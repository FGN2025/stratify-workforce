

# Communities UX Audit: End-to-End Gap Analysis

```text
DISCOVERY → PROFILE → JOIN → APPROVAL → ACCESS WORK ORDERS
   ↓          ↓        ↓        ↓              ↓
  [1,2]     [3,4,5]   [6]     [7,8]          [9,10]
```

## Gap 1: Hardcoded hero stats on Communities page (P2)
`Communities.tsx` line 76-78 shows `"2,500+"` Active Members and `"180+"` Work Orders — completely hardcoded. Real community count is dynamic but the other two are fake.

**Fix**: Query actual totals from `community_memberships` and `work_orders`, or remove fake numbers.

## Gap 2: Random community assignment on Home page (P1)
`Index.tsx` line 63-66 assigns a **random community** to each work order card via `getRandomCommunity()` — showing incorrect community associations. Users clicking through will see wrong branding.

**Fix**: Use the actual `tenant_id` relationship. Query work orders with their tenant join, or pass `wo.tenant_id` to look up the correct community.

## Gap 3: Hardcoded location and website on Community Profile (P1)
`CommunityProfile.tsx` line 167 shows `"United States"` (hardcoded) instead of `community.location`. Line 175 shows `website.com` with `href="#"` instead of `community.website_url`. Both fields exist in the data model but are ignored.

**Fix**: Use `community.location` and `community.website_url`. Hide each if null.

## Gap 4: "Verified" badge shown for ALL communities (P1)
`CommunityProfile.tsx` line 152-159 always renders a "Verified" badge regardless of `community.is_verified`. Unverified communities appear verified.

**Fix**: Conditionally render based on `community.is_verified`.

## Gap 5: Cover image not used on Community Profile (P2)
`CommunityProfile.tsx` line 126-132 renders only a gradient from `brand_color`. The `cover_image_url` field is available but never displayed as a background image.

**Fix**: If `community.cover_image_url` exists, use it as `background-image`; fall back to the gradient.

## Gap 6: No re-apply path after rejection (P2)
`JoinCommunityButton` shows "Request Denied" with reviewer notes but **no way to re-apply**. The user is permanently stuck unless the record is manually deleted.

**Fix**: Add a "Re-apply" button that deletes the rejected membership row and re-inserts a fresh pending request.

## Gap 7: "My Communities" only shows owned communities (P1)
`useMyCommunities` queries `tenants WHERE owner_id = user.id` — it only shows communities the user **created**, not communities they've **joined** as a member. A user who joined 5 communities but created none sees an empty section.

**Fix**: Also query `community_memberships` to show communities where the user has an approved membership, alongside owned ones.

## Gap 8: No notification to manager on new membership request (P2)
When a user clicks "Join Community", the membership row is inserted but no notification is created. Managers won't know someone requested to join unless they manually check the Requests tab.

**Fix**: Insert a notification for community managers/admins on membership request creation (via DB trigger or client-side insert).

## Gap 9: Members tab is a placeholder (P2)
`CommunityProfile.tsx` line 251-254 shows "Member list coming soon" — members tab has no implementation despite `community_memberships` data being available.

**Fix**: Query approved memberships with profile data and render a member list.

## Gap 10: Filter button on Communities page does nothing (P3)
`Communities.tsx` line 97-100 renders a "Filter" button with no `onClick` or dropdown. It's purely decorative.

**Fix**: Add category/game-title filter dropdown, or remove the button.

## Gap 11: ExternalLink button on Community Profile does nothing (P3)
`CommunityProfile.tsx` line 186-188 renders an `ExternalLink` icon button with no `onClick` or `href`. It sits next to the Join button but is inert.

**Fix**: Link to `community.website_url` if available, or remove.

## Gap 12: Leaderboard tab is a placeholder (P3)
"Leaderboard coming soon" — data exists via `get_leaderboard_data()` but isn't wired up per-community.

---

## Priority Ranking

| Priority | Gap | Effort |
|----------|-----|--------|
| P1 | #2 — Random community on Home page | Small (use real tenant join) |
| P1 | #3 — Hardcoded location/website | Trivial (use real fields) |
| P1 | #4 — Verified badge always shown | Trivial (conditional render) |
| P1 | #7 — My Communities missing joined communities | Small (add membership query) |
| P2 | #1 — Fake hero stats | Small (real queries) |
| P2 | #5 — Cover image unused on profile | Trivial (add backgroundImage) |
| P2 | #6 — No re-apply after rejection | Small (delete + re-insert) |
| P2 | #8 — No manager notification on join request | Medium (trigger or insert) |
| P2 | #9 — Members tab placeholder | Medium (query + list UI) |
| P3 | #10 — Filter button inert | Small |
| P3 | #11 — ExternalLink button inert | Trivial |
| P3 | #12 — Leaderboard tab placeholder | Medium |

## Recommended First Pass

Fix all P1 gaps across 4 files:

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove `getRandomCommunity()`; join work orders to their actual tenant via `tenant_id` |
| `src/pages/CommunityProfile.tsx` | Use `community.location` / `community.website_url` (hide if null); conditionally render Verified badge on `is_verified`; show `cover_image_url` in banner |
| `src/hooks/useMyCommunities.ts` | Also query `community_memberships` for approved memberships, merge with owned communities |
| `src/pages/Communities.tsx` | Replace hardcoded hero stats with real aggregates or remove fake numbers |

P2/P3 gaps (re-apply, members list, notifications, filter, leaderboard) follow as separate iterations.

