// gg-activity-probe
//
// Admin-only, read-only discovery probe against the live FGN.GG
// ecosystem-data-api. It does NOT assume any action or field names: it tries a
// set of candidate action shapes, records which ones respond, and reports the
// exact top-level keys and per-record field names that come back.
//
// Output of this function is the input to
// docs/api/integration-guides/gg-simulation-activity-contract.md.
//
// Nothing is written to the Academy database by this function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface ProbeResult {
  request: Record<string, unknown>;
  http_status: number | null;
  ok: boolean;
  top_level_keys?: string[];
  record_count?: number;
  record_keys?: string[];
  sample?: unknown;
  error?: string;
}

function keysOf(v: unknown): string[] {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? Object.keys(v as Record<string, unknown>)
    : [];
}

function firstArray(body: unknown): unknown[] | null {
  if (!body || typeof body !== 'object') return null;
  for (const v of Object.values(body as Record<string, unknown>)) {
    if (Array.isArray(v)) return v;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await createClient(supabaseUrl, supabaseAnon)
      .auth.getUser(token);
    if (authErr || !user) return json({ error: 'Invalid token' }, 401);

    const admin = createClient(supabaseUrl, supabaseService);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    const playUrl = Deno.env.get('FGN_PLAY_SUPABASE_URL');
    const ecosystemKey = Deno.env.get('ECOSYSTEM_API_KEY');
    if (!playUrl || !ecosystemKey) {
      return json({ error: 'Play integration not configured' }, 500);
    }

    let body: {
      actions?: unknown;
      activity_id?: unknown;
      challenge_id?: unknown;
      raw?: Record<string, unknown>;
    } = {};
    try { body = await req.json(); } catch { /* optional */ }

    // Raw passthrough: forward one request verbatim and return the full body.
    // Read-only; used to capture complete contract samples.
    if (body.raw && typeof body.raw === 'object') {
      const res = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ecosystem-Key': ecosystemKey,
          'X-Ecosystem-App': 'academy',
        },
        body: JSON.stringify(body.raw),
      });
      const text = await res.text();
      let parsed: unknown = null;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      return json({ request: body.raw, http_status: res.status, body: parsed }, 200);
    }

    async function probe(request: Record<string, unknown>): Promise<ProbeResult> {
      try {
        const res = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Ecosystem-Key': ecosystemKey!,
            'X-Ecosystem-App': 'academy',
          },
          body: JSON.stringify(request),
        });
        const text = await res.text();
        let parsed: unknown = null;
        try { parsed = JSON.parse(text); } catch { /* non-json */ }
        if (!res.ok) {
          return {
            request,
            http_status: res.status,
            ok: false,
            error: text.slice(0, 400),
            top_level_keys: keysOf(parsed),
          };
        }
        const arr = firstArray(parsed);
        const first = arr && arr.length > 0 ? arr[0] : null;
        return {
          request,
          http_status: res.status,
          ok: true,
          top_level_keys: keysOf(parsed),
          record_count: arr ? arr.length : undefined,
          record_keys: first ? keysOf(first) : keysOf(parsed),
          sample: first ?? parsed,
        };
      } catch (e) {
        return { request, http_status: null, ok: false, error: String(e) };
      }
    }

    // Candidate action names for the two new Simulation Activity lookups.
    const candidateActions: string[] = Array.isArray(body.actions) && body.actions.length > 0
      ? (body.actions as unknown[]).map(String)
      : [
          'simulation-activities',
          'simulation_activities',
          'simulation-activity',
          'simulation_activity',
          'activities',
          'activity',
          'canonical-activities',
          'golden-paths',
        ];

    const results: ProbeResult[] = [];

    // 1. Baseline: health + a single challenge page, to read the live challenge
    //    payload shape (does it now carry a canonical activity field?).
    results.push(await probe({ action: 'health' }));
    const challengeProbe = await probe({
      action: 'challenges', limit: 5, page: 0, include_inactive: true,
    });
    results.push(challengeProbe);

    // 2. Candidate list actions.
    for (const action of candidateActions) {
      results.push(await probe({ action, limit: 25, page: 0 }));
    }

    // 3. Single-activity lookup, if the caller supplied an id, or if we can
    //    lift one off a discovered list / challenge record.
    const discoveredActivityId =
      (typeof body.activity_id === 'string' ? body.activity_id : null) ??
      (() => {
        for (const r of results) {
          const s = r.sample as Record<string, unknown> | null;
          if (!s || typeof s !== 'object') continue;
          for (const k of ['simulation_activity_id', 'activity_id', 'id']) {
            const v = s[k];
            if (
              typeof v === 'string' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) &&
              (k !== 'id' || String(r.request.action).includes('activit'))
            ) return v;
          }
        }
        return null;
      })();

    if (discoveredActivityId) {
      for (const action of candidateActions) {
        results.push(await probe({ action, id: discoveredActivityId }));
        results.push(await probe({ action, simulation_activity_id: discoveredActivityId }));
      }
    }

    // 4. Challenge-side relationship: does a single challenge report the id?
    if (typeof body.challenge_id === 'string') {
      results.push(await probe({ action: 'challenges', ids: [body.challenge_id], include_inactive: true }));
      results.push(await probe({ action: 'challenge', id: body.challenge_id, include_inactive: true }));
    }

    const working = results.filter((r) => r.ok);
    return json({
      probed_at: new Date().toISOString(),
      discovered_activity_id: discoveredActivityId,
      working_actions: working.map((r) => ({
        action: r.request.action,
        request: r.request,
        record_count: r.record_count,
        record_keys: r.record_keys,
      })),
      results,
    });
  } catch (e) {
    console.error('gg-activity-probe error:', e);
    return json({ error: 'Internal server error', details: String(e) }, 500);
  }
});
