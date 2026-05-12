
INSERT INTO public.credential_types (type_key, display_name, description, issuer_app_slug, icon_name, accent_color, sort_order, is_active)
VALUES ('play_evidence', 'Play Evidence Verification', 'Skill verification issued when evidence submitted on play.fgn.gg is approved by a reviewer.', 'fgn-play', 'check-circle', '#22c55e', 51, true)
ON CONFLICT (type_key) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS skill_credentials_play_evidence_unique
  ON public.skill_credentials (passport_id, external_reference_id)
  WHERE credential_type_key = 'play_evidence' AND external_reference_id IS NOT NULL;
