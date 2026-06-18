// attach-assessment-to-workorder
//
// Admin-authorized write endpoint used by the FGN Challenge Configurator (and
// any future internal tool) to attach a simulation/assessment to an existing
// work_order. Performs a 2-step write:
//   1. Upsert public.simulations by wo_code (unique).
//   2. Replace public.simulation_items for that simulation (delete + insert).
//
// Idempotent on wo_code. Returns the simulation row plus item count.
//
// NOTE: simulations.sim_type and simulation_runs.archetype CHECK constraints
// currently allow only ('sequence','loadout'). The dev order's
// 'resource_selection' / 'method_selection' archetypes will be rejected by the
// DB until the CHECK-expansion migration is approved & run. This function
// validates the wider set in code so the migration is the only follow-up.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ItemSchema = z.object({
  item_key: z.string().min(1).max(128),
  cat_key: z.string().max(128).nullish(),
  icon: z.string().max(128).nullish(),
  name: z.string().min(1).max(255),
  sub: z.string().max(500).nullish(),
  display_order: z.number().int().nonnegative().default(0),
  correct: z.boolean().default(false),
  critical: z.boolean().default(false),
  seq: z.number().int().nullish(),
  why: z.string().max(2000).nullish(),
});

const BodySchema = z.object({
  work_order_id: z.string().uuid(),
  wo_code: z.string().min(1).max(64),
  sim_id_external: z.string().max(128).nullish(),
  title: z.string().min(1).max(255),
  sim_type: z.enum(['sequence', 'loadout', 'resource_selection', 'method_selection']),
  game_prefix: z.string().max(64).nullish(),
  job_type: z.string().max(64).nullish(),
  job_label: z.string().max(128).nullish(),
  blurb: z.string().max(2000).nullish(),
  briefing: z.array(z.unknown()).default([]),
  facts: z.array(z.unknown()).default([]),
  cats: z.array(z.unknown()).default([]),
  config: z.record(z.unknown()).default({}),
  track_key: z.string().max(64).default('msfs-2024'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tenant_id: z.string().uuid().nullish(),
  items: z.array(ItemSchema).min(1).max(500),
});

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
    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: 'validation_failed', details: parsed.error.flatten() }, 400);
    }
    const body = parsed.data;

    // Sanity: work_order must exist.
    const { data: wo, error: woErr } = await admin
      .from('work_orders')
      .select('id, tenant_id')
      .eq('id', body.work_order_id)
      .maybeSingle();
    if (woErr) return json({ error: 'work_order lookup failed', details: woErr.message }, 500);
    if (!wo) return json({ error: 'work_order not found' }, 404);

    // Reject cross-wo wo_code collisions (wo_code is globally unique).
    const { data: collision } = await admin
      .from('simulations')
      .select('id, work_order_id')
      .eq('wo_code', body.wo_code)
      .maybeSingle();
    if (collision && collision.work_order_id !== body.work_order_id) {
      return json(
        {
          error: 'wo_code already bound to a different work_order',
          existing_work_order_id: collision.work_order_id,
        },
        409,
      );
    }

    // ---- Upsert simulation by wo_code (unique). ----
    const simRow = {
      work_order_id: body.work_order_id,
      wo_code: body.wo_code,
      sim_id_external: body.sim_id_external ?? null,
      title: body.title,
      sim_type: body.sim_type,
      game_prefix: body.game_prefix ?? null,
      job_type: body.job_type ?? null,
      job_label: body.job_label ?? null,
      blurb: body.blurb ?? null,
      briefing: body.briefing,
      facts: body.facts,
      cats: body.cats,
      config: body.config,
      track_key: body.track_key,
      status: body.status,
      tenant_id: body.tenant_id ?? wo.tenant_id ?? null,
    };

    const { data: simulation, error: simErr } = await admin
      .from('simulations')
      .upsert(simRow, { onConflict: 'wo_code' })
      .select('id, wo_code, work_order_id, sim_type, status, updated_at')
      .single();

    if (simErr || !simulation) {
      return json(
        {
          error: 'simulation upsert failed',
          details: simErr?.message ?? 'no row returned',
          hint:
            simErr?.message?.includes('simulations_sim_type_check')
              ? 'sim_type CHECK constraint needs expansion migration before this archetype can be stored'
              : undefined,
        },
        500,
      );
    }

    // ---- Replace items (delete-then-insert in service role context). ----
    const { error: delErr } = await admin
      .from('simulation_items')
      .delete()
      .eq('simulation_id', simulation.id);
    if (delErr) {
      return json({ error: 'simulation_items wipe failed', details: delErr.message }, 500);
    }

    const itemRows = body.items.map((it, idx) => ({
      simulation_id: simulation.id,
      item_key: it.item_key,
      cat_key: it.cat_key ?? null,
      icon: it.icon ?? null,
      name: it.name,
      sub: it.sub ?? null,
      display_order: it.display_order ?? idx,
      correct: it.correct,
      critical: it.critical,
      seq: it.seq ?? null,
      why: it.why ?? null,
    }));

    const { error: insErr, count } = await admin
      .from('simulation_items')
      .insert(itemRows, { count: 'exact' });

    if (insErr) {
      return json({ error: 'simulation_items insert failed', details: insErr.message }, 500);
    }

    return json({
      simulation,
      items_written: count ?? itemRows.length,
    });
  } catch (e) {
    return json({ error: 'internal_error', details: (e as Error).message }, 500);
  }
});
