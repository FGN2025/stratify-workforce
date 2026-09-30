# Apprenticeship Pathways: "Check the job numbers in your area"

## What changes
On each Apprenticeship Pathway card on the Careers page, the main button "View on Apprenticeship.gov" becomes **"Check the job numbers in your area"**. It opens the Workforce map (https://workforce.fgn.academy) in a new tab with:
- **the trade sector already selected** for that pathway (for example, CDL Class A Driver opens "CDL truck drivers"), and
- **the learner's state already selected**, taken from the address saved on their Academy account.

The Apprenticeship.gov link stays as a small secondary link on every card. It now goes to the Apprenticeship Job Finder (https://www.apprenticeship.gov/apprenticeship-job-finder) instead of a separate occupation page for each pathway. Partner buttons (CDL Quest, CDL Exchange, Broadband Workforce) stay as they are.

## What we found
- The Workforce map already supports opening on a chosen trade and state from its web address (`?metric=workforce&trade=<id>&state=<XX>`). **No change is needed in the Workforce map project.**
- Academy stores each learner's state on their saved address (from onboarding).
- The Workforce map currently requires its own sign-in and admin approval. **Decision:** it will move to a shared fgn.academy sign-in. That change is made in the Workforce map project, not here. Until it ships, learners may see the map's sign-in page first; after signing in, they return to the trade and state that were already selected.

## Pathway to trade sector mapping (one or more sectors per pathway)

| Academy pathway | Workforce map trade sectors |
|---|---|
| CDL Class A Driver | CDL truck drivers |
| Fiber Optic Technician | Fiber splicing, Telecom line & fiber |
| Heavy Equipment Operator | Heavy equipment operators (candidate: Mobile heavy equipment mechanics) |
| Agricultural Equipment Technician | Precision agriculture technicians |
| Diesel Mechanic | Diesel mechanics |

The main button opens the first sector in the list. When a pathway has more than one sector, small links under the main button ("Also see: Telecom line & fiber") open the map on each of the other sectors, with the learner's state still selected. If a pathway has no match, the map opens on its default trade. If the learner has no saved state, the map opens on its default state.

## Follow-up (Workforce map project, separate)
- Shared fgn.academy sign-in on workforce.fgn.academy, replacing its separate sign-in and approval gate for Academy learners.

## Technical details
- `src/pages/Careers.tsx`: add `workforceSectors: {id, label}[]` to each career entry. The primary button gets the new label and a link to the first sector. Additional sectors render as secondary links. The apprenticeship.gov link moves to a secondary link that points to the Job Finder URL.
- New hook `useUserState()`: reads the signed-in user's `user_addresses.state` (primary or most recent row) and returns an uppercase two-letter code. It waits for `session?.access_token`.
- One helper, `workforceMapUrl(sectorId, state)`, builds `https://workforce.fgn.academy/?metric=workforce&trade=<id>&state=<XX>` and leaves out any missing parts.
- Trade sector IDs are data rows in the Workforce map project. Only `telecom`, `electrical`, `fiber_splicing`, `tower_line`, and `hvac` appear in its code. Confirm the IDs for CDL, heavy equipment, precision agriculture, and diesel against its live data before hard-coding them.
- Verification: open the Careers page and confirm each button's link contains the correct trade and state; open one link and check that the map lands on that trade and state (after sign-in).
