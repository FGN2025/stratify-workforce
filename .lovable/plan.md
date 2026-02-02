
# Evidence Collection System for Work Order Completions

## Assessment Summary

### Level of Effort: **MEDIUM** (2-3 days of development)

This feature requires database schema changes, storage configuration, admin UI updates, and end-user upload components. The existing infrastructure provides a solid foundation, but several new components need to be built.

---

## Current State Analysis

### What Exists Today

| Component | Status | Notes |
|-----------|--------|-------|
| Work Orders Table | Exists | Has `success_criteria` JSON column, but no evidence requirements |
| User Completions Table | Exists | Has `metadata` JSON column that could store evidence URLs |
| Storage Bucket | Exists | `media-assets` bucket is public and configured |
| Media Upload Hook | Exists | `useMediaLibrary` handles file uploads to `media-assets` |
| Work Order Edit Dialog | Exists | Admins can configure work orders, but no evidence fields |
| Completion Flow | Exists | Users can start/complete work orders via `useWorkOrderCompletion` |

### What Needs to Be Built

| Component | Effort | Description |
|-----------|--------|-------------|
| Evidence Requirements Schema | Low | Add `evidence_requirements` column to `work_orders` table |
| Evidence Submissions Table | Medium | New table to track submitted evidence files |
| Evidence Review Queue | Medium | New table/enum for review status tracking |
| Storage Folder Structure | Low | Create `evidence-submissions/` folder structure |
| RLS Policies | Low | Secure evidence uploads and review access |
| Admin: Configure Evidence | Medium | Extend `WorkOrderEditDialog` with evidence config |
| Admin: Review Queue UI | High | New component for reviewing/approving evidence |
| User: Evidence Upload UI | Medium | Component for users to upload evidence during completion |
| Notification System | Low | Alert admins when evidence needs review |

---

## Proposed Architecture

### Database Schema Changes

**1. Extend `work_orders` table:**
```text
work_orders
  + evidence_requirements: JSONB (nullable)
    {
      required: boolean,
      min_uploads: number,
      max_uploads: number,
      allowed_types: string[] (image, video, document),
      instructions: string,
      deadline_hours: number (optional - hours after completion)
    }
```

**2. New `work_order_evidence` table:**
```text
work_order_evidence
  - id: UUID (PK)
  - completion_id: UUID (FK -> user_work_order_completions)
  - user_id: UUID (FK -> auth.users)
  - work_order_id: UUID (FK -> work_orders)
  - file_url: TEXT (storage URL)
  - file_name: TEXT
  - file_type: TEXT (mime type)
  - file_size: INTEGER (bytes)
  - uploaded_at: TIMESTAMPTZ
  - review_status: ENUM (pending, approved, rejected, needs_revision)
  - reviewed_by: UUID (nullable, FK -> auth.users)
  - reviewed_at: TIMESTAMPTZ (nullable)
  - reviewer_notes: TEXT (nullable)
  - metadata: JSONB (optional - video duration, image dimensions, etc.)
```

**3. New enum type:**
```text
CREATE TYPE evidence_review_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'needs_revision'
);
```

### Storage Configuration

```text
media-assets/
  evidence-submissions/
    {work_order_id}/
      {user_id}/
        {timestamp}-{filename}
```

New RLS policies needed for evidence folder:
- Users can upload to their own folder
- Users can view their own uploads
- Admins can view all evidence
- Admins can delete rejected evidence

---

## Implementation Phases

### Phase 1: Database & Storage Foundation (4-6 hours)

**Tasks:**
1. Create migration for `evidence_requirements` column on `work_orders`
2. Create `work_order_evidence` table with proper relationships
3. Create `evidence_review_status` enum
4. Add RLS policies for evidence table
5. Configure storage folder structure and policies

**Files modified:**
- New migration file(s)

---

### Phase 2: Admin Evidence Configuration (4-6 hours)

