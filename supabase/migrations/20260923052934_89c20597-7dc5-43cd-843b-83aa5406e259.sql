
CREATE OR REPLACE FUNCTION public.studio_rate_limit_hit(p_hash text, p_window timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO public.studio_rate_limit (token_hash, window_start, request_count)
  VALUES (p_hash, p_window, 1)
  ON CONFLICT (token_hash, window_start)
  DO UPDATE SET request_count = public.studio_rate_limit.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.studio_rate_limit_hit(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_rate_limit_hit(text, timestamptz) TO service_role;
