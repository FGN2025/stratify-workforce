import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Must match fetch-challenges/index.ts PLAY_CHALLENGE_FIELDS exactly.
// Lossless whitelist of fields play.fgn.gg actually returns on a challenge.
const PLAY_CHALLENGE_FIELDS = [
  'id',
  'name',
  'description',
  'game_id',
  'challenge_type',
  'difficulty',
  'points_reward',
  'estimated_minutes',
  'start_date',
  'end_date',
  'requires_evidence',
  'cover_image_url',
  'game_name',
  'is_active',
  'is_featured',
  'created_at',
  'updated_at',
] as const;

type Challenge = Record<string, unknown> & { id: string };

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
    let body: { work_order_ids?: string[]; dry_run?: boolean; force?: boolean } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }
    const dryRun = body.dry_run !== false; // default true
    const force = body.force === true;     // default false
    const ids = Array.isArray(body.work_order_ids) ? body.work_order_ids : null;

    // Load target work orders
    let q = admin
      .from('work_orders')
      .select('id, fgn_origin_challenge_id, title, cover_image_url, metadata')
      .not('fgn_origin_challenge_id', 'is', null);
    if (ids && ids.length > 0) q = q.in('id', ids);
    const { data: workOrders, error: woErr } = await q;
    if (woErr) return json({ error: 'Failed to load work orders', details: woErr.message }, 500);

    // Single cached upstream fetch: challenges (paginated) + games
    const challenges = await fetchAllChallenges(playUrl, ecosystemKey);
    const challengeById = new Map<string, Challenge>(
      challenges.map((c) => [String(c.id), c]),
    );

    const gameIdToName = await fetchGameMap(playUrl, ecosystemKey);

    const rows: Array<Record<string, unknown>> = [];
    const summary = { would_update: 0, updated: 0, skipped_already_present: 0, not_found_on_play: 0 };

    for (const wo of workOrders ?? []) {
      const existing = (wo.metadata as Record<string, unknown> | null)?.play_source;
      const hasPlaySource = existing != null;

      if (hasPlaySource && !force) {
        summary.skipped_already_present++;
        rows.push({
          work_order_id: wo.id,
          fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
          current_title: wo.title,
          current_cover_image_url: wo.cover_image_url,
          status: 'skipped-already-present',
        });
        continue;
      }

      const c = challengeById.get(String(wo.fgn_origin_challenge_id));
      if (!c) {
        summary.not_found_on_play++;
        rows.push({
          work_order_id: wo.id,
          fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
          current_title: wo.title,
          current_cover_image_url: wo.cover_image_url,
          status: 'not-found-on-play',
        });
        continue;
      }

      // Build lossless play_source from whitelist
      const playSource: Record<string, unknown> = {};
      for (const f of PLAY_CHALLENGE_FIELDS) {
        if (c[f] !== undefined) playSource[f] = c[f];
      }
      // Backfill game_name if absent from snapshot
      if (playSource.game_name == null && c.game_id) {
        const gn = gameIdToName.get(String(c.game_id));
        if (gn) playSource.game_name = gn;
      }

      const preview = {
        name: playSource.name ?? null,
        description: playSource.description ?? null,
        cover_image_url: playSource.cover_image_url ?? null,
        difficulty: playSource.difficulty ?? null,
        points_reward: playSource.points_reward ?? null,
        game_name: playSource.game_name ?? null,
        challenge_type: playSource.challenge_type ?? null,
        estimated_minutes: playSource.estimated_minutes ?? null,
        requires_evidence: playSource.requires_evidence ?? null,
        is_active: playSource.is_active ?? null,
        is_featured: playSource.is_featured ?? null,
        start_date: playSource.start_date ?? null,
        end_date: playSource.end_date ?? null,
        created_at: playSource.created_at ?? null,
        updated_at: playSource.updated_at ?? null,
      };

      if (dryRun) {
        summary.would_update++;
        rows.push({
          work_order_id: wo.id,
          fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
          current_title: wo.title,
          current_cover_image_url: wo.cover_image_url, // leg-1 — preserved
          status: 'would-update',
          play_source: playSource,
          preview,
        });
      } else {
        const currentMeta = (wo.metadata as Record<string, unknown> | null) ?? {};
        const newMeta = { ...currentMeta, play_source: playSource };
        const { error: upErr } = await admin
          .from('work_orders')
          .update({ metadata: newMeta })
          .eq('id', wo.id);
        if (upErr) {
          rows.push({
            work_order_id: wo.id,
            fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
            current_title: wo.title,
            status: 'error',
            error: upErr.message,
          });
          continue;
        }
        summary.updated++;
        rows.push({
          work_order_id: wo.id,
          fgn_origin_challenge_id: wo.fgn_origin_challenge_id,
          current_title: wo.title,
          current_cover_image_url: wo.cover_image_url,
          status: 'updated',
          play_source: playSource,
          preview,
        });
      }
    }

    // Audit log
    try {
      await admin.from('play_sync_attempts').insert({
        direction: 'outbound',
        action: 'backfill-play-source',
        status: 'completed',
        request: { work_order_ids: ids, dry_run: dryRun, force },
        response: { summary },
      });
    } catch (_) { /* non-fatal */ }

    return json({ dry_run: dryRun, force, summary, rows }, 200);
  } catch (e) {
    console.error('backfill-play-source error:', e);
    return json({ error: 'Internal server error', details: String(e) }, 500);
  }
});

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

async function fetchGameMap(playUrl: string, key: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ecosystem-Key': key,
        'X-Ecosystem-App': 'academy',
      },
      body: JSON.stringify({ action: 'games' }),
    });
    if (res.ok) {
      const data = await res.json();
      const games: Array<Record<string, unknown>> = data?.games ?? data?.data ?? [];
      for (const g of games) {
        const id = g.id ?? g.key;
        const name = g.name ?? g.short_name ?? g.key;
        if (id && name) map.set(String(id), String(name));
      }
    }
  } catch (_) { /* non-fatal */ }
  return map;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