**Tasks:**
1. Extend `WorkOrderEditDialog` with evidence configuration section
2. Add toggles/inputs for:
   - Enable evidence requirement
   - Min/max file count
   - Allowed file types (checkboxes)
   - Instructions text area
   - Optional deadline setting

**Files modified:**
- `src/components/admin/WorkOrderEditDialog.tsx`
- `src/components/admin/WorkOrdersManager.tsx` (display evidence column)

---

### Phase 3: User Evidence Upload Flow (6-8 hours)

**Tasks:**
1. Create `EvidenceUploadDialog` component
2. Create `useEvidenceSubmission` hook for upload operations
3. Modify `WorkOrderDetail.tsx` to show evidence requirements
4. Add upload UI after work order completion
5. Show user's submitted evidence with status badges
6. Allow resubmission if rejected

**New files:**
- `src/components/work-orders/EvidenceUploadDialog.tsx`
- `src/components/work-orders/EvidenceCard.tsx`
- `src/hooks/useEvidenceSubmission.ts`

**Files modified:**
- `src/pages/WorkOrderDetail.tsx`
- `src/hooks/useWorkOrderCompletion.ts`

---

### Phase 4: Admin Review Queue (6-8 hours)

**Tasks:**
1. Create `EvidenceReviewQueue` component for admin dashboard
2. Create `EvidenceReviewDialog` for reviewing individual submissions
3. Add filtering by status (pending, approved, rejected)
4. Enable bulk approval/rejection
5. Add reviewer notes functionality
6. Update audit log for review actions

**New files:**
- `src/components/admin/EvidenceReviewQueue.tsx`
- `src/components/admin/EvidenceReviewDialog.tsx`
- `src/hooks/useEvidenceReview.ts`

**Files modified:**
- `src/pages/Admin.tsx` (add new tab)

---

## Technical Details

### Evidence Upload Hook (Draft)

```typescript
// src/hooks/useEvidenceSubmission.ts
interface EvidenceUploadParams {
  completionId: string;
  workOrderId: string;
  file: File;
}

export function useEvidenceSubmission() {
  const uploadEvidence = useMutation({
    mutationFn: async (params: EvidenceUploadParams) => {
      // 1. Upload file to storage
      const fileName = `evidence-submissions/${params.workOrderId}/${user.id}/${Date.now()}-${file.name}`;
      
      // 2. Create evidence record in database
      // 3. Return evidence record
    }
  });
  
  return { uploadEvidence, ... };
}
```

### Evidence Requirements UI (Draft)

Evidence configuration in work order edit dialog:
- Toggle: "Require evidence submission"
- Number inputs: Min files, Max files
- Checkboxes: Images, Videos, Documents
- Textarea: Instructions for users
- Number input: Deadline (hours after completion)

### Review Status Flow

```text
User uploads -> pending -> Admin reviews -> approved/rejected/needs_revision
                                              |
                           needs_revision -> User resubmits -> pending
```

---

## Security Considerations

1. **File Size Limits**: Enforce max file size (e.g., 50MB) on frontend and storage
2. **File Type Validation**: Validate MIME types server-side
3. **RLS Policies**: Users can only see their own evidence; admins see all
4. **Storage Quotas**: Consider per-user or per-work-order limits
5. **Virus Scanning**: Consider integrating a scanning service for uploads

---

## Dependencies

No new npm packages required. Uses existing:
- `@supabase/supabase-js` for storage and database
- `@tanstack/react-query` for state management
- Existing UI components (Dialog, Button, Badge, etc.)

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Large file uploads fail | Implement chunked uploads or increase timeout |
| Storage costs grow | Implement cleanup job for rejected/old evidence |
| Admin review backlog | Add notification system and dashboard metrics |
| Users upload inappropriate content | Add reporting mechanism and moderation queue |

---

## Success Metrics

- Evidence upload success rate > 95%
- Average review turnaround < 24 hours
- User resubmission rate < 20% (indicates clear instructions)

