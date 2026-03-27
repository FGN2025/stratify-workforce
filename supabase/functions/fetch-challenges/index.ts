import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// play.fgn.gg's public Supabase config
const PLAY_FGN_URL = 'https://yrhwzmkenjgiujhofucx.supabase.co';
const PLAY_FGN_ANON_KEY = Deno.env.get('PLAY_FGN_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify requesting user is an admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const localSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and check admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!).auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: isAdmin } = await localSupabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch challenges from play.fgn.gg
    const playClient = createClient(PLAY_FGN_URL, PLAY_FGN_ANON_KEY);
    
    const { data: challenges, error: fetchError } = await playClient
      .from('challenges')
      .select('*, games(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching challenges:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch challenges from play.fgn.gg' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch challenge_tasks from play.fgn.gg
    const challengeIds = (challenges || []).map((c: Record<string, unknown>) => c.id);
    let tasksMap: Record<string, Array<Record<string, unknown>>> = {};
    
    if (challengeIds.length > 0) {
      const { data: tasks, error: tasksError } = await playClient
        .from('challenge_tasks')
        .select('*')
        .in('challenge_id', challengeIds)
        .order('order_index', { ascending: true });

      if (!tasksError && tasks) {
        // Group tasks by challenge_id
        for (const task of tasks) {
          const cid = String(task.challenge_id);
          if (!tasksMap[cid]) tasksMap[cid] = [];
          tasksMap[cid].push(task);
        }
      } else if (tasksError) {
        // challenge_tasks table may not exist — log but don't fail
        console.warn('Could not fetch challenge_tasks:', tasksError.message);
      }
    }

    // Also fetch which challenges are already imported
    const { data: existingWorkOrders } = await localSupabase
      .from('work_orders')
      .select('source_challenge_id')
      .not('source_challenge_id', 'is', null);

    const importedIds = new Set(
      (existingWorkOrders || []).map((wo: { source_challenge_id: string | null }) => wo.source_challenge_id)
    );

    const enrichedChallenges = (challenges || []).map((c: Record<string, unknown>) => ({
      ...c,
      already_imported: importedIds.has(String(c.id)),
      tasks: tasksMap[String(c.id)] || [],
    }));

    return new Response(JSON.stringify({ challenges: enrichedChallenges }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
