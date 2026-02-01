
# Hierarchical Tenant Structure with Extended Categories and Roles

## Executive Summary

This plan extends your tenant/community system to support a multi-level organizational hierarchy (Broadband Operator > School/Employer > End Users) with flexible role and category types that can be extended as needed.

---

## Current State Analysis

### What Exists Today

| Component | Current Implementation | Limitation |
|-----------|----------------------|------------|
| **Tenants** | Flat structure with `id`, `name`, `slug`, `category_type` | No parent-child relationships |
| **Platform Roles** | `app_role` enum: `super_admin`, `admin`, `moderator`, `user` | Global platform roles only |
| **Community Roles** | `community_membership_role` enum: `member`, `moderator`, `admin` | Generic, not business-specific |
| **Categories** | `community_category_type` enum: `geography`, `broadband_provider`, `trade_skill` | Missing school, employer, training_center |

### Data Flow Today

```text
Platform Level:          user_roles (super_admin, admin, moderator, user)
                                |
                                v
Tenant Level:           tenants (flat, no hierarchy)
                                |
                                v
Membership Level:       community_memberships (member, moderator, admin)
```

---

## Proposed Architecture

### New Hierarchical Structure

```text
                    ┌─────────────────────┐
                    │   Broadband Operator│  (top-level tenant)
                    │   e.g., Cox, AT&T   │
                    └─────────┬───────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
    ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │   School    │    │  Employer   │    │  Training   │
    │  Community  │    │  Community  │    │   Center    │
    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
           │                  │                  │
    ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │  Students   │    │  Employees  │    │ Apprentices │
    │  Teachers   │    │  Managers   │    │ Instructors │
    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Database Changes

### 1. Add Hierarchical Fields to Tenants Table

Add `parent_tenant_id` column to enable parent-child relationships:

```sql
-- Add parent_tenant_id for hierarchy
ALTER TABLE public.tenants 
ADD COLUMN parent_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Add hierarchy_level for quick depth queries
ALTER TABLE public.tenants 
ADD COLUMN hierarchy_level INTEGER NOT NULL DEFAULT 0;

-- Create index for efficient hierarchy queries
CREATE INDEX idx_tenants_parent ON public.tenants(parent_tenant_id);
CREATE INDEX idx_tenants_hierarchy_level ON public.tenants(hierarchy_level);
```

### 2. Extend Category Types

Add new organization types to the enum:

```sql
-- Add new category types for schools, employers, training centers
ALTER TYPE public.community_category_type ADD VALUE 'school';
ALTER TYPE public.community_category_type ADD VALUE 'employer';
ALTER TYPE public.community_category_type ADD VALUE 'training_center';
ALTER TYPE public.community_category_type ADD VALUE 'government';
ALTER TYPE public.community_category_type ADD VALUE 'nonprofit';
```

### 3. Extend Membership Roles

Add business-specific roles to the membership enum:

```sql
-- Add new membership roles for students, employees, instructors, etc.
ALTER TYPE public.community_membership_role ADD VALUE 'student';
ALTER TYPE public.community_membership_role ADD VALUE 'employee';
ALTER TYPE public.community_membership_role ADD VALUE 'apprentice';
ALTER TYPE public.community_membership_role ADD VALUE 'instructor';
ALTER TYPE public.community_membership_role ADD VALUE 'manager';
ALTER TYPE public.community_membership_role ADD VALUE 'subscriber';
ALTER TYPE public.community_membership_role ADD VALUE 'owner';
```

### 4. Create Helper Functions

Functions to work with the hierarchy:

```sql
-- Function to get all child tenants (recursive)
CREATE OR REPLACE FUNCTION public.get_child_tenants(p_tenant_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE children AS (
    SELECT id FROM tenants WHERE parent_tenant_id = p_tenant_id
    UNION ALL
    SELECT t.id FROM tenants t
    INNER JOIN children c ON t.parent_tenant_id = c.id
  )
  SELECT id FROM children;
$$;

-- Function to get all parent tenants (ancestry chain)
CREATE OR REPLACE FUNCTION public.get_parent_tenants(p_tenant_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE parents AS (
    SELECT parent_tenant_id FROM tenants WHERE id = p_tenant_id
    UNION ALL
    SELECT t.parent_tenant_id FROM tenants t
    INNER JOIN parents p ON t.id = p.parent_tenant_id
    WHERE t.parent_tenant_id IS NOT NULL
  )
  SELECT parent_tenant_id FROM parents WHERE parent_tenant_id IS NOT NULL;
$$;

-- Function to check if user has role in tenant or parent tenants
CREATE OR REPLACE FUNCTION public.has_tenant_role(
  p_user_id UUID, 
  p_tenant_id UUID, 
  p_role community_membership_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.user_id = p_user_id
      AND cm.role = p_role
      AND (
        cm.tenant_id = p_tenant_id
        OR cm.tenant_id IN (SELECT get_parent_tenants(p_tenant_id))
      )
  )
$$;
```

### 5. Update RLS Policies

Add policies that respect hierarchy:

```sql
-- Tenant admins can manage child tenants
CREATE POLICY "Tenant admins can manage child tenants"
ON public.tenants
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.role = 'admin'
      AND (
        cm.tenant_id = tenants.id
        OR cm.tenant_id IN (SELECT get_parent_tenants(tenants.id))
      )
  )
);
```

---

## Frontend Changes

### 1. Update TenantManagement Component

Modify `src/components/admin/superadmin/TenantManagement.tsx`:

- Add parent tenant selector dropdown in create/edit form
- Display hierarchy level indicator in the table
- Add tree view for visualizing tenant relationships
- Update form to include new category types

### 2. Update Type Definitions

Modify `src/types/tenant.ts`:

```typescript
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  logo_url: string | null;
  created_at: string;
  // New fields
  parent_tenant_id: string | null;
  hierarchy_level: number;
  category_type: CategoryType | null;
  children?: Tenant[]; // For tree display
}

