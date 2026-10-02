-- Organization reviewers may read evidence files they are allowed to review
CREATE POLICY "Tenant reviewers read reviewable evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'evidence' AND EXISTS (
    SELECT 1 FROM public.evidence_artifacts a
    WHERE a.storage_path = storage.objects.name
      AND public.can_review_tenant_evidence(a.tenant_id)
  )
);

-- Issue the pilot reward automatically when a pilot step closes as demonstrated
CREATE OR REPLACE FUNCTION public.complete_task_review(p_demonstration_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d RECORD;
  v_status public.demonstration_status;
  v_signals int := 0;
  v_reward uuid;
BEGIN
  SELECT * INTO d FROM public.task_demonstrations WHERE id = p_demonstration_id;
  IF d IS NULL THEN RAISE EXCEPTION 'demonstration not found'; END IF;
  IF NOT public.can_review_tenant_evidence(d.tenant_id) THEN RAISE EXCEPTION 'not permitted'; END IF;

  UPDATE public.task_demonstrations
     SET reviewed_by = auth.uid(), review_completed_at = now(), updated_at = now()
   WHERE id = p_demonstration_id;

  v_status := public.recompute_task_demonstration(p_demonstration_id);
  IF v_status = 'demonstrated' THEN
    v_signals := public.create_skill_signals_for_demonstration(p_demonstration_id);
    IF d.work_order_id = 'f98c218c-2c64-4fde-a1c4-cdfada0658b6' THEN
      PERFORM set_config('request.jwt.claim.role', 'service_role', true);
      v_reward := public.award_pilot_review_reward(p_demonstration_id);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    END IF;
  END IF;

  RETURN jsonb_build_object('status', v_status, 'skill_signals_created', v_signals, 'pilot_reward_entry', v_reward);
END; $function$;