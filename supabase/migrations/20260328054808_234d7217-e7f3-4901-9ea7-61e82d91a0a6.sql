
-- Webhook subscriptions table
CREATE TABLE public.webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_slug text NOT NULL REFERENCES authorized_apps(app_slug) ON DELETE CASCADE,
  webhook_url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_slug, webhook_url)
);

-- Webhook delivery log
CREATE TABLE public.webhook_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status_code integer,
  response_body text,
  attempt_number integer NOT NULL DEFAULT 1,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_log ENABLE ROW LEVEL SECURITY;

-- Webhook subscriptions: admins + service role can manage
CREATE POLICY "Service role full access on webhook_subscriptions"
  ON public.webhook_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage webhook subscriptions"
  ON public.webhook_subscriptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "App owners can view own webhooks"
  ON public.webhook_subscriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM authorized_apps aa
    WHERE aa.app_slug = webhook_subscriptions.app_slug
    AND aa.owner_id = auth.uid()
  ));

-- Delivery log: admins + service role
CREATE POLICY "Service role full access on webhook_delivery_log"
  ON public.webhook_delivery_log FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view webhook delivery logs"
  ON public.webhook_delivery_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_webhook_subs_events ON public.webhook_subscriptions USING GIN (events);
CREATE INDEX idx_webhook_delivery_sub ON public.webhook_delivery_log (subscription_id, created_at DESC);
