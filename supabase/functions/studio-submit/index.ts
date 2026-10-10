// FGN Studio package submissions — Phase 4 write path.
// Separate from the read-only studio-catalog API. Auth reuses the Studio token
// model: short-lived studio_tokens carrying the `submissions:create` scope,
// minted server-to-server via the durable operator key. Browser origins are
// restricted to origins registered against the issuing app.
//
// Routes:
//   POST /studio-submit/submissions   — submit a SCORM package (Studio token)
//   GET  /studio-submit/status/:id    — poll validation + review state (Studio token)
//   POST /studio-submit/review        — admin approve / reject / needs_revision (user JWT)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import JSZip from 'npm:jszip@3.10.1';
import {
  CONTRACT_VERSION,
  SUPPORTED_CONTRACT_VERSIONS,
  corsFor,
  sha256Hex,
  bearerFrom,
  jsonResponse,
} from '../_shared/studio-auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_PACKAGE_BYTES = 25 * 1024 * 1024; // 25 MB decoded
const BUCKET = 'studio-submissions';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type SubmitSession = {
  tokenId: string;
  appId: string;
  tenantId: string;
  approvedOrigins: string[];
};

type AuthFailure = { status: number; code: string; message: string };

function isAuthFailure(v: unknown): v is AuthFailure {
  return !!v && typeof v === 'object' && 'code' in (v as Record<string, unknown>);
}

/** Resolves a short-lived Studio token and requires the submissions:create scope. */
async function resolveSubmitSession(req: Request): Promise<SubmitSession | AuthFailure> {
  const raw = bearerFrom(req);
  if (!raw) {
    return { status: 401, code: 'credential_absent', message: 'Authorization: Bearer <studio token> required.' };
  }
  if (!raw.startsWith('fgnstudio_')) {
    return {
      status: 401,
      code: 'credential_invalid',
      message: 'Durable app keys are not accepted here. Exchange the operator key for a short-lived Studio token.',
    };
  }
  const tokenHash = await sha256Hex(raw);
  const { data: token } = await admin
    .from('studio_tokens')
    .select('id, app_id, tenant_id, scopes, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!token) return { status: 401, code: 'credential_invalid', message: 'Token not recognised.' };
  if (token.revoked_at) return { status: 401, code: 'credential_revoked', message: 'Token has been revoked.' };
  if (new Date(token.expires_at).getTime() <= Date.now()) {
    return { status: 401, code: 'credential_expired', message: 'Token has expired.' };
  }
  if (!Array.isArray(token.scopes) || !token.scopes.includes('submissions:create')) {
    return { status: 403, code: 'scope_denied', message: 'Token lacks the submissions:create scope.' };
  }

  const { data: app } = await admin
    .from('authorized_apps')
    .select('id, is_active, can_submit_packages, allowed_origins')
    .eq('id', token.app_id)
    .maybeSingle();

  if (!app || !app.is_active) {
    return { status: 401, code: 'credential_revoked', message: 'Issuing application is inactive.' };
  }
  if (!app.can_submit_packages) {
    return { status: 403, code: 'scope_denied', message: 'Issuing application is not provisioned for package submissions.' };
  }

  return {
    tokenId: token.id,
    appId: token.app_id,
    tenantId: token.tenant_id,
    approvedOrigins: (app.allowed_origins as string[]) ?? [],
  };
}

/** Verifies an Academy admin user JWT for the review route. */
async function resolveAdminUser(req: Request): Promise<{ userId: string } | AuthFailure> {
  const raw = bearerFrom(req);
  if (!raw || raw.startsWith('fgnstudio_')) {
    return { status: 401, code: 'credential_absent', message: 'A signed-in Academy admin is required.' };
  }
  const { data, error } = await admin.auth.getUser(raw);
  if (error || !data?.user) {
    return { status: 401, code: 'credential_invalid', message: 'Session could not be verified.' };
  }
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: data.user.id, _role: 'admin' });
  const { data: isSuper } = await admin.rpc('has_role', { _user_id: data.user.id, _role: 'super_admin' });
  if (!isAdmin && !isSuper) {
    return { status: 403, code: 'scope_denied', message: 'Platform admin role required.' };
  }
  return { userId: data.user.id };
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

type ManifestSummary = {
  manifestPresent: boolean;
  manifestTitle: string | null;
  organizationCount: number;
  itemCount: number;
  scormVersionDetected: string | null;
};

