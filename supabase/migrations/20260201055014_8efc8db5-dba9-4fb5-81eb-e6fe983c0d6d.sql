-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create site_media table for centralized media management
CREATE TABLE public.site_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'youtube', 'audio')),
  url TEXT NOT NULL,
  alt_text TEXT,
  title TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_media ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view media URLs for site display)
CREATE POLICY "Site media is viewable by everyone"
ON public.site_media
FOR SELECT
USING (true);

-- Admin-only insert
CREATE POLICY "Admins can insert site media"
ON public.site_media
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only update
CREATE POLICY "Admins can update site media"
ON public.site_media
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only delete
CREATE POLICY "Admins can delete site media"
ON public.site_media
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_site_media_updated_at
BEFORE UPDATE ON public.site_media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create media-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-assets', 'media-assets', true);

-- Storage policies for media-assets bucket
-- Public read access
CREATE POLICY "Media assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'media-assets');

-- Admin-only upload
CREATE POLICY "Admins can upload media assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'media-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin-only update
CREATE POLICY "Admins can update media assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'media-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin-only delete
CREATE POLICY "Admins can delete media assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'media-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Seed default media records for existing hardcoded images
INSERT INTO public.site_media (location_key, media_type, url, title, alt_text) VALUES
-- Hero images
('home_hero_image', 'image', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=600&fit=crop', 'Home Hero Background', 'Industrial training facility'),
('leaderboard_hero', 'image', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&h=400&fit=crop', 'Leaderboard Hero Background', 'Construction site panorama'),
('profile_hero', 'image', 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&h=400&fit=crop', 'Profile Hero Background', 'Truck on highway'),
('students_hero', 'image', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=400&fit=crop', 'Students Hero Background', 'Industrial training'),
('work_orders_hero', 'image', 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1600&h=400&fit=crop', 'Work Orders Hero Background', 'Mechanic workshop'),
-- Game cover images
('ats_cover', 'image', 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=400&fit=crop', 'ATS Cover Image', 'American Truck Simulator highway scene'),
('farming_sim_cover', 'image', 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=400&fit=crop', 'Farming Sim Cover Image', 'Farm field at sunset'),
('construction_sim_cover', 'image', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=400&fit=crop', 'Construction Sim Cover Image', 'Construction equipment at work'),
('mechanic_sim_cover', 'image', 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&h=400&fit=crop', 'Mechanic Sim Cover Image', 'Auto repair workshop');