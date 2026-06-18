// import-challenge-as-workorder
//
// Single source of truth for converting one or more play.fgn.gg challenges
// into academy work_orders. Mirrors the create-branch of
// WorkOrderEditDialog.handleSubmit field-for-field so the dialog AND the
// FGN Challenge Configurator converge on this one path.
//
// Phase A invariant preserved: metadata.play_source is populated on the
// INSERT itself (no post-insert UPDATE / backfill).
//
// Side effects per import (same as the dialog):
//   1. game_channels upsert keyed on game_title (ignore duplicates).
//   2. work_order_tasks insert (order_index from display_order, source_task_id).
//
// Idempotent: if a work_order already exists for a challenge id, returns
// that row with status="existing" — never duplicates.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { SIM_CHANNEL_CONFIG, type GameTitle } from '../_shared/sim-channel-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Mirrors GAME_NAME_MAP in src/components/admin/ImportChallengeDialog.tsx.
const GAME_NAME_MAP: Record<string, GameTitle> = {
  'American Truck Simulator': 'ATS',
  'Farming Simulator': 'Farming_Sim',
  'Construction Simulator': 'Construction_Sim',
  'Mechanic Simulator': 'Mechanic_Sim',
  'Fiber-Tech Simulator': 'Fiber_Tech',
  'Roadcraft': 'Roadcraft',
  'Microsoft Flight Simulator 2024': 'MSFS_2024',
  'MSFS 2024': 'MSFS_2024',
  'Electrician Simulator': 'Electrician_Sim',
};

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
const DIFFICULTY_MAP: Record<string, Difficulty> = {
  easy: 'beginner',
  beginner: 'beginner',
  medium: 'intermediate',
  intermediate: 'intermediate',
  hard: 'advanced',
  advanced: 'advanced',
};

// Lossless play_source field whitelist — must match fetch-challenges.
const PLAY_CHALLENGE_FIELDS = [
  'id', 'name', 'description', 'game_id', 'challenge_type', 'difficulty',
  'points_reward', 'estimated_minutes', 'start_date', 'end_date',
  'requires_evidence', 'cover_image_url', 'game_name', 'is_active',
  'is_featured', 'created_at', 'updated_at',
] as const;

interface PlayTask {
  id: string;
  title: string;
  description?: string | null;
  display_order?: number | null;
}

interface PlayChallenge {
  id: string;
  name: string;
  description?: string | null;
  difficulty?: string | null;
  points_reward?: number | null;
  estimated_minutes?: number | null;
  estimated_time_minutes?: number | null;
  cover_image_url?: string | null;
  game_name?: string | null;
  games?: { name?: string } | null;
  tasks?: PlayTask[];
  requires_evidence?: boolean;
  [k: string]: unknown;
}

interface ImportResult {
  challenge_id: string;
  work_order_id: string | null;
  status: 'created' | 'existing' | 'error';
  tasks_imported?: number;
  play_source_present?: boolean;
  error?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Invalid token' }, 401);

    const admin = createClient(supabaseUrl, supabaseService);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    // ---- Validate input ----
    let payload: { challenge_ids?: unknown } = {};
    try {
      payload = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    const ids = payload.challenge_ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) {
      return json({ error: 'challenge_ids must be a non-empty array of <=50 strings' }, 400);
    }
    const challengeIds = ids.map(String);

    // ---- Fetch canonical challenge catalog via fetch-challenges (forwards admin bearer) ----
    const fcRes = await fetch(`${supabaseUrl}/functions/v1/fetch-challenges`, {
      method: 'GET',
      headers: { Authorization: authHeader, apikey: supabaseAnon },
    });
    if (!fcRes.ok) {
      const text = await fcRes.text().catch(() => '');
      return json({ error: 'fetch-challenges upstream failed', details: text }, 502);
    }
    const fcBody = await fcRes.json();
    const allChallenges: PlayChallenge[] = fcBody?.challenges ?? [];
    const byId = new Map(allChallenges.map((c) => [String(c.id), c]));

    const results: ImportResult[] = [];

