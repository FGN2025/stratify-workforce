// Admin tool: replay a previously-failed play_sync_attempts row by re-POSTing
// the original payload back through play-webhook-receiver.
//
// Auth: requires the caller to be an authenticated admin / super_admin.
// Strategy:
//   1. Look up the attempt row, pull request.payload (the original webhook body).
//   2. Delete the prior attempt so the receiver's idempotency check doesn't short-circuit.
//   3. Sign the body with PLAY_WEBHOOK_SECRET (if set) and POST to play-webhook-receiver.
//   4. Return the receiver's response so the admin UI can show success/failure.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // AuthN/AuthZ: require admin caller
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id);
  const isAdmin = (roles ?? []).some((r) => r.role === 'admin' || r.role === 'super_admin');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { attempt_id?: string; attempt_ids?: string[] };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const ids = body.attempt_ids ?? (body.attempt_id ? [body.attempt_id] : []);
  if (ids.length === 0) {
    return new Response(JSON.stringify({ error: 'attempt_id or attempt_ids required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const secret = Deno.env.get('PLAY_WEBHOOK_SECRET');
  const results: Array<Record<string, unknown>> = [];

  for (const attemptId of ids) {
    const { data: attempt, error: fetchErr } = await supabase
      .from('play_sync_attempts')
      .select('id, action, request, external_attempt_id')
      .eq('id', attemptId)
      .maybeSingle();
    if (fetchErr || !attempt) {
      results.push({ attempt_id: attemptId, ok: false, error: 'not found' });
      continue;
    }
    const request = attempt.request as Record<string, unknown> | null;
    const originalPayload = (request?.payload as Record<string, unknown> | undefined) ?? request;
    if (!originalPayload) {
      results.push({ attempt_id: attemptId, ok: false, error: 'no payload stored' });
      continue;
    }

    // Drop the prior row to bypass receiver idempotency on delivery_id.
    await supabase.from('play_sync_attempts').delete().eq('id', attemptId);

    const rawBody = JSON.stringify(originalPayload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Ecosystem-App': 'play-webhook',
      'X-Replay-By': userData.user.id,
    };
    if (secret) headers['X-Play-Signature'] = await hmacHex(secret, rawBody);

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/play-webhook-receiver`, {
        method: 'POST',
        headers,
        body: rawBody,
      });
      const respBody = await resp.json().catch(() => null);
      results.push({
        attempt_id: attemptId,
        ok: resp.ok,
        status: resp.status,
        response: respBody,
      });
    } catch (err) {
      results.push({ attempt_id: attemptId, ok: false, error: String(err) });
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
