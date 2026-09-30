CREATE OR REPLACE FUNCTION public.work_order_publication_issues(p_work_order_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH work_order AS (
    SELECT
      coalesce(
        nullif(btrim(title), ''),
        nullif(btrim(generated_name), ''),
        nullif(btrim(metadata #>> '{play_source,name}'), '')
      ) AS display_title,
      btrim(coalesce(description, '')) AS summary,
      coalesce(
        nullif(btrim(cover_image_url), ''),
        nullif(btrim(metadata #>> '{play_source,cover_image_url}'), '')
      ) AS image_url
    FROM public.work_orders
    WHERE id = p_work_order_id
  ), task_quality AS (
    SELECT
      count(*) AS task_count,
      count(*) FILTER (
        WHERE length(btrim(title)) >= 3
          AND lower(btrim(title)) NOT IN ('untitled', 'untitled task', 'task', 'step')
          AND length(btrim(coalesce(description, ''))) >= 20
      ) AS usable_task_count
    FROM public.work_order_tasks
    WHERE work_order_id = p_work_order_id
  )
  SELECT array_remove(ARRAY[
    CASE
      WHEN w.display_title IS NULL
        OR lower(w.display_title) IN ('untitled', 'untitled work order', 'work order')
      THEN 'a meaningful title'
    END,
    CASE WHEN length(w.summary) < 40 THEN 'a summary of at least 40 characters' END,
    CASE WHEN w.image_url IS NULL THEN 'a cover image' END,
    CASE WHEN tq.task_count = 0 THEN 'at least one task' END,
    CASE
      WHEN tq.task_count > 0 AND tq.usable_task_count <> tq.task_count
      THEN 'a meaningful title and brief of at least 20 characters for every task'
    END
  ], NULL)
  FROM work_order w
  CROSS JOIN task_quality tq;
$$;

REVOKE ALL ON FUNCTION public.work_order_publication_issues(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.work_order_publication_issues(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_publication_issues(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_work_order_publication_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues text[];
BEGIN
  IF NEW.is_active IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.is_active IS DISTINCT FROM TRUE) THEN
    v_issues := public.work_order_publication_issues(NEW.id);

    IF coalesce(array_length(v_issues, 1), 0) > 0 THEN
      RAISE EXCEPTION 'Cannot publish this Work Order. Add %.', array_to_string(v_issues, ', ')
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_work_order_publication_readiness ON public.work_orders;
CREATE TRIGGER enforce_work_order_publication_readiness
BEFORE INSERT OR UPDATE OF is_active ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_work_order_publication_readiness();