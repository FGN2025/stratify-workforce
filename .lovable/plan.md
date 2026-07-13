# Rename "Skills Development" → "Skills Discovery"

## Scope
Update every user-facing instance of "Skills Development" to "Skills Discovery" (preserving casing).

## Instances found (4)

**User-facing (must change):**
1. `index.html:7` — `<title>WELCOME TO THE WORLD OF SIMULATION GAMES FOR SKILLS DEVELOPMENT</title>` → `...FOR SKILLS DISCOVERY`
2. `src/components/marketplace/HeroSection.tsx:33` — Hero tagline `FOR SKILLS DEVELOPMENT` → `FOR SKILLS DISCOVERY`

**Backend / non-UI (recommend changing for consistency):**
3. `supabase/functions/sync-challenge-completion/index.ts:702` — Notification message copy: `"Continue your skills development at fgn.academy..."` → `"Continue your skills discovery at fgn.academy..."` (this is delivered to end users via notifications, so it is user-facing)
4. `supabase/functions/scorm-build/_lib/scorm-builder/builder.ts:5` — Code comment only; update for internal consistency

## Out of scope
- No changes to database schema, table names, enums, routes, or component/file names.
- No SEO meta description rewrite beyond the title tag change.
- No design or layout changes.

## Verification
- `rg -i "skills development"` returns zero matches after edits.
- Typecheck passes.
- Visual spot-check of Home hero and browser tab title.
