# Give FGN Academy apps distinct industry identities

## Recommendation

Use the same visual grammar as the live FGN.GG Challenges library, but translate its taxonomy correctly:

```text
FGN.GG Challenges             FGN Academy Apps
Category: Simulation          Discipline: Construction & Heavy Equipment
Card: Construction Simulator  Card: Heavy Equipment & Construction app
Card identity: game artwork   Card identity: real industry/worksite artwork
```

The Academy app library should therefore use strong image-led app cards grouped under discipline headings. Disciplines organize the library; each app keeps its own recognizable cover, accent, name, and concise purpose.

Do **not** replace the learner sidebar’s SIM Categories with a second list of Disciplines. The Apps page already provides discipline navigation, so repeating it in the sidebar would create two competing menus.

Remove the learner-facing **SIM Categories** group from the global sidebar, while keeping the underlying SIM Categories system intact for Work Order filters, category rows, deep-dive resources, challenge overrides, and admin tools. Simulation hubs remain available from the relevant app and discipline pages.

## What will change

### 1. Image-led app library
- Redesign each app card to use a stable landscape cover, matching the density and scanability of the FGN.GG challenge cards.
- Keep rows grouped by Academy Discipline rather than simulation game.
- Show the app name, short purpose, status, access terms, and launch type without inventing activity counts.
- Use the app accent as a restrained edge/badge treatment; FGN pillar colors remain locked and unchanged.
- Preserve the current horizontal carousel behavior and mobile snap scrolling.

### 2. A coherent visual identity for every current app
- Create or assign one cover image for each current listing: Merits, Maritime, Sim Racing, Railway, Trucking, Farming, Heavy Equipment & Construction, and Broadband & Fiber.
- Follow the existing FGN imagery rules: photoreal, machinery/work-led, real environments, no baked-in text or logos, no posed worker portraits, and no game-trailer aesthetic.
- Use the existing `hero_image_url` field as the cover source, so visual identity stays registry-controlled and does not couple Academy to any app site’s deployment.
- Reuse each cover on the app detail page as a full-width identity banner with readable text overlay and a graceful non-image fallback.

### 3. Platform-admin visual controls
- Extend Marketplace Catalog editing so the platform admin can set or replace an app cover, accent, tagline, and description using the existing media upload/library control.
- Show a live card preview before saving.
- Keep new or incomplete listings hidden until their existing status is changed; no access or publication rule changes.

### 4. Discipline and simulation navigation
- Keep the top-level **Apps** link as the single entry into discipline discovery.
- Remove the signed-in learner sidebar’s **SIM Categories** section and its nested resource links.
- Keep **Admin → SIM → SIM Categories** unchanged.
- Make simulation names on app and discipline pages actionable links to their existing `/sim/:game` hubs, preserving curriculum, Work Orders, career paths, credentials, subscriptions, and external resources.
- Keep Work Order category filters, category carousels, deep dives, challenge-category overrides, MCP tools, and `category_key` behavior unchanged.

## Verified current state
- The live FGN.GG Challenges page uses image-led cards grouped under headings such as Competitive Gaming, Simulation, and Strategy.
- Academy already has the correct many-to-many Discipline → Application structure and renders one row per discipline.
- Every current Academy app has an accent but no assigned cover image; the registry already exposes an app `hero_image_url` field.
- The current Marketplace Catalog editor cannot edit that image or the app’s descriptive identity fields.
- SIM Categories are not the Academy marketplace taxonomy. They currently support Work Order grouping/filtering, deep-dive resources, challenge overrides, SIM admin tools, and sidebar navigation.
- Existing `/sim/:game` pages do not depend on the sidebar to function and already contain the resource links currently nested there.

## Validation
- Check the Apps directory, a discipline page, and every app detail page at desktop and mobile sizes.
- Confirm all current apps have readable, correctly cropped covers and fallbacks work when a cover is absent.
- Confirm the learner sidebar no longer duplicates taxonomy and remains usable when collapsed.
- Confirm every simulation link opens the correct existing hub.
- Regression-check Work Order filters, deep-dive rows, challenge overrides, SIM admin editing, FGN.GG challenge links, and the signed-in Workspace app row.
- Confirm no change to FGN.GG ingestion, challenge completion sync, points, Skill Passport history, access rules, app-site code, or independent deployment.

## Technical details
- Prefer the existing `applications.hero_image_url`; no new marketplace table is needed for the first version.
- Reuse the existing media library/image field instead of adding another upload path.
- Update the marketplace card/detail presentation and registry editor only; keep `sim_categories` and `/sim/:gameTitle` contracts intact.
- Generated or uploaded covers remain content assets, not logos. App logos can be added later only when their owners provide approved marks.
