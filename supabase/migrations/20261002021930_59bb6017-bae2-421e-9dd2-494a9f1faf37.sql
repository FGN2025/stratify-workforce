DROP POLICY IF EXISTS "System can insert points for authenticated users" ON public.user_points;
CREATE POLICY "Learners may record own XP only"
ON public.user_points FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND points_type = 'xp'
  AND amount > 0
  AND reverses_entry_id IS NULL
  AND coalesce(award_pathway, 'legacy_completion') = 'legacy_completion'
);