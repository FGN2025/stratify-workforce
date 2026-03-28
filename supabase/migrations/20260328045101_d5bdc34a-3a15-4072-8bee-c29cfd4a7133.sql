
CREATE OR REPLACE FUNCTION public.calculate_readiness(p_user_id uuid, p_career_path_id text DEFAULT NULL::text)
 RETURNS TABLE(career_path_id text, matched_count bigint, total_count bigint, readiness_pct integer, matched_labels text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  WITH user_creds AS (
    SELECT sc.title, sc.game_title, sc.skills_verified
    FROM skill_credentials sc
    JOIN skill_passport sp ON sp.id = sc.passport_id
    WHERE sp.user_id = p_user_id
  ),
  active_tracks AS (
    SELECT DISTINCT uc.game_title::text AS track FROM user_creds uc WHERE uc.game_title IS NOT NULL
    UNION
    SELECT DISTINCT cs.game_title::text AS track FROM channel_subscriptions cs WHERE cs.user_id = p_user_id
    UNION
    SELECT DISTINCT wo.game_title::text AS track
    FROM user_task_progress utp
    JOIN work_orders wo ON wo.id = utp.work_order_id
    WHERE utp.user_id = p_user_id
  ),
  req_matches AS (
    SELECT
      r.career_path_id,
      r.display_label,
      CASE
        WHEN r.credential_match_type = 'title_contains' THEN
          EXISTS (SELECT 1 FROM user_creds uc WHERE uc.title ILIKE '%' || r.match_value || '%')
        WHEN r.credential_match_type = 'game_title' THEN
          EXISTS (SELECT 1 FROM user_creds uc WHERE uc.game_title::text = r.match_value)
        WHEN r.credential_match_type = 'skill_verified' THEN
          EXISTS (SELECT 1 FROM user_creds uc WHERE r.match_value = ANY(uc.skills_verified))
        ELSE false
      END AS is_matched
    FROM career_path_requirements r
    WHERE (p_career_path_id IS NULL OR r.career_path_id = p_career_path_id)
      AND (p_career_path_id IS NOT NULL OR r.game_title IS NULL OR r.game_title IN (SELECT track FROM active_tracks))
  )
  SELECT
    rm.career_path_id,
    COUNT(*) FILTER (WHERE rm.is_matched) AS matched_count,
    COUNT(*) AS total_count,
    CASE WHEN COUNT(*) = 0 THEN 0
      ELSE LEAST(ROUND(COUNT(*) FILTER (WHERE rm.is_matched) * 100.0 / COUNT(*))::integer, 100)
    END AS readiness_pct,
    ARRAY_AGG(rm.display_label) FILTER (WHERE rm.is_matched) AS matched_labels
  FROM req_matches rm
  GROUP BY rm.career_path_id;
$$;
