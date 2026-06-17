
CREATE OR REPLACE FUNCTION public.user_tenant_id(p_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM profiles WHERE id = p_user AND tenant_id IS NOT NULL),
    (SELECT tenant_id FROM community_memberships
       WHERE user_id = p_user AND request_status = 'approved'
       ORDER BY joined_at ASC NULLS LAST LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_or_user_tenant(p_user uuid DEFAULT auth.uid())
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(public.current_tenant_id(p_user), public.user_tenant_id(p_user)); $$;

-- telemetry_sessions
ALTER TABLE public.telemetry_sessions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.telemetry_sessions ts SET tenant_id = COALESCE(public.user_tenant_id(ts.user_id),'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'::uuid) WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_tenant ON public.telemetry_sessions(tenant_id);
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.telemetry_sessions;
CREATE POLICY "Tenant admins view tenant sessions" ON public.telemetry_sessions FOR SELECT
USING (has_role(auth.uid(),'super_admin'::app_role) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)));

-- skill_credentials
ALTER TABLE public.skill_credentials ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.skill_credentials sc SET tenant_id = COALESCE(public.user_tenant_id(sp.user_id),'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'::uuid)
FROM public.skill_passport sp WHERE sc.passport_id = sp.id AND sc.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_skill_credentials_tenant ON public.skill_credentials(tenant_id);
CREATE POLICY "Tenant admins view tenant credentials" ON public.skill_credentials FOR SELECT
USING (has_role(auth.uid(),'super_admin'::app_role) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)));

-- work_order_evidence
ALTER TABLE public.work_order_evidence ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_work_order_evidence_tenant ON public.work_order_evidence(tenant_id);
CREATE POLICY "Tenant admins view tenant evidence" ON public.work_order_evidence FOR SELECT
USING (has_role(auth.uid(),'super_admin'::app_role) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)));

-- simulations
ALTER TABLE public.simulations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.simulations s SET tenant_id = COALESCE(wo.owner_tenant_id,'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'::uuid)
FROM public.work_orders wo WHERE s.work_order_id = wo.id AND s.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_simulations_tenant ON public.simulations(tenant_id);

-- tutor_conversations
ALTER TABLE public.tutor_conversations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.tutor_conversations tc SET tenant_id = COALESCE(public.user_tenant_id(tc.user_id),'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'::uuid) WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_tenant ON public.tutor_conversations(tenant_id);
CREATE POLICY "Tenant admins view tenant conversations" ON public.tutor_conversations FOR SELECT
USING (has_role(auth.uid(),'super_admin'::app_role) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)));

-- authorized_apps
ALTER TABLE public.authorized_apps ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.authorized_apps aa SET tenant_id = COALESCE(public.user_tenant_id(aa.owner_id),'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'::uuid) WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_authorized_apps_tenant ON public.authorized_apps(tenant_id);
DROP POLICY IF EXISTS "Admins can view all authorized apps" ON public.authorized_apps;
CREATE POLICY "Tenant admins view tenant authorized apps" ON public.authorized_apps FOR SELECT
USING (has_role(auth.uid(),'super_admin'::app_role) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)));

-- webhook_subscriptions (links via app_slug -> authorized_apps.app_slug)
ALTER TABLE public.webhook_subscriptions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.webhook_subscriptions ws SET tenant_id = COALESCE(aa.tenant_id,'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'::uuid)
FROM public.authorized_apps aa WHERE ws.app_slug = aa.app_slug AND ws.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_tenant ON public.webhook_subscriptions(tenant_id);
DROP POLICY IF EXISTS "Admins can manage webhook subscriptions" ON public.webhook_subscriptions;
CREATE POLICY "Tenant admins manage tenant webhooks" ON public.webhook_subscriptions FOR ALL
USING (has_role(auth.uid(),'super_admin'::app_role) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)))
WITH CHECK (has_role(auth.uid(),'super_admin'::app_role) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)));
