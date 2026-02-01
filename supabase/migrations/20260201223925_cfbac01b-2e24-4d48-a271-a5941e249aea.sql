-- Create enums for events module
CREATE TYPE public.event_type AS ENUM ('quest', 'head_to_head');
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'registration_open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.registration_status AS ENUM ('registered', 'confirmed', 'cancelled', 'no_show');
CREATE TYPE public.match_status AS ENUM ('pending', 'in_progress', 'completed');

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type public.event_type NOT NULL DEFAULT 'quest',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ,
  min_participants INTEGER DEFAULT 1,
  max_participants INTEGER,
  status public.event_status NOT NULL DEFAULT 'draft',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  google_calendar_event_id TEXT
);

-- Create event_registrations table
CREATE TABLE public.event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.registration_status NOT NULL DEFAULT 'registered',
  bracket_seed INTEGER,
  UNIQUE(event_id, user_id)
);

-- Create event_matches table for head-to-head brackets
CREATE TABLE public.event_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  match_order INTEGER NOT NULL,
  player1_id UUID,
  player2_id UUID,
  winner_id UUID,
  player1_score INTEGER,
  player2_score INTEGER,
  scheduled_time TIMESTAMPTZ,
  status public.match_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_scheduled_start ON public.events(scheduled_start);
CREATE INDEX idx_events_work_order_id ON public.events(work_order_id);
CREATE INDEX idx_events_tenant_id ON public.events(tenant_id);
CREATE INDEX idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX idx_event_registrations_user_id ON public.event_registrations(user_id);
CREATE INDEX idx_event_matches_event_id ON public.event_matches(event_id);

-- Add updated_at trigger for events
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for event_matches
CREATE TRIGGER update_event_matches_updated_at
  BEFORE UPDATE ON public.event_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events table
CREATE POLICY "Published events are viewable by everyone"
  ON public.events
  FOR SELECT
  USING (status != 'draft');

CREATE POLICY "Admins can view all events"
  ON public.events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert events"
  ON public.events
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update events"
  ON public.events
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete events"
  ON public.events
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for event_registrations table
CREATE POLICY "Anyone can view event registrations"
  ON public.event_registrations
  FOR SELECT
  USING (true);

CREATE POLICY "Users can register themselves for events"
  ON public.event_registrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
  ON public.event_registrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all registrations"
  ON public.event_registrations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for event_matches table
CREATE POLICY "Anyone can view event matches"
  ON public.event_matches
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert matches"
  ON public.event_matches
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update matches"
  ON public.event_matches
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete matches"
  ON public.event_matches
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for event registrations (live participant count updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;