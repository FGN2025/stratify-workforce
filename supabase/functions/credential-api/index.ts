import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-key, x-ecosystem-key, x-play-signature, x-fgn-event, x-delivery-id, x-play-delivery-id, x-ecosystem-app, x-academy-origin',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

// HMAC-SHA256(rawBody) → lowercase hex (matches §6 webhook receiver scheme)
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function appOriginFromReq(req: Request): string {
  const origin = req.headers.get('x-academy-origin');
  if (origin) return origin.replace(/\/+$/, '');
  return 'https://fgn.academy';
}

interface CredentialIssueRequest {
  user_email: string;
  credential_type_key: string;
  score?: number;
  skills_verified?: string[];
  external_reference_id?: string;
}

interface VerifyRequest {
  verification_hash: string;
}

interface WebhookRegisterRequest {
  webhook_url: string;
  events: string[];
  secret?: string;
}

const VALID_WEBHOOK_EVENTS = ['credential.issued', 'readiness.threshold', 'work_order.completed'];

function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const path = pathParts[0] === 'credential-api' ? pathParts.slice(1) : pathParts;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ==========================================
    // PUBLIC ENDPOINTS (no auth required)
    // ==========================================

    // ------------------------------------------
    // POST /passport-link  (Option B: HMAC magic-link relay for Player Dashboard → Skill Passport)
    // Auth: X-Ecosystem-Key + X-Play-Signature (HMAC-SHA256 of raw body, hex)
    // Body: { external_user_id, intent?: 'view_passport', ttl_seconds?: 60..900 }
    // ------------------------------------------
    if (req.method === 'POST' && path[0] === 'passport-link' && !path[1]) {
      const ecoKey = req.headers.get('x-ecosystem-key') ?? req.headers.get('x-app-key');
      const expectedEcoKey = Deno.env.get('ECOSYSTEM_API_KEY');
      if (!ecoKey || !expectedEcoKey || ecoKey !== expectedEcoKey) {
        return new Response(JSON.stringify({ error: 'invalid_ecosystem_key' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rawBody = await req.text();
      const sigHeader = (req.headers.get('x-play-signature') ?? '').trim();
      const webhookSecret = Deno.env.get('PLAY_WEBHOOK_SECRET');
      const strict = (Deno.env.get('PLAY_WEBHOOK_STRICT') ?? 'true').toLowerCase() === 'true';
      const deliveryId =
        req.headers.get('x-delivery-id') ??
        req.headers.get('x-play-delivery-id') ?? null;

      // Mirror receiver's diagnostics surface: capture sig_mode / sig_reason
      // for every passport-link verification attempt so 401s are debuggable.
      const writePassportMirror = async (
        sigMode: 'unsigned' | 'strict' | 'lenient' | 'misconfigured',
        sigReason: string | undefined,
        status: 'queued' | 'completed' | 'failed',
        responseSnap: unknown,
        errSnap?: string,
      ) => {
        try {
          await supabase.from('play_sync_attempts').insert({
            direction: 'inbound',
            action: 'passport-link',
            external_attempt_id: deliveryId,
            status,
            request: {
              headers: {
                x_play_signature_present: !!sigHeader,
                x_play_signature_prefix: sigHeader ? sigHeader.slice(0, 8) : null,
                x_play_signature_len: sigHeader.length,
                x_delivery_id: req.headers.get('x-delivery-id'),
                x_play_delivery_id: req.headers.get('x-play-delivery-id'),
                x_ecosystem_app: req.headers.get('x-ecosystem-app'),
                content_type: req.headers.get('content-type'),
              },
              raw_body_len: rawBody.length,
              raw_body_sha_prefix: (await hmacSha256Hex('diag', rawBody)).slice(0, 12),
              sig_mode: sigMode,
              sig_reason: sigReason,
            },
            response: responseSnap,
            error: errSnap,
          });
        } catch (e) {
          console.error('[credential-api] passport-link mirror insert failed', e);
        }
      };

      if (!webhookSecret) {
        await writePassportMirror('misconfigured', 'PLAY_WEBHOOK_SECRET not set', 'failed', { error: 'server_not_configured' });
        return new Response(JSON.stringify({ error: 'server_not_configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const expectedSig = await hmacSha256Hex(webhookSecret, rawBody);
      // Diagnostic: also compute with trimmed secret to detect whitespace drift,
      // and a plain SHA-256 of raw bytes so sender can confirm byte-equality.
      const expectedSigTrim = await hmacSha256Hex(webhookSecret.trim(), rawBody);
      const rawBodySha = Array.from(new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawBody))
      )).map(b => b.toString(16).padStart(2, '0')).join('');
      const sigOk = sigHeader.length > 0 && (
        timingSafeEqualHex(sigHeader.toLowerCase(), expectedSig) ||
        timingSafeEqualHex(sigHeader.toLowerCase(), expectedSigTrim)
      );
      const sigMode: 'strict' | 'lenient' | 'unsigned' = !sigHeader
        ? 'unsigned'
        : (strict ? 'strict' : 'lenient');
      const sigReason = sigOk
        ? undefined
        : (!sigHeader
            ? 'missing x-play-signature header'
            : `signature mismatch — provided=${sigHeader.slice(0, 8)}… expected=${expectedSig.slice(0, 8)}… expected_trim=${expectedSigTrim.slice(0, 8)}… body_sha=${rawBodySha.slice(0, 12)}… body_len=${rawBody.length} secret_len=${webhookSecret.length}`);

      console.log('[credential-api] passport-link sig check', {
        sig_mode: sigMode,
        sig_ok: sigOk,
        sig_reason: sigReason,
        delivery_id: deliveryId,
        body_len: rawBody.length,
        body_sha: rawBodySha,
        body_preview: rawBody,
      });

      if (!sigOk && (strict || !sigHeader)) {
        await writePassportMirror(sigMode, sigReason, 'failed', { error: 'invalid_signature', sig_mode: sigMode, sig_reason: sigReason });
        return new Response(JSON.stringify({
          error: 'invalid_signature',
          sig_mode: sigMode,
          sig_reason: sigReason,
        }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await writePassportMirror(sigMode, sigReason, 'queued', { sig_mode: sigMode, accepted: true });

      let parsed: any;
      try { parsed = JSON.parse(rawBody); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const externalUserId: string | undefined = parsed?.external_user_id;
      const intent: string = parsed?.intent ?? 'view_passport';
      const ttl = Math.min(Math.max(Number(parsed?.ttl_seconds ?? 300) || 300, 60), 900);
      if (!externalUserId || typeof externalUserId !== 'string') {
        return new Response(JSON.stringify({ error: 'missing_external_user_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: identity } = await supabase
        .from('play_identity')
        .select('user_id')
        .eq('external_user_id', externalUserId)
        .maybeSingle();

      if (!identity) {
        return new Response(JSON.stringify({ error: 'user_not_linked' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = newToken();
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      const { error: insErr } = await supabase
        .from('passport_link_tokens')
        .insert({
          token,
          user_id: identity.user_id,
          external_user_id: externalUserId,
          intent,
          issued_to_app: 'play.fgn.gg',
          expires_at: expiresAt,
        });
      if (insErr) {
        return new Response(JSON.stringify({ error: 'token_persist_failed' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const origin = appOriginFromReq(req);
      return new Response(JSON.stringify({
        url: `${origin}/passport/link?token=${token}`,
        expires_at: expiresAt,
        user_resolved: true,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ------------------------------------------
    // POST /passport-link/consume  (called by /passport/link landing page; single-use)
    // Body: { token }
    // ------------------------------------------
    if (req.method === 'POST' && path[0] === 'passport-link' && path[1] === 'consume') {
      let parsed: any;
      try { parsed = await req.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const token: string | undefined = parsed?.token;
      if (!token) {
        return new Response(JSON.stringify({ error: 'missing_token' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: row } = await supabase
        .from('passport_link_tokens')
        .select('user_id, expires_at, consumed_at, intent')
        .eq('token', token)
        .maybeSingle();

      if (!row) {
        return new Response(JSON.stringify({ error: 'token_not_found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (row.consumed_at) {
        return new Response(JSON.stringify({ error: 'token_already_used' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: 'token_expired' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from('passport_link_tokens')
        .update({ consumed_at: new Date().toISOString() })
        .eq('token', token);

      const { data: passport } = await supabase
        .from('skill_passport')
        .select('public_url_slug, is_public')
        .eq('user_id', row.user_id)
        .maybeSingle();

      return new Response(JSON.stringify({
        user_id: row.user_id,
        intent: row.intent,
        passport_slug: passport?.public_url_slug ?? null,
        is_public: passport?.is_public ?? false,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // GET /passport/:slug
    if (req.method === 'GET' && path[0] === 'passport' && path[1]) {
      const slug = path[1];
      
      const { data: passport, error: passportError } = await supabase
        .from('skill_passport')
        .select('id, user_id, is_public, public_url_slug')
        .eq('public_url_slug', slug)
        .eq('is_public', true)
        .single();

      if (passportError || !passport) {
        return new Response(
          JSON.stringify({ error: 'Passport not found or not public' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const gameFilter = url.searchParams.get('game');
      
      let credentialsQuery = supabase
        .from('skill_credentials')
        .select(`id, title, credential_type, issued_at, expires_at, score, issuer, skills_verified, game_title, credential_type_key, verification_hash`)
        .eq('passport_id', passport.id);

      if (gameFilter) {
        credentialsQuery = credentialsQuery.eq('game_title', gameFilter);
      }

      const { data: credentials, error: credError } = await credentialsQuery;
      if (credError) throw credError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url, employability_score')
        .eq('id', passport.user_id)
        .single();

      return new Response(
        JSON.stringify({ passport: { slug: passport.public_url_slug, user: profile }, credentials: credentials || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /credentials/verify
    if (req.method === 'POST' && path[0] === 'credentials' && path[1] === 'verify') {
      const body: VerifyRequest = await req.json();
      
      if (!body.verification_hash) {
        return new Response(
          JSON.stringify({ error: 'verification_hash is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: credential, error } = await supabase
        .from('skill_credentials')
        .select(`id, title, credential_type, issued_at, expires_at, score, issuer, skills_verified, game_title, passport_id`)
        .eq('verification_hash', body.verification_hash)
        .single();

      if (error || !credential) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Credential not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isExpired = credential.expires_at && new Date(credential.expires_at) < new Date();

      const { data: passport } = await supabase
        .from('skill_passport')
        .select('user_id')
        .eq('id', credential.passport_id)
        .single();

      let username = null;
      if (passport) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', passport.user_id)
          .single();
        username = profile?.username;
      }

      return new Response(
        JSON.stringify({ valid: !isExpired, expired: isExpired, credential: { ...credential, holder_username: username } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /catalog/credential-types
    if (req.method === 'GET' && path[0] === 'catalog' && path[1] === 'credential-types') {
      const gameFilter = url.searchParams.get('game');
      
      let query = supabase.from('credential_types').select('*').eq('is_active', true).order('sort_order');
      if (gameFilter) query = query.eq('game_title', gameFilter);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ credential_types: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /career-paths
    if (req.method === 'GET' && path[0] === 'career-paths' && !(path[2] === 'readiness')) {
      const specificPath = path[1];
      const userId = url.searchParams.get('user_id');
      const passportSlug = url.searchParams.get('passport_slug');

      let reqQuery = supabase.from('career_path_requirements').select('*').order('career_path_id').order('sort_order');
      if (specificPath) reqQuery = reqQuery.eq('career_path_id', specificPath);

      const { data: requirements, error: reqError } = await reqQuery;
      if (reqError) throw reqError;

      const pathMap: Record<string, { career_path_id: string; requirements: typeof requirements; readiness?: any }> = {};
      for (const r of requirements || []) {
        if (!pathMap[r.career_path_id]) pathMap[r.career_path_id] = { career_path_id: r.career_path_id, requirements: [] };
        pathMap[r.career_path_id].requirements.push(r);
      }

      let resolvedUserId = userId;
      if (!resolvedUserId && passportSlug) {
        const { data: passport } = await supabase.from('skill_passport').select('user_id').eq('public_url_slug', passportSlug).eq('is_public', true).single();
        resolvedUserId = passport?.user_id ?? null;
      }

      if (resolvedUserId) {
        const { data: readiness, error: readErr } = await supabase.rpc('calculate_readiness', { p_user_id: resolvedUserId, p_career_path_id: specificPath || null });
        if (!readErr && readiness) {
          for (const row of readiness) {
            if (pathMap[row.career_path_id]) {
              pathMap[row.career_path_id].readiness = { matched_count: Number(row.matched_count), total_count: Number(row.total_count), readiness_pct: Number(row.readiness_pct), matched_labels: row.matched_labels || [] };
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ career_paths: Object.values(pathMap), user_id: resolvedUserId || null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /career-paths/:id/readiness/:user_id
    if (req.method === 'GET' && path[0] === 'career-paths' && path[2] === 'readiness' && path[3]) {
      const careerPathId = path[1];
      const targetUserId = path[3];

      const { data: readiness, error: readErr } = await supabase.rpc('calculate_readiness', { p_user_id: targetUserId, p_career_path_id: careerPathId });
      if (readErr) throw readErr;

      const result = readiness?.[0];
      return new Response(
        JSON.stringify({
          career_path_id: careerPathId, user_id: targetUserId,
          readiness: result ? { matched_count: Number(result.matched_count), total_count: Number(result.total_count), readiness_pct: Number(result.readiness_pct), matched_labels: result.matched_labels || [] } : { matched_count: 0, total_count: 0, readiness_pct: 0, matched_labels: [] },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // AUTHENTICATED ENDPOINTS (user JWT required)
    // ==========================================
    
    const authHeader = req.headers.get('Authorization');
    const appKey = req.headers.get('X-App-Key');

    // GET /credentials/mine
    if (req.method === 'GET' && path[0] === 'credentials' && path[1] === 'mine') {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authorization required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const gameFilter = url.searchParams.get('game');
      const { data: passport } = await supabase.from('skill_passport').select('id').eq('user_id', user.id).single();
      if (!passport) {
        return new Response(JSON.stringify({ credentials: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let credQuery = supabase.from('skill_credentials').select('*').eq('passport_id', passport.id);
      if (gameFilter) credQuery = credQuery.eq('game_title', gameFilter);

      const { data: credentials, error } = await credQuery;
      if (error) throw error;

      return new Response(JSON.stringify({ credentials: credentials || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ==========================================
    // AUTHORIZED APP ENDPOINTS (API key required)
    // ==========================================

    if (appKey) {
      const { data: appAuth, error: appError } = await supabase.rpc('verify_app_api_key', { p_api_key: appKey });

      if (appError || !appAuth || appAuth.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const app = appAuth[0];

      // GET /credentials/search - Search/filter credentials with pagination
      if (req.method === 'GET' && path[0] === 'credentials' && path[1] === 'search') {
        if (!app.can_read) {
          return new Response(JSON.stringify({ error: 'App does not have read permission' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const gameTitle = url.searchParams.get('game_title');
        const credType = url.searchParams.get('type');
        const issuedAfter = url.searchParams.get('issued_after');
        const issuedBefore = url.searchParams.get('issued_before');
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
        const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '50')));
        const offset = (page - 1) * pageSize;

        let query = supabase
          .from('skill_credentials')
          .select(`
            id, title, credential_type, credential_type_key, issued_at, expires_at,
            score, issuer, issuer_app_slug, skills_verified, game_title,
            verification_hash, external_reference_id,
            skill_passport!inner(user_id, public_url_slug, is_public)
          `, { count: 'exact' });

        if (gameTitle) query = query.eq('game_title', gameTitle);
        if (credType) query = query.eq('credential_type_key', credType);
        if (issuedAfter) query = query.gte('issued_at', issuedAfter);
        if (issuedBefore) query = query.lte('issued_at', issuedBefore);

        query = query.order('issued_at', { ascending: false }).range(offset, offset + pageSize - 1);

        const { data: credentials, error: credErr, count } = await query;
        if (credErr) throw credErr;

        // Collect user IDs for profile enrichment
        const userIds = [...new Set((credentials || []).map((c: any) => c.skill_passport?.user_id).filter(Boolean))];
        let profileMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
          for (const p of profiles || []) profileMap[p.id] = p;
        }

        const results = (credentials || []).map((c: any) => {
          const userId = c.skill_passport?.user_id;
          const profile = profileMap[userId];
          const { skill_passport, ...cred } = c;
          return {
            ...cred,
            user: profile ? { id: userId, username: profile.username, avatar_url: profile.avatar_url } : { id: userId },
          };
        });

        return new Response(
          JSON.stringify({
            credentials: results,
            pagination: { page, page_size: pageSize, total: count || 0, total_pages: Math.ceil((count || 0) / pageSize) },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GET /credentials/user/:email
      if (req.method === 'GET' && path[0] === 'credentials' && path[1] === 'user' && path[2]) {
        if (!app.can_read) {
          return new Response(JSON.stringify({ error: 'App does not have read permission' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const email = decodeURIComponent(path[2]);
        const gameFilter = url.searchParams.get('game');

        const { data: profile } = await supabase.from('profiles').select('id').eq('username', email).maybeSingle();
        if (!profile) {
          return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: passport } = await supabase.from('skill_passport').select('id').eq('user_id', profile.id).single();
        if (!passport) {
          return new Response(JSON.stringify({ credentials: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        let credQuery = supabase.from('skill_credentials').select('*').eq('passport_id', passport.id);
        if (gameFilter) credQuery = credQuery.eq('game_title', gameFilter);

        const { data: credentials, error } = await credQuery;
        if (error) throw error;

        const { data: profileInfo } = await supabase.from('profiles').select('username, avatar_url').eq('id', profile.id).single();

        return new Response(
          JSON.stringify({ user: profileInfo, credentials: credentials || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST /credentials/issue
      if (req.method === 'POST' && path[0] === 'credentials' && path[1] === 'issue') {
        if (!app.can_issue) {
          return new Response(JSON.stringify({ error: 'App does not have issue permission' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const body: CredentialIssueRequest = await req.json();

        if (!app.types_allowed.includes(body.credential_type_key)) {
          return new Response(JSON.stringify({ error: `App cannot issue credential type: ${body.credential_type_key}` }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: credTypeData, error: typeError } = await supabase.from('credential_types').select('*').eq('type_key', body.credential_type_key).single();
        if (typeError || !credTypeData) {
          return new Response(JSON.stringify({ error: 'Invalid credential type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: userProfile } = await supabase.from('profiles').select('id').eq('username', body.user_email).maybeSingle();
        if (!userProfile) {
          return new Response(JSON.stringify({ error: 'User not found. User must be registered in FGN.Academy first.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const targetUserId = userProfile.id;

        let { data: passport } = await supabase.from('skill_passport').select('id').eq('user_id', targetUserId).single();
        if (!passport) {
          const passportHash = crypto.randomUUID();
          const { data: newPassport, error: createError } = await supabase
            .from('skill_passport')
            .insert({ user_id: targetUserId, passport_hash: passportHash, is_public: false })
            .select('id')
            .single();
          if (createError) throw createError;
          passport = newPassport;
        }

        const payload = JSON.stringify({ type: body.credential_type_key, user: targetUserId, issued: new Date().toISOString(), score: body.score, random: crypto.randomUUID() });
        const encoder = new TextEncoder();
        const data = encoder.encode(payload);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const verificationHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const { data: credential, error: credError } = await supabase
          .from('skill_credentials')
          .insert({
            passport_id: passport!.id,
            title: credTypeData.display_name,
            credential_type: credTypeData.id ? 'skill_verification' : 'certification',
            issuer: app.app_slug,
            issuer_app_slug: app.app_slug,
            game_title: credTypeData.game_title,
            credential_type_key: body.credential_type_key,
            score: body.score,
            skills_verified: body.skills_verified || credTypeData.skills_granted,
            external_reference_id: body.external_reference_id,
            verification_hash: verificationHash,
          })
          .select()
          .single();

        if (credError) throw credError;

        // Fire webhook asynchronously
        dispatchWebhook(supabase, 'credential.issued', {
          credential_id: credential.id,
          user_id: targetUserId,
          credential_type_key: body.credential_type_key,
          game_title: credTypeData.game_title,
          score: body.score,
          issued_at: credential.issued_at,
        }).catch(err => console.error('Webhook dispatch error:', err));

        return new Response(
          JSON.stringify({ success: true, credential, verification_url: `${supabaseUrl}/functions/v1/credential-api/credentials/verify` }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ==========================================
      // WEBHOOK MANAGEMENT ENDPOINTS
      // ==========================================

      // POST /webhooks - Register a webhook
      if (req.method === 'POST' && path[0] === 'webhooks') {
        const body: WebhookRegisterRequest = await req.json();

        if (!body.webhook_url || !body.events?.length) {
          return new Response(JSON.stringify({ error: 'webhook_url and events[] are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Validate URL
        try { new URL(body.webhook_url); } catch {
          return new Response(JSON.stringify({ error: 'Invalid webhook_url' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Validate events
        const invalidEvents = body.events.filter(e => !VALID_WEBHOOK_EVENTS.includes(e));
        if (invalidEvents.length > 0) {
          return new Response(
            JSON.stringify({ error: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${VALID_WEBHOOK_EVENTS.join(', ')}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const secret = body.secret || generateWebhookSecret();

        const { data: sub, error: subErr } = await supabase
          .from('webhook_subscriptions')
          .upsert({
            app_slug: app.app_slug,
            webhook_url: body.webhook_url,
            secret,
            events: body.events,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'app_slug,webhook_url' })
          .select('id, app_slug, webhook_url, events, is_active, created_at')
          .single();

        if (subErr) throw subErr;

        return new Response(
          JSON.stringify({ webhook: sub, secret, note: 'Store this secret securely. It will be used to sign webhook payloads via HMAC-SHA256 in the X-Webhook-Signature header.' }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GET /webhooks - List webhooks for this app
      if (req.method === 'GET' && path[0] === 'webhooks' && !path[1]) {
        const { data: subs, error: subErr } = await supabase
          .from('webhook_subscriptions')
          .select('id, app_slug, webhook_url, events, is_active, created_at, updated_at')
          .eq('app_slug', app.app_slug)
          .order('created_at', { ascending: false });

        if (subErr) throw subErr;

        return new Response(
          JSON.stringify({ webhooks: subs || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // DELETE /webhooks/:id - Delete a webhook
      if (req.method === 'DELETE' && path[0] === 'webhooks' && path[1]) {
        const webhookId = path[1];

        const { error: delErr } = await supabase
          .from('webhook_subscriptions')
          .delete()
          .eq('id', webhookId)
          .eq('app_slug', app.app_slug);

        if (delErr) throw delErr;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GET /webhooks/:id/deliveries - View delivery log
      if (req.method === 'GET' && path[0] === 'webhooks' && path[2] === 'deliveries') {
        const webhookId = path[1];
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
        const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20')));

        // Verify ownership
        const { data: sub } = await supabase.from('webhook_subscriptions').select('id').eq('id', webhookId).eq('app_slug', app.app_slug).single();
        if (!sub) {
          return new Response(JSON.stringify({ error: 'Webhook not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: logs, error: logErr, count } = await supabase
          .from('webhook_delivery_log')
          .select('*', { count: 'exact' })
          .eq('subscription_id', webhookId)
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (logErr) throw logErr;

        return new Response(
          JSON.stringify({ deliveries: logs || [], pagination: { page, page_size: pageSize, total: count || 0 } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // No matching route
    return new Response(
      JSON.stringify({ error: 'Not found', available_endpoints: [
        'GET /passport/:slug', 'POST /credentials/verify', 'GET /catalog/credential-types',
        'GET /career-paths', 'GET /career-paths/:id/readiness/:user_id',
        'GET /credentials/mine (JWT)', 'GET /credentials/search (API key)',
        'GET /credentials/user/:email (API key)', 'POST /credentials/issue (API key)',
        'POST /webhooks (API key)', 'GET /webhooks (API key)', 'DELETE /webhooks/:id (API key)',
        'GET /webhooks/:id/deliveries (API key)',
      ] }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Credential API error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ==========================================
// WEBHOOK DISPATCH HELPER
// ==========================================

async function dispatchWebhook(supabase: any, eventType: string, payload: Record<string, any>) {
  // Find all active subscriptions for this event type
  const { data: subs, error } = await supabase
    .from('webhook_subscriptions')
    .select('id, webhook_url, secret')
    .filter('events', 'cs', `{${eventType}}`)
    .eq('is_active', true);

  if (error || !subs?.length) return;

  const body = JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), data: payload });

  for (const sub of subs) {
    try {
      // HMAC-SHA256 signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', encoder.encode(sub.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

      const resp = await fetch(sub.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Event': eventType },
        body,
      });

      await supabase.from('webhook_delivery_log').insert({
        subscription_id: sub.id,
        event_type: eventType,
        payload,
        status_code: resp.status,
        response_body: (await resp.text()).substring(0, 1000),
        delivered_at: new Date().toISOString(),
      });
    } catch (err) {
      await supabase.from('webhook_delivery_log').insert({
        subscription_id: sub.id,
        event_type: eventType,
        payload,
        status_code: 0,
        response_body: err instanceof Error ? err.message : 'Delivery failed',
      });
    }
  }
}
