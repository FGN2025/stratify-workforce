import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type PlayGame = {
  id: string;
  name?: string;
  slug?: string;
  short_name?: string;
  description?: string;
  accent_color?: string;
  is_active?: boolean;
};

type AcademyChannel = {
  game_title: string;
  name: string;
  accent_color: string | null;
  description: string | null;
};

type DiffRow = {
  play_id: string | null;
  play_name: string | null;
  play_slug: string | null;
  academy_enum: string | null;
  academy_name: string | null;
  status: 'synced' | 'missing_on_academy' | 'missing_on_play' | 'name_mismatch';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const adminClient = createClient(supabaseUrl, supabaseService);

    // Verify caller is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      supabaseAnon,
    ).auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: isAdmin } = await adminClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    // Fetch play.fgn.gg games catalog
    const playRes = await fetch(`${playUrl}/functions/v1/ecosystem-data-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ecosystem-Key': ecosystemKey,
        apikey: Deno.env.get('FGN_PLAY_SUPABASE_ANON_KEY') ?? ecosystemKey,
      },
      body: JSON.stringify({ action: 'games' }),
    });

    if (!playRes.ok) {
      const text = await playRes.text();
      return json({ error: 'play games fetch failed', status: playRes.status, body: text }, 502);
    }

    const playData = await playRes.json();
    const playGames: PlayGame[] = playData?.games ?? playData?.data ?? [];

    // Fetch academy game_channels
    const { data: academy, error: chErr } = await adminClient
      .from('game_channels')
      .select('game_title, name, accent_color, description');

    if (chErr) return json({ error: chErr.message }, 500);

    const academyByDescId = new Map<string, AcademyChannel>();
    const academyByName = new Map<string, AcademyChannel>();
    for (const ch of (academy ?? []) as AcademyChannel[]) {
      academyByName.set(ch.name.toLowerCase(), ch);
      // description sometimes stores play_game_id (per Phase A convention)
      if (ch.description) {
        const match = ch.description.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (match) academyByDescId.set(match[0].toLowerCase(), ch);
      }
    }

    const usedAcademy = new Set<string>();
    const diff: DiffRow[] = [];

    for (const g of playGames) {
      const playName = g.name ?? null;
      const matched =
        academyByDescId.get(String(g.id).toLowerCase()) ??
        (playName ? academyByName.get(playName.toLowerCase()) : undefined);

      if (matched) {
        usedAcademy.add(matched.game_title);
        diff.push({
          play_id: g.id,
          play_name: playName,
          play_slug: g.slug ?? null,
          academy_enum: matched.game_title,
          academy_name: matched.name,
          status:
            playName && matched.name && playName.toLowerCase() !== matched.name.toLowerCase()
              ? 'name_mismatch'
              : 'synced',
        });
      } else {
        diff.push({
          play_id: g.id,
          play_name: playName,
          play_slug: g.slug ?? null,
          academy_enum: null,
          academy_name: null,
          status: 'missing_on_academy',
        });
      }
    }

    // Academy entries not present on play side
    for (const ch of (academy ?? []) as AcademyChannel[]) {
      if (usedAcademy.has(ch.game_title)) continue;
      diff.push({
        play_id: null,
        play_name: null,
        play_slug: null,
        academy_enum: ch.game_title,
        academy_name: ch.name,
        status: 'missing_on_play',
      });
    }

    return json({
      play_count: playGames.length,
      academy_count: (academy ?? []).length,
      diff,
      play_games_raw: playGames,
    }, 200);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
