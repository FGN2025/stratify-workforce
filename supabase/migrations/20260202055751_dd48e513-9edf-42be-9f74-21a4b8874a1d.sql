-- Phase 1: Evidence Collection System - Database Foundation

-- 1. Create evidence review status enum
CREATE TYPE public.evidence_review_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'needs_revision'
);

-- 2. Add evidence_requirements column to work_orders table
ALTER TABLE public.work_orders
ADD COLUMN evidence_requirements JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.work_orders.evidence_requirements IS 'JSON config: { required: boolean, min_uploads: number, max_uploads: number, allowed_types: string[], instructions: string, deadline_hours: number }';

-- 3. Create work_order_evidence table
CREATE TABLE public.work_order_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  completion_id UUID NOT NULL REFERENCES public.user_work_order_completions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_status public.evidence_review_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID DEFAULT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  reviewer_notes TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_work_order_evidence_user_id ON public.work_order_evidence(user_id);
CREATE INDEX idx_work_order_evidence_work_order_id ON public.work_order_evidence(work_order_id);
CREATE INDEX idx_work_order_evidence_completion_id ON public.work_order_evidence(completion_id);
CREATE INDEX idx_work_order_evidence_review_status ON public.work_order_evidence(review_status);
CREATE INDEX idx_work_order_evidence_uploaded_at ON public.work_order_evidence(uploaded_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.work_order_evidence ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for work_order_evidence

-- Users can view their own evidence submissions
CREATE POLICY "Users can view their own evidence"
ON public.work_order_evidence
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own evidence
CREATE POLICY "Users can insert their own evidence"
ON public.work_order_evidence
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending evidence (e.g., resubmit)
CREATE POLICY "Users can update their own pending evidence"
ON public.work_order_evidence
FOR UPDATE
USING (auth.uid() = user_id AND review_status IN ('pending', 'needs_revision'));

-- Users can delete their own pending evidence
CREATE POLICY "Users can delete their own pending evidence"
ON public.work_order_evidence
FOR DELETE
USING (auth.uid() = user_id AND review_status = 'pending');

-- Admins can view all evidence
CREATE POLICY "Admins can view all evidence"
ON public.work_order_evidence
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update evidence (for review actions)
CREATE POLICY "Admins can update evidence for review"
ON public.work_order_evidence
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete rejected evidence
CREATE POLICY "Admins can delete rejected evidence"
ON public.work_order_evidence
FOR DELETE
USING (public.has_role(auth.uid(), 'admin') AND review_status = 'rejected');

-- 6. Storage policies for evidence-submissions folder
-- Users can upload to their own evidence folder
CREATE POLICY "Users can upload evidence to their folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'media-assets' 
  AND (storage.foldername(name))[1] = 'evidence-submissions'
  AND auth.uid()::text = (storage.foldername(name))[3]
);

-- Users can view their own evidence files
CREATE POLICY "Users can view their own evidence files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'media-assets'
  AND (storage.foldername(name))[1] = 'evidence-submissions'
  AND auth.uid()::text = (storage.foldername(name))[3]
);

-- Users can delete their own pending evidence files
CREATE POLICY "Users can delete their own evidence files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'media-assets'
  AND (storage.foldername(name))[1] = 'evidence-submissions'
  AND auth.uid()::text = (storage.foldername(name))[3]
);

-- Admins can view all evidence files
CREATE POLICY "Admins can view all evidence files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'media-assets'
  AND (storage.foldername(name))[1] = 'evidence-submissions'
  AND public.has_role(auth.uid(), 'admin')
);

-- Admins can delete evidence files
CREATE POLICY "Admins can delete evidence files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'media-assets'
  AND (storage.foldername(name))[1] = 'evidence-submissions'
  AND public.has_role(auth.uid(), 'admin')
);