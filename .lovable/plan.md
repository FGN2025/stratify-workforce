
# Replace Native confirm() with Custom AlertDialog

## Problem

The `TenantManagement.tsx` component uses a native browser `confirm()` dialog for delete confirmations (line 145). This has several issues:

- Inconsistent styling with the rest of the application
- Cannot be styled or branded
- Difficult to test in automated testing environments
- Blocks the JavaScript thread
- Poor accessibility compared to custom dialogs

## Solution

Replace the native `confirm()` with a controlled `AlertDialog` component, following the same pattern already used in `RoleEscalationControls.tsx` and `DangerousOperations.tsx`.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/admin/superadmin/TenantManagement.tsx` | Add AlertDialog imports and controlled state for delete confirmation |

---

## Implementation Details

### 1. Add AlertDialog Imports

Add the AlertDialog component imports alongside the existing Dialog imports:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

### 2. Add State for Pending Delete

Add a new state variable to track which tenant is pending deletion:

```typescript
const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
```

### 3. Update handleDelete Function

Change from immediate confirmation to setting pending state:

```typescript
const handleDelete = (tenant: Tenant) => {
  setDeletingTenant(tenant);
};
```

### 4. Add New confirmDelete Function

Create a new function that performs the actual deletion:

```typescript
const confirmDelete = async () => {
  if (!deletingTenant) return;

  try {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', deletingTenant.id);
    
    if (error) throw error;
    
    toast({ 
      title: 'Deleted', 
      description: `${deletingTenant.name} has been deleted` 
    });
    
    fetchTenants();
  } catch (error) {
    console.error('Error deleting tenant:', error);
    toast({ 
      title: 'Error', 
      description: 'Failed to delete tenant', 
      variant: 'destructive' 
    });
  } finally {
    setDeletingTenant(null);
  }
};
```

### 5. Add AlertDialog Component

Add the AlertDialog at the end of the component's JSX (after the Table):

```typescript
<AlertDialog 
  open={!!deletingTenant} 
  onOpenChange={() => setDeletingTenant(null)}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to delete "{deletingTenant?.name}"? 
        This action cannot be undone and will remove all associated data.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction 
        onClick={confirmDelete}
        className="bg-destructive hover:bg-destructive/90"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Before vs After Comparison

| Aspect | Before (native confirm) | After (AlertDialog) |
|--------|------------------------|---------------------|
| Styling | Browser default | Matches app theme |
| Thread blocking | Yes | No |
| Testability | Difficult | Easy |
| Accessibility | Basic | Full ARIA support |
| Branding | None | Customizable |
| Animation | None | Smooth transitions |

---

## Pattern Consistency

This change aligns `TenantManagement.tsx` with the patterns already established in:

- `RoleEscalationControls.tsx` - Uses `pendingChange` state + AlertDialog
- `DangerousOperations.tsx` - Uses `selectedOperation` state + AlertDialog

All Super Admin panel components will now use consistent confirmation dialogs.

---

## Summary

This is a straightforward refactor that replaces the native `confirm()` dialog with a custom `AlertDialog` component. The change improves user experience, testability, and maintains consistency with other components in the Super Admin panel.
