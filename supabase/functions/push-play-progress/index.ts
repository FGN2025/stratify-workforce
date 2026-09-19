import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_ATTEMPTS = 5;

async function hmacHex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  // --- Authorization: platform admin JWT, or service-role key (internal/cron) ---
  const authHeader = req.headers.get('Authorization') || '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '');
  let authorized = bearer === serviceKey;

  if (!authorized) {
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAdmin } = await asUser.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    authorized = true;
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* optional */ }
  const dryRun = body.dry_run === true;
  const limit = Math.min(Number(body.limit ?? 25) || 25, 100);
  const retryFailed = body.retry_failed === true;

  const ingestUrl = Deno.env.get('FGN_PLAY_INGEST_URL');
  const ecosystemKey = Deno.env.get('ECOSYSTEM_API_KEY');
  const webhookSecret = Deno.env.get('PLAY_WEBHOOK_SECRET');

  // Pull queued work
  const statuses = retryFailed ? ['pending', 'failed'] : ['pending'];
  const { data: queued, error: queueError } = await admin
    .from('play_outbound_queue')
    .select('*')
    .in('status', statuses)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (queueError) {
    return new Response(JSON.stringify({ error: 'Queue read failed', details: queueError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const pending = queued ?? [];

  if (!ingestUrl || !ecosystemKey) {
    return new Response(
      JSON.stringify({
        configured: false,
        reason: !ingestUrl
          ? 'FGN_PLAY_INGEST_URL is not configured — Play has not published a receiving endpoint yet.'
          : 'ECOSYSTEM_API_KEY is not configured.',
        pending_count: pending.length,
        sample: pending.slice(0, 3).map((r) => ({ id: r.id, event_type: r.event_type, payload: r.payload })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({
        configured: true,
        dry_run: true,
        target: ingestUrl,
        pending_count: pending.length,
        sample: pending.slice(0, 3).map((r) => ({ id: r.id, event_type: r.event_type, payload: r.payload })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let delivered = 0;
  let failed = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const row of pending) {
    const envelope = JSON.stringify({
      event: row.event_type,
      source: 'fgn-academy',
      delivery_id: row.id,
      timestamp: new Date().toISOString(),
      data: row.payload,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Ecosystem-Key': ecosystemKey,
      'X-Ecosystem-App': 'academy',
      'X-Delivery-Id': row.id,
      'X-Event-Type': row.event_type,
    };
    if (webhookSecret) {
      headers['X-Signature-256'] = `sha256=${await hmacHex(webhookSecret, envelope)}`;
    }

    let status = 0;
    let responseText = '';
    let errorMsg: string | null = null;

    try {
      const res = await fetch(ingestUrl, { method: 'POST', headers, body: envelope });
      status = res.status;
      responseText = (await res.text()).slice(0, 1000);
      if (!res.ok) errorMsg = `HTTP ${status}: ${responseText}`;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    const ok = !errorMsg;
    const attempts = (row.attempts ?? 0) + 1;

    await admin
      .from('play_outbound_queue')
      .update({
        status: ok ? 'delivered' : attempts >= MAX_ATTEMPTS ? 'dead' : 'failed',
        attempts,
        last_error: errorMsg,
        delivered_at: ok ? new Date().toISOString() : null,
      })
      .eq('id', row.id);

    await admin.from('play_sync_attempts').insert({
      direction: 'outbound',
      action: `outbound:${row.event_type}`,
      external_attempt_id: row.id,
      status: ok ? 'completed' : 'failed',
      request: { target: ingestUrl, event: row.event_type, payload: row.payload },
      response: { status, body: responseText.slice(0, 500) },
      error: errorMsg,
    });

    if (ok) delivered++; else failed++;
    results.push({ id: row.id, event_type: row.event_type, status, ok, error: errorMsg });
  }

  return new Response(
    JSON.stringify({ configured: true, target: ingestUrl, processed: pending.length, delivered, failed, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
