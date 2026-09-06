# Public (Unauthenticated) Surface — Assessment & Optimization Plan

## What I verified (live checks against the running app and database)

### Pages a non-registered visitor can open today
- `/` home — hero, Trending Work Orders, Featured Communities, Recently Added, Popular
- `/communities` and `/community/:slug` — full community profile incl. its work orders
- `/learn`, `/learn/:id`, `/learn/:courseId/lesson/:lessonId` — course catalog AND full lesson content
- `/careers`, `/events` (list only; detail is protected), `/sim/:gameTitle` industry hubs
- `/passport/:slug`, `/embed/passport/:slug`, `/verify` (intentionally public)
- `/privacy`, `/eula`, `/auth`

### What an anonymous visitor can pull straight from the API (verified with the public key)
Good news: profiles, memberships, registrations, progress, evidence, and all admin/config tables are locked to signed-in users. But these are fully public:

1. **tenants — every column of every approved community**, including `owner_id`, `reviewed_by`, `reviewer_notes`, `play_tenant_id` (deep platform/ecosystem linkage), internal hierarchy fields.
2. **work_orders — full rows**, including `success_criteria`, `evidence_requirements`, `metadata` (which carries origin challenge IDs and integration internals).
3. **courses + lessons — complete lesson content**, including quiz questions *and correct answers with explanations* (`correct_index` is right there in the JSON).
4. **channel_posts** — community discussion readable by anyone.
5. **site_media** — the entire media library catalog.
6. Also public (acceptable): sim_categories, badges, career_paths, game_channels, active achievements.

## The problems

- **Quiz answers are downloadable by anyone** — undermines assessment integrity, our biggest exposure.
- **Internal/platform plumbing leaks**: reviewer notes, owner IDs, Play ecosystem IDs, challenge origin metadata.
- **Marketing upside is underused**: anonymous visitors see live content but get no conversion path beyond the hero "Join" button; no sign-in prompt on course/community pages, no public SEO-friendly landing content per community beyond what exists.

## Proposed changes

### 1. Tighten anonymous data exposure (database)
- Replace the tenants public SELECT with a **safe public view** (`public_communities`) exposing only: name, slug, description, logo_url, cover_image_url, brand_color, website_url, location, member_count, is_verified, category_type. Point the public pages at the view; keep the base table authenticated-only. Hides `owner_id`, `reviewer_notes`, `play_tenant_id`, hierarchy internals.
- Same pattern for work orders: a `public_work_orders` view with marketing fields only (title, generated_name, description, game_title, cover_image_url, difficulty, xp_reward, tenant_id) — no success_criteria internals, evidence config, or metadata. Curation rules still applied inside the view.
- **Lessons: gate by lesson type.** Keep lesson title/type visible (for course outline marketing), but strip `content` for anonymous users — require sign-in to read lesson bodies. This fixes the leaked quiz answers. (Simplest robust approach: restrict the lessons SELECT to authenticated, and let the course detail page show outlines from a safe view.)
- `channel_posts`: change "viewable by everyone" to members-of-that-community only (public pages don't render posts today, so no UX loss).
- `site_media`: leave public (pages need images), but confirm no sensitive uploads — acceptable.

### 2. Marketing optimization for anonymous visitors (frontend, light touch)
- Add a consistent, dismissible **"Join free to start" call-to-action band** on public pages (`/learn/:id`, `/community/:slug`, `/sim/:gameTitle`) shown only when signed out, routing to `/auth`.
- Course detail signed-out view: show outline + XP + skills gained, with locked lesson rows ("Sign in to start") instead of silently rendering nothing.
- Community profile signed-out: add "Request to join" → routes to `/auth` with return path (today the button appears but leads nowhere useful logged out).
- Verify home page meta title/description/OG tags are set for fgn.academy (SEO check, fix if missing).

### Explicitly out of scope
- No changes to what signed-in members see.
- Passports, /verify, and embed routes stay public — they are the intended marketing surface.
- No change to the Play/ecosystem webhook contracts.

## Technical notes
- Views: `create view public.public_communities with (security_invoker = true)` won't work for anon since base RLS would block; use `security_barrier` + explicit GRANT on the view with a definer-side filter, or simpler: keep base RLS but add a dedicated anon policy on a view with `security definer` semantics. Will implement as views owned by postgres with `GRANT SELECT TO anon` and revoke anon SELECT on base tables where pages are updated to use the view.
- Frontend touch points: `Index.tsx`, `CommunityProfile.tsx`, `Communities.tsx`, `CourseDetail.tsx`, `LessonDetail.tsx`, `SimIndustry.tsx`, new `JoinCtaBanner` component, `index.html` meta.
- Migration includes GRANTs for every new view per project rules.

## Verification
- Re-run the anonymous API probe for tenants/work_orders/lessons/channel_posts and confirm restricted fields are gone.
- Playwright signed-out pass over `/`, `/communities`, `/community/:slug`, `/learn/:id` confirming marketing content still renders and CTAs route to `/auth`.
- Signed-in regression check: member course play and community views unchanged.
