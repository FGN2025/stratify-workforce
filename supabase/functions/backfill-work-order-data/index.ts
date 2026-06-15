import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Platform-standard evidence defaults (matches the existing populated row)
const EVIDENCE_DEFAULTS = {
  required: true,
  min_uploads: 1,
  max_uploads: 5,
  allowed_types: ['image', 'video', 'document'],
  instructions: '',
  deadline_hours: null,
} as const;

type Challenge = Record<string, unknown> & {
  id: string;
  tasks?: Array<Record<string, unknown>>;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const playUrl = Deno.env.get('FGN_PLAY_SUPABASE_URL');
    const ecosystemKey = Deno.env.get('ECOSYSTEM_API_KEY');

    if (!playUrl || !ecosystemKey) {
      return json({ error: 'Play integration not configured' }, 500);
    }

    const admin = createClient(supabaseUrl, supabaseService);

    // Verify admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } =
      await createClient(supabaseUrl, supabaseAnon).auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    // Parse body
    let body: {
      mode?: 'tasks' | 'evidence';
      work_order_ids?: string[];
      dry_run?: boolean;
    } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const mode = body.mode;
    const dryRun = body.dry_run !== false; // default true
    const idsFilter = Array.isArray(body.work_order_ids) ? body.work_order_ids : null;

    if (mode !== 'tasks' && mode !== 'evidence') {
      return json({ error: "mode must be 'tasks' or 'evidence'" }, 400);
    }

    if (mode === 'tasks') {
      return await runTasksBackfill(admin, playUrl, ecosystemKey, idsFilter, dryRun);
    } else {
      return await runEvidenceBackfill(admin, idsFilter, dryRun);
    }
  } catch (e) {
    console.error('backfill-work-order-data error:', e);
    return json({ error: 'Internal server error', details: String(e) }, 500);
  }
});

// ---------------------------------------------------------------------------
// TASKS BACKFILL
// ---------------------------------------------------------------------------
async function runTasksBackfill(
  admin: ReturnType<typeof createClient>,
  playUrl: string,
  ecosystemKey: string,
  idsFilter: string[] | null,
  dryRun: boolean,
) {
  // Target: imported work orders missing work_order_tasks
  let q = admin
    .from('work_orders')
    .select('id, fgn_origin_challenge_id, title')
    .not('fgn_origin_challenge_id', 'is', null);
  if (idsFilter && idsFilter.length > 0) q = q.in('id', idsFilter);
  const { data: workOrders, error: woErr } = await q;
  if (woErr) return json({ error: 'Failed to load work orders', details: woErr.message }, 500);

  // Filter to those with zero existing tasks
  const { data: existingTaskRows } = await admin
    .from('work_order_tasks')
    .select('work_order_id');
  const hasTasks = new Set((existingTaskRows ?? []).map((r: { work_order_id: string }) => r.work_order_id));
  const targets = (workOrders ?? []).filter((wo) => !hasTasks.has(wo.id));

  // Single cached upstream fetch
  const challenges = await fetchAllChallenges(playUrl, ecosystemKey);
  const challengeById = new Map<string, Challenge>(challenges.map((c) => [String(c.id), c]));

  const rows: Array<Record<string, unknown>> = [];
  const summary = {
    targeted: targets.length,
    would_insert_rows: 0,
    inserted_rows: 0,
    skipped_upstream_empty: 0,
    not_found_on_play: 0,
    errors: 0,
  };

  for (const wo of targets) {
    const c = challengeById.get(String(wo.fgn_origin_challenge_id));
    if (!c) {
      summary.not_found_on_play++;
      rows.push({
        work_order_id: wo.id,
        title: wo.title,
        fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
        status: 'not-found-on-play',
        upstream_task_count: 0,
        tasks: [],
      });
      continue;
    }

    const upstreamTasks = Array.isArray(c.tasks) ? c.tasks : [];
    if (upstreamTasks.length === 0) {
      summary.skipped_upstream_empty++;
      rows.push({
        work_order_id: wo.id,
        title: wo.title,
        fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
        status: 'skipped-upstream-empty',
        upstream_task_count: 0,
        tasks: [],
      });
      continue;
    }

    const taskRows = upstreamTasks.map((t, idx) => {
      const tt = t as Record<string, unknown>;
      const order =
        typeof tt.display_order === 'number'
          ? tt.display_order
          : typeof tt.order_index === 'number'
            ? tt.order_index
            : idx;
      return {
        work_order_id: wo.id,
        title: String(tt.title ?? ''),
        description: tt.description ? String(tt.description) : null,
        order_index: order,
        source_task_id: tt.id ? String(tt.id) : null,
      };
    });

    if (dryRun) {
      summary.would_insert_rows += taskRows.length;
      rows.push({
        work_order_id: wo.id,
        title: wo.title,
        fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
        status: 'would-insert',
        upstream_task_count: upstreamTasks.length,
        tasks: taskRows,
      });
    } else {
      const { error: insErr } = await admin.from('work_order_tasks').insert(taskRows);
      if (insErr) {
        summary.errors++;
        rows.push({
          work_order_id: wo.id,
          title: wo.title,
          status: 'error',
          error: insErr.message,
        });
        continue;
      }
      summary.inserted_rows += taskRows.length;
      rows.push({
        work_order_id: wo.id,
        title: wo.title,
        fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
        status: 'inserted',
        upstream_task_count: upstreamTasks.length,
        tasks: taskRows,
      });
    }
  }

  return json({ mode: 'tasks', dry_run: dryRun, summary, rows }, 200);
}