/** Validates the ZIP and extracts a manifest summary. Throws on hard failure. */
async function validatePackage(zipBytes: Uint8Array): Promise<{ summary: ManifestSummary; errors: string[] }> {
  const errors: string[] = [];
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBytes);
  } catch {
    return {
      summary: { manifestPresent: false, manifestTitle: null, organizationCount: 0, itemCount: 0, scormVersionDetected: null },
      errors: ['Package is not a readable ZIP archive.'],
    };
  }

  const manifestFile = zip.file('imsmanifest.xml');
  if (!manifestFile) {
    return {
      summary: { manifestPresent: false, manifestTitle: null, organizationCount: 0, itemCount: 0, scormVersionDetected: null },
      errors: ['imsmanifest.xml not found at the package root.'],
    };
  }

  const xml = await manifestFile.async('text');
  const titleMatch = xml.match(/<organizations[^>]*>[\s\S]*?<organization[^>]*>[\s\S]*?<title>([\s\S]*?)<\/title>/);
  const orgCount = (xml.match(/<organization[\s>]/g) ?? []).length;
  const itemCount = (xml.match(/<item[\s>]/g) ?? []).length;
  const schemaMatch = xml.match(/<schemaversion>([\s\S]*?)<\/schemaversion>/);

  if (orgCount === 0) errors.push('Manifest declares no organizations.');
  if (itemCount === 0) errors.push('Manifest declares no items.');

  return {
    summary: {
      manifestPresent: true,
      manifestTitle: titleMatch ? titleMatch[1].trim().slice(0, 200) : null,
      organizationCount: orgCount,
      itemCount,
      scormVersionDetected: schemaMatch ? schemaMatch[1].trim() : null,
    },
    errors,
  };
}

