
CREATE TABLE public.challenge_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  gate_mode text NOT NULL DEFAULT 'per_challenge',
  course_id uuid,
  lesson_id uuid,
  accent_color text NOT NULL DEFAULT '#6366f1',
  icon_name text NOT NULL DEFAULT 'graduation-cap',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenge_tracks_gate_mode_check CHECK (gate_mode IN ('all_completed','per_challenge'))
);

CREATE TABLE public.challenge_track_membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.challenge_tracks(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_id, challenge_id)
);

CREATE INDEX idx_ctm_challenge_id ON public.challenge_track_membership(challenge_id);
CREATE INDEX idx_ctm_track_id ON public.challenge_track_membership(track_id);

ALTER TABLE public.challenge_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_track_membership ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active tracks" ON public.challenge_tracks
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage tracks" ON public.challenge_tracks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated can view memberships" ON public.challenge_track_membership
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage memberships" ON public.challenge_track_membership
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_challenge_tracks_updated_at
  BEFORE UPDATE ON public.challenge_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Track 3: OSHA Safety Overlay (all_completed gate)
WITH t3 AS (
  INSERT INTO public.challenge_tracks (track_key, name, gate_mode, course_id, lesson_id, accent_color, icon_name)
  VALUES (
    'osha_safety_overlay',
    'OSHA Safety Overlay',
    'all_completed',
    'dab09852-eeb2-431f-b2f4-b881c6b4aa7f',
    'a1b2c3d4-0003-4000-8000-000000000001',
    '#6366f1',
    'graduation-cap'
  )
  RETURNING id
)
INSERT INTO public.challenge_track_membership (track_id, challenge_id)
SELECT t3.id, c FROM t3, unnest(ARRAY[
  'bcb4a446-d0b7-4432-bedb-4f7ce42ff557',
  '452f8199-9e08-484c-bf8c-887cb24ad3ce',
  '7c7ae072-81a1-4dac-8307-268266a786e6',
  'd098fcac-09a6-41b3-b196-97b98e4435e1'
]) AS c;

-- Seed Track 4: Fiber Optics Construction (per_challenge)
WITH t4 AS (
  INSERT INTO public.challenge_tracks (track_key, name, gate_mode, course_id, accent_color, icon_name)
  VALUES (
    'fiber_optics_construction',
    'Fiber Optics Construction',
    'per_challenge',
    'dab09852-eeb2-431f-b2f4-b881c6b4aa7f',
    '#6366f1',
    'graduation-cap'
  )
  RETURNING id
)
INSERT INTO public.challenge_track_membership (track_id, challenge_id)
SELECT t4.id, c FROM t4, unnest(ARRAY[
  '02481a75-383c-485a-bdff-f0a4dd2b9121',
  '1c899b1a-a527-4023-aeb4-43d387993578',
  '260d4700-7f7a-431f-9768-097284293cd6',
  'e18786a7-043f-4900-8a07-c892c36af1b9',
  'ae4c4228-f107-4f31-ae3d-ec819b0b6863',
  '2a7c0a85-8f05-4c15-965b-e94f72f3672f',
  '858d2e0d-6d78-4d7f-8377-0dc40ab269dd',
  '034e8cf3-8832-4c05-a572-67af46dc9971',
  'c8298ef1-d359-4536-958f-533e66f7ee4a',
  '5e9ace81-fcc3-49f9-9013-5321d2e04d56',
  'd8b601c3-ff40-46c6-aa4b-55da7711c8ce',
  '57da5f29-5a4e-4148-a738-319e7a33252c',
  '4ce440c1-be75-4700-a8fa-4a80f6d1fbde'
]) AS c;