// ---------------------------------------------------------------------------
// EVIDENCE BACKFILL (conditional: upstream requires_evidence && current null)
// ---------------------------------------------------------------------------
async function runEvidenceBackfill(
  admin: ReturnType<typeof createClient>,
  idsFilter: string[] | null,
  dryRun: boolean,
) {
  let q = admin
    .from('work_orders')
    .select('id, title, fgn_origin_challenge_id, metadata, evidence_requirements')
    .is('evidence_requirements', null)
    .not('fgn_origin_challenge_id', 'is', null);
  if (idsFilter && idsFilter.length > 0) q = q.in('id', idsFilter);

  const { data: workOrders, error: woErr } = await q;
  if (woErr) return json({ error: 'Failed to load work orders', details: woErr.message }, 500);

  const rows: Array<Record<string, unknown>> = [];
  const summary = {
    candidates_evidence_null: (workOrders ?? []).length,
    would_update: 0,
    updated: 0,
    skipped_upstream_not_required: 0,
    skipped_no_play_source: 0,
    errors: 0,
  };

  for (const wo of workOrders ?? []) {
    const ps = (wo.metadata as { play_source?: { requires_evidence?: boolean } } | null)?.play_source;
    if (!ps) {
      summary.skipped_no_play_source++;
      rows.push({
        work_order_id: wo.id,
        title: wo.title,
        status: 'skipped-no-play-source',
      });
      continue;
    }
    if (ps.requires_evidence !== true) {
      summary.skipped_upstream_not_required++;
      continue;
    }

    if (dryRun) {
      summary.would_update++;
      rows.push({
        work_order_id: wo.id,
        title: wo.title,
        fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
        status: 'would-update',
        evidence_requirements: EVIDENCE_DEFAULTS,
      });
    } else {
      const { error: upErr } = await admin
        .from('work_orders')
        .update({ evidence_requirements: EVIDENCE_DEFAULTS as unknown as object })
        .eq('id', wo.id);
      if (upErr) {
        summary.errors++;
        rows.push({
          work_order_id: wo.id,
          title: wo.title,
          status: 'error',
          error: upErr.message,
        });
        continue;
      }
      summary.updated++;
      rows.push({
        work_order_id: wo.id,
        title: wo.title,
        fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
        status: 'updated',
        evidence_requirements: EVIDENCE_DEFAULTS,
      });
    }
  }

  return json({ mode: 'evidence', dry_run: dryRun, summary, rows }, 200);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchAllChallenges(playUrl: string, key: string): Promise<Challenge[]> {
  const PAGE = 500;
  const all: Challenge[] = [];
  for (let page = 0; page < 50; page++) {
    const res = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ecosystem-Key': key,
        'X-Ecosystem-App': 'academy',
      },
      body: JSON.stringify({ action: 'challenges', limit: PAGE, page }),
    });
    if (!res.ok) throw new Error(`ecosystem-data-api challenges ${res.status}`);
    const data = await res.json();
    const batch: Challenge[] = data?.challenges ?? data?.data ?? [];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
