-- Fix 1: Restrict audit log inserts to authenticated users
DROP POLICY IF EXISTS "System can insert audit logs" ON public.system_audit_logs;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.system_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix 2: Restrict game stats visibility
DROP POLICY IF EXISTS "Users can view all game stats" ON public.user_game_stats;

CREATE POLICY "Users can view their own game stats"
ON public.user_game_stats
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 3: Add explicit INSERT policy for discord connections
CREATE POLICY "Users can create own discord connection"
ON public.user_discord_connections
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());