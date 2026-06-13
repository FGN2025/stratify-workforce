// score-simulation edge function
// Phase C: scores a simulation play, writes simulation_runs, calls
// sync-challenge-completion. Mirrors scoreRun()/gradeFor() from the
// reference: sequence is RELATIVE-ORDER scoring; loadout is correct-set
// scoring; criticals → stand_down + percent 0.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SequenceSelection {
  item_id: string;
  position: number;
}
type Selection = string | SequenceSelection;

interface SimItem {
  id: string;
  item_key: string;
  name: string;
  correct: boolean;
  critical: boolean;
  seq: number | null;
  why: string | null;
}

interface Simulation {
  id: string;
  work_order_id: string;
  wo_code: string;
  title: string;
  sim_type: 'sequence' | 'loadout';
  config: { critFailGrade?: string; critFailLine?: string } | null;
  fgn_origin_challenge_id?: string | null;
}

function gradeFor(percent: number, max: number, standDown: boolean, critGrade?: string): string {
  if (standDown) return critGrade || 'STAND DOWN';
  if (percent >= max - 20) return 'JOB READY';
  if (percent >= max - 60) return 'ALMOST CREW-READY';
  if (percent >= max - 110) return 'GREEN APPRENTICE';
  return 'BACK TO THE YARD';
}

interface ScoreResult {
  raw: number;
  max: number;
  percent: number;
  stand_down: boolean;
  grade: string;
  criticalHits: string[];
  perItem: Array<{ item_id: string; item_key: string; name: string; included: boolean; correct_choice: boolean; required: boolean; in_order: boolean | null; why: string | null }>;
}

function scoreLoadout(items: SimItem[], selectedIds: string[]): ScoreResult {
  const max = items.filter((i) => i.correct).length * 10;
  const selectedSet = new Set(selectedIds);
  const criticalHits: string[] = [];
  let raw = 0;

  for (const it of items) {
    const included = selectedSet.has(it.id);
    if (!included) continue;
    if (it.critical) criticalHits.push(it.id);
    if (it.correct) raw += 10;
    else raw -= 10;
  }

  const standDown = criticalHits.length > 0;
  if (standDown) raw -= 25;

  const percent = standDown ? 0 : Math.max(0, Math.round((raw / Math.max(max, 1)) * 100));

  const perItem = items.map((it) => ({
    item_id: it.id,
    item_key: it.item_key,
    name: it.name,
    included: selectedSet.has(it.id),
    correct_choice: it.correct,
    required: it.correct,
    in_order: null,
    why: it.why,
  }));

  return { raw, max, percent, stand_down: standDown, grade: '', criticalHits, perItem };
}

/**
 * Sequence scoring — relative-order, prerequisite-based.
 * Spec:
 *  +10 per required step in correct relative order to other included required steps
 *  -10 required step out of relative order
 *  -10 included non-required item
 *  -5  skipped required step
 *  -25 + stand_down for any critical included
 */