export type CategoryType = 
  | 'geography' 
  | 'broadband_provider' 
  | 'trade_skill'
  | 'school'
  | 'employer'
  | 'training_center'
  | 'government'
  | 'nonprofit';

export type MembershipRole = 
  | 'member' 
  | 'moderator' 
  | 'admin'
  | 'student'
  | 'employee'
  | 'apprentice'
  | 'instructor'
  | 'manager'
  | 'subscriber'
  | 'owner';
```

### 3. Create Tenant Hierarchy Component

New component for visualizing and managing the tree:

```text
src/components/admin/superadmin/TenantHierarchyTree.tsx
```

This will display tenants in a collapsible tree structure with drag-and-drop reordering.

### 4. Update TenantContext

Modify `src/contexts/TenantContext.tsx` to support hierarchy navigation and inherited permissions.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp]_add_tenant_hierarchy.sql` | Create | Database migration for hierarchy support |
| `src/types/tenant.ts` | Modify | Add hierarchy fields and new types |
| `src/components/admin/superadmin/TenantManagement.tsx` | Modify | Add parent selector and hierarchy display |
| `src/components/admin/superadmin/TenantHierarchyTree.tsx` | Create | New tree visualization component |
| `src/contexts/TenantContext.tsx` | Modify | Add hierarchy navigation support |
| `src/hooks/useTenantHierarchy.ts` | Create | Hook for hierarchy queries |

---

## Example Use Cases After Implementation

### Use Case 1: Cox Broadband Structure

```text
Cox Broadband (broadband_provider)
├── Cox Arizona Training Center (training_center)
│   └── Members: instructors, apprentices, subscribers
├── Cox California Employment (employer)
│   └── Members: employees, managers
└── Cox Skills Academy (school)
    └── Members: students, instructors
```

### Use Case 2: Role Inheritance

A user who is an `admin` at "Cox Broadband" automatically has admin visibility over all child tenants (Cox Arizona, Cox California, etc.) without needing separate membership records.

---

## Migration Strategy

1. **Phase 1**: Add database columns and enums (non-breaking)
2. **Phase 2**: Update UI to support new fields
3. **Phase 3**: Add hierarchy visualization
4. **Phase 4**: Implement inherited permissions

---

## Summary

This plan adds hierarchical multi-tenancy to support your business structure:

- Broadband operators as top-level tenants
- Schools, employers, and training centers as child tenants  
- Extended roles (student, employee, apprentice, instructor, manager, subscriber)
- Inherited permissions through the hierarchy
- Flexible enum types that can be extended as needed

The design maintains backward compatibility with existing data while enabling the new organizational structure.
