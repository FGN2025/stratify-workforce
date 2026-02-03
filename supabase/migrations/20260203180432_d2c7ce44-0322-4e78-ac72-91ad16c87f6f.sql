-- Add admin RLS policies for Discord connections management

-- Super admins can view all Discord connections
CREATE POLICY "Super admins can view all discord connections"
ON public.user_discord_connections FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can update Discord connections (toggle active status)
CREATE POLICY "Super admins can update discord connections"
ON public.user_discord_connections FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can delete any Discord connection (or users their own)
CREATE POLICY "Users and super admins can delete discord connections"
ON public.user_discord_connections FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'super_admin')
);