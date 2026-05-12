
-- 1. sim_categories table
create table public.sim_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  subtitle text,
  icon_key text not null default 'target',
  accent_color text not null default '#F59E0B',
  display_order int not null default 0,
  default_game_titles game_title[] not null default '{}',
  deep_dive_resources jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sim_categories enable row level security;

create policy "sim_categories viewable by everyone"
  on public.sim_categories for select using (true);

create policy "Admins can insert sim_categories"
  on public.sim_categories for insert
  with check (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'super_admin'::app_role));

create policy "Admins can update sim_categories"
  on public.sim_categories for update
  using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'super_admin'::app_role));

create policy "Admins can delete sim_categories"
  on public.sim_categories for delete
  using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'super_admin'::app_role));

create trigger update_sim_categories_updated_at
  before update on public.sim_categories
  for each row execute function public.update_updated_at_column();

-- 2. per-challenge override
alter table public.work_orders
  add column category_key text references public.sim_categories(key)
    on update cascade on delete set null;

create index idx_work_orders_category_key on public.work_orders(category_key);

-- 3. seed categories
insert into public.sim_categories (key, title, subtitle, icon_key, accent_color, display_order, default_game_titles, deep_dive_resources) values
  ('trucking', 'Trucking & Logistics', 'American Truck Simulator scenarios', 'truck', '#8B5CF6', 10, ARRAY['ATS']::game_title[],
    '[
      {"key":"cdlQuest","title":"CDL Quest","description":"Complete CDL curriculum with structured learning paths and telemetry tracking","href":"https://simu-cdl-path.lovable.app","accentColor":"#8B5CF6","iconKey":"graduation-cap","ctaLabel":"Start Training"},
      {"key":"cdlExchange","title":"CDL Exchange","description":"Verified credentials marketplace for employers and recruiters","href":"https://skill-truck-path.lovable.app","accentColor":"#10B981","iconKey":"briefcase","ctaLabel":"View Opportunities"}
    ]'::jsonb),
  ('agriculture', 'Agriculture', 'Farming Simulator scenarios', 'tractor', '#22C55E', 20, ARRAY['Farming_Sim']::game_title[], '[]'::jsonb),
  ('construction', 'Construction', 'Construction Simulator and Roadcraft scenarios', 'hard-hat', '#F59E0B', 30, ARRAY['Construction_Sim','Roadcraft']::game_title[], '[]'::jsonb),
  ('mechanics', 'Mechanics', 'Mechanic Simulator scenarios', 'wrench', '#EF4444', 40, ARRAY['Mechanic_Sim']::game_title[], '[]'::jsonb),
  ('broadband', 'Broadband', 'Fiber-Tech Simulator scenarios', 'cable', '#3B82F6', 50, ARRAY['Fiber_Tech']::game_title[], '[]'::jsonb);

-- 4. backfill miscategorized work_orders by title prefix
update public.work_orders set game_title = 'Construction_Sim' where game_title = 'ATS' and title ilike 'CS -%';
update public.work_orders set game_title = 'Farming_Sim'      where game_title = 'ATS' and title ilike 'FS25%';
update public.work_orders set game_title = 'Roadcraft'        where game_title = 'Fiber_Tech' and title ilike 'RC %';
