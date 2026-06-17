
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_dark_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS font_heading text,
  ADD COLUMN IF NOT EXISTS font_body text,
  ADD COLUMN IF NOT EXISTS nav_app_name text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS terms_url text,
  ADD COLUMN IF NOT EXISTS privacy_url text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS scorm_destinations jsonb;

COMMENT ON COLUMN public.tenants.nav_app_name IS 'Override for the in-app product name (e.g. "COX Skills"). Falls back to name.';
COMMENT ON COLUMN public.tenants.scorm_destinations IS 'Per-tenant SCORM brand tokens overrides; consumed by scorm-build edge function.';
