
CREATE TABLE public.breakroom_sync_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breakroom_quiz_id integer NOT NULL,
  breakroom_user_id integer NOT NULL,
  fgn_user_id uuid NOT NULL,
  sync_outcome text NOT NULL,
  fgn_result text,
  bbw_result text,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 1,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT breakroom_sync_attempts_quiz_user_unique UNIQUE (breakroom_quiz_id, breakroom_user_id)
);

CREATE INDEX idx_breakroom_sync_attempts_user_quiz
  ON public.breakroom_sync_attempts (breakroom_user_id, breakroom_quiz_id);

CREATE INDEX idx_breakroom_sync_attempts_outcome
  ON public.breakroom_sync_attempts (sync_outcome);

ALTER TABLE public.breakroom_sync_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync attempts"
  ON public.breakroom_sync_attempts
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
