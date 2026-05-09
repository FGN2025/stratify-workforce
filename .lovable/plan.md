## SIM Activation Plan — Roadcraft & Mechanic_Sim

Goal: bring both SIMs from "skeleton row exists" to "Industry Hub feels alive" parity with Fiber_Tech / Construction_Sim.

### Current State (audited)

| Surface | Roadcraft | Mechanic_Sim |
|---|---|---|
| `game_channels` row | ✅ teal `#12cabd`, no cover | ✅ red `#ef4444`, no cover |
| Work orders | 2 active | 1 active |
| Courses (`game_title`) | 0 | 0 |
| `sim_resources` | 0 | 0 |
| `credential_types` | 0 | 0 |
| `career_path_requirements` | 0 (no path) | 4 (diesel-mechanic) |
| Subscribers | 0 | 1 |
| Atlas AI persona | ❌ | ❌ |
| Sidebar icon | shares `Cable` w/ Fiber-Tech | `Wrench` ✅ |

### Phased Sequencing

**Phase A — Visual Identity (fast, ~30 min, no content authoring)**
1. Swap Roadcraft icon from `Cable` → distinct icon (proposed: `Map` or `Construction`). Update `GameIcon.tsx` and `simResources.ts`.
2. Author channel cover images for both SIMs (1920×600 hero), upload via media library, set `game_channels.cover_image_url`.
3. Tighten `game_channels.description` copy + `simResources.ts` `title`/`shortTitle` so the Industry Hub hero reads cleanly.
4. Align Roadcraft accent: `simResources` says `#22C55E` but channel row is `#12cabd`. Pick one and reconcile.

**Phase B — Career Spine (Mechanic_Sim first, it has a head start)**
5. Mechanic_Sim: define 2–3 `credential_types` matching the existing `diesel-mechanic` `career_path_requirements` rows (so readiness % stops being 0).
6. Roadcraft: create a `career_paths` row (e.g. `roadcraft-operator` or `infrastructure-tech`) + 4–6 `career_path_requirements` rows + matching `credential_types`.

**Phase C — Curriculum Seed (1 starter course per SIM)**
7. Roadcraft: "Roadcraft Foundations" course, `game_title='Roadcraft'`, 4–6 lessons covering equipment intro, site safety, basic ops, mission flow.
8. Mechanic_Sim: "CMS Foundations" course, `game_title='Mechanic_Sim'`, 4–6 lessons covering diagnostics workflow, tooling, safety, work-order intake.
9. Decide authoring path — see Open Question #1.

**Phase D — Resources & Work Order Expansion**
10. Add 2–3 `sim_resources` per SIM (partner sites, official docs, community).
11. Author 2–3 additional work orders per SIM to give the Hub depth.

**Phase E — Integrations (defer unless requested)**
12. Atlas AI persona rows for each SIM (`ai_persona_configs.context_type='sim:Roadcraft'`, etc.).
13. Telemetry mapping rules in `telemetry-ingest` if either SIM has a Breakroom/Play feed.
14. SCORM bundle authoring via the toolkit (only when challenge mappings exist).

### Open Questions Before Building

1. **Course authoring path** — `CourseBuilder.tsx` is SCORM-bundle focused and has no native `game_title` selector. Options:
   - (a) Add a `game_title` dropdown to CourseBuilder + author the two starter courses through the SCORM toolkit pipeline.
   - (b) Seed two minimal native courses (modules + lessons rows) directly via migration/insert and handle SCORM later.
   - (c) Defer Phase C entirely until the toolkit produces a Roadcraft/Mechanic bundle organically.
2. **Roadcraft career path identity** — does a target role already exist in your taxonomy (e.g. `infrastructure-operator`), or should we mint `roadcraft-operator`?
3. **Cover imagery** — generate via `imagegen` (premium) using brand cues, or do you have source art queued?
4. **Accent reconciliation for Roadcraft** — keep the channel teal `#12cabd` (and update config) or switch to green `#22C55E` (and update channel)?

### Out of Scope
- Multi-SIM courses, tenant-specific curricula, badging artwork beyond `icon_name` + `accent_color`, SCORM bundle authoring (Phase E only on demand).

### Risks
- Phase C is the largest effort; lack of native non-SCORM course authoring UI is the bottleneck.
- Without `credential_types`, Phase B career readiness will keep showing 0% even after requirements exist.
- Subscriber count is 0 (Roadcraft) / 1 (Mechanic) — even after activation, social proof will be thin until promoted.
