CREATE OR REPLACE FUNCTION public.get_leaderboard_data(_game_title text DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  employability_score numeric,
  total_play_time_hours numeric,
  total_xp integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    COALESCE(p.employability_score, 0) AS employability_score,
    COALESCE(ROUND(SUM(ugs.total_play_time_minutes) / 60.0, 1), 0) AS total_play_time_hours,
    COALESCE((SELECT SUM(amount)::integer FROM user_points WHERE user_id = p.id AND points_type = 'xp'), 0) AS total_xp
  FROM profiles p
  LEFT JOIN user_game_stats ugs ON ugs.user_id = p.id
    AND (_game_title IS NULL OR ugs.game_title::text = _game_title)
  WHERE _game_title IS NULL
    OR EXISTS (SELECT 1 FROM user_game_stats g WHERE g.user_id = p.id AND g.game_title::text = _game_title)
  GROUP BY p.id, p.username, p.avatar_url, p.employability_score
  ORDER BY COALESCE(p.employability_score, 0) DESC;
$$;