CREATE POLICY "Users can view their own sync attempts"
  ON public.breakroom_sync_attempts
  FOR SELECT
  TO authenticated
  USING (fgn_user_id = auth.uid());