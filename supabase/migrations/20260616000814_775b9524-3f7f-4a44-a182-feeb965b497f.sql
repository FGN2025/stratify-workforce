ALTER TABLE public.work_orders ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS generated_name text;
COMMENT ON COLUMN public.work_orders.generated_name IS 'AI-synthesized neutral display name. Fallback when title is NULL. Never overrides title. See docs/work-order-name-contract.md.';