const GAME_TITLES = new Set([
  'ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim', 'Fiber_Tech',
  'Roadcraft', 'MSFS_2024', 'House_Flipper', 'House_Flipper_2', 'Electrician_Sim',
]);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const origin = req.headers.get('Origin');
  const segments = url.pathname.split('/').filter(Boolean);
  const fnIndex = segments.indexOf('studio-submit');
  const route = fnIndex >= 0 ? segments.slice(fnIndex + 1) : segments;
  const head = (route[0] ?? '').toLowerCase();

  if (req.method === 'OPTIONS') {
    let approved: string[] | null = null;
    if (origin) {
      const { data } = await admin
        .from('authorized_apps')
        .select('allowed_origins')
        .eq('can_submit_packages', true)
        .eq('is_active', true);
      approved = (data ?? []).flatMap((a: Record<string, unknown>) => (a.allowed_origins as string[]) ?? []);
    }
    return new Response('ok', { headers: corsFor(origin, false, approved) });
  }

  try {
    // ---------- admin review route (Academy user JWT) ----------
    if (head === 'review') {
      const cors = corsFor(origin, false, null);
      if (req.method !== 'POST') {
        return jsonResponse({ error: 'method_not_allowed' }, 405, cors);
      }
      const reviewer = await resolveAdminUser(req);
      if (isAuthFailure(reviewer)) {
        return jsonResponse({ error: reviewer.code, message: reviewer.message }, reviewer.status, cors);
      }

      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: 'invalid_request', message: 'JSON body required.' }, 400, cors);
      }
      const submissionId = typeof body.submissionId === 'string' ? body.submissionId : '';
      const action = typeof body.action === 'string' ? body.action : '';
      const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : null;
      if (!submissionId || !['approved', 'rejected', 'needs_revision'].includes(action)) {
        return jsonResponse(
          { error: 'invalid_request', message: 'submissionId and action (approved|rejected|needs_revision) are required.' },
          400,
          cors,
        );
      }

      const { data: submission } = await admin
        .from('studio_submissions')
        .select('*')
        .eq('id', submissionId)
        .maybeSingle();
      if (!submission) return jsonResponse({ error: 'not_found' }, 404, cors);
      if (submission.review_status !== 'pending') {
        return jsonResponse(
          { error: 'already_reviewed', message: `Submission is already ${submission.review_status}.`, reviewStatus: submission.review_status },
          409,
          cors,
        );
      }
      if (action === 'approved' && submission.validation_status !== 'valid') {
        return jsonResponse(
          { error: 'validation_incomplete', message: 'Only packages that passed validation can be approved.' },
          409,
          cors,
        );
      }

      let scormCourseId: string | null = null;
      let generatedWorkOrderId: string | null = null;

      if (action === 'approved') {
        // Determine the lead Work Order: an existing referenced one, or a draft
        // generated from the manifest when the submission requested it.
        const sourceWoIds = (submission.source_work_order_ids as string[]) ?? [];
        let leadWoId = sourceWoIds[0] ?? null;

        if (!leadWoId && submission.request_work_order_creation) {
          const summary = (submission.manifest_summary ?? {}) as Record<string, unknown>;
          const gameTitle = typeof summary.gameTitle === 'string' ? summary.gameTitle : null;
          if (!gameTitle || !GAME_TITLES.has(gameTitle)) {
            return jsonResponse(
              { error: 'game_title_required', message: 'Work Order creation requires a valid gameTitle from the Studio vocabulary.' },
              409,
              cors,
            );
          }
          const { data: wo, error: woErr } = await admin
            .from('work_orders')
            .insert({
              tenant_id: submission.tenant_id,
              owner_tenant_id: submission.tenant_id,
              title: submission.title,
              description: submission.description,
              game_title: gameTitle,
              is_active: false, // draft: inactive until publication-readiness checks pass
            })
            .select('id')
            .single();
          if (woErr) throw woErr;
          leadWoId = wo.id;
          generatedWorkOrderId = wo.id;
        }

        if (leadWoId) {
          // Create the SCORM course inactive — a person publishes it later via the
          // existing publish flow. unique(work_order_id, destination) conflicts
          // link the existing course instead of failing.
          const courseId = crypto.randomUUID();
          const { data: existing } = await admin
            .from('scorm_courses')
            .select('id')
            .eq('work_order_id', leadWoId)
            .eq('destination', 'fgn-academy')
            .maybeSingle();
          if (existing) {
            scormCourseId = existing.id;
          } else {
            const { data: course, error: cErr } = await admin
              .from('scorm_courses')
              .insert({
                id: courseId,
                work_order_id: leadWoId,
                destination: 'fgn-academy',
                title: submission.title,
                description: submission.description,
                scorm_version: submission.scorm_version === '2004' ? '1.2' : submission.scorm_version,
                manifest_url: submission.package_path,
                bundle_id: `studio-${submission.id}`,
                is_published: false,
                published_at: null,
                generated_by: reviewer.userId,
              })
              .select('id')
              .single();
            if (cErr) throw cErr;
            scormCourseId = course.id;
          }
        }
      }

      const { error: upErr } = await admin
        .from('studio_submissions')
        .update({
          review_status: action,
          reviewed_by: reviewer.userId,
          reviewed_at: new Date().toISOString(),
          review_note: note,
          ...(scormCourseId ? { scorm_course_id: scormCourseId } : {}),
          ...(generatedWorkOrderId ? { generated_work_order_id: generatedWorkOrderId } : {}),
        })
        .eq('id', submissionId)
        .eq('review_status', 'pending'); // concurrency guard: only one reviewer wins
      if (upErr) throw upErr;

      return jsonResponse(
        { submissionId, reviewStatus: action, scormCourseId, generatedWorkOrderId },
        200,
        cors,
      );
    }

    // ---------- Studio token routes ----------
    const session = await resolveSubmitSession(req);
    if (isAuthFailure(session)) {
      return jsonResponse({ error: session.code, message: session.message }, session.status, corsFor(origin, false, null));
    }
    const cors = corsFor(origin, false, session.approvedOrigins);
    if (origin && !cors['Access-Control-Allow-Origin']) {
      return jsonResponse({ error: 'forbidden_origin', message: 'Origin is not registered against this application.' }, 403, cors);
    }

    const contract = req.headers.get('X-Studio-Contract');
    if (!contract || !SUPPORTED_CONTRACT_VERSIONS.includes(contract)) {
      return jsonResponse(
        {
          error: 'contract_version_mismatch',
          message: 'X-Studio-Contract header absent or unsupported.',
          received: contract,
          currentContractVersion: CONTRACT_VERSION,
          supportedContractVersions: SUPPORTED_CONTRACT_VERSIONS,
        },
        400,
        cors,
      );
    }

    // ---------- GET /status/:id ----------
    if (head === 'status') {
      if (req.method !== 'GET') return jsonResponse({ error: 'method_not_allowed' }, 405, cors);
      const id = route[1] ?? '';
      const { data: sub } = await admin
        .from('studio_submissions')
        .select('id, title, validation_status, validation_errors, review_status, review_note, reviewed_at, scorm_course_id, generated_work_order_id, created_at')
        .eq('id', id)
        .eq('app_id', session.appId) // an app only ever sees its own submissions
        .maybeSingle();
      if (!sub) return jsonResponse({ error: 'not_found' }, 404, cors);
      return jsonResponse({ contractVersion: CONTRACT_VERSION, submission: sub }, 200, cors);
    }

    // ---------- POST /submissions ----------
    if (head === 'submissions' || head === '') {
      if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, cors);

      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: 'invalid_request', message: 'JSON body required.' }, 400, cors);
      }

      const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const description = typeof body.description === 'string' ? body.description.trim() : null;
      const scormVersion = typeof body.scormVersion === 'string' ? body.scormVersion.trim() : '1.2';
      const packageBase64 = typeof body.packageBase64 === 'string' ? body.packageBase64 : '';
      const sourceWorkOrderIds = Array.isArray(body.sourceWorkOrderIds)
        ? (body.sourceWorkOrderIds as unknown[]).filter((v): v is string => typeof v === 'string')
        : [];
      const requestWoCreation = body.requestWorkOrderCreation === true;
      const gameTitle = typeof body.gameTitle === 'string' ? body.gameTitle : null;

      if (!idempotencyKey || idempotencyKey.length > 200) {
        return jsonResponse({ error: 'invalid_request', message: 'idempotencyKey is required (max 200 chars).' }, 400, cors);
      }
      if (!title || title.length > 200) {
        return jsonResponse({ error: 'invalid_request', message: 'title is required (max 200 chars).' }, 400, cors);
      }
      if (!['1.2', '2004'].includes(scormVersion)) {
        return jsonResponse({ error: 'invalid_request', message: 'scormVersion must be "1.2" or "2004".' }, 400, cors);
      }
      if (!packageBase64) {
        return jsonResponse({ error: 'invalid_request', message: 'packageBase64 (the SCORM ZIP, base64-encoded) is required.' }, 400, cors);
      }
      if (requestWoCreation && (!gameTitle || !GAME_TITLES.has(gameTitle))) {
        return jsonResponse(
          { error: 'invalid_request', message: 'requestWorkOrderCreation requires a gameTitle from the Studio vocabulary.', validGameTitles: Array.from(GAME_TITLES) },
          400,
          cors,
        );
      }

      // Idempotency: a repeated key returns the existing record, no second package.
      const { data: existing } = await admin
        .from('studio_submissions')
        .select('id, validation_status, review_status, created_at')
        .eq('app_id', session.appId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        return jsonResponse(
          { contractVersion: CONTRACT_VERSION, submissionId: existing.id, duplicate: true, validationStatus: existing.validation_status, reviewStatus: existing.review_status },
          200,
          cors,
        );
      }

      let zipBytes: Uint8Array;
      try {
        zipBytes = base64ToBytes(packageBase64);
      } catch {
        return jsonResponse({ error: 'invalid_request', message: 'packageBase64 is not valid base64.' }, 400, cors);
      }
      if (zipBytes.length > MAX_PACKAGE_BYTES) {
        return jsonResponse({ error: 'package_too_large', message: `Package exceeds the ${MAX_PACKAGE_BYTES / 1024 / 1024} MB limit.` }, 413, cors);
      }

      const { summary, errors } = await validatePackage(zipBytes);
      const validationStatus = errors.length ? 'validation_failed' : 'valid';

      const submissionId = crypto.randomUUID();
      const packagePath = `${session.appId}/${submissionId}.zip`;
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(packagePath, zipBytes, { contentType: 'application/zip', upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await admin.from('studio_submissions').insert({
        id: submissionId,
        app_id: session.appId,
        tenant_id: session.tenantId,
        idempotency_key: idempotencyKey,
        title,
        description,
        scorm_version: scormVersion,
        package_path: packagePath,
        package_size_bytes: zipBytes.length,
        manifest_summary: { ...summary, gameTitle },
        source_work_order_ids: sourceWorkOrderIds,
        request_work_order_creation: requestWoCreation,
        validation_status: validationStatus,
        validation_errors: errors.length ? errors : null,
      });
      if (insErr) {
        // Unique-violation race: another request with the same key won.
        if (String(insErr.code) === '23505') {
          const { data: winner } = await admin
            .from('studio_submissions')
            .select('id, validation_status, review_status')
            .eq('app_id', session.appId)
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();
          return jsonResponse(
            { contractVersion: CONTRACT_VERSION, submissionId: winner?.id, duplicate: true, validationStatus: winner?.validation_status, reviewStatus: winner?.review_status },
            200,
            cors,
          );
        }
        throw insErr;
      }

      return jsonResponse(
        {
          contractVersion: CONTRACT_VERSION,
          submissionId,
          duplicate: false,
          validationStatus,
          validationErrors: errors.length ? errors : null,
          reviewStatus: 'pending',
          statusUrl: `status/${submissionId}`,
        },
        201,
        cors,
      );
    }

    return jsonResponse({ error: 'not_found', message: `Unknown route: /${route.join('/')}` }, 404, corsFor(origin, false, null));
  } catch (err) {
    console.error('studio-submit error:', err);
    return jsonResponse(
      { error: 'internal_error', message: err instanceof Error ? err.message : 'Unexpected error' },
      500,
      corsFor(origin, false, null),
    );
  }
});
