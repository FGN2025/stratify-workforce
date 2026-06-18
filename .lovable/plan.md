## Goal
Make community creation admin-only. Regular users should not see "Create Community" CTAs, the "My Communities" pending/submission flow, or be able to insert into `tenants` via the API.

## Frontend changes

**`src/pages/Communities.tsx`**
- Gate the `PageHero` `primaryAction` ("Create Community") on `isAdmin` instead of `user`.
- Replace `<MyCommunities onCreateClick={...} />` with an admin-only render: only show it when `isAdmin`. (Removes the "Create Your First Community" empty-state for regular users, which was the whole point of the self-service path.)

**`src/components/communities/MyCommunities.tsx`**
- Repurpose as an admin-only "Communities I manage" panel: keep the list, but drop the "Create Your First Community" empty-state CTA and the header "Create" button (creation already lives in the PageHero for admins).
- Empty state becomes a simple "You don't manage any communities yet." message.

**`src/components/admin/CommunityFormDialog.tsx`**
- Remove the `isUserAdmin` branch that inserts with `approval_status: 'pending'`. Since only admins reach this dialog, always insert with `approval_status: 'approved'` and `is_verified: true`.
- Keep the "Community Created" toast; remove the "Submitted for review" path.

**Optional cleanup (not required for behavior):** leave `useMyCommunities` as-is — it's still useful for the admin panel.

## Backend changes (migration)

Tighten `tenants` RLS so non-admins cannot insert:

```sql
DROP POLICY "Authenticated users can create communities" ON public.tenants;

CREATE POLICY "Admins can create communities"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY "Users can update own pending communities" ON public.tenants;
```

Rationale: with no self-service submission, the "own pending community" update policy is dead code and the moderation queue is no longer needed.

## What we are NOT changing
- The admin approval queue UI and `approval_status` column stay in the schema (cheap to keep, useful if you ever re-enable self-service).
- Public visibility rule (`approval_status = 'approved'`) is unchanged.
- Membership join/request flows for end users on existing communities are untouched.

## Result
- Regular users: no "Create Community" button anywhere, no "My Communities" card on `/communities`. They can still browse and request to join approved communities.
- Admins / super_admins: see "Create Community" in the hero, see the manage panel, and new communities they create are instantly live.
