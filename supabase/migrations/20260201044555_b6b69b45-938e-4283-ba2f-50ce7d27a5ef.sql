-- Create enum for game titles
CREATE TYPE public.game_title AS ENUM ('ATS', 'Farming_Sim', 'Construction_Sim', 'Mechanic_Sim');

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  brand_color TEXT NOT NULL DEFAULT '#10b981',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  username TEXT,
  avatar_url TEXT,
  employability_score FLOAT DEFAULT 50 CHECK (employability_score >= 0 AND employability_score <= 100),
  skills JSONB DEFAULT '{"safety": 50, "efficiency": 50, "precision": 50, "speed": 50, "equipment_care": 50}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create work_orders table
CREATE TABLE public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  game_title public.game_title NOT NULL,
  success_criteria JSONB DEFAULT '{"min_score": 80, "max_damage": 5}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create telemetry_sessions table
CREATE TABLE public.telemetry_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  final_score FLOAT CHECK (final_score >= 0 AND final_score <= 100),
  raw_data JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_sessions ENABLE ROW LEVEL SECURITY;

-- Tenants are readable by everyone (for theme loading)
CREATE POLICY "Tenants are viewable by everyone" 
ON public.tenants 
FOR SELECT 
USING (true);

-- Profiles policies
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Work orders are viewable by everyone or within tenant
CREATE POLICY "Work orders are viewable by everyone" 
ON public.work_orders 
FOR SELECT 
USING (true);

-- Telemetry sessions policies
CREATE POLICY "Users can view their own sessions" 
ON public.telemetry_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" 
ON public.telemetry_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.telemetry_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed tenant data
INSERT INTO public.tenants (name, slug, brand_color, logo_url) VALUES
  ('FGN Global', 'fgn', '#10b981', NULL),
  ('Cox Broadband', 'cox', '#3b82f6', NULL),
  ('Caterpillar Academy', 'caterpillar', '#eab308', NULL);

-- Seed some sample work orders
INSERT INTO public.work_orders (tenant_id, title, description, game_title, success_criteria) VALUES
  ((SELECT id FROM tenants WHERE slug = 'fgn'), 'Cross-Country Freight Delivery', 'Complete a long-haul delivery from Los Angeles to New York with minimal fuel consumption.', 'ATS', '{"min_score": 85, "max_damage": 3, "fuel_efficiency": 8.5}'),
  ((SELECT id FROM tenants WHERE slug = 'cox'), 'Fiber Line Installation', 'Navigate to customer location and complete fiber optic cable installation scenario.', 'ATS', '{"min_score": 80, "max_damage": 5, "time_limit": 3600}'),
  ((SELECT id FROM tenants WHERE slug = 'caterpillar'), 'Excavator Foundation Dig', 'Complete foundation excavation within tolerance specifications.', 'Construction_Sim', '{"min_score": 90, "max_damage": 2, "precision": 0.95}'),
  ((SELECT id FROM tenants WHERE slug = 'fgn'), 'Farm Equipment Maintenance', 'Complete seasonal maintenance on harvester and tractor fleet.', 'Mechanic_Sim', '{"min_score": 75, "max_damage": 10}'),
  (NULL, 'Open Highway Challenge', 'Global competition - fastest safe delivery wins.', 'ATS', '{"min_score": 70, "max_damage": 5}')