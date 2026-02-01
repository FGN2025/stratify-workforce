-- Phase 2: Extend category types enum
ALTER TYPE public.community_category_type ADD VALUE IF NOT EXISTS 'school';
ALTER TYPE public.community_category_type ADD VALUE IF NOT EXISTS 'employer';
ALTER TYPE public.community_category_type ADD VALUE IF NOT EXISTS 'training_center';
ALTER TYPE public.community_category_type ADD VALUE IF NOT EXISTS 'government';
ALTER TYPE public.community_category_type ADD VALUE IF NOT EXISTS 'nonprofit';

-- Phase 3: Extend membership roles enum
ALTER TYPE public.community_membership_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE public.community_membership_role ADD VALUE IF NOT EXISTS 'employee';
ALTER TYPE public.community_membership_role ADD VALUE IF NOT EXISTS 'apprentice';
ALTER TYPE public.community_membership_role ADD VALUE IF NOT EXISTS 'instructor';
ALTER TYPE public.community_membership_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.community_membership_role ADD VALUE IF NOT EXISTS 'subscriber';
ALTER TYPE public.community_membership_role ADD VALUE IF NOT EXISTS 'owner';