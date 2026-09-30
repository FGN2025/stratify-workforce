ALTER TABLE public.points_redemptions ADD COLUMN IF NOT EXISTS request_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_points_redemptions_request_key ON public.points_redemptions (user_id, request_key) WHERE request_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.redeem_points(p_option_id uuid, p_request_key text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_opt record; v_bal bigint; v_ledger uuid; v_red uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'sign-in required'; END IF;
  SELECT * INTO v_opt FROM program_redemption_options WHERE id = p_option_id AND is_active;
  IF v_opt IS NULL THEN RAISE EXCEPTION 'option unavailable'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('redeem:' || v_uid::text, 0));
  IF p_request_key IS NOT NULL THEN
    SELECT id INTO v_red FROM points_redemptions WHERE user_id = v_uid AND request_key = p_request_key;
    IF v_red IS NOT NULL THEN RETURN v_red; END IF;
  END IF;
  IF v_opt.kind = 'pathway_step' AND v_opt.requires_reviewed_evidence AND NOT EXISTS (
    SELECT 1 FROM task_demonstrations WHERE user_id = v_uid AND status = 'demonstrated' AND review_completed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'this pathway step requires accepted reviewed evidence';
  END IF;
  SELECT coalesce(sum(amount),0) INTO v_bal FROM user_points WHERE user_id = v_uid AND points_type = 'credits';
  IF v_bal < v_opt.cost THEN RAISE EXCEPTION 'insufficient points'; END IF;
  INSERT INTO user_points (user_id, points_type, amount, source_type, source_id, description, event_key, award_pathway, program_id)
  VALUES (v_uid, 'credits', -v_opt.cost, 'redemption', v_opt.id, 'Redeemed: ' || v_opt.name,
          'redeem:' || coalesce(v_uid::text || ':' || p_request_key, gen_random_uuid()::text), 'redemption', v_opt.program_id)
  RETURNING id INTO v_ledger;
  INSERT INTO points_redemptions (user_id, option_id, cost, ledger_entry_id, request_key)
  VALUES (v_uid, v_opt.id, v_opt.cost, v_ledger, p_request_key) RETURNING id INTO v_red;
  RETURN v_red;
END $$;
DROP FUNCTION IF EXISTS public.redeem_points(uuid);
REVOKE EXECUTE ON FUNCTION public.redeem_points(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_points(uuid, text) TO authenticated;