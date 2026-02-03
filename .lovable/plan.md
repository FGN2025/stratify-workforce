
# Plan: Community Creation & Super Admin Approval Workflow

## Overview

Enable any registered user to create a community (currently limited to admins only), but require Super Admin approval before the community becomes publicly visible. This follows the pattern already established by the Evidence Review system.

---

## Architecture

```text
USER JOURNEY: Creating a Community
──────────────────────────────────────────────────────────────────

Registered User visits /communities
        │
        ▼
Clicks "Create Community" button (now visible to all logged-in users)
        │
        ▼
Fills out CommunityFormDialog
        │
        ▼
On submit:
  • Sets approval_status = 'pending'
  • Sets owner_id = current user ID
  • Inserts into tenants table
        │
        ▼
User sees confirmation: "Your community has been submitted for review"
        │
        ▼
User can view their pending communities in "My Communities" section


SUPER ADMIN JOURNEY: Reviewing Communities
──────────────────────────────────────────────────────────────────

Super Admin navigates to Admin Panel → Communities Tab (NEW)
        │
        ▼
Views CommunityReviewQueue (similar to EvidenceReviewQueue)
        │
        ├── Filter by: All | Pending | Approved | Rejected
        │
        ▼
Clicks "Review" on a pending community
        │
        ▼
CommunityReviewDialog opens
        │
        ├── View community details, branding, games assigned
        ├── Approve → Sets approval_status = 'approved', is_verified = true
        ├── Reject → Sets approval_status = 'rejected', adds reviewer_notes
        └── Request Changes → Sets approval_status = 'needs_revision'
        │
        ▼
Community creator is notified (future: email notification)
```

---

## Database Changes

### 1. Create Approval Status Enum

```sql
CREATE TYPE public.community_approval_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'needs_revision'
);
```

### 2. Add Approval Columns to Tenants Table

```sql
ALTER TABLE public.tenants
ADD COLUMN approval_status public.community_approval_status NOT NULL DEFAULT 'approved',
ADD COLUMN reviewed_by UUID REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN reviewed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN reviewer_notes TEXT DEFAULT NULL,
ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT now();
```

**Note**: Default is `'approved'` to maintain backward compatibility for existing communities and admin-created ones.

### 3. Update RLS Policies

```sql
-- Users can view approved communities OR their own pending communities
CREATE POLICY "Users can view approved or own communities"
ON public.tenants FOR SELECT
TO authenticated
USING (
  approval_status = 'approved'
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);

-- Authenticated users can create communities (insert as pending)
CREATE POLICY "Authenticated users can create communities"
ON public.tenants FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND approval_status = 'pending'
);

-- Users can update their own pending communities
CREATE POLICY "Users can update own pending communities"
ON public.tenants FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() AND approval_status IN ('pending', 'needs_revision'))
WITH CHECK (owner_id = auth.uid());

-- Super admins can update any community (for approval)
CREATE POLICY "Super admins can update any community"
ON public.tenants FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/CommunityReviewQueue.tsx` | Admin queue for reviewing pending communities (similar to EvidenceReviewQueue) |
| `src/components/admin/CommunityReviewDialog.tsx` | Modal for reviewing a single community with approve/reject/revision actions |
| `src/hooks/useCommunityReview.ts` | Hook for fetching and managing community approvals |
| `src/hooks/usePendingCommunityCount.ts` | Hook to get pending count for badge display |
| `src/components/communities/MyCommunities.tsx` | Section showing user's own communities (pending/approved/rejected) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Communities.tsx` | Show "Create Community" for all logged-in users, add "My Communities" section |
| `src/pages/Admin.tsx` | Add "Communities" tab with pending badge for Super Admins |
| `src/components/admin/CommunityFormDialog.tsx` | Set owner_id and approval_status on create |
| `src/hooks/useCommunities.ts` | Filter to only show approved communities in public view |
| `src/types/tenant.ts` | Add approval_status and related fields to Tenant type |

---

## Implementation Details

### 1. Tenant Type Updates

```typescript
// src/types/tenant.ts
export type CommunityApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export interface Tenant {
  // ... existing fields ...
  
  // Approval workflow fields
  approval_status: CommunityApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  submitted_at: string | null;
}
```

### 2. Communities Page Updates

**Access Control Changes:**
- "Create Community" button visible to ALL authenticated users (not just admins)
- Admin edit button still restricted to admins
- Show "My Communities" section for logged-in users

