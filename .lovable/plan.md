# Studio-first authoring and a simpler Admin dashboard

## Goal
Building challenges, Work Orders and courses starts in one place: pick an industry app, then author in studio.fgn.gg. Academy becomes the place to review, publish, curate, assign and verify. FGN.GG challenge import stays as the second way in.

```text
Pick app (industry) --> Author in Studio --> Submit --> Academy review --> Publish
FGN.GG challenge ----> Import (Configurator) ------> Academy review --> Publish
```

## 1. Industry-first "New Work Order" flow (Academy side)
- New "Create" entry in the admin menu opens a picker of My Academy Apps grouped by discipline (same cover cards as /apps).
- Choosing an app opens studio.fgn.gg with the app, its disciplines and allowed simulations pre-selected (read from the existing catalog API, no new data).
- Second choice on the same screen: "Import from FGN.GG challenges" (existing import, now filtered to the chosen app's simulations).
- Studio submissions carry the chosen app; the review inbox shows it and approval files the draft Work Order under that app.

## 2. Configurator becomes edit-only
- Remove "Create Work Order" from the Configurator; keep quick edits (title, description, criteria, category, active toggle), publication-readiness checks, and FGN.GG challenge import.
- Work Order rows from Studio show a "Edit in Studio" link for deep content changes.

## 3. Admin dashboard review — keep, merge, move, remove

Keep in Academy (governance, learners, live operations):
- Users, Communities, Community Review, Community Setup, Registration Codes, Events, Curation
- Evidence Review, Studio Submissions (renamed "Review Inbox"), Marketplace Catalog
- Credential Types, Authorized Apps, Webhooks, Discord, AI Config, Super Admin
- FGN Play health, Play Webhook Retry, Parity Monitor, Play Games Sync (merged into one "Integrations" page with tabs)

Merge:
- Challenge Registry + Challenge Mappings + Challenge Tracks + Activity Mapping become one "Challenges" page with tabs.
- SIM Games + SIM Categories + SIM Resources become one "Simulations" page with tabs (internal taxonomy unchanged).
- Media Library stays, also reachable from the Marketplace Catalog cover editor.

Move to Studio, then remove from Academy:
- Breakroom Mapper — removed from the menu and admin pages now. The automatic Breakroom sync keeps running; unmatched quizzes are mapped by setting the Breakroom link on the Work Order in Studio (or the Configurator quick edit as interim).
- Course Builder — Studio generates SCORM. Hidden from the menu now, page retired once Studio's first real package passes the joint test (kept reachable by direct link until then).
- Work Order create dialog (see section 2).
- Notebook Telemetry — candidate to move; kept until Studio confirms it wants it.
- Skills Paths (career paths) — stays in Academy for now; flagged as a future Studio item.

Resulting menu (community tier): Community Setup, Events, Work Orders, Evidence Review, Curation, Media, Registration Codes, Skills Paths.
Platform tier: Create, Review Inbox, Users, Communities, Marketplace Catalog, Challenges, Simulations, Integrations, plus the super-admin items above.

## 4. Studio side (Darcy, darcy@fgn.gg)
- Accept the app/discipline/simulation launch values from Academy.
- Include the app in every submission; offer "Edit in Studio" for existing Work Orders.
- Own Breakroom link editing and SCORM generation.
- Handoff doc updated with the new fields; joint test closes the phase.

## Unchanged
FGN.GG import, completion sync, points, Skill Passport, Breakroom sync, Work Order categories/filters/MCP tools, server-only XP/credits, Decision 4, time ban, no changes to FGN.GG, Merits, Maritime, Sim Racing, Railroading.

## Technical details
- Submission contract: add optional `applicationSlug` (validated against `applications`) in a new contract version; older versions still accepted. Store on `studio_submissions`.
- Studio launch URL: `https://studio.fgn.gg/new?app=<slug>&discipline=<slug>&games=<list>`.
- Remove routes/menu items: `breakroom-mapper` section and component, Course Builder menu entry; old URLs redirect to the new merged pages so bookmarks keep working.
- Merged pages reuse existing manager components inside tabs; no table changes besides the submission column.
- Update AGENTS.md (Studio is the authoring front door; Academy reviews and publishes), roadmap.md, admin user guide.
