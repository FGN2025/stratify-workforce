-- Phase 1: Add hierarchical fields to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER NOT NULL DEFAULT 0;

-- Create indexes for efficient hierarchy queries
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON public.tenants(parent_tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_hierarchy_level ON public.tenants(hierarchy_level);