# Apprenticeship Pathways: "Check the job numbers in your area"

## What changes
On each Apprenticeship Pathway card on the Careers page, the main button "View on Apprenticeship.gov" becomes **"Check the job numbers in your area"**. It opens the Workforce map (https://workforce.fgn.academy) in a new tab with:
- **the trade sector already selected** for that pathway (for example, CDL Class A Driver opens "CDL truck drivers"), and
- **the learner's state already selected**, taken from the address saved on their Academy account.

The Apprenticeship.gov link stays as a small secondary link on every card. It now goes to the Apprenticeship Job Finder (https://www.apprenticeship.gov/apprenticeship-job-finder) instead of a separate occupation page for each pathway. Partner buttons (CDL Quest, CDL Exchange, Broadband Workforce) stay as they are.

## What we found
- The Workforce map already supports opening on a chosen trade and state from its web address (`?metric=workforce&trade=<id>&state=<XX>`). **No change is needed in the Workforce map project.**
- Academy stores each learner's state on their saved address (from onboarding).
- The Workforce map requires its own sign-in and admin approval. Academy learners who aren't approved there will see its sign-in or "pending approval" page first; after signing in they return to the pre-selected trade and state.

## Pathway to trade sector mapping

| Academy pathway | Workforce map trade sector |
|---|---|
| CDL Class A Driver | CDL truck drivers |
| Fiber Optic Technician | Fiber splicing (alternative: Telecom line & fiber) |
| Heavy Equipment Operator | Heavy equipment operators |
| Agricultural Equipment Technician | Precision agriculture technicians |
| Diesel Mechanic | Diesel mechanics |

If a pathway has no match, the button opens the map on its default trade. If the learner has no saved state, the map opens on its default state.

## Needs your decision
1. **Sign-in on the Workforce map.** Keep it as is (learners must sign in and be approved there), or later make the workforce view public or shared-sign-in? That would be a change in the Workforce map project, outside this plan.
2. **Fiber pathway**: "Fiber splicing" or "Telecom line & fiber"?

## Technical details
- `src/pages/Careers.tsx`: add a `workforceSector` field to each career entry; replace the primary button's label and href; move the apprenticeship.gov link to a secondary outline or text link.
- New small hook `useUserState()`: reads `user_addresses.state` for the signed-in user (primary/most recent row), normalized to a two-letter uppercase code. The query waits for `session?.access_token`.
- The URL builder is `https://workforce.fgn.academy/?metric=workforce&trade=<id>&state=<XX>`, omitting any missing parts. Keep it in one helper so the base address lives in one place.
- Trade sector IDs are stored as rows in the Workforce map's database (only `telecom`, `electrical`, `fiber_splicing`, `tower_line`, `hvac` appear in its code). Before shipping, confirm the exact IDs for CDL, heavy equipment, precision agriculture, and diesel against that project's live data, then hard-code the mapping.
- Verification: open the Careers page and confirm each button's link contains the correct trade and state; open one link and check that the map lands on that trade and state (after sign-in).
