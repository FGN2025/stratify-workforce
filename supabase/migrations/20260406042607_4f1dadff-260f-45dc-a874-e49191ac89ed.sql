
-- PART 1: Trigger to auto-generate source_challenge_id on insert
CREATE OR REPLACE FUNCTION public.generate_source_challenge_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_challenge_id IS NULL THEN
    NEW.source_challenge_id := gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_source_challenge_id
  BEFORE INSERT ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_source_challenge_id();

-- PART 2: Add fgn_origin_challenge_id column
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS fgn_origin_challenge_id text;

COMMENT ON COLUMN public.work_orders.fgn_origin_challenge_id IS
  'The original challenge UUID from play.fgn.gg. Used for reference and re-sync only. source_challenge_id is always fgn.academy-owned.';

-- PART 3: Migrate imported work orders
UPDATE public.work_orders
SET
  fgn_origin_challenge_id = source_challenge_id,
  source_challenge_id = gen_random_uuid()::text
WHERE source_challenge_id IS NOT NULL;

-- PART 4: Backfill nulls
UPDATE public.work_orders
SET source_challenge_id = gen_random_uuid()::text
WHERE source_challenge_id IS NULL;
