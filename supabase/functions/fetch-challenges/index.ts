import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const POLL_ACTION = 'challenges';
const PAGE_LIMIT = 500;

// Fields play actually returns on a challenge today (per integration doc).
// Only these are persisted into work_orders.metadata.play_source.
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
  'is_active',
  'is_featured',
  'created_at',
  'updated_at',
] as const;

type Challenge = Record<string, unknown> & { id: string; tasks?: unknown[] };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const playUrl = Deno.env.get('FGN_PLAY_SUPABASE_URL');
    const ecosystemKey = Deno.env.get('ECOSYSTEM_API_KEY');

    if (!playUrl || !ecosystemKey) {
      return json({ error: 'Play integration not configured (FGN_PLAY_SUPABASE_URL / ECOSYSTEM_API_KEY missing)' }, 500);
    }

    const localSupabase = createClient(supabaseUrl, supabaseService);

    // Verify admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(supabaseUrl, supabaseAnon).auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: isAdmin } = await localSupabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    // Admin browse endpoint: always fetch the full list (no cursor).
    // The incremental `since` cursor is owned by play-poll-achievements / background sync,
    // not the import UI — using it here causes the dialog to only show recently-changed challenges.
    const all: Challenge[] = [];
    let page = 0;
    const startedAt = new Date().toISOString();

    while (true) {
      const body: Record<string, unknown> = {
        action: 'challenges',
        limit: PAGE_LIMIT,
        page,
      };

      const res = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ecosystem-Key': ecosystemKey,
          'X-Ecosystem-App': 'academy',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        await logAttempt(localSupabase, 'failed', body, null, `ecosystem-data-api ${res.status}: ${errText}`);
        return json({ error: 'Failed to fetch challenges from play.fgn.gg', details: errText }, 502);
      }

      const data = await res.json();
      const batch: Challenge[] = data?.challenges ?? data?.data ?? [];
      all.push(...batch);

      if (batch.length < PAGE_LIMIT) break;
      page += 1;
      if (page > 50) break; // safety
    }


    // Try to fetch the games catalog so we can attach { games: { name } } per
    // challenge — the import dialog filter relies on this nested shape. If the
    // action is unsupported or fails, we silently fall back to no game mapping.
    const gameIdToName = new Map<string, string>();
    try {
      const gRes = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ecosystem-Key': ecosystemKey,
          'X-Ecosystem-App': 'academy',
        },
        body: JSON.stringify({ action: 'games' }),
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        const games: Array<Record<string, unknown>> =
          gData?.games ?? gData?.data ?? [];
        for (const g of games) {
          const id = g.id ?? g.key;
          const name = g.name ?? g.short_name ?? g.key;
          if (id && name) gameIdToName.set(String(id), String(name));
        }
      }
    } catch (e) {
      console.warn('games catalog fetch failed:', e);
    }

    // Build lossless play_source per challenge (only real fields).
    const enriched = all.map((c) => {
      const playSource: Record<string, unknown> = {};
      for (const f of PLAY_CHALLENGE_FIELDS) {
        if (c[f] !== undefined) playSource[f] = c[f];
      }
      return { ...c, play_source: playSource };
    });

    // Mark which are already imported.
    const { data: existingWorkOrders } = await localSupabase
      .from('work_orders')
      .select('fgn_origin_challenge_id')
      .not('fgn_origin_challenge_id', 'is', null);

    const importedIds = new Set(
      (existingWorkOrders || []).map((wo: { fgn_origin_challenge_id: string | null }) =>
        wo.fgn_origin_challenge_id,
      ),
    );

    const finalChallenges = enriched.map((c) => {
      const gameId = c.game_id ? String(c.game_id) : null;
      const existingGames = (c as { games?: { name?: string } }).games;
      const gameName = existingGames?.name ?? (gameId ? gameIdToName.get(gameId) : undefined);
      return {
        ...c,
        games: gameName ? { name: gameName } : existingGames ?? null,
        already_imported: importedIds.has(String(c.id)),
        tasks: Array.isArray(c.tasks) ? c.tasks : [],
      };
    });

    await logAttempt(
      localSupabase,
      'completed',
      { action: POLL_ACTION, started_at: startedAt },
      { count: finalChallenges.length },
      null,
    );

    return json({ challenges: finalChallenges }, 200);
  } catch (error) {
    console.error('fetch-challenges error:', error);
    return json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function logAttempt(
  client: ReturnType<typeof createClient>,
  status: 'completed' | 'failed' | 'queued' | 'duplicate',
  request: unknown,
  response: unknown,
  error: string | null,
) {
  try {
    await client.from('play_sync_attempts').insert({
      direction: 'outbound',
      action: POLL_ACTION,
      status,
      request,
      response,
      error,
    });
  } catch (e) {
    console.warn('play_sync_attempts insert failed:', e);
  }
}
