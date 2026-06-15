# Fix random community badges on Work Orders page

## Preflight (confirmed)

- 4 work orders carry a real `tenant_id` (FGN Global ×2, Oil and Gas Community, Cox Broadband) — real-tenant rendering will be exercised.
- All 6 House Flipper work orders have `tenant_id = NULL` (verified in prior turn).
- FGN Global tenant row exists: `slug='fgn'`, `brand_color='#F59E0B'`. Safe to use as the NULL fallback.
- `EventCard` already accepts `community?: Pick<Tenant, 'id'|'name'|'slug'|'brand_color'|'logo_url'>` — no signature change.
- `getRandomCommunity` is used **only** in `src/pages/WorkOrders.tsx` (4 sites). No other page uses it.
- `src/pages/Index.tsx` already uses the correct stable pattern (`wo.tenant_id ? communityMap[wo.tenant_id] : undefined`) — no randomizer to remove there. It does not fall back to "FGN Global" for NULL (just shows no badge); leaving as-is per your scope.

## Change (single file: `src/pages/WorkOrders.tsx`)

1. **Delete** `getRandomCommunity` (line 90).
2. **Add** a stable resolver in its place:

   ```ts
   const communityMap = useMemo(
     () => Object.fromEntries(communities.map((c) => [c.id, c])) as Record<string, Tenant>,
     [communities]
   );
   const fgnGlobalCommunity = useMemo(
     () => communities.find((c) => c.slug === 'fgn'),
     [communities]
   );
   const resolveCommunity = (tenantId: string | null | undefined) =>
     (tenantId ? communityMap[tenantId] : fgnGlobalCommunity) ?? fgnGlobalCommunity;
   ```

3. **Replace** all 4 EventCard call sites (lines 147, 157, 188, 231):
   - `community={getRandomCommunity()}` → `community={resolveCommunity(wo.tenant_id)}`

No other files touched. No data rows changed. No DB migration. No EventCard prop change.

## Acceptance

- House Flipper cards (all 6) show **FGN Global**, stable across reloads.
- Aviation, CMS, RC Site, and other `tenant_id IS NULL` work orders also show **FGN Global**.
- Oil and Gas Community, Cox Broadband, and any future tenant-owned work order render their **real** tenant name and brand color.
- `getRandomCommunity` is removed entirely; no shuffling on any reload.
- `tenant_id` rows unchanged.

## Out of scope (reporting only)

- `src/pages/Index.tsx` does not use the randomizer. It shows no badge when `tenant_id IS NULL`. If you want NULL → "FGN Global" applied on Index too for consistency with Work Orders, say the word and I'll fold that in.

Switch to build mode to apply.