    for (const challengeId of challengeIds) {
      try {
        // Idempotency check — return existing row, never duplicate.
        const { data: existing } = await admin
          .from('work_orders')
          .select('id, metadata')
          .eq('fgn_origin_challenge_id', challengeId)
          .maybeSingle();

        if (existing) {
          const playSourcePresent =
            !!(existing.metadata && (existing.metadata as Record<string, unknown>).play_source);
          results.push({
            challenge_id: challengeId,
            work_order_id: existing.id,
            status: 'existing',
            play_source_present: playSourcePresent,
          });
          continue;
        }

        const challenge = byId.get(challengeId);
        if (!challenge) {
          results.push({
            challenge_id: challengeId,
            work_order_id: null,
            status: 'error',
            error: 'challenge not found in fetch-challenges response',
          });
          continue;
        }

        // Build play_source snapshot (matches fetch-challenges enrichment).
        const playSource: Record<string, unknown> = {};
        for (const f of PLAY_CHALLENGE_FIELDS) {
          if (challenge[f] !== undefined) playSource[f] = challenge[f];
        }
        // fetch-challenges already attaches play_source; prefer it if richer.
        const supplied = (challenge as { play_source?: Record<string, unknown> }).play_source;
        const finalPlaySource = supplied && Object.keys(supplied).length >= Object.keys(playSource).length
          ? supplied
          : playSource;

        const gameName = challenge.games?.name ?? challenge.game_name ?? '';
        const gameTitle = (GAME_NAME_MAP[gameName] ?? 'ATS') as GameTitle;
        const difficulty = DIFFICULTY_MAP[(challenge.difficulty ?? '').toLowerCase()] ?? 'beginner';
        const xpReward = challenge.points_reward ?? 50;
        const estimatedTime = challenge.estimated_minutes ?? challenge.estimated_time_minutes ?? null;
        const coverImageUrl = challenge.cover_image_url ?? null;
        const description = challenge.description ?? null;

        const requiresEvidence =
          (finalPlaySource as { requires_evidence?: boolean })?.requires_evidence === true;
        const evidenceRequirements = requiresEvidence
          ? {
              required: true,
              min_uploads: 1,
              max_uploads: 5,
              allowed_types: ['image', 'video', 'document'],
              instructions: '',
              deadline_hours: null as number | null,
            }
          : null;

        // ---- INSERT (single, with metadata.play_source) — Phase A invariant ----
        const insertRow = {
          title: null,
          description,
          game_title: gameTitle,
          difficulty,
          xp_reward: xpReward,
          estimated_time_minutes: estimatedTime,
          max_attempts: null,
          success_criteria: null,
          is_active: false,
          channel_id: null,
          tenant_id: null,
          evidence_requirements: evidenceRequirements,
          cover_image_url: coverImageUrl,
          fgn_origin_challenge_id: challengeId,
          metadata: { play_source: finalPlaySource },
        };

        const { data: newWO, error: insertErr } = await admin
          .from('work_orders')
          .insert(insertRow)
          .select('id, metadata')
          .single();

        if (insertErr || !newWO) {
          results.push({
            challenge_id: challengeId,
            work_order_id: null,
            status: 'error',
            error: insertErr?.message ?? 'insert returned no row',
          });
          continue;
        }

        // ---- Side effect A: game_channels upsert ----
        try {
          const cfg = SIM_CHANNEL_CONFIG[gameTitle];
          await admin
            .from('game_channels')
            .upsert(
              {
                game_title: gameTitle,
                name: cfg?.name ?? gameTitle.replace(/_/g, ' '),
                accent_color: cfg?.accentColor ?? '#94A3B8',
              },
              { onConflict: 'game_title', ignoreDuplicates: true },
            );
        } catch (e) {
          console.warn('game_channels upsert skipped:', e);
        }

        // ---- Side effect B: work_order_tasks insert ----
        const tasks = Array.isArray(challenge.tasks) ? challenge.tasks : [];
        let tasksImported = 0;
        if (tasks.length > 0) {
          const taskRows = tasks.map((t, idx) => ({
            work_order_id: newWO.id,
            title: t.title,
            description: t.description ?? null,
            order_index: t.display_order ?? idx,
            source_task_id: t.id ?? null,
          }));
          const { error: taskErr, count } = await admin
            .from('work_order_tasks')
            .insert(taskRows, { count: 'exact' });
          if (taskErr) {
            console.error('task insert failed:', taskErr);
          } else {
            tasksImported = count ?? taskRows.length;
          }
        }

        const playSourcePresent =
          !!(newWO.metadata && (newWO.metadata as Record<string, unknown>).play_source);

        results.push({
          challenge_id: challengeId,
          work_order_id: newWO.id,
          status: 'created',
          tasks_imported: tasksImported,
          play_source_present: playSourcePresent,
        });
      } catch (e) {
        results.push({
          challenge_id: challengeId,
          work_order_id: null,
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return json({ results }, 200);
  } catch (e) {
    console.error('import-challenge-as-workorder error:', e);
    return json({ error: 'Internal server error', details: String(e) }, 500);
  }
});
