// reconcile-simulation-activities
//
// Admin-only. Reconciles Academy Work Orders against the canonical Simulation
// Activity identity published by FGN.GG.
//
// HARD RULES (Phase 1B):
//  - A reconciliation run NEVER writes to work_orders. It only writes proposals
//    into simulation_activity_reconciliation and refreshes the disposable
//    simulation_activity_cache.
//  - Identity is resolved deterministically through recorded source identifiers
//    only (fgn_origin_challenge_id / source_challenge_id -> GG challenge ->
//    challenge.simulation_activity_id). No title matching, no fuzzy matching,
//    no AI inference.
//  - Existing source identifiers are preserved as provenance and never removed.
//  - Academy-native work orders (no GG source) are a valid resolved state.
//  - Canonical ids are written onto work_orders only via the explicit `approve`
//    action below, one work order at a time, chosen by an admin.

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GGChallenge = Record<string, unknown> & { id?: string };
type GGActivity = Record<string, unknown> & { id?: string };

async function ggCall(
  playUrl: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ecosystem-Key': key,
      'X-Ecosystem-App': 'academy',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* non-json */ }
  return { ok: res.ok, status: res.status, body: parsed };
}

function pickArray(body: unknown, ...keys: string[]): unknown[] {
  if (!body || typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  for (const k of keys) if (Array.isArray(o[k])) return o[k] as unknown[];
  for (const v of Object.values(o)) if (Array.isArray(v)) return v;
  return [];
}

function activityIdOf(challenge: GGChallenge): string | null {
  const direct = challenge.simulation_activity_id;
  if (typeof direct === 'string' && UUID_RE.test(direct)) return direct;
  const embedded = challenge.simulation_activity as Record<string, unknown> | null | undefined;
  const nested = embedded?.simulation_activity_id ?? embedded?.id;
  if (typeof nested === 'string' && UUID_RE.test(nested)) return nested;
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
    const { data: { user }, error: authErr } =
      await createClient(supabaseUrl, supabaseAnon).auth.getUser(token);
    if (authErr || !user) return json({ error: 'Invalid token' }, 401);

    const admin = createClient(supabaseUrl, supabaseService);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    let body: {
      action?: string;
      work_order_id?: string;
      simulation_activity_id?: string | null;
      status?: string;
    } = {};
    try { body = await req.json(); } catch { /* optional */ }

    const action = body.action ?? 'run';

    // ---------------------------------------------------------------- approve
    // The ONLY path that writes a canonical id onto a work order.
    if (action === 'approve') {
      const woId = body.work_order_id;
      if (!woId || !UUID_RE.test(woId)) return json({ error: 'work_order_id required' }, 400);

      const { data: proposal } = await admin
        .from('simulation_activity_reconciliation')
        .select('*')
        .eq('work_order_id', woId)
        .maybeSingle();
      if (!proposal) return json({ error: 'No reconciliation proposal for that work order' }, 404);

      const targetId = body.simulation_activity_id !== undefined
        ? body.simulation_activity_id
        : proposal.proposed_simulation_activity_id;

      if (targetId !== null && (typeof targetId !== 'string' || !UUID_RE.test(targetId))) {
        return json({ error: 'simulation_activity_id must be a UUID or null' }, 400);
      }

      // Only the identity column is touched. Educational content, source
      // identifiers and metadata are left exactly as they are.
      const { error: updErr } = await admin
        .from('work_orders')
        .update({ simulation_activity_id: targetId })
        .eq('id', woId);
      if (updErr) return json({ error: updErr.message }, 500);

      await admin
        .from('simulation_activity_reconciliation')
        .update({
          status: targetId ? 'MATCHED' : 'ACADEMY_NATIVE',
          resolved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          reopened_at: null,
        })
        .eq('work_order_id', woId);

      return json({ ok: true, work_order_id: woId, simulation_activity_id: targetId });
    }

    // --------------------------------------------------------------- set_status
    // Admin marks a proposal resolved/unresolved without changing identity.
    if (action === 'set_status') {
      const woId = body.work_order_id;
      const status = body.status;
      const allowed = ['MATCHED', 'ACADEMY_NATIVE', 'NEEDS_REVIEW', 'LEGACY_SOURCE', 'ORPHANED_SOURCE', 'RETIRED'];
      if (!woId || !status || !allowed.includes(status)) {
        return json({ error: 'work_order_id and a valid status are required' }, 400);
      }
      const resolved = status === 'MATCHED' || status === 'ACADEMY_NATIVE' || status === 'RETIRED';
      const { error } = await admin
        .from('simulation_activity_reconciliation')
        .update({
          status,
          resolved,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('work_order_id', woId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, work_order_id: woId, status });
    }

    // -------------------------------------------------------------------- run
    const playUrl = Deno.env.get('FGN_PLAY_SUPABASE_URL');
    const ecosystemKey = Deno.env.get('ECOSYSTEM_API_KEY');
    if (!playUrl || !ecosystemKey) return json({ error: 'Play integration not configured' }, 500);

    // 1. Pull live canonical activities and refresh the disposable cache.
    const actRes = await ggCall(playUrl, ecosystemKey, {
      action: 'simulation-activities', limit: 200, page: 0,
    });
    if (!actRes.ok) {
      return json({ error: 'FGN.GG simulation-activities unavailable', detail: actRes.body }, 502);
    }
    const activities = pickArray(actRes.body, 'data', 'simulation_activities') as GGActivity[];

    const cacheRows = activities
      .map((a) => {
        const id = (a.simulation_activity_id ?? a.id) as string | undefined;
        if (typeof id !== 'string' || !UUID_RE.test(id)) return null;
        return {
          simulation_activity_id: id,
          canonical_name: (a.canonical_name as string) ?? null,
          canonical_slug: (a.canonical_slug as string) ?? null,
          canonical_description: (a.canonical_description as string) ?? null,
          gg_game_id: (a.game_id as string) ?? null,
          gg_game_name: (a.game_name as string) ?? null,
          gg_game_slug: (a.game_slug as string) ?? null,
          game_version: (a.game_version as string) ?? null,
          activity_category: (a.activity_category as string) ?? null,
          industry_domain: (a.industry_domain as string) ?? null,
          canonical_status: (a.status as string) ?? null,
          provenance: (a.provenance as string) ?? null,
          schema_version: (a.schema_version as number) ?? null,
          platform_applicability: (a.platform_applicability ?? null) as unknown,
          source_updated_at: (a.updated_at as string) ?? null,
          source_payload: a as unknown,
          last_synced_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (cacheRows.length) {
      await admin
        .from('simulation_activity_cache')
        .upsert(cacheRows, { onConflict: 'simulation_activity_id' });
    }

    // 2. Pull live challenges (including inactive) for the challenge -> activity map.
    const chRes = await ggCall(playUrl, ecosystemKey, {
      action: 'challenges', limit: 500, page: 0, include_inactive: true,
    });
    if (!chRes.ok) {
      return json({ error: 'FGN.GG challenges unavailable', detail: chRes.body }, 502);
    }
    const challenges = pickArray(chRes.body, 'challenges', 'data') as GGChallenge[];
    const challengeById = new Map<string, GGChallenge>();
    for (const c of challenges) if (typeof c.id === 'string') challengeById.set(c.id, c);

    const knownActivityIds = new Set(cacheRows.map((r) => (r as { simulation_activity_id: string }).simulation_activity_id));

    // 3. Read every Academy work order.
    const { data: workOrders, error: woErr } = await admin
      .from('work_orders')
      .select('id, title, game_title, is_active, simulation_activity_id, source_challenge_id, fgn_origin_challenge_id, metadata')
      .limit(2000);
    if (woErr) return json({ error: woErr.message }, 500);

    // 4. Preserve admin-resolved proposals; only reopen when the evidence changed.
    const { data: priorRows } = await admin
      .from('simulation_activity_reconciliation')
      .select('work_order_id, status, resolved, proposed_simulation_activity_id');
    const prior = new Map((priorRows ?? []).map((p) => [p.work_order_id as string, p]));

    const now = new Date().toISOString();
    const proposals: Record<string, unknown>[] = [];
    const counts: Record<string, number> = {};
    const duplicateWatch = new Map<string, string[]>();

    for (const wo of workOrders ?? []) {
      const origin = wo.fgn_origin_challenge_id as string | null;
      const source = wo.source_challenge_id as string | null;
      const playSource = (wo.metadata as Record<string, unknown> | null)?.play_source ?? null;

      let matchedChallengeId: string | null = null;
      let matchBasis = 'none';
      if (origin && challengeById.has(origin)) {
        matchedChallengeId = origin; matchBasis = 'fgn_origin_challenge_id';
      } else if (source && challengeById.has(source)) {
        matchedChallengeId = source; matchBasis = 'source_challenge_id';
      }

      const proposedId = matchedChallengeId
        ? activityIdOf(challengeById.get(matchedChallengeId)!)
        : null;

      let status: string;
      let reviewReason: string | null = null;
      if (proposedId) {
        status = 'MATCHED';
        const arr = duplicateWatch.get(proposedId) ?? [];
        arr.push(wo.id as string);
        duplicateWatch.set(proposedId, arr);
      } else if (matchedChallengeId) {
        // Challenge exists on GG but carries no canonical activity yet.
        status = 'NEEDS_REVIEW';
        reviewReason = 'canonical_identity_not_yet_published_by_gg';
      } else if (origin || playSource) {
        // Recorded GG provenance, but the challenge is gone from the live catalog.
        status = 'ORPHANED_SOURCE';
      } else if (source) {
        // Academy-side identifier only, no GG lineage ever recorded.
        status = 'LEGACY_SOURCE';
      } else {
        status = 'ACADEMY_NATIVE';
      }

      if (status !== 'MATCHED' && wo.is_active === false && !origin && !playSource) {
        // Inactive Academy-only content is lifecycle, not an identity failure.
        status = status === 'ACADEMY_NATIVE' ? 'ACADEMY_NATIVE' : status;
      }

      const p = prior.get(wo.id as string);
      // ACADEMY NATIVE and admin-approved rows stay resolved and are not
      // re-surfaced unless the underlying proposal actually changed.
      const evidenceChanged =
        !!p && p.resolved === true && (p.proposed_simulation_activity_id ?? null) !== (proposedId ?? null);
      const resolved = status === 'ACADEMY_NATIVE'
        ? true
        : (p?.resolved === true && !evidenceChanged);

      counts[status] = (counts[status] ?? 0) + 1;

      proposals.push({
        work_order_id: wo.id,
        proposed_simulation_activity_id: proposedId,
        matched_challenge_id: matchedChallengeId,
        match_basis: matchBasis,
        is_deterministic: !!proposedId,
        status: resolved && p?.status ? p.status : status,
        resolved,
        reopened_at: evidenceChanged ? now : null,
        last_run_at: now,
        diagnostics: {
          title: wo.title,
          game_title: wo.game_title,
          is_active: wo.is_active,
          current_simulation_activity_id: wo.simulation_activity_id ?? null,
          source_challenge_id: source,
          fgn_origin_challenge_id: origin,
          has_play_source: !!playSource,
          review_reason: reviewReason,
          canonical_known: proposedId ? knownActivityIds.has(proposedId) : false,
          identity_conflict:
            !!proposedId && !!wo.simulation_activity_id && wo.simulation_activity_id !== proposedId,
        },
      });
    }

    // Two or more work orders resolving to the same canonical activity is a
    // reportable conflict, not something to auto-resolve.
    const duplicates = [...duplicateWatch.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([activityId, ids]) => ({ simulation_activity_id: activityId, work_order_ids: ids }));
    const duplicateWoIds = new Set(duplicates.flatMap((d) => d.work_order_ids));
    for (const p of proposals) {
      if (duplicateWoIds.has(p.work_order_id as string)) {
        (p.diagnostics as Record<string, unknown>).duplicate_canonical_mapping = true;
        (p.diagnostics as Record<string, unknown>).review_reason =
          'two_or_more_work_orders_claim_the_same_canonical_activity';
        if (!p.resolved) { p.status = 'NEEDS_REVIEW'; }
      }
    }

    if (proposals.length) {
      const { error: upErr } = await admin
        .from('simulation_activity_reconciliation')
        .upsert(proposals, { onConflict: 'work_order_id' });
      if (upErr) return json({ error: upErr.message }, 500);
    }

    // Canonical activities published by GG with no Academy work order at all.
    const mappedActivityIds = new Set(
      proposals.map((p) => p.proposed_simulation_activity_id as string | null).filter(Boolean) as string[],
    );
    const unmappedActivities = cacheRows
      .map((r) => r as { simulation_activity_id: string; canonical_name: string | null })
      .filter((r) => !mappedActivityIds.has(r.simulation_activity_id));

    return json({
      ok: true,
      ran_at: now,
      work_orders_examined: proposals.length,
      activities_cached: cacheRows.length,
      challenges_seen: challengeById.size,
      status_counts: counts,
      duplicate_canonical_mappings: duplicates,
      canonical_activities_without_work_order: unmappedActivities,
      note: 'Proposals only. No work order identity was changed by this run.',
    });
  } catch (e) {
    console.error('reconcile-simulation-activities failed:', e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
