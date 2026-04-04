

# Insert Breakroom Identity Mapping for End-to-End Testing

## What will be done

Insert a single row into the `breakroom_identity` table to map the Breakroom username **RacerX** to the FGN user `84d2999e-0eae-4a52-b508-a0aafc6c84d7`, using the primary tenant `efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca` (FGN Global).

## SQL

```sql
INSERT INTO public.breakroom_identity (user_id, breakroom_username, tenant_id)
VALUES (
  '84d2999e-0eae-4a52-b508-a0aafc6c84d7',
  'RacerX',
  'efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca'
);
```

## Technical Details

| Field | Value |
|-------|-------|
| **Table** | `public.breakroom_identity` |
| **user_id** | `84d2999e-0eae-4a52-b508-a0aafc6c84d7` |
| **breakroom_username** | `RacerX` |
| **tenant_id** | `efd28c29-43ea-4a7c-9cf4-32f5c9ac97ca` (FGN Global) |
| **Tool** | Supabase insert tool (data operation, not a migration) |

This gives the `breakroom-lms-sync` edge function a valid identity to resolve during end-to-end testing. When Breakroom sends a POST with `breakroom_username: "RacerX"`, the function will find this row and proceed with the sync logic.

