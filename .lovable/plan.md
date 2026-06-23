
# Mobile-Friendly Overhaul — fgn.academy

Goal: bring fgn.academy's student-facing experience up to the polish of play.fgn.gg on phones and small tablets, without regressing desktop. Scope is presentation/layout only — no business logic, no schema, no API changes.

Reference target (play.fgn.gg mobile patterns):
- Compact top bar: logo left, hamburger/sheet right; primary CTA pinned in the bar
- Stacked single-column hero with display type that scales down cleanly
- Full-bleed content cards with edge-to-edge horizontal swipe rails (no visible side arrows)
- Bottom-safe sticky CTA on detail screens
- Dark backdrop with the brand network pattern; no horizontal scroll anywhere

This plan is the execution sequence for the findings already captured in `.lovable/plan.md`. It is a presentation-layer pass only.

## Phase 1 — Shell & primitives (foundation)

These changes unblock every page below. Done once, benefit everywhere.

1. `src/components/layout/AppLayout.tsx`
   - `<main>`: `px-4 sm:px-6 lg:px-8 py-4 sm:py-6` + inner `container mx-auto max-w-7xl 2xl:max-w-[1400px]`
   - Remove flat `p-6`
2. `src/components/layout/TopNav.tsx`
   - Mobile (<768px): logo + hamburger trigger only; move search into the sheet; collapse avatar menu into sheet
   - Reserve a 44px tap target for every actionable icon
3. `src/components/layout/AppSidebar.tsx`
   - Pass `defaultOpen={!isMobile}` so the sidebar starts collapsed on phones
   - Wire the existing shadcn `Sheet` mobile drawer (already supported by `ui/sidebar`)
4. `src/components/marketplace/HorizontalCarousel.tsx`
   - Replace `hidden sm:flex` arrows with: arrows on `md+`, snap-scroll + edge-fade affordance on mobile
   - Add `scroll-snap-type: x mandatory` to the rail and `scroll-snap-align: start` to children
   - Expose a `cardWidthClass` prop default of `w-[85vw] sm:w-72 lg:w-80` so callers stop hardcoding
5. `src/components/marketplace/HeroSection.tsx` and `PageHero.tsx`
   - `px-4 sm:px-6 lg:px-8` (drop the `px-8` floor)
   - Headline: `text-3xl sm:text-5xl lg:text-6xl`, allow `text-balance`
   - Hero copy max width: `max-w-2xl xl:max-w-3xl 2xl:max-w-4xl`
6. `src/index.css`
   - Add a `.no-scrollbar` utility (already partially present — verify) and a `--safe-bottom: env(safe-area-inset-bottom)` token used by sticky CTAs

## Phase 2 — Student page sweep

For each page, replace hardcoded `w-72`/`w-80` card widths on rails with the new `cardWidthClass` default, and add a `2xl:` grid step where a grid is used.

- `src/pages/Index.tsx` — rails: featured courses, work orders, communities, events
- `src/pages/Learn.tsx` — enrolled + catalog rails; grid: `sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`
- `src/pages/WorkOrders.tsx` — convert the 6 stacked carousels to a filterable grid on `md+` (stay as carousels on mobile); grid: `md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`
- `src/pages/WorkOrderDetail.tsx` — sticky bottom CTA bar on mobile (`fixed bottom-0 inset-x-0 pb-[var(--safe-bottom)]`); two-column layout on `lg+`
- `src/pages/Profile.tsx` — header stack on mobile; achievements/certs grid `2xl:grid-cols-5`, skills `2xl:grid-cols-6`
- `src/pages/Communities.tsx` — search widens to `max-w-xl` on desktop; carousels → responsive grid on `md+`
- `src/pages/CommunityProfile.tsx` — tabs become a horizontal scroller on mobile with `no-scrollbar`; fall back to a `Select` only under 380px
- `src/components/tutor/TutorChatPanel.tsx` — already mobile-aware; verify full-screen sheet behavior and safe-area padding

## Phase 3 — Desktop wide-screen polish (≥1440px)

- Containers: lift `max-w-7xl` → `2xl:max-w-[1400px]` in `AppLayout` and any page overriding it
- Add a `2xl:` step on every grid touched in Phase 2 so wide monitors get more columns instead of more whitespace
- Hero copy: allow `2xl:max-w-4xl` so the line length grows with the viewport
- Carousels: show 4–5 cards on `2xl` via `cardWidthClass` token

## Out of scope (explicitly)

- Admin surfaces (Configurator, Media Library, Course Builder) — not requested
- PWA / install prompts / offline — none requested
- Capacitor / native wrapper — none requested
- Backend, RLS, edge functions, data shape — untouched
- Visual redesign or new tokens — current Industrial Command Center aesthetic is preserved; only spacing, breakpoints, and component contracts change

## Verification

After each phase, drive Playwright at 375×812 (iPhone), 768×1024 (iPad), 1440×900, and 1920×1080 against `/`, `/learn`, `/work-orders`, `/work-orders/:id`, `/profile`, `/communities`, `/communities/:slug`. Confirm: no horizontal scroll, no clipped CTAs, no card narrower than 280px on mobile, no grid wider than 4 columns until `2xl`.

## Sequencing & estimate

- Phase 1: 1 pass, ~6 files. Unblocks the rest.
- Phase 2: 1 pass per page, mostly mechanical. ~7 pages.
- Phase 3: piggybacks on Phase 2 edits — same files, additional `2xl:` classes.

Recommend executing Phase 1 first as a standalone change so the primitives can be reviewed before the page sweep lands.
