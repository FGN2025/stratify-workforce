-- Phase 1: Add developer to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';

-- Phase 2: Add owner_id column to authorized_apps table
ALTER TABLE public.authorized_apps 
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;