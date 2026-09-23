
CREATE OR REPLACE FUNCTION public.resolve_canonical_skill(p_skill_key text, p_game public.game_title DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT canonical_skill_id FROM public.skill_aliases
  WHERE alias_key = p_skill_key
    AND (game_title = p_game OR game_title IS NULL)
  ORDER BY (game_title IS NOT NULL) DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_canonical_skill(text, public.game_title) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_canonical_skill(text, public.game_title) TO authenticated, service_role;
