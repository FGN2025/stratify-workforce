

# Fix: Wire "New Work Order" Button (Admin-Only)

## Summary
Add `onClick` to the "New Work Order" button on `/work-orders`, opening the existing `ImportChallengeDialog` → `WorkOrderEditDialog` flow. The button only renders for admin/super_admin users.

## Changes — `src/pages/WorkOrders.tsx`

1. **Add imports**: `useUserRole`, `ImportChallengeDialog`, `WorkOrderEditDialog`, `useQueryClient`, `MappedChallengeData`
2. **Add state**:
   - `showImportDialog` (boolean)
   - `showEditDialog` (boolean)
   - `importedData` (mapped challenge data for pre-filling the edit form)
3. **Admin guard**: Use `useUserRole()` — only include the `primaryAction` prop when `isAdmin` is true
4. **Wire `onClick`**: `primaryAction.onClick` opens the import dialog
5. **Import → Edit flow**: When a challenge is selected from `ImportChallengeDialog`, store the mapped data and open `WorkOrderEditDialog` with a synthetic work order object pre-filled from the import
6. **Refresh on save**: Call `queryClient.invalidateQueries({ queryKey: ['work-orders'] })` from the `onSave` callback
7. **Render dialogs**: Add both dialog components at the bottom of the JSX (inside `<AppLayout>`)

## Technical Detail

```text
Button click (admin only)
  → ImportChallengeDialog opens
  → User selects challenge
  → WorkOrderEditDialog opens (pre-filled)
  → Save → invalidate work-orders query → list refreshes
```

Only one file changes: `src/pages/WorkOrders.tsx`.

