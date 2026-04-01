
-- 1. Fix leaderboard embed token exposure
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Active embeds are viewable by token" ON leaderboard_embed_configs;

-- Create a SECURITY DEFINER RPC to validate tokens server-side
CREATE OR REPLACE FUNCTION public.get_embed_config(p_token text)
RETURNS TABLE(
  id uuid,
  title text,
  theme text,
  display_count integer,
  show_avatars boolean,
  show_change boolean,
  game_title text,
  tenant_id uuid,
  work_order_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    lec.id,
    lec.title,
    lec.theme,
    lec.display_count,
    lec.show_avatars,
    lec.show_change,
    lec.game_title::text,
    lec.tenant_id,
    lec.work_order_id
  FROM leaderboard_embed_configs lec
  WHERE lec.embed_token = p_token 
    AND lec.is_active = true
    AND (lec.expires_at IS NULL OR lec.expires_at > now());
$$;

-- 2. Fix audit log forgery - enforce actor_id matches auth.uid()
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON system_audit_logs;

CREATE POLICY "Authenticated users can insert own audit logs"
ON system_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

-- 3. Fix user achievements public read exposure
DROP POLICY IF EXISTS "Everyone can view all earned achievements" ON user_achievements;

CREATE POLICY "Authenticated users can view all achievements"
ON user_achievements
FOR SELECT
TO authenticated
USING (true);
