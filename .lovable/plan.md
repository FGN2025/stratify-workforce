# Studio-first authoring and a simpler Admin dashboard

## Goal
studio.fgn.gg (FGN Creative Hub) becomes the one shared configurator for everything authored: FGN.GG challenges, Academy Work Orders and courses. Authors pick an industry app, build once, and choose destinations (FGN.GG, Academy, or both). Academy stops creating content and becomes the place to receive, review, publish, curate, assign and verify.

```text
                         +--> FGN.GG (challenge)
Pick app --> Studio -----+
                         +--> Academy Review Inbox --> Publish (Work Order / course)
```

Existing FGN.GG challenges already linked to Academy keep working unchanged; new ones arrive through Studio.

## 1. Industry-first create flow (Academy side)
- A "Create in Studio" entry opens a picker of My Academy Apps grouped by discipline (same cover cards as /apps).
- Choosing an app opens studio.fgn.gg with the app, disciplines and allowed simulations pre-selected (from the existing catalog API).
- Studio submissions carry the app and their destinations; the Review Inbox shows both. Approval files the draft Work Order under that app and links it to the matching FGN.GG challenge when Studio sent it to both.

## 2. Configurator becomes review-and-edit only
- Remove "Create Work Order" and, once Studio distribution is live, the "Import from FGN Challenges" button (kept until then as a fallback).
- Keep quick edits (title, criteria, category, active toggle) and publication-readiness checks.
- Studio-authored rows show "Edit in Studio" for content changes.
- Challenge Registry, Mappings, Tracks and Activity Mapping shrink to read-only views of what Studio linked, plus manual override for legacy items.

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

## 5. Optimizations from the industry-subdomain and community hierarchy
- One place per fact: apps (subdomains) own launch and branding; disciplines own industry grouping; communities own who sees what. Admin screens edit each fact in one place only.
- Community catalogs by app: Curation becomes "choose apps, then fine-tune" — a community turns on whole industry apps, with per-item exceptions, instead of picking hundreds of single items.
- App-scoped admin view: platform admins can filter Work Orders, courses, submissions and evidence by app, so each industry is managed like its own small site.
- Shared app identity: subdomain sites read their cover, name, tagline and accent from the Academy catalog feed, so branding is changed once.
- Shared sign-in and progress: subdomains use Academy sign-in (already built) and send results back through the one learning-source queue; no per-site learner records.
- Community landing per app: each community gets an app-filtered page (e.g. a school's Construction offerings) using existing data.
- Cleaner learner menu: Apps replaces scattered browsing entries; Course Catalog filters by app.
- Fewer duplicate lists: industries list in constants, SIM categories and disciplines are mapped so admins never retype industry names.
- Reporting by app and community from the existing points ledger and evidence records.

## Unchanged
FGN.GG import, completion sync, points, Skill Passport, Breakroom sync, Work Order categories/filters/MCP tools, server-only XP/credits, Decision 4, time ban, no changes to FGN.GG, Merits, Maritime, Sim Racing, Railroading. Sub-sites stay independently deployed; Academy only provides the shared feed, sign-in and records.

## Technical details
- Submission contract: add optional `applicationSlug` (validated against `applications`) in a new contract version; older versions still accepted. Store on `studio_submissions`.
- Studio launch URL: `https://studio.fgn.gg/new?app=<slug>&discipline=<slug>&games=<list>`.
- Remove routes/menu items: `breakroom-mapper` section and component, Course Builder menu entry; old URLs redirect to the new merged pages so bookmarks keep working.
- Merged pages reuse existing manager components inside tabs; no table changes besides the submission column.
- Update AGENTS.md (Studio is the authoring front door; Academy reviews and publishes), roadmap.md, admin user guide.
