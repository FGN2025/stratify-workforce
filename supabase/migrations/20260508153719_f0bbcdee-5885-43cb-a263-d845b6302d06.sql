
CREATE TABLE public.challenge_lesson_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  play_challenge_id text NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (play_challenge_id, lesson_id)
);

CREATE INDEX idx_challenge_lesson_mappings_active
  ON public.challenge_lesson_mappings (play_challenge_id)
  WHERE is_active = true;

ALTER TABLE public.challenge_lesson_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage challenge lesson mappings"
  ON public.challenge_lesson_mappings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated users can read active mappings"
  ON public.challenge_lesson_mappings
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE TRIGGER trg_challenge_lesson_mappings_updated_at
  BEFORE UPDATE ON public.challenge_lesson_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed from current hardcoded CHALLENGE_LESSON_MAP in sync-challenge-completion
INSERT INTO public.challenge_lesson_mappings (play_challenge_id, lesson_id, notes)
VALUES
  ('034e8cf3-8832-4c05-a572-67af46dc9971', '2eb52508-7822-429c-b95f-be65d63bfb2d', 'CE-01: CS Fiber — Underground Conduit Systems and Bedding Standards'),
  ('c8298ef1-d359-4536-958f-533e66f7ee4a', 'e4332a97-b389-4486-a8f0-304185c7dd52', 'CE-02: RC Fiber — Aerial Route Assessment and Pole Line Evaluation'),
  ('5e9ace81-fcc3-49f9-9013-5321d2e04d56', '529bb1c4-ff45-4641-840c-edce7a97c39b', 'CE-03: CS Fiber — Pre-Construction Safety and 811 Compliance'),
  ('d8b601c3-ff40-46c6-aa4b-55da7711c8ce', 'fb955601-7957-4d05-a748-fe4c4e64d88d', 'CE-05: CS Fiber — Directional Bore Planning and HDD Site Operations'),
  ('57da5f29-5a4e-4148-a738-319e7a33252c', '0e1a2041-ca0b-4c49-8d07-73fe1fd51d1b', 'CE-06 CS: CS Fiber — OSP Handoff'),
  ('4ce440c1-be75-4700-a8fa-4a80f6d1fbde', '0e1a2041-ca0b-4c49-8d07-73fe1fd51d1b', 'CE-06 RC: RC Fiber — Cable Run Documentation')
ON CONFLICT (play_challenge_id, lesson_id) DO NOTHING;
