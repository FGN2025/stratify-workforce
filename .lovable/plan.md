# Rebuild fgn.academy as a marketplace of discipline apps

## What already exists
- A programs registry with 9 entries: Scout Merits, Maritime, Sim Racing, Railroading (preview), Broadband & Fiber, Heavy Equipment, Trucking, Farming, plus FGN.GG (competition source, not a program).
- Public pages `/programs` and `/programs/:key`, a public `program-registry` feed, and per-program redemption options on the shared points system.
- Shared services each app relies on: one sign-in, Skill Passport, points ledger, canonical skills, credentials and verification, Work Orders.
- Gaps: shared sign-in across subdomains is marked "unverified" for every sub-site; the home page still reads as a single learning site, not a library of apps; sub-sites run on their own and don't report what they can do.

## Target shape

```text
fgn.academy  (marketplace + shared services)
 ├─ Marketplace: browse disciplines, app cards, search/filter by kind
 ├─ Shared: sign-in, Skill Passport, points wallet, credentials, Workspace
 └─ Disciplines (each deployed on its own)
     ├─ Subdomain apps: merits / maritime / simracing / railway / ...
     ├─ External partner apps: broadbandworkforce.com
     └─ In-Academy disciplines: Heavy Equipment, Trucking, Farming
FGN.GG = competition source feeding progress in (listed, not a discipline)
```

## Stages

1. **Marketplace home.** Signed-out home becomes the app library: a featured row, then carousels grouped by kind (Verticals, Trades, Industries, Games). Each card shows name, tagline, status (Live / Preview), what it connects to (Passport, points, sign-in), and opens the subdomain or the in-Academy page. Signed-in Workspace adds "My disciplines" (apps the learner has activity in) and the points wallet.
2. **Discipline detail pages.** Extend `/programs/:key` into an app listing page: what you learn, linked games and trades, skills earned, ways to redeem, and a "Launch app" button. In-Academy disciplines keep their current course/Work Order content.
3. **Registry upgrades (platform admin only).** Add listing fields: hero image, category, featured flag, screenshots, launch mode (subdomain / external / in-Academy). Admin screen to add a discipline without code. A new subdomain then shows up in the marketplace on its own.
4. **App handshake contract.** Each sub-site publishes a small capability file (for example `/.well-known/fgn-app.json`) giving its name, version, health, and which shared services it uses. Academy reads it into the registry's capability fields, so "unverified" turns into a checked status. This goes in the versioned contract inventory.
5. **Shared sign-in across subdomains.** Use Academy as the single sign-in provider (Academy's OAuth consent route already exists) so a learner signed in on fgn.academy is recognised on each subdomain, with return-to-app after sign-in. Checked per sub-site, then the badge changes to "Verified".
6. **Shared wallet and Passport across apps.** Sub-sites send progress to Academy through the existing learning-source path (signed, deduplicated, retried), and read the learner's balance and Passport through scoped read tokens like the Studio ones. Each discipline keeps its own reward types (badges, prizes, pathway steps) on the one points ledger.

## Boundaries (standing rules kept)
- FGN Academy stays the public brand; organizations stay account context only.
- Sub-sites stay independently deployable; Academy doesn't depend on their internals (for example, Broadband SCORM stays on its own site).
- This plan doesn't change any code on Merits, Maritime, Sim Racing, Railroading or FGN.GG. Stages 4 to 6 need each site owner to opt in, and we coordinate with them.
- No time indicators. XP and credits are written only on the server. Decision 4 still applies.

## Decisions needed from you
- Should a learner choosing a discipline change the look of the site (accent color), or only the content shown?
- Who owns each subdomain's handshake work (named people per site)?
- Do you want a single marketplace search across all apps, or browsing only at first?

## Technical details
- New `programs` columns: `category`, `featured`, `hero_image_url`, `launch_mode`, `screenshots jsonb`, `capabilities_checked_at`. Public reads go only through the `program-registry` feed and a public projection view.
- A scheduled edge function fetches each `canonical_url/.well-known/fgn-app.json` and validates it against a JSON Schema published next to the Studio schemas.
- Shared sign-in is done with Academy as the OAuth server (configure_oauth_server), plus a client registration for each subdomain that only allows that subdomain's redirect addresses.
- Sub-site reads use scoped tokens (reusing the studio-auth pattern), with each scope tied to one program.
- UI reuses HorizontalCarousel inside `container mx-auto px-4`, and keeps pillar colors locked.
