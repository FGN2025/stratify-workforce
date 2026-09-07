# Replace Cox Broadband with Acme Broadband

Cox Broadband was seeded as placeholder data (id `6c53d350-…`, slug `cox`, approved, one work order attached). Acme Broadband is a real customer, so the existing record will be renamed in place — keeping its history and the attached work order — rather than deleting and recreating.

## What will change

- **Rename the community** in the database:
  - `name`: "Cox Broadband" → "Acme Broadband"
  - `slug`: `cox` → `acme-broadband` (verified: no conflict, nothing in code hardcodes the old slug or id)
- The attached work order ("Fiber Line Installation") and all other linked records stay intact — they reference the community by id, which does not change.

## Cleanup of leftover placeholder text

- `src/components/admin/setup/steps/CorporateStep.tsx`: the form placeholders still say "Cox Communications, Inc.", "COX", "https://www.cox.com" → change to Acme-themed examples ("Acme Broadband, Inc.", "Acme Broadband", "https://www.acmebroadband.com").
- An old migration comment mentioning "COX Skills" as an example stays as-is (historical migration files are not edited).

## After the change

- The community appears as **Acme Broadband** everywhere: Communities page, admin tables, tenant switcher, public listing.
- Its public URL becomes `/communities/acme-broadband`.

## Technical details

- Single small migration: `UPDATE public.tenants SET name='Acme Broadband', slug='acme-broadband' WHERE slug='cox'` (plus `updated_at` if present).
- No RLS, grants, or data-model changes involved.
