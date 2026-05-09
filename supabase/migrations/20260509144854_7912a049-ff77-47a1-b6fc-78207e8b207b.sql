ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS event_key text;

COMMENT ON COLUMN public.user_points.event_key IS
  'Idempotency key for XP awards. Conventions:
   breakroom:wo:<work_order_id>:quiz:<breakroom_quiz_id>
   breakroom:achv:<achievement_id>:quiz:<breakroom_quiz_id>
   scorm:first-pass:<course_id>:<user_id>
   Legacy rows leave this NULL; partial unique index ignores NULLs.';

CREATE UNIQUE INDEX IF NOT EXISTS user_points_user_event_key_uidx
  ON public.user_points (user_id, event_key)
  WHERE event_key IS NOT NULL;