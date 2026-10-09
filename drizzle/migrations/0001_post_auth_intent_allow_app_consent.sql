CREATE OR REPLACE FUNCTION public.create_post_auth_intent(p_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_path IS NULL OR NOT (
       p_path ~ '^/(workspace|learn|work-orders|profile|programs|settings|events|communities|careers|sim|apps|disciplines)(/[A-Za-z0-9_-]+)*$'
    OR p_path ~ '^/\.lovable/oauth/consent\?authorization_id=[A-Za-z0-9_-]{1,128}$'
  ) THEN
    RAISE EXCEPTION 'destination not permitted';
  END IF;
  DELETE FROM post_auth_intents WHERE expires_at < now();
  INSERT INTO post_auth_intents (path) VALUES (p_path) RETURNING id INTO v_id;
  RETURN v_id;
END $$;