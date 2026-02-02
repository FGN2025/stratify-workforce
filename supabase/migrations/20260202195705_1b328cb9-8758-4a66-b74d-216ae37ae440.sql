-- Create sim_resources table for managing external links per simulator game
CREATE TABLE public.sim_resources (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_title public.game_title NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    href TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'link',
    accent_color TEXT NOT NULL DEFAULT '#10b981',
    media_id UUID REFERENCES public.site_media(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by game
CREATE INDEX idx_sim_resources_game_title ON public.sim_resources(game_title);
CREATE INDEX idx_sim_resources_sort_order ON public.sim_resources(game_title, sort_order);

-- Enable Row Level Security
ALTER TABLE public.sim_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view active resources
CREATE POLICY "Active resources are viewable by everyone"
ON public.sim_resources
FOR SELECT
USING (is_active = true);

-- Admins can view all resources (including inactive)
CREATE POLICY "Admins can view all resources"
ON public.sim_resources
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert resources
CREATE POLICY "Admins can insert resources"
ON public.sim_resources
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update resources
CREATE POLICY "Admins can update resources"
ON public.sim_resources
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete resources
CREATE POLICY "Admins can delete resources"
ON public.sim_resources
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sim_resources_updated_at
BEFORE UPDATE ON public.sim_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial data from the current static config
INSERT INTO public.sim_resources (game_title, title, description, href, icon_name, accent_color, sort_order)
VALUES 
    ('ATS', 'CDL Quest', 'Complete CDL curriculum with structured learning paths and telemetry tracking', 'https://simu-cdl-path.lovable.app', 'graduation-cap', '#3B82F6', 0),
    ('ATS', 'CDL Exchange', 'Verified credentials marketplace for employers and recruiters', 'https://skill-truck-path.lovable.app', 'briefcase', '#10B981', 1);