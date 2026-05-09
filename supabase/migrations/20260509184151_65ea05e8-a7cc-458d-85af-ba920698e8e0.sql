
CREATE TABLE public.notebook_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('hit','miss','skip')),
  reason text,
  context_type text,
  game_title text,
  persona_id uuid REFERENCES public.ai_persona_configs(id) ON DELETE SET NULL,
  notebook_id text,
  citation_count integer NOT NULL DEFAULT 0,
  latency_ms integer,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notebook_attempts_created_at ON public.notebook_attempts (created_at DESC);
CREATE INDEX idx_notebook_attempts_game_title ON public.notebook_attempts (game_title);
CREATE INDEX idx_notebook_attempts_context_type ON public.notebook_attempts (context_type);
CREATE INDEX idx_notebook_attempts_status ON public.notebook_attempts (status);

ALTER TABLE public.notebook_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notebook attempts"
ON public.notebook_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
