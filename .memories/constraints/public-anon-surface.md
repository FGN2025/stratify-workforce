---
name: Anonymous surface policy
description: Which data is public (marketing) vs members-only; use safe projection views for anon reads
type: constraint
---
Anonymous (signed-out) users may read ONLY these safe projections:
- `public_communities`, `public_work_orders`, `public_lesson_outlines` (plus courses, modules, categories, badges, career paths, game channels, site_media).

Base tables `tenants`, `work_orders`, `lessons`, and `channel_posts` are authenticated-only.
**Why:** lesson content includes quiz answers (`correct_index`); tenants/work_orders base rows expose owner/reviewer/integration internals.
**How to apply:** any new client query that must work signed-out must target a projection view or a table confirmed to have an anon policy — never widen a base-table policy to public.
