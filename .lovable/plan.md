## Goal

Mirror Play's v1 skills taxonomy on the Academy side. Drop the verbatim taxonomy block into our running asks thread, cross-link from our top-level ecosystem guide, deep-link per-track guides to their matching namespace, and re-flag the one remaining open ask (PR P-2 14-day legacy window).

The Phase E webhook HMAC scheme is already resolved in §6 of `docs/phase-f-status-and-open-asks.md` (FINAL, confirmed 2026-05-10) — no re-ask needed there.

## Files to change

### 1. `docs/phase-f-status-and-open-asks.md` — append two new sections

**`## 7. Update — skills taxonomy (v1, May 2026)`**

- **Source of truth:** Play's `src/lib/skillTaxonomy.ts`. Academy mirrors via `skill_credentials.skills_verified[]` and the `/public-catalog/skills` consumers.
- **Cross-reference:** Play's `docs/play-fgn-gg-integration-guide.md` §7 + "Skills Taxonomy (May 2026)".
- **Full taxonomy snapshot (v1, May 2026)** — paste verbatim, formatted as four namespace tables (cdl, osha, fiber, gaming) with proper `| Tag | Label |` markdown so it renders cleanly (the user's pasted block came in as run-on text — we'll re-flow it).
- **Difficulty rules** — `difficulty:beginner|intermediate|advanced|expert` always appended, mirrors `challenges.difficulty`.
- **Legacy fallback shape** — `["game:<games.name>", "gaming-proficiency", "difficulty:<level>"]`, emitted only when `challenges.skill_tags` is empty/null. Curated + legacy coexist, no flag day.
- **Format rules** — lowercase, namespace-prefixed `<namespace>:<skill>`; Skill Passport keys on prefix so unknown tags in a known namespace fail open; edge function does not filter unknown tags.
- **Academy-side impact (3 bullets):**
  1. `skill_credentials.skills_verified[]` accepts namespaced tags as-is.
  2. Profile / Skill Passport renders `namespace:tag` via human-label lookup, falls back to title-cased tag.
  3. `/public-catalog/skills` stays game-scoped today; adding a `namespace` field is a follow-up PR.

**`## 8. Still open — PR P-2 legacy window`**

Re-state the only remaining ask:
- **PR P-2:** how long do we accept both `X-App-Key` and `X-Ecosystem-Key` before hard-failing legacy? Academy proposes **14 days** from cutover. Need play's confirmation so we can schedule the strict-mode flip.

(Webhook HMAC is intentionally NOT re-asked — already finalized in §6.)

### 2. `docs/api/README.md` — add top-level cross-reference

Add a new bullet to the doc index pointing at the taxonomy section:

> **Skills Taxonomy (v1, May 2026)** — see `docs/phase-f-status-and-open-asks.md` §7. Spans `cdl:`, `osha:`, `fiber:`, `gaming:` namespaces plus `difficulty:*`. Canonical reference for any payload field carrying skill tags (`skills_verified[]`, challenge `skill_tags`). Source of truth: Play's `src/lib/skillTaxonomy.ts`.

This is the single top-level link Play asked for — not duplicated per-track.

### 3. `docs/api/integration-guides/cdl-quest.md` — namespace deep-link

Add one sentence near the existing `skills_verified` mention:

> Skill tags use the v1 namespaced taxonomy — `cdl:*` slice for this guide (`cdl:pre-trip`, `cdl:backing`, `cdl:speed-management`, …). Full enumeration: `docs/phase-f-status-and-open-asks.md` §7.

### 4. `docs/api/integration-guides/cdl-exchange.md` — namespace deep-link

Same pattern, pointing at the `cdl:` slice + §7 anchor.

### 5. `docs/api/public-catalog/skills.md` — short callout at top

Add a one-paragraph note above the existing `GET /skills` section:

> **v1 namespacing in effect (May 2026).** Skill `key` values returned here are the legacy game-scoped form. Cross-app payloads (e.g. `skills_verified[]` from Play) use namespace-prefixed tags — see `docs/phase-f-status-and-open-asks.md` §7 for the full enumeration. A `namespace` field on this endpoint is a planned follow-up.

## Out of scope (deferred)

- Adding `namespace` field to `/public-catalog/skills` response.
- Migrating existing `skill_credentials.skills_verified[]` rows to namespaced form.
- Profile UI namespace badges / colored chips.
- Per-track companion guides for OSHA / Fiber (`osha-overlay.md`, `fiber-tech.md`) — Play mentioned these but they don't exist on our side yet; will create when those tracks ship integration partners.

## Verification

- `rg -n "Skills Taxonomy" docs/` returns hits in `docs/api/README.md`, both integration guides, `docs/api/public-catalog/skills.md`, and the new §7 in phase-f doc.
- `rg -n "X-App-Key" docs/phase-f-status-and-open-asks.md` still surfaces the P-2 ask in §8.
- Phase-f doc renders the four namespace tables as proper markdown tables (no run-on text).