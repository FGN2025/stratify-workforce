CREATE OR REPLACE FUNCTION public.upsert_scorm_course_bundle(
  p_course_id           uuid,
  p_work_order_id       uuid,
  p_destination         text,
  p_title               text,
  p_description         text,
  p_cover_image_url     text,
  p_scorm_version       text,
  p_manifest_url        text,
  p_bundle_id           text,
  p_generated_by        uuid,
  p_source_challenge_id uuid,
  p_ai_enhanced         jsonb,
  p_join_rows           jsonb,
  p_wipe_progress       boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Upsert scorm_courses (new build or regen)
  INSERT INTO public.scorm_courses (
    id, work_order_id, destination, title, description, cover_image_url,
    scorm_version, manifest_url, bundle_id, is_published, published_at,
    generated_by, source_challenge_id, ai_enhanced
  )
  VALUES (
    p_course_id, p_work_order_id, p_destination, p_title, p_description,
    p_cover_image_url, p_scorm_version, p_manifest_url, p_bundle_id,
    true, now(), p_generated_by, p_source_challenge_id, p_ai_enhanced
  )
  ON CONFLICT (id) DO UPDATE SET
    work_order_id       = EXCLUDED.work_order_id,
    destination         = EXCLUDED.destination,
    title               = EXCLUDED.title,
    description         = EXCLUDED.description,
    cover_image_url     = EXCLUDED.cover_image_url,
    scorm_version       = EXCLUDED.scorm_version,
    manifest_url        = EXCLUDED.manifest_url,
    bundle_id           = EXCLUDED.bundle_id,
    generated_by        = EXCLUDED.generated_by,
    source_challenge_id = EXCLUDED.source_challenge_id,
    ai_enhanced         = EXCLUDED.ai_enhanced;
    -- is_published / published_at intentionally NOT in DO UPDATE so
    -- admin-flipped unpublish state survives regen.
    -- updated_at handled by existing scorm_courses_updated_at trigger.
    -- zip_url stamped separately by post-package update in scorm-build.

  -- 2. Wipe + reinsert bundle join rows
  DELETE FROM public.scorm_course_work_orders WHERE course_id = p_course_id;

  INSERT INTO public.scorm_course_work_orders (course_id, work_order_id, position, is_lead)
  SELECT
    p_course_id,
    (row->>'work_order_id')::uuid,
    (row->>'position')::int,
    (row->>'is_lead')::boolean
  FROM jsonb_array_elements(p_join_rows) AS row;

  -- 3. Progress wipe (bundle replacement only)
  IF p_wipe_progress THEN
    DELETE FROM public.scorm_course_progress WHERE course_id = p_course_id;
  END IF;

  RETURN p_course_id;
END;
$$;

-- Service role only; toolkit edge fn is the sole caller.
REVOKE ALL ON FUNCTION public.upsert_scorm_course_bundle(
  uuid, uuid, text, text, text, text, text, text, text, uuid, uuid, jsonb, jsonb, boolean
) FROM public, authenticated, anon;