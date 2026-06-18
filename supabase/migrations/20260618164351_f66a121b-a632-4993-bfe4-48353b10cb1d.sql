ALTER TABLE public.sim_categories
  ADD COLUMN IF NOT EXISTS sidebar_label text,
  ADD COLUMN IF NOT EXISTS show_in_sidebar boolean NOT NULL DEFAULT true;