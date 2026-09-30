-- 1/2: quarantine + atomic delivery claim
ALTER TABLE public.learning_source_pull_attempts
  ADD COLUMN IF NOT EXISTS error_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ls_attempt_delivery
  ON public.learning_source_pull_attempts (source_slug, action, external_attempt_id)
  WHERE external_attempt_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_learning_source_attempt(
  p_source_slug text, p_action text, p_delivery_id text, p_request jsonb
) RETURNS TABLE(attempt_id uuid, claimed boolean, prior_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_status text;
BEGIN
  IF p_delivery_id IS NULL THEN
    INSERT INTO learning_source_pull_attempts (source_slug, direction, action, status, request)
    VALUES (p_source_slug, 'inbound', p_action, 'processing', p_request) RETURNING id INTO v_id;
    RETURN QUERY SELECT v_id, true, NULL::text; RETURN;
  END IF;

  INSERT INTO learning_source_pull_attempts (source_slug, direction, action, external_attempt_id, status, request)
  VALUES (p_source_slug, 'inbound', p_action, p_delivery_id, 'processing', p_request)
  ON CONFLICT (source_slug, action, external_attempt_id) WHERE external_attempt_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, true, NULL::text; RETURN;
  END IF;

  SELECT id, status INTO v_id, v_status FROM learning_source_pull_attempts
   WHERE source_slug = p_source_slug AND action = p_action AND external_attempt_id = p_delivery_id
   FOR UPDATE;

  IF v_status = 'failed' THEN
    UPDATE learning_source_pull_attempts
       SET error_history = error_history || jsonb_build_array(jsonb_build_object('at', now(), 'status', status, 'error', error, 'response', response)),
           status = 'processing', error = NULL, request = p_request
     WHERE id = v_id;
    RETURN QUERY SELECT v_id, true, 'failed'::text; RETURN;
  END IF;

  RETURN QUERY SELECT v_id, false, v_status;
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_learning_source_attempt(text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_learning_source_attempt(text,text,text,jsonb) TO service_role;

-- Previously record-only unverified rows become quarantined (never replayed).
UPDATE public.learning_source_pull_attempts
   SET status = 'quarantined'
 WHERE status = 'shadow' AND response->>'reason' = 'signature_not_verified';

-- 4: pilot reward pathway + server-only non-legacy pathways
ALTER TABLE public.user_points DROP CONSTRAINT IF EXISTS user_points_award_pathway_check;
ALTER TABLE public.user_points ADD CONSTRAINT user_points_award_pathway_check
  CHECK (award_pathway IN ('legacy_completion','evidence_model','redemption','reversal','pilot_review_reward'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_pilot_reward_once
  ON public.user_points (user_id, source_id) WHERE award_pathway = 'pilot_review_reward';

CREATE OR REPLACE FUNCTION public.enforce_award_flow_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF NEW.award_pathway = 'evidence_model' THEN
    RAISE EXCEPTION 'award_pathway=evidence_model is disabled while Skill Verification is dormant (no credential or XP may be minted from partner evidence)';
  END IF;
  IF TG_TABLE_NAME = 'skill_credentials' THEN
    IF NEW.award_pathway = 'pilot_review_reward' THEN
      RAISE EXCEPTION 'pilot_review_reward never mints credentials';
    END IF;
    RETURN NEW;
  END IF;
  -- user_points: only legacy completions may come from a signed-in client.
  IF v_role IN ('authenticated','anon') AND NEW.award_pathway <> 'legacy_completion' THEN
    RAISE EXCEPTION 'award_pathway % is server-authorized only', NEW.award_pathway;
  END IF;
  IF NEW.award_pathway = 'pilot_review_reward' THEN
    IF NEW.points_type = 'xp' THEN
      RAISE EXCEPTION 'pilot_review_reward cannot grant XP';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM task_demonstrations d
       WHERE d.id = NEW.source_id AND d.user_id = NEW.user_id
         AND d.status = 'demonstrated' AND d.review_completed_at IS NOT NULL
         AND d.work_order_id = 'f98c218c-2c64-4fde-a1c4-cdfada0658b6'
    ) THEN
      RAISE EXCEPTION 'pilot_review_reward requires an accepted review on the Excavation & Trenching pilot';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.award_pilot_review_reward(p_demonstration_id uuid, p_amount integer DEFAULT 50)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_d record; v_id uuid;
BEGIN
  SELECT * INTO v_d FROM task_demonstrations WHERE id = p_demonstration_id;
  IF v_d IS NULL THEN RAISE EXCEPTION 'demonstration not found'; END IF;
  INSERT INTO user_points (user_id, points_type, amount, source_type, source_id, description, event_key, award_pathway, tenant_id, origin_site)
  VALUES (v_d.user_id, 'credits', p_amount, 'work_order', v_d.id, 'Pilot review reward',
          'pilot_review:' || v_d.id, 'pilot_review_reward', v_d.tenant_id, 'academy')
  ON CONFLICT (user_id, source_id) WHERE award_pathway = 'pilot_review_reward' DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.award_pilot_review_reward(uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_pilot_review_reward(uuid,integer) TO service_role;

-- Atomic redemption (spend currency: credits)
CREATE OR REPLACE FUNCTION public.redeem_points(p_option_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_opt record; v_bal bigint; v_ledger uuid; v_red uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'sign-in required'; END IF;
  SELECT * INTO v_opt FROM program_redemption_options WHERE id = p_option_id AND is_active;
  IF v_opt IS NULL THEN RAISE EXCEPTION 'option unavailable'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('redeem:' || v_uid::text, 0));
  IF v_opt.kind = 'pathway_step' AND v_opt.requires_reviewed_evidence AND NOT EXISTS (
    SELECT 1 FROM task_demonstrations WHERE user_id = v_uid AND status = 'demonstrated' AND review_completed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'this pathway step requires accepted reviewed evidence';
  END IF;
  SELECT coalesce(sum(amount),0) INTO v_bal FROM user_points WHERE user_id = v_uid AND points_type = 'credits';
  IF v_bal < v_opt.cost THEN RAISE EXCEPTION 'insufficient points'; END IF;
  INSERT INTO user_points (user_id, points_type, amount, source_type, source_id, description, event_key, award_pathway, program_id)
  VALUES (v_uid, 'credits', -v_opt.cost, 'redemption', v_opt.id, 'Redeemed: ' || v_opt.name,
          'redeem:' || gen_random_uuid(), 'redemption', v_opt.program_id)
  RETURNING id INTO v_ledger;
  INSERT INTO points_redemptions (user_id, option_id, cost, ledger_entry_id)
  VALUES (v_uid, v_opt.id, v_opt.cost, v_ledger) RETURNING id INTO v_red;
  RETURN v_red;
END $$;
REVOKE EXECUTE ON FUNCTION public.redeem_points(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_points(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reverse_redemption(p_redemption_id uuid, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_r record; v_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'platform admin required';
  END IF;
  SELECT * INTO v_r FROM points_redemptions WHERE id = p_redemption_id FOR UPDATE;
  IF v_r IS NULL OR v_r.status IN ('reversed','rejected') THEN RAISE EXCEPTION 'not reversible'; END IF;
  INSERT INTO user_points (user_id, points_type, amount, source_type, source_id, description, event_key, award_pathway, reverses_entry_id)
  VALUES (v_r.user_id, 'credits', v_r.cost, 'redemption', v_r.id, 'Refund', 'refund:' || v_r.id, 'reversal', v_r.ledger_entry_id)
  RETURNING id INTO v_id;
  UPDATE points_redemptions SET status = 'reversed', decided_by = auth.uid(), decided_at = now(), note = p_note WHERE id = v_r.id;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.reverse_redemption(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_redemption(uuid,text) TO authenticated;

-- 5: expiring post-auth destinations
CREATE TABLE public.post_auth_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.post_auth_intents TO service_role;
ALTER TABLE public.post_auth_intents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.create_post_auth_intent(p_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_path IS NULL OR p_path !~ '^/(workspace|learn|work-orders|profile|programs|settings|events|communities|careers|sim)(/[A-Za-z0-9_-]+)*$' THEN
    RAISE EXCEPTION 'destination not permitted';
  END IF;
  DELETE FROM post_auth_intents WHERE expires_at < now();
  INSERT INTO post_auth_intents (path) VALUES (p_path) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.resolve_post_auth_intent(p_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT path FROM post_auth_intents WHERE id = p_id AND expires_at > now()
$$;
GRANT EXECUTE ON FUNCTION public.create_post_auth_intent(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_post_auth_intent(uuid) TO anon, authenticated;