**New Section: "My Communities"**
```text
┌─────────────────────────────────────────────────────────────────┐
│  My Communities                                                 │
│                                                                 │
│  [Pending] Acme Trucking School          Status: ⏳ Pending    │
│  [Rejected] Test Community               Status: ✕ Rejected    │
│  [Approved] My Gaming Guild              Status: ✓ Approved    │
│                                                                 │
│  [+ Create New Community]                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3. CommunityFormDialog Updates

**On Create (non-admin users):**
```typescript
const handleSubmit = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const insertData = {
    ...formData,
    owner_id: user.id,
    approval_status: isAdmin ? 'approved' : 'pending', // Admins bypass approval
    submitted_at: new Date().toISOString(),
  };
  
  await supabase.from('tenants').insert(insertData);
  
  if (!isAdmin) {
    toast({
      title: 'Community Submitted',
      description: 'Your community has been submitted for review. You will be notified once approved.',
    });
  }
};
```

### 4. CommunityReviewQueue Component

Similar to `EvidenceReviewQueue`, with:
- Status filter (Pending, Approved, Rejected, Needs Revision)
- Table showing: Community Name, Owner, Category, Games, Submitted Date, Status
- "Review" action button per row
- Pending count badge

### 5. CommunityReviewDialog Component

```text
┌─────────────────────────────────────────────────────────────────┐
│  Review Community                                        [X]   │
│─────────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Hero Image]                                            │   │
│  │                                                          │   │
│  │  [Logo] Community Name                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Submitted by: @username                                        │
│  Submitted on: Feb 3, 2026                                      │
│                                                                 │
│  Category: School                                               │
│  Games: ATS, Farming Simulator                                  │
│  Website: https://example.com                                   │
│  Location: Dallas, TX                                           │
│                                                                 │
│  Description:                                                   │
│  Lorem ipsum dolor sit amet...                                  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Review Notes (optional for approval, required for rejection):  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Request Changes]  [Reject]  [Approve]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6. useCommunities Hook Updates

```typescript
export function useCommunities() {
  const { data: communities = [], isLoading, error } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('approval_status', 'approved') // Only show approved in public view
        .order('name', { ascending: true });

      if (error) throw error;
      return data as unknown as Tenant[];
    },
  });
  // ...
}
```

### 7. Admin Dashboard Updates

Add "Communities" tab (for super_admin only) with pending count badge:

```typescript
// In Admin.tsx TabsList
{isSuperAdmin && (
  <TabsTrigger value="community-review" className="relative">
    Community Review
    {pendingCommunityCount > 0 && (
      <Badge variant="destructive" className="ml-2">
        {pendingCommunityCount}
      </Badge>
    )}
  </TabsTrigger>
)}
```

---

## Data Flow

```text
USER CREATES COMMUNITY
────────────────────────────────────────────────────────────────
1. User fills form → Submit
2. INSERT: approval_status='pending', owner_id=user.id
3. RLS allows: owner can view their pending community
4. Community NOT visible in public /communities list


SUPER ADMIN APPROVES
────────────────────────────────────────────────────────────────
1. Super Admin views pending queue
2. Clicks "Approve" on community
3. UPDATE: approval_status='approved', reviewed_by, reviewed_at
4. Community now visible in public /communities list
5. Creator sees "Approved" status in My Communities


SUPER ADMIN REJECTS/REQUESTS CHANGES
────────────────────────────────────────────────────────────────
1. Super Admin clicks "Reject" or "Request Changes"
2. UPDATE: approval_status='rejected'/'needs_revision', reviewer_notes
3. Creator sees status + notes in My Communities
4. (For 'needs_revision') Creator can edit and resubmit
```

---

## Status Styling (Consistent with Evidence Review)

```typescript
const STATUS_STYLES: Record<CommunityApprovalStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  needs_revision: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};
```

---

## Role-Based Access Summary

| Action | Guest | User | Admin | Super Admin |
|--------|-------|------|-------|-------------|
| View approved communities | Yes | Yes | Yes | Yes |
| Create community (pending) | No | Yes | Yes | Yes |
| View own pending communities | — | Yes | Yes | Yes |
| Edit own pending community | — | Yes | Yes | Yes |
| Approve/reject communities | No | No | No | Yes |
| Edit any approved community | No | No | Yes | Yes |
| Delete communities | No | No | No | Yes |

---

## Estimated Effort

| Task | Time |
|------|------|
| Database migration (enum + columns + RLS) | 20 min |
| Update Tenant type | 5 min |
| useCommunityReview hook | 25 min |
| usePendingCommunityCount hook | 10 min |
| CommunityReviewQueue component | 40 min |
| CommunityReviewDialog component | 35 min |
| MyCommunities section | 25 min |
| Update Communities.tsx (user access + section) | 20 min |
| Update CommunityFormDialog (owner_id, status) | 15 min |
| Update useCommunities (filter approved) | 10 min |
| Update Admin.tsx (new tab + badge) | 15 min |
| Testing & polish | 30 min |
| **Total** | **~4 hours** |

---

## Summary

This implementation enables democratic community creation with proper oversight:

1. **User Access** - Any registered user can submit a community for creation
2. **Pending State** - New user-created communities start as "pending" and are hidden from public view
3. **Super Admin Review** - Dedicated review queue with approve/reject/revision actions
4. **My Communities** - Users can track the status of their submitted communities
5. **Admin Bypass** - Admins/Super Admins can still create immediately-approved communities
6. **Existing Patterns** - Follows the established Evidence Review workflow architecture
7. **Backward Compatible** - Existing communities remain approved and unchanged
