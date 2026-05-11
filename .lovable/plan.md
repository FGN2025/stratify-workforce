## Now (this turn)

**Rename only.** In `src/pages/Profile.tsx`:
- Section heading "Completions" → "Challenge Completions"
- Stats label `'Completions'` → `'Challenge Completions'` (or short label `'Challenges'` if room is tight in `PageHero` stats — recommend `'Challenges'` for the stat chip, full name for the section header)
- Subtitle "Verified credentials and qualifications" → "Verified Play.fgn.gg challenge completions"

The current grid only sources from `skill_credentials` (populated today by `play-webhook-receiver` / Play challenge events). All existing rows are challenge-derived, so this rename is accurate and non-breaking.

## Recommended timing for the separate "Course Completions / External Completions" section

**Build the UX shell now (hidden/empty state) — wire data when the SCORM ingest API lands.**

Rationale:
- `skill_credentials.credential_type` already has `course_completion`, `certification`, `badge`, `skill_verification`. The data model supports segmentation today; only the source-of-truth ingestion for broadbandworkforce.com SCORM completions is missing.
- Splitting the UI now (even with an empty state) sets user expectations and avoids a visual reshuffle later when records start landing.
- A second Skills Radar requires a per-source skill taxonomy; that depends on what the SCORM API returns. **Don't build the second radar until the API contract is locked** — otherwise the axes will need to be reworked.

### Proposed phased rollout

**Phase 1 — Now (this PR):**
1. Rename to "Challenge Completions" and filter the section to `credential_type IN ('skill_verification','badge')` AND/OR rows whose `external_source` indicates Play (e.g., `issuer = 'fgn-play'` / `external_source = 'play'`). Keep current grid layout.
2. Add a sibling section `Course Completions` directly below, filtered to `credential_type = 'course_completion'`. Show today's 3 records there. Use the same stacked grid + `CertificationCard`.
3. Keep the single existing Skills Radar; label it "Operator Skill Profile" (sources from all credentials for now).

**Phase 2 — When the broadbandworkforce.com / external SCORM ingest API ships:**
1. Introduce a source filter (Play / Academy SCORM / External SCORM) as tabs or chips on each section.
2. Add a second radar: "External Training Skill Profile" sourced from external SCORM completions, beside the existing radar (2-col grid on `lg`).
3. Add per-source attribution on each `CertificationCard` (already partially shown via `issuer` text).

**Phase 3 — Later:**
- Aggregated "Verified Skills" rollup that merges both radars into a unified competency score, gated by source-trust weighting.

## Open question for you

Do you want me to proceed with Phase 1 now (rename + add empty/populated `Course Completions` section), or **only** the rename today and defer the new section to when the SCORM API is closer?