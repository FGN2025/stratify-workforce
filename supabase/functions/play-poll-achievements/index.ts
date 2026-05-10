// Phase E scaffolding — pull play.fgn.gg achievements via ecosystem-data-api.
//
// Status: STUB. Posts {action:'achievements', since:<cursor>} to play's
// ecosystem-data-api with X-Ecosystem-Key, advances play_poll_cursor, and
// records each batch in play_sync_attempts. Mapping each achievement to a
// skill_credentials row is left to the next pass once we see the real shape
// of play's achievements payload (open ask: confirm field names).
//
// Intended trigger: admin-initiated POST or pg_cron schedule. Requires admin
// JWT (verify_jwt is on by default for this function).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const POLL_ACTION = 'achievements';
const PAGE_LIMIT = 200;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const playUrl = Deno.env.get('FGN_PLAY_SUPABASE_URL');
  const ecosystemKey = Deno.env.get('ECOSYSTEM_API_KEY');

  if (!playUrl || !ecosystemKey) {
    return new Response(
      JSON.stringify({ error: 'FGN_PLAY_SUPABASE_URL or ECOSYSTEM_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Authn: require admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: claims.claims.sub,
    _role: 'admin',
  });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Read cursor
  const { data: cursorRow } = await supabase
    .from('play_poll_cursor')
    .select('since')
    .eq('action', POLL_ACTION)
    .maybeSingle();
  const since = cursorRow?.since ?? null;

  const target = `${playUrl.replace(/\/$/, '')}/functions/v1/ecosystem-data-api`;
  const resp = await fetch(target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ecosystem-Key': ecosystemKey,
      'X-Ecosystem-App': 'academy',
    },
    body: JSON.stringify({ action: POLL_ACTION, since, limit: PAGE_LIMIT }),
  });

  const body = await resp.json().catch(() => null);
  const ok = resp.status >= 200 && resp.status < 300;

  await supabase.from('play_sync_attempts').insert({
    direction: 'outbound',
    action: `poll:${POLL_ACTION}`,
    external_attempt_id: null,
    status: ok ? 'completed' : 'failed',
    request: { since, limit: PAGE_LIMIT },
    response: body,
    error: ok ? null : `HTTP ${resp.status}`,
  });

  if (!ok) {
    return new Response(
      JSON.stringify({ error: 'play poll failed', status: resp.status, body }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Advance cursor to now (conservative — refine once we see the real shape and
  // can use max(updated_at) from the returned items).
  const newSince = new Date().toISOString();
  await supabase
    .from('play_poll_cursor')
    .upsert(
      { action: POLL_ACTION, since: newSince, updated_at: newSince },
      { onConflict: 'action' },
    );

  // Reuse the webhook receiver's achievement handler so polled and pushed events
  // converge on the same write path.
  const { handleAchievementEarned } = await import('../play-webhook-receiver/index.ts');
  const items = Array.isArray((body as Record<string, unknown>)?.data)
    ? ((body as Record<string, unknown>).data as Record<string, unknown>[])
    : [];

  let credentialed = 0;
  let duplicates = 0;
  let unmapped = 0;
  const errors: string[] = [];
  for (const item of items) {
    const result = await handleAchievementEarned(supabase, { event: 'achievement.earned', data: item });
    const b = (result.body ?? {}) as Record<string, unknown>;
    if (b.duplicate) duplicates++;
    else if (b.credentialed === true) credentialed++;
    else if (b.reason === 'unmapped_identity') unmapped++;
    else if (result.status >= 400) errors.push(JSON.stringify(b));
  }

  return new Response(
    JSON.stringify({
      ok: true,
      received: items.length,
      credentialed,
      duplicates,
      unmapped,
      errors: errors.slice(0, 5),
      previous_since: since,
      new_since: newSince,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
