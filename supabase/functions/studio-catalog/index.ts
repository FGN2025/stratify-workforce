// FGN Studio catalog API — READ ONLY.
// No write path, no submission path. Phase 4 remains blocked.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import spec from './openapi.json' with { type: 'json' };
import {
  CONTRACT_VERSION,
  SUPPORTED_CONTRACT_VERSIONS,
  TOKEN_TTL_SECONDS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS,
  DISCOVERY_ROUTES,
  corsFor,
  sha256Hex,
  randomToken,
  resolveSession,
  isAuthFailure,
  checkRateLimit,
  resolveTenantScope,
  encodeCursor,
  decodeCursor,
  scopeFingerprint,
  jsonResponse,
} from '../_shared/studio-auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function catalogVersions(): Promise<Record<string, { version: number; lastChangedAt: string }>> {
  const { data } = await admin.from('catalog_versions').select('source_key, version, last_changed_at');
  const out: Record<string, { version: number; lastChangedAt: string }> = {};
  (data ?? []).forEach((r: Record<string, unknown>) => {
    out[r.source_key as string] = {
      version: Number(r.version),
      lastChangedAt: r.last_changed_at as string,
    };
  });
  return out;
}

function maturityOf(row: Record<string, unknown> | null | undefined) {
  if (!row) return { maturity: null, maturityState: 'unclassified', maturityApprovedAt: null };
  if (row.level3_approved_at) return { maturity: 3, maturityState: 'level_3', maturityApprovedAt: row.level3_approved_at };
  if (row.level2_approved_at) return { maturity: 2, maturityState: 'level_2', maturityApprovedAt: row.level2_approved_at };
  if (row.level1_approved_at) return { maturity: 1, maturityState: 'level_1', maturityApprovedAt: row.level1_approved_at };
  return { maturity: null, maturityState: 'unclassified', maturityApprovedAt: null };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const origin = req.headers.get('Origin');
  const segments = url.pathname.split('/').filter(Boolean);
  const fnIndex = segments.indexOf('studio-catalog');
  const route = fnIndex >= 0 ? segments.slice(fnIndex + 1) : segments;
  const head = (route[0] ?? '').toLowerCase();
  const isDiscovery = DISCOVERY_ROUTES.has(head);

  if (req.method === 'OPTIONS') {
    // Preflight for a protected route still needs the approved-origin list, which we
    // cannot know before authentication; approved origins are resolved per app below.
    let approved: string[] | null = null;
    if (!isDiscovery && origin) {
      const { data } = await admin
        .from('authorized_apps')
        .select('allowed_origins')
        .eq('can_read_catalog', true)
        .eq('is_active', true);
      approved = (data ?? []).flatMap((a: Record<string, unknown>) => (a.allowed_origins as string[]) ?? []);
    }
    return new Response('ok', { headers: corsFor(origin, isDiscovery, approved) });
  }

  const discoveryCors = corsFor(origin, true, null);

  try {
    // ---------- discovery: no credential, any origin ----------
    if (head === 'openapi.json' || head === '') {
      return new Response(JSON.stringify(spec, null, 2), {
        headers: { ...discoveryCors, 'Content-Type': 'application/json' },
      });
    }

    if (head === 'capabilities') {
      const raw = req.headers.get('Authorization');
      const versions = await catalogVersions();
      const base = {
        contractVersion: CONTRACT_VERSION,
        supportedContractVersions: SUPPORTED_CONTRACT_VERSIONS,
        readOnly: true,
        writeEndpoints: [],
        note:
          'An absent credential is accepted on /capabilities only. Every other catalog route returns 401 without a valid short-lived Studio token.',
        catalogVersions: versions,
        unsupported: [
          { capability: 'work-order.write', reason: 'Read-only contract. Submissions are a separate gate (Phase 4, blocked).' },
          { capability: 'skill.proposal', reason: 'Academy owns approval. Studio approvals are simulated and never authoritative.' },
        ],
      };
      if (!raw) {
        return jsonResponse({ ...base, authenticated: false, tenantId: null, tenantLabel: null, capabilities: [] }, 200, discoveryCors);
      }
      const session = await resolveSession(admin, req);
      if (isAuthFailure(session)) {
        return jsonResponse({ error: session.code, message: session.message, ...base, authenticated: false }, session.status, discoveryCors);
      }
      const { data: tenant } = await admin.from('tenants').select('id, name, slug').eq('id', session.tenantId).maybeSingle();
      return jsonResponse(
        {
          ...base,
          authenticated: true,
          tenantId: session.tenantId,
          tenantLabel: tenant?.name ?? null,
          tenantSlug: tenant?.slug ?? null,
          includesDescendants: session.includeDescendants,
          tokenExpiresAt: session.expiresAt,
          scopes: session.scopes,
          capabilities: [
            'skills.read',
            'skills.aliases',
            'skills.ambiguity-report',
            'work-orders.read',
            'work-orders.unfiltered',
            'work-orders.academy-native',
            'work-orders.maturity',
            'work-orders.visibility',
            'work-orders.curation',
            'vocabulary.read',
            'sources.read',
            'pagination.cursor',
            'versions.per-response',
          ],
          rateLimit: { requests: RATE_LIMIT_MAX_REQUESTS, windowSeconds: RATE_LIMIT_WINDOW_SECONDS },
        },
        200,
        discoveryCors,
      );
    }

    // ---------- operator-to-operator token mint ----------
    if (head === 'studio-token') {
      const appKey = req.headers.get('X-App-Key');
      if (req.method !== 'POST') {
        return jsonResponse({ error: 'method_not_allowed' }, 405, discoveryCors);
      }
      if (!appKey) {
        return jsonResponse(
          { error: 'credential_absent', message: 'X-App-Key (durable operator key) required. This route is server-to-server only.' },
          401,
          discoveryCors,
        );
      }
      const keyHash = await sha256Hex(appKey);
      const { data: app } = await admin
        .from('authorized_apps')
        .select('id, app_slug, is_active, can_read_catalog, catalog_tenant_id, catalog_include_descendants')
        .eq('api_key_hash', keyHash)
        .maybeSingle();

      if (!app || !app.is_active) {
        return jsonResponse({ error: 'credential_invalid' }, 401, discoveryCors);
      }
      if (!app.can_read_catalog || !app.catalog_tenant_id) {
        return jsonResponse(
          { error: 'scope_denied', message: 'Application is not provisioned for catalog reads, or has no tenant scope.' },
          403,
          discoveryCors,
        );
      }
      // Browser origins may not mint tokens; the durable key stays operator-side.
      if (origin) {
        return jsonResponse(
          { error: 'forbidden_origin', message: 'Token minting is server-to-server only; the durable key must never reach a browser.' },
          403,
          discoveryCors,
        );
      }

      const raw = randomToken();
      const tokenHash = await sha256Hex(raw);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
      const { error } = await admin.from('studio_tokens').insert({
        app_id: app.id,
        token_hash: tokenHash,
        tenant_id: app.catalog_tenant_id,
        include_descendants: app.catalog_include_descendants,
        scopes: ['catalog:read'],
        issued_to: app.app_slug,
        expires_at: expiresAt,
      });
      if (error) throw error;

      return jsonResponse(
        { token: raw, tokenType: 'Bearer', expiresAt, expiresInSeconds: TOKEN_TTL_SECONDS, scopes: ['catalog:read'], tenantId: app.catalog_tenant_id, includesDescendants: app.catalog_include_descendants },
        201,
        discoveryCors,
      );
    }

    // ---------- protected catalog routes ----------
    const session = await resolveSession(admin, req);
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

    if (req.method !== 'GET') {
      return jsonResponse({ error: 'method_not_allowed', message: 'Catalog routes are read-only.' }, 405, cors);
    }

    const rl = await checkRateLimit(admin, session.tokenHash);
    if (!rl.allowed) {
      return jsonResponse({ error: 'rate_limited', retryAfterSeconds: rl.retryAfter }, 429, cors, {
        'Retry-After': String(rl.retryAfter),
      });
    }
    await admin
      .from('studio_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', session.tokenId);

    const versions = await catalogVersions();
    const scopeIds = await resolveTenantScope(admin, session);
    const scopeFp = await scopeFingerprint(session);

    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const cursorRaw = url.searchParams.get('cursor');

    // ---------- /vocabulary ----------
    if (head === 'vocabulary') {
      const { data, error } = await admin.rpc('studio_vocabulary');
      if (error) throw error;
      const v = data as Record<string, unknown>;
      const groups = (v.groups ?? {}) as Record<string, unknown>;
      const unsupported = (v.unsupported ?? []) as unknown[];
      return jsonResponse(
        {
          contractVersion: CONTRACT_VERSION,
          vocabularyVersion: v.vocabulary_version,
          derivedFrom: 'live database enum and check-constraint catalog',
          partial: unsupported.length > 0,
          unsupported,
          ...groups,
        },
        200,
        cors,
      );
    }

    // ---------- /sources ----------
    if (head === 'sources') {
      const { count: activityCount } = await admin
        .from('simulation_activity_cache')
        .select('simulation_activity_id', { count: 'exact', head: true });
      const { data: lastSync } = await admin
        .from('simulation_activity_cache')
        .select('last_synced_at')
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const items = [
        { sourceId: 'canonical-skills', label: 'Canonical skill catalog', sourceVersion: versions.skills?.version ?? 1, lastChangedAt: versions.skills?.lastChangedAt ?? null, lastSyncedAt: null, owner: 'FGN Academy' },
        { sourceId: 'work-order-catalog', label: 'Work Order catalog', sourceVersion: versions.work_orders?.version ?? 1, lastChangedAt: versions.work_orders?.lastChangedAt ?? null, lastSyncedAt: null, owner: 'FGN Academy' },
        { sourceId: 'evidence-vocabulary', label: 'Evidence and assessment vocabulary', sourceVersion: versions.vocabulary?.version ?? 1, lastChangedAt: versions.vocabulary?.lastChangedAt ?? null, lastSyncedAt: null, owner: 'FGN Academy' },
        { sourceId: 'gg-activity-cache', label: 'FGN.GG simulation activity cache', sourceVersion: versions.activities?.version ?? 1, lastChangedAt: versions.activities?.lastChangedAt ?? null, lastSyncedAt: lastSync?.last_synced_at ?? null, owner: 'FGN.GG', recordCount: activityCount ?? 0 },
      ];
      return jsonResponse({ contractVersion: CONTRACT_VERSION, items, nextCursor: null }, 200, cors);
    }

    // ---------- /skills ----------
    if (head === 'skills') {
      const query = (url.searchParams.get('query') ?? '').trim();
      const qFp = await sha256Hex(`skills:${query}:${limit}`);
      const currentVersion = versions.skills?.version ?? 1;
      let offset = 0;

      if (cursorRaw) {
        const c = decodeCursor(cursorRaw);
        if (!c) return jsonResponse({ error: 'cursor_invalid', message: 'Cursor could not be decoded.' }, 400, cors);
        if (c.s !== scopeFp) return jsonResponse({ error: 'cursor_scope_mismatch', message: 'Cursor was issued to a different credential scope.' }, 403, cors);
        if (c.q !== qFp.slice(0, 16)) return jsonResponse({ error: 'cursor_query_mismatch', message: 'Cursor belongs to a different query or page size.' }, 400, cors);
        if (c.v !== currentVersion) {
          return jsonResponse(
            { error: 'catalog_changed', message: 'The skill catalog changed during this walk. Restart the read.', cursorCatalogVersion: c.v, currentCatalogVersion: currentVersion },
            409,
            cors,
          );
        }
        offset = c.o;
      }

      let q = admin
        .from('canonical_skills')
        .select('id, skill_key, skill_name, description, domain, classification, status, version, record_version, updated_at', { count: 'exact' })
        .order('skill_key', { ascending: true })
        .range(offset, offset + limit - 1);
      if (query) q = q.or(`skill_key.ilike.%${query}%,skill_name.ilike.%${query}%`);

      const { data: skills, count, error } = await q;
      if (error) throw error;

      const ids = (skills ?? []).map((s: Record<string, unknown>) => s.id);
      const { data: aliasRows } = ids.length
        ? await admin.from('skill_aliases').select('alias_key, game_title, canonical_skill_id, source').in('canonical_skill_id', ids)
        : { data: [] };

      // Ambiguity is computed across the whole alias table, not just this page.
      const { data: allAliases } = await admin.from('skill_aliases').select('alias_key, canonical_skill_id');
      const aliasTargets = new Map<string, Set<string>>();
      (allAliases ?? []).forEach((a: Record<string, unknown>) => {
        const key = a.alias_key as string;
        if (!aliasTargets.has(key)) aliasTargets.set(key, new Set());
        aliasTargets.get(key)!.add(a.canonical_skill_id as string);
      });

      const items = (skills ?? []).map((s: Record<string, unknown>) => ({
        skillId: s.id,
        skillKey: s.skill_key,
        label: s.skill_name,
        description: s.description,
        domain: s.domain,
        classification: s.classification,
        curationState: s.status,
        skillVersion: s.version,
        recordVersion: Number(s.record_version),
        updatedAt: s.updated_at,
        aliases: (aliasRows ?? [])
          .filter((a: Record<string, unknown>) => a.canonical_skill_id === s.id)
          .map((a: Record<string, unknown>) => ({
            aliasKey: a.alias_key,
            gameScope: a.game_title ?? null,
            source: a.source ?? null,
            ambiguous: (aliasTargets.get(a.alias_key as string)?.size ?? 1) > 1,
          })),
      }));

      const ambiguousAliases = Array.from(aliasTargets.entries())
        .filter(([, set]) => set.size > 1)
        .map(([aliasKey, set]) => ({ aliasKey, resolvesTo: Array.from(set), resolvable: false }));

      const nextOffset = offset + items.length;
      const hasMore = nextOffset < (count ?? 0);
      return jsonResponse(
        {
          contractVersion: CONTRACT_VERSION,
          catalogVersion: currentVersion,
          catalogChangedAt: versions.skills?.lastChangedAt ?? null,
          scope: { tenantId: session.tenantId, includesDescendants: session.includeDescendants, note: 'The canonical skill catalog is platform-global and is not tenant-filtered.' },
          totalCount: count ?? 0,
          items,
          ambiguousAliases,
          nextCursor: hasMore ? encodeCursor({ s: scopeFp, v: currentVersion, o: nextOffset, q: qFp.slice(0, 16) }) : null,
        },
        200,
        cors,
      );
    }

    // ---------- /work-orders (alias: /work-order-relationships) ----------
    if (head === 'work-orders' || head === 'work-order-relationships') {
      const activityIds = (url.searchParams.get('activityIds') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const maturityFilter = (url.searchParams.get('maturity') ?? '').trim();
      const qFp = await sha256Hex(`wo:${activityIds.join('|')}:${maturityFilter}:${limit}`);
      const currentVersion = versions.work_orders?.version ?? 1;
      let offset = 0;

      if (cursorRaw) {
        const c = decodeCursor(cursorRaw);
        if (!c) return jsonResponse({ error: 'cursor_invalid', message: 'Cursor could not be decoded.' }, 400, cors);
        if (c.s !== scopeFp) return jsonResponse({ error: 'cursor_scope_mismatch', message: 'Cursor was issued to a different credential scope.' }, 403, cors);
        if (c.q !== qFp.slice(0, 16)) return jsonResponse({ error: 'cursor_query_mismatch', message: 'Cursor belongs to a different query or page size.' }, 400, cors);
        if (c.v !== currentVersion) {
          return jsonResponse(
            { error: 'catalog_changed', message: 'The Work Order catalog changed during this walk. Restart the read.', cursorCatalogVersion: c.v, currentCatalogVersion: currentVersion },
            409,
            cors,
          );
        }
        offset = c.o;
      }

      const scopeList = `(${scopeIds.join(',')})`;
      let q = admin
        .from('work_orders')
        .select('id, title, description, game_title, simulation_activity_id, source_challenge_id, fgn_origin_challenge_id, visibility, owner_tenant_id, tenant_id, is_active, record_version, created_at', { count: 'exact' })
        .or(`owner_tenant_id.in.${scopeList},tenant_id.in.${scopeList}`)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + limit - 1);
      if (activityIds.length) q = q.in('simulation_activity_id', activityIds);

      const { data: rows, count, error } = await q;
      if (error) throw error;

      const woIds = (rows ?? []).map((r: Record<string, unknown>) => r.id);
      const { data: maturityRows } = woIds.length
        ? await admin.from('work_order_migration_maturity').select('*').in('work_order_id', woIds)
        : { data: [] };
      // Curation metadata is filtered to the credential's tenant scope — a Studio session
      // never sees which other organizations curated a Work Order.
      const { data: curationRows } = woIds.length
        ? await admin
            .from('tenant_work_order_curation')
            .select('work_order_id, tenant_id, included')
            .in('work_order_id', woIds)
            .in('tenant_id', scopeIds)
        : { data: [] };
      const { data: tenantRows } = await admin.from('tenants').select('id, name').in('id', scopeIds);
      const tenantName = new Map((tenantRows ?? []).map((t: Record<string, unknown>) => [t.id, t.name]));

      let items = (rows ?? []).map((r: Record<string, unknown>) => {
        const m = maturityOf((maturityRows ?? []).find((x: Record<string, unknown>) => x.work_order_id === r.id));
        const owner = (r.owner_tenant_id ?? r.tenant_id) as string | null;
        return {
          workOrderId: r.id,
          title: r.title,
          description: r.description,
          gameTitle: r.game_title,
          activityId: r.simulation_activity_id ?? null,
          academyNative: !r.simulation_activity_id,
          sourceChallengeId: r.source_challenge_id ?? null,
          originChallengeId: r.fgn_origin_challenge_id ?? null,
          ...m,
          maturityReviewNote: (maturityRows ?? []).find((x: Record<string, unknown>) => x.work_order_id === r.id)?.review_note ?? null,
          visibility: {
            ownerTenantId: owner,
            ownerTenantLabel: owner ? tenantName.get(owner) ?? null : null,
            visibilityMode: r.visibility ?? null,
            isActive: r.is_active,
            curationSupported: true,
            curationScopeNote: 'Curation rows are filtered to this credential\'s tenant scope only.',
            curatedForTenants: (curationRows ?? [])
              .filter((c: Record<string, unknown>) => c.work_order_id === r.id)
              .map((c: Record<string, unknown>) => ({
                tenantId: c.tenant_id,
                tenantLabel: tenantName.get(c.tenant_id) ?? null,
                included: c.included,
              })),
          },
          recordVersion: Number(r.record_version),
          createdAt: r.created_at,
        };
      });

      if (maturityFilter) {
        const wanted = maturityFilter.split(',').map((s) => s.trim());
        items = items.filter((i) => wanted.includes(i.maturityState));
      }

      const nextOffset = offset + (rows ?? []).length;
      const hasMore = nextOffset < (count ?? 0);
      return jsonResponse(
        {
          contractVersion: CONTRACT_VERSION,
          catalogVersion: currentVersion,
          catalogChangedAt: versions.work_orders?.lastChangedAt ?? null,
          scope: { tenantId: session.tenantId, includesDescendants: session.includeDescendants, tenantIdsInScope: scopeIds },
          filtersApplied: { activityIds: activityIds.length ? activityIds : null, maturity: maturityFilter || null },
          note: 'No filter is required. Academy-native Work Orders (activityId null) and unclassified maturity are always included in an unfiltered read. One activity may legitimately carry several Work Orders — multiple interpretations are preserved.',
          totalCount: count ?? 0,
          items,
          nextCursor: hasMore ? encodeCursor({ s: scopeFp, v: currentVersion, o: nextOffset, q: qFp.slice(0, 16) }) : null,
        },
        200,
        cors,
      );
    }

    return jsonResponse({ error: 'not_found', message: `Unknown route: /${route.join('/')}` }, 404, cors);
  } catch (e) {
    console.error('studio-catalog error', e);
    return jsonResponse({ error: 'internal_error', message: (e as Error).message }, 500, discoveryCors);
  }
});
