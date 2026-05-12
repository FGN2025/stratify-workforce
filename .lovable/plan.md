## Goal

Two admin upgrades to the SIM Categories system:

1. **Inline edit on `/work-orders`** — admins can hover any category section and click an "Edit" pencil that opens the existing category dialog without leaving the page.
2. **Deep Dive resource library** — a central, reusable catalog of Deep Dive resources (CDL Quest, CDL Exchange, future ones). Each category activates resources from the library instead of re-typing them.

---

## 1. Deep Dive Resource Library

### New table: `sim_deep_dive_resources`
- `key` (text, unique) — stable identifier (`cdl_quest`, `cdl_exchange`, etc.)
- `title`, `description`, `href`, `cta_label`
- `icon_key`, `accent_color`
- `is_active` (global on/off, default true)
- `display_order`

### New join table: `sim_category_deep_dive`
- `category_id` (fk → sim_categories, cascade)
- `resource_id` (fk → sim_deep_dive_resources, cascade)
- `display_order`
- PK: `(category_id, resource_id)`

### Backfill
- Seed library with `cdl_quest` and `cdl_exchange` (from `SIM_RESOURCES.ATS.resources`).
- Migrate any existing `sim_categories.deep_dive_resources` JSONB entries into library + join rows (match by `key`, create if missing).
- Keep the JSONB column on `sim_categories` for one release as a fallback, then drop in a follow-up migration.

### RLS
- Public/authenticated SELECT on both tables.
- Admin/super_admin ALL on both tables.

---

## 2. Admin UI changes

### `src/components/admin/DeepDiveLibraryManager.tsx` (new)
- Grid of resource cards with edit/delete, "Add Resource" button.
- Reuses an extracted `DeepDiveResourceForm` (icon, color, title, description, href, CTA, active toggle).
- Shows usage count: "Used by N categories".

### `src/components/admin/SimCategoriesManager.tsx`
- Add a top-level tabs split: **Categories** | **Deep Dive Library**.
- Each category card now shows attached library resources (read from join table) instead of inline JSONB.

### `src/components/admin/SimCategoryEditDialog.tsx`
- Replace the freeform Deep Dive editor with a **multi-select picker** sourced from `sim_deep_dive_resources` (checkbox list with drag-handle for ordering).
- Removes the inline create/edit UI for resources (those live in the Library tab now).
- "Manage library →" link button that switches the parent tab.

### `src/hooks/useSimCategories.ts`
- Update fetcher to LEFT JOIN `sim_category_deep_dive` + `sim_deep_dive_resources`, return `deep_dive_resources` shaped the same way the UI already consumes (key/title/href/iconKey/accentColor/ctaLabel/description), preserving display_order from the join.
- Existing `SimDeepDiveResource` type unchanged → no consumer changes on `WorkOrders.tsx`.

---

## 3. Inline edit on `/work-orders`

### `src/pages/WorkOrders.tsx`
- For admins (`useUserRole().isAdmin`), each category section header gets a small ghost `<Button>` with `Edit` icon (right-aligned, only renders when `isAdmin`).
- Clicking opens `SimCategoryEditDialog` with the clicked category prefilled.
- Same dialog component already used in admin — wired to the same save handler (extracted from `SimCategoriesManager` into `useSaveSimCategory()` hook so both surfaces share logic and React Query invalidation).
- Add a "+ Add Category" affordance at the end of the category list, also admin-only.

### New: `src/hooks/useSaveSimCategory.ts`
- Extracts the insert/update mutation currently inline in `SimCategoriesManager` so both `Admin → SIM Categories` and `WorkOrders` use the same code path.

---

## Technical details

```text
sim_categories ──< sim_category_deep_dive >── sim_deep_dive_resources
                       (join: display_order)
```

Resolution flow on `/work-orders`:
1. `useSimCategories()` returns categories with `deep_dive_resources[]` already hydrated from the join.
2. `WorkOrders.tsx` renders category carousel → Deep Dive cards → admin sees inline `Edit` if `isAdmin`.

No changes to:
- `WorkOrderFilters.tsx`
- `resolveCategoryKey()` mapping
- Public catalog edge function

---

## Files

**New**
- `supabase/migrations/<ts>_deep_dive_library.sql`
- `src/hooks/useDeepDiveResources.ts`
- `src/hooks/useSaveSimCategory.ts`
- `src/components/admin/DeepDiveLibraryManager.tsx`
- `src/components/admin/DeepDiveResourceEditDialog.tsx`

**Edited**
- `src/components/admin/SimCategoriesManager.tsx` — add tabs, swap card resource source
- `src/components/admin/SimCategoryEditDialog.tsx` — replace inline editor with library picker
- `src/hooks/useSimCategories.ts` — join library, hydrate `deep_dive_resources`
- `src/pages/WorkOrders.tsx` — admin inline edit pencil + add-category button
- `src/integrations/supabase/types.ts` — auto-regenerated post-migration

---

## Out of scope (defer)
- Per-tenant category overrides
- Drag-and-drop reordering (use number inputs for now)
- Dropping the legacy `sim_categories.deep_dive_resources` JSONB column (follow-up after one release of dual-read)