function scoreSequence(items: SimItem[], ordered: SequenceSelection[]): ScoreResult {
  const requiredItems = items.filter((i) => i.correct && i.seq !== null);
  const max = requiredItems.length * 10;

  const includedIds = ordered.map((o) => o.item_id);
  const includedSet = new Set(includedIds);

  const criticalHits: string[] = [];
  for (const it of items) {
    if (it.critical && includedSet.has(it.id)) criticalHits.push(it.id);
  }
  const standDown = criticalHits.length > 0;

  // Build the relative-order check: among INCLUDED required items, the
  // user's order (by position) must match the canonical order (by seq).
  const includedRequired = ordered
    .map((o, idx) => {
      const item = items.find((i) => i.id === o.item_id);
      if (!item || !item.correct || item.seq === null) return null;
      return { item_id: o.item_id, user_pos: idx, canonical_seq: item.seq };
    })
    .filter((x): x is { item_id: string; user_pos: number; canonical_seq: number } => x !== null);

  // For each included required item, it's "in correct relative order" if
  // for every OTHER included required item, the relative comparison of
  // user_pos matches the relative comparison of canonical_seq.
  const inOrderMap = new Map<string, boolean>();
  for (const a of includedRequired) {
    let ok = true;
    for (const b of includedRequired) {
      if (a.item_id === b.item_id) continue;
      const userBeforeB = a.user_pos < b.user_pos;
      const canonicalBeforeB = a.canonical_seq < b.canonical_seq;
      if (userBeforeB !== canonicalBeforeB) { ok = false; break; }
    }
    inOrderMap.set(a.item_id, ok);
  }

  let raw = 0;
  const includedRequiredIds = new Set(includedRequired.map((r) => r.item_id));

  for (const r of includedRequired) {
    if (inOrderMap.get(r.item_id)) raw += 10;
    else raw -= 10;
  }
  // skipped required
  for (const it of requiredItems) {
    if (!includedRequiredIds.has(it.id) && !includedSet.has(it.id)) raw -= 5;
    else if (!includedRequiredIds.has(it.id) && includedSet.has(it.id) && !it.correct) {
      // shouldn't happen — required items are correct=true
    }
  }
  // included non-required (distractors)
  for (const id of includedIds) {
    const it = items.find((i) => i.id === id);
    if (it && !it.correct) raw -= 10;
  }
  if (standDown) raw -= 25;

  const percent = standDown ? 0 : Math.max(0, Math.round((raw / Math.max(max, 1)) * 100));

  const perItem = items.map((it) => ({
    item_id: it.id,
    item_key: it.item_key,
    name: it.name,
    included: includedSet.has(it.id),
    correct_choice: it.correct,
    required: it.correct && it.seq !== null,
    in_order: inOrderMap.has(it.id) ? inOrderMap.get(it.id)! : null,
    why: it.why,
  }));

  return { raw, max, percent, stand_down: standDown, grade: '', criticalHits, perItem };
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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // 1. JWT validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string | undefined) || '';

    // 2. Parse + validate
    const body = (await req.json()) as {
      simulation_id?: string;
      selections?: Selection[];
    };
    if (!body.simulation_id || !Array.isArray(body.selections)) {
      return new Response(JSON.stringify({ error: 'simulation_id and selections[] required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Service-role load sim + items + work_order challenge id
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: simRow, error: simErr } = await admin
      .from('simulations')
      .select('id, work_order_id, wo_code, title, sim_type, config, work_orders!inner(fgn_origin_challenge_id, source_challenge_id)')
      .eq('id', body.simulation_id)
      .maybeSingle();
    if (simErr || !simRow) {
      return new Response(JSON.stringify({ error: 'Simulation not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // deno-lint-ignore no-explicit-any
    const wo = (simRow as any).work_orders;
    const sim: Simulation = {
      id: simRow.id,
      work_order_id: simRow.work_order_id,
      wo_code: simRow.wo_code,
      title: simRow.title,
      sim_type: simRow.sim_type as 'sequence' | 'loadout',
      config: simRow.config as Simulation['config'],
      fgn_origin_challenge_id: wo?.fgn_origin_challenge_id ?? wo?.source_challenge_id ?? null,
    };

    const { data: itemsRaw, error: itemsErr } = await admin
      .from('simulation_items')
      .select('id, item_key, name, correct, critical, seq, why')
      .eq('simulation_id', sim.id);
    if (itemsErr || !itemsRaw) throw itemsErr || new Error('items load failed');
    const items = itemsRaw as SimItem[];

    // 4. Score
    let result: ScoreResult;
    if (sim.sim_type === 'sequence') {
      // Accept either string[] (positional) or {item_id, position}[] (explicit)
      const ordered: SequenceSelection[] = body.selections.map((s, idx) => {
        if (typeof s === 'string') return { item_id: s, position: idx };
        return { item_id: s.item_id, position: s.position ?? idx };
      }).sort((a, b) => a.position - b.position);
      result = scoreSequence(items, ordered);
    } else {
      const ids = body.selections.map((s) => (typeof s === 'string' ? s : s.item_id));
      result = scoreLoadout(items, ids);
    }
    result.grade = gradeFor(result.percent, result.max, result.stand_down, sim.config?.critFailGrade);

    const critFailLine = sim.config?.critFailLine || null;

    // 5. Insert simulation_runs (service role bypasses RLS by design)
    const { data: runRow, error: runErr } = await admin
      .from('simulation_runs')
      .insert({
        user_id: userId,
        simulation_id: sim.id,
        work_order_id: sim.work_order_id,
        archetype: sim.sim_type,
        raw: result.raw,
        max: result.max,
        percent: result.percent,
        grade: result.grade,
        stand_down: result.stand_down,
        item_selections: body.selections,
        critical_hits: result.criticalHits,
        debrief: {
          per_item: result.perItem,
          critFailLine: result.stand_down ? critFailLine : null,
        },
      })
      .select('*')
      .single();
    if (runErr) throw runErr;

    // 6. Call sync-challenge-completion (ecosystem key path)
    let syncResponse: unknown = null;
    if (sim.fgn_origin_challenge_id && userEmail) {
      const ecosystemKey = Deno.env.get('ECOSYSTEM_API_KEY');
      if (ecosystemKey) {
        try {
          const syncResp = await fetch(`${supabaseUrl}/functions/v1/sync-challenge-completion`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Ecosystem-Key': ecosystemKey,
              'apikey': anonKey,
              'x-play-path': 'simulation',
            },
            body: JSON.stringify({
              user_email: userEmail,
              challenge_id: sim.fgn_origin_challenge_id,
              score: result.percent,
              completed_at: new Date().toISOString(),
              metadata: {
                source: 'score-simulation',
                simulation_id: sim.id,
                wo_code: sim.wo_code,
                stand_down: result.stand_down,
                run_id: runRow.id,
              },
            }),
          });
          syncResponse = await syncResp.json().catch(() => ({ status: syncResp.status }));
        } catch (e) {
          console.error('[score-simulation] sync call failed', e);
          syncResponse = { error: e instanceof Error ? e.message : 'sync failed' };
        }
      } else {
        console.warn('[score-simulation] ECOSYSTEM_API_KEY missing — skipping sync');
      }
    }

    return new Response(
      JSON.stringify({
        attempt: { user_id: userId, simulation_id: sim.id, archetype: sim.sim_type },
        record: runRow,
        debrief: {
          grade: result.grade,
          percent: result.percent,
          raw: result.raw,
          max: result.max,
          stand_down: result.stand_down,
          critFailLine: result.stand_down ? critFailLine : null,
          per_item: result.perItem,
        },
        sync: syncResponse,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[score-simulation] error', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
