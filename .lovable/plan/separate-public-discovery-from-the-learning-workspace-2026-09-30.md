# Separate public discovery from the learning workspace

## Goal
Give FGN Academy two clearly different experiences:

- A public, audience-focused discovery site centered on Courses
- A signed-in workspace centered on each learner’s activity, progress, and organization

FGN Academy remains the product identity. Organization names and switching remain account context and do not change tenant IDs or permissions.

## Public Academy
- Introduce a dedicated public layout instead of placing visitors inside the application sidebar.
- Use a concise public header with the FGN Academy brand, Courses navigation, and sign-in/join actions.
- Rework `/` as an audience-specific FGN Academy landing page that explains the learning offer and leads into the Course catalog.
- Keep the public Course catalog and Course detail pages browsable without an account; Course outlines remain visible while enrollment and Course activity require sign-in.
- Remove Communities, Work Orders, events, careers, organization controls, learner tools, and administration from public discovery navigation.
- Keep legal and credential-verification pages reachable without sign-in where required, without promoting them as discovery destinations.

## Signed-in workspace
- Add a dedicated workspace overview as the signed-in home, combining:
  - Courses in progress and completed Courses
  - Assigned or active Work Orders
  - XP and Skill Passport progress
  - Upcoming learner activity where existing data supports it
- Use the existing application layout for the workspace, including the collapsible sidebar, notifications, account menu, role-aware administration, and simulation areas.
- Keep the active organization and organization switcher inside the signed-in account menu.
- Make the FGN Academy logo and post-sign-in default destination open the workspace overview rather than the public landing page.
- Preserve access to the public Course catalog from inside the workspace so learners can discover additional Courses without leaving their signed-in context.

## Routing and sign-in behavior
- Make `/` render the public landing experience for visitors and send authenticated users to the workspace overview.
- Add a stable signed-in workspace route and protect it with the existing authentication boundary.
- After a normal sign-in, open the workspace overview; when sign-in was triggered from a specific Course or protected destination, preserve the existing return destination.
- Keep public Course URLs shareable and maintain the current clean browser-routing behavior.
- Gate non-public learner areas with existing authentication and role checks rather than relying only on hidden navigation.

## Technical details
- Create separate public and workspace layout components so public pages no longer mount the application sidebar, tenant setup gate, or learner-only chrome.
- Reuse existing Course hooks and safe public Course projections; do not change underlying Course, tenant, enrollment, Work Order, or role data.
- Build the workspace overview from existing learner-scoped hooks and loading/empty states. Do not invent progress or activity when no records exist.
- Keep FGN Academy branding fixed at the product level and tenant branding scoped to authenticated organization context.
- Record the new public/workspace route boundary as an architecture decision.

## Verification
- Signed out: `/` shows the public Academy experience without an application sidebar; Courses and Course details are browsable; enrollment sends the visitor to sign-in and returns them correctly.
- Signed in: `/` resolves to the workspace overview; the logo returns there; active organization remains visible only in the account context.
- Confirm the workspace shows accurate learner-scoped Courses, Work Orders, XP/Skill Passport progress, and supported upcoming activity with polished loading and empty states.
- Confirm direct access to learner, organization, and administration destinations still follows the existing permission rules.
- Check desktop and mobile layouts, route refreshes, console/runtime errors, and the latest build result.

## Scope boundaries
- No tenant ID, permission, enrollment, content, or database migration changes.
- No changes to FGN.GG, Merits, Maritime, Railroading, or Sim Racing.
