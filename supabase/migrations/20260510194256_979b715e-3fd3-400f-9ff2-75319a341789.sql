INSERT INTO public.credential_types
  (type_key, display_name, description, issuer_app_slug, icon_name, accent_color, sort_order, is_active)
VALUES
  ('play_achievement', 'Play Achievement', 'Badge earned on play.fgn.gg via challenges, quests, and tournaments.',
   'fgn-play', 'trophy', '#9333ea', 50, true)
ON CONFLICT (type_key) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
      issuer_app_slug = EXCLUDED.issuer_app_slug,
      icon_name = EXCLUDED.icon_name,
      accent_color = EXCLUDED.accent_color,
      is_active = true,
      updated_at = now();

UPDATE public.authorized_apps
   SET credential_types_allowed = ARRAY(
         SELECT DISTINCT unnest(coalesce(credential_types_allowed, '{}'::text[]) || ARRAY['play_achievement'])
       ),
       updated_at = now()
 WHERE app_slug = 'fgn-play';

-- Per-learner idempotency, scoped to play_achievement only (challenge-completion rows
-- have their own pre-existing dupe situation that is out of scope here).
CREATE UNIQUE INDEX IF NOT EXISTS skill_credentials_play_achievement_unique
  ON public.skill_credentials (passport_id, external_reference_id)
  WHERE credential_type_key = 'play_achievement' AND external_reference_id IS NOT NULL;