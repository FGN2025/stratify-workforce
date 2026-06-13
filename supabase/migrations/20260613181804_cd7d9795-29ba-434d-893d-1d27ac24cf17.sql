CREATE TABLE public.simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  simulation_id uuid NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  archetype text NOT NULL CHECK (archetype IN ('sequence','loadout')),
  raw integer NOT NULL DEFAULT 0,
  max integer NOT NULL DEFAULT 0,
  percent integer NOT NULL DEFAULT 0,
  grade text,
  stand_down boolean NOT NULL DEFAULT false,
  item_selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  critical_hits jsonb NOT NULL DEFAULT '[]'::jsonb,
  debrief jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.simulation_runs TO authenticated;
GRANT ALL ON public.simulation_runs TO service_role;

ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own simulation runs"
  ON public.simulation_runs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages simulation runs"
  ON public.simulation_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_sim_runs_user_id ON public.simulation_runs(user_id);
CREATE INDEX idx_sim_runs_simulation_id ON public.simulation_runs(simulation_id);
CREATE INDEX idx_sim_runs_work_order_id ON public.simulation_runs(work_order_id);

INSERT INTO public.courses (id, title, description, is_published, xp_reward, game_title)
VALUES (
  'a8000000-0000-4000-8000-000000000001',
  'MSFS 2024 — Simulation Stubs',
  'Internal stub course wiring MSFS simulation lessons to play.fgn.gg challenge completions. Unpublished by design.',
  false,
  0,
  'MSFS_2024'::game_title
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules (id, course_id, title, description, order_index, xp_reward)
VALUES (
  'a8000000-0000-4000-8000-000000000002',
  'a8000000-0000-4000-8000-000000000001',
  'MSFS Simulations',
  'One lesson per simulation. Each lesson resolves its sim via content.studio_sim_id.',
  1,
  0
)
ON CONFLICT (id) DO NOTHING;

WITH sim_rows AS (
  SELECT id, wo_code, title, work_order_id,
         CASE wo_code
           WHEN 'WO-2710' THEN 'a8000000-0000-4000-8000-000000000010'::uuid
           WHEN 'WO-2720' THEN 'a8000000-0000-4000-8000-000000000020'::uuid
           WHEN 'WO-2730' THEN 'a8000000-0000-4000-8000-000000000030'::uuid
           WHEN 'WO-2740' THEN 'a8000000-0000-4000-8000-000000000040'::uuid
           WHEN 'WO-2848' THEN 'a8000000-0000-4000-8000-000000000050'::uuid
           WHEN 'WO-2919' THEN 'a8000000-0000-4000-8000-000000000060'::uuid
         END AS lesson_id,
         CASE wo_code
           WHEN 'WO-2710' THEN 10
           WHEN 'WO-2720' THEN 20
           WHEN 'WO-2730' THEN 30
           WHEN 'WO-2740' THEN 40
           WHEN 'WO-2848' THEN 50
           WHEN 'WO-2919' THEN 60
         END AS order_index
  FROM public.simulations
)
INSERT INTO public.lessons (id, module_id, title, lesson_type, content, work_order_id, duration_minutes, xp_reward, order_index, passing_score)
SELECT
  s.lesson_id,
  'a8000000-0000-4000-8000-000000000002'::uuid,
  s.title,
  'simulation'::lesson_type,
  jsonb_build_object('studio_sim_id', s.id, 'wo_code', s.wo_code),
  s.work_order_id,
  0,
  0,
  s.order_index,
  70
FROM sim_rows s
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  work_order_id = EXCLUDED.work_order_id;

INSERT INTO public.challenge_lesson_mappings (play_challenge_id, lesson_id, is_active, notes)
SELECT
  w.fgn_origin_challenge_id,
  l.id,
  true,
  'MSFS Phase C stub: ' || s.wo_code
FROM public.simulations s
JOIN public.work_orders w ON w.id = s.work_order_id
JOIN public.lessons l ON l.content->>'studio_sim_id' = s.id::text
WHERE w.fgn_origin_challenge_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.challenge_tracks (id, track_key, name, description, gate_mode, accent_color, icon_name, is_active)
VALUES (
  'a8000000-0000-4000-8000-0000000000aa',
  'msfs-2024',
  'MSFS 2024 Pathway',
  'Microsoft Flight Simulator 2024 challenge track — fires Knowledge Check Available on play.fgn.gg completion.',
  'per_challenge',
  '#F59E0B',
  'plane',
  true
)
ON CONFLICT (track_key) DO UPDATE SET is_active = true;

INSERT INTO public.challenge_track_membership (track_id, challenge_id, notes)
SELECT
  'a8000000-0000-4000-8000-0000000000aa'::uuid,
  w.fgn_origin_challenge_id,
  'MSFS Phase C: ' || w.title
FROM public.work_orders w
WHERE w.fgn_origin_challenge_id IN (
  '7846317c-77b2-4dd4-a855-308cb659891a',
  '7b210f8c-3d98-4d62-a756-a59526743b4e',
  'cd393fee-feb7-42ac-a1e6-4f2fdc3e7c69',
  '4d884744-d614-4284-94e3-8e3f9ff46d3e',
  '2a4e6ccb-fe50-4218-b437-065f3f8c496b'
)
ON CONFLICT (track_id, challenge_id) DO NOTHING;