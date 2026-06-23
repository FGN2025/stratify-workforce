# Mobile & Desktop Adaptability Audit

Audit-only pass across the student-facing shell (Home, Learn, Work Orders, Profile, Communities) and the global layout. No code changes. Issues are graded **High / Med / Low** with file:line citations.

## Top cross-cutting problems

| # | Issue | Severity | Where |
|---|---|---|---|
| 1 | Hardcoded `w-72` / `w-80` carousel cards don't fit a 375px viewport and prevent "peek" of the next card | **High** | Index, Learn, WorkOrders, Communities, Profile skeletons |
| 2 | Hero sections use `px-8` on mobile (only 311px usable on a 375px phone) — `text-6xl` headings overflow/wrap badly | **High** | `HeroSection.tsx:28`, `PageHero.tsx:58` |
| 3 | Carousel arrows are `hidden sm:flex` and there's no swipe affordance or resize listener | **High / Med** | `HorizontalCarousel.tsx:73,33-40` |
| 4 | `useIsMobile` exists but is unused in the layout shell and every page audited (only `TutorChatPanel` + shadcn sidebar use it) | **Med** | AppLayout, TopNav, WorkOrderDetail, Profile, Communities, CommunityProfile |
| 5 | Desktop wide-screen (≥1440px) under-utilization: hero copy capped at `max-w-2xl`, grids stop at `lg:grid-cols-3/4` with no `2xl:` step, no two-column carousel band | **Med** | Heroes, Profile, CommunityProfile, WorkOrders |
| 6 | Global `<main>` uses flat `p-6` and has no max-width container | **High / Med** | `AppLayout.tsx:18` |

## Per-file findings (condensed)

### Global shell
- **AppLayout.tsx:18** — `p-6` flat → `p-4 md:p-6`; add `max-w-screen-2xl mx-auto` on `<main>`.
- **TopNav.tsx:39** — Search bar `hidden md:block` with no mobile fallback (no icon → sheet). Avatar trigger lacks `min-h-[44px]`. Left cluster (TenantSwitcher + trigger) has no `min-w-0 overflow-hidden` guard.
- **AppSidebar.tsx:336** — `collapsible="icon"` with no `defaultOpen={!isMobile}` guard; on mobile first paint the drawer can overlay content. No `2xl:` always-expanded variant for wide desktops.
- **Footer.tsx** — Already responsive (`flex-col sm:flex-row`); only a container-token alignment nit.

### Hero / Carousel primitives
- **HeroSection.tsx:28** — `px-8 py-16`, `max-w-2xl`; needs `px-4 md:px-8`, `text-3xl md:text-5xl lg:text-6xl`, `min-h-[280px] md:min-h-[400px]`, wider cap at `xl:`.
- **PageHero.tsx:58,86** — same `px-8` issue; stats row `flex gap-8` has no `flex-wrap` (WorkOrders passes 4 stats → mobile overflow).
- **HorizontalCarousel.tsx** — arrows hidden on mobile (acceptable, but no swipe hint); `checkScroll` not bound to `resize` (line 33); `viewAllLink` uses `<a href>` not `<Link>` (line 69).

### Pages
- **Index.tsx:99,117,134,153** — 4 carousels of fixed `w-72/80` cards. Skeleton row (line 73) has same problem. Consider a `md:` grid fallback for at least one band.
- **Learn.tsx:37** — `TabsList grid-cols-2` stays `cols-2` when "My Courses" is hidden for signed-out users → broken tab bar. Skeleton `w-80` fixed.
- **WorkOrders.tsx:182-267** — 6 carousels, all `w-72/80`. Inconsistent container usage (line 209). At 2xl could host two carousels per row.
- **WorkOrderDetail.tsx:233-411** — Hero stacks correctly; CTAs (line 312) can land far below fold on mobile — candidate for sticky bottom action bar via `useIsMobile`. Back link (line 226) lacks tap target.
- **Profile.tsx:230,249** — Credential grid stops at `xl:grid-cols-4`; add `2xl:grid-cols-5/6`. `SkillRadar` (recharts) needs a separate responsive-SVG check.
- **Communities.tsx:109** — Uses carousel for a browse/search page; should be a `grid-cols-1 sm:2 lg:3 xl:4`. Search `max-w-md` could widen on desktop.
- **CommunityProfile.tsx:232-256** — 4–6 tabs in a `TabsList` with no `overflow-x-auto` → mobile overflow/wrap. Cover banner fixed `h-48` (short on wide desktops). Work-orders grid caps at `lg:grid-cols-3`.

## Recommended phased fix order (when you're ready to build)

1. **Shell + primitives** (highest leverage, touches every page): AppLayout padding/container, HorizontalCarousel resize + responsive card-width contract, HeroSection/PageHero padding & wrap rules.
2. **Page card widths**: sweep `w-72`/`w-80` → `w-[85vw] sm:w-72` across Index, Learn, WorkOrders, Communities skeletons.
3. **Browse pages → grids**: convert Communities (and optionally one band of WorkOrders) from carousels to responsive grids.
4. **Mobile-specific affordances**: TopNav mobile search, WorkOrderDetail sticky CTA bar, CommunityProfile tab overflow/select, sidebar `defaultOpen={!isMobile}`.
5. **Wide-desktop polish (≥1440px)**: add `2xl:` grid steps on Profile + CommunityProfile, widen hero content caps, taller cover banners, two-column carousel band where it makes sense.

No files will be changed until you approve.
