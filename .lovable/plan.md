# Rebuild fgn.academy as a curated marketplace of applications

## Hierarchy to approve first

```text
FGN Academy marketplace (fgn.academy)  discover, compare, launch, My Academy
 └─ Discipline        Maritime & Marine Ops, Rail & Transportation, Motorsports &
                      Vehicle Dynamics, Agriculture, Construction, Broadband ...
     └─ Application   maritime / railway / simracing / merits .fgn.academy,
                      broadbandworkforce.com, in-Academy experiences
         └─ Activity  Work Order, simulation challenge, assessment
Program / community   Scouts, an ISP community, an employer cohort.
                      Spans applications; controls access and participants.
```

- Disciplines, applications and programs are three separate things that link many-to-many. One application (for example, drone operations) can appear under several disciplines without copying its content or learner records.
- Subdomains are where applications live. They are not the full category list.
- Merits is listed as a cross-discipline program application. Its exact scope gets confirmed with its owner before the final label.
- FGN.GG stays a competition source that feeds progress in. It is not a discipline or a program.

## What exists today
- A single programs registry (9 rows) mixes verticals, trades, games, an industry and a competition source. That is exactly the blending this rebuild separates.
- Public `/programs` pages, a public registry feed, a shared points ledger, canonical skills, Skill Passport, Work Orders and organization membership.
- Shared sign-in is marked "unverified" for every sub-site.

## Stage 1 — Marketplace foundation (this build)
Completion test: a visitor can find and launch every available application.
1. **Registry, split into three lists.** Disciplines, applications, and links between applications and disciplines. Each application has a launch type (subdomain, external, or in-Academy), status (Live / Preview / Coming soon), access terms (open, sign-in required, organization invite) and the shared services it uses. Existing program rows keep their IDs and move across, so points, redemption options, game links and offerings stay intact.
2. **Marketplace home.** The signed-out home becomes the discovery page: a featured row, carousels by discipline, and filters by discipline and access type. Adding an application means adding a catalog entry, with no homepage redesign.
3. **Listing pages.** `/disciplines/:key` lists the applications, skills and activities in a discipline. `/apps/:key` shows what the app is, which disciplines it belongs to, its access terms, the skills it records evidence for, its redemption options, and a Launch button.
4. **Redirects.** `/programs` and `/programs/:key` keep working and forward to the matching new page. Old URLs such as railway.fgn.gg stay recorded as legacy links.
5. **Admin catalog editor (platform admin only).** Create and edit disciplines and applications, link them, set featured and status. Community admins keep managing only their own organization's offerings.

## Stage 2 — Connected experience (next)
Completion test: a participant moves between applications with one account and no lost history.
- Academy becomes the single sign-in for every subdomain (its OAuth consent page already exists), and returns the user to the app they came from. Each subdomain is checked one at a time, then marked Verified.
- "My Academy" in the signed-in Workspace shows the applications the learner uses and their combined progress and evidence.
- Each application publishes a small capability file. Academy checks it, so listings show what each app actually supports.

## Stage 3 — Partner distribution (later)
Organization catalogs (an ISP, school or employer picks its portfolio of applications), sponsored access, cohorts and reporting, all built on the current organization curation model.

## Stage 4 — Commercial expansion (only when justified)
Paid access and approved outside publishers. Not in scope now: no checkout, revenue sharing or public app submissions.

## FGN.GG connections stay exactly as they are
The rebuild only changes how apps are listed and found. Nothing in the FGN.GG connection is redesigned.
- **Kept untouched:** importing challenges, syncing completions, polling achievements, the retry queue, links from challenges to lessons, and the signed delivery address with its duplicate protection (200 for already done, 409 with retry for in-progress).
- **Links:** challenge links keep the plural `/challenges/:id` form and the FGN origin challenge ID. play.fgn.gg and the legacy fgn.gg link stay recorded.
- **Marketplace placement:** FGN.GG appears as a "Competition" source on the application and discipline pages its challenges feed (for example, Trucking challenges show on Rail & Transportation or Construction where they're mapped). It never becomes a discipline or program, so it can't be curated away or hidden by organization settings.
- **Records:** challenge-earned progress, skill signals and points keep their IDs and history, and still show in the Passport and My Academy.
- **Release check:** every stage ends with the existing FGN.GG checks before publishing: a signed challenge completion, a repeat delivery, a challenge link opening correctly, and achievement sync. A stage doesn't ship if any of these fail.

## Rules carried through every stage
- **Signing in doesn't grant access.** A shared account never opens private programs on its own; access comes from program or organization membership.
- **Taking part doesn't prove competence.** Completed, evidence submitted and assessed stay separate states, and the Passport keeps them apart.
- **Shared systems don't mean shared visibility.** Partners see only the participants and evidence they're authorized for (current organization-scoped rules).
- Existing IDs, completion records, partner mappings and evidence links are kept. No separate learner record per application.
- FGN Academy stays the public brand. Sub-sites stay independently deployable, and this plan doesn't change code on Merits, Maritime, Sim Racing, Railroading or FGN.GG. No time indicators. XP and credits are written only on the server. Decision 4 still applies.

## Decisions needed
- Approve the hierarchy and the starting discipline list above.
- Confirm Merits' scope label, and name an owner for each subdomain's Stage 2 handshake.

## Technical details
- New tables `disciplines`, `applications` and `application_disciplines`, plus `program_applications` linking programs and communities to applications. Each gets GRANTs and RLS: platform admins write, signed-in users read. Anonymous reads go only through `public_*` projection views or the registry feed, per the anonymous-surface rule.
- Backfill: each current `programs` row with kind vertical, industry or game becomes an application that reuses the same UUID, linked to a discipline. Program-level rows (Scout Merits) also stay in `programs`. `programs` stays readable and its retired fields are marked deprecated, never dropped.
- `program-registry` feed: the current response is kept, with additive `disciplines[]` and `applications[]` fields, versioned in the contract inventory.
- UI: HorizontalCarousel inside `container mx-auto px-4`. Pillar colors stay locked, and application accent colors are used only on cards.
- `AGENTS.md` gets a rule that disciplines, applications and programs are separate registries linked many-to-many.
