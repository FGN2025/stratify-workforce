CREATE OR REPLACE FUNCTION public.enforce_work_order_publication_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues text[];
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active IS TRUE THEN
    RAISE EXCEPTION 'Cannot publish a new Work Order before its tasks are saved. Save it as Hidden, then publish after completing the title, summary, image, and task briefs.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.is_active IS TRUE
     AND OLD.is_active IS DISTINCT FROM TRUE THEN
    v_issues := public.work_order_publication_issues(NEW.id);

    IF coalesce(array_length(v_issues, 1), 0) > 0 THEN
      RAISE EXCEPTION 'Cannot publish this Work Order. Add %.', array_to_string(v_issues, ', ')
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_work_order_publication_readiness() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_work_order_publication_readiness() TO service_role;