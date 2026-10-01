# Set up a test learner with points and a reviewer

## Goal
Create two clearly labelled test accounts so the remaining live tests (redemption, refund, pilot journey, sign-in return) can run against the real app.

## Accounts
- **Test learner** — `qa-learner@fgn.academy` (plain learner role, member of the FGN Global organization).
- **Test reviewer** — `qa-reviewer@fgn.academy` (organization reviewer/instructor role only — not a platform admin, so we also prove a normal reviewer can accept evidence).
- Existing real accounts (Darcy, MJ) are not used or changed.

## Steps
1. Create both accounts through the normal sign-up path with email confirmed by an admin action, so profile, Skill Passport and membership are created by the usual triggers.
2. Give the reviewer the organization role that can review evidence (checked against the existing review permission), and confirm it cannot do platform-admin actions.
3. Grant the learner a known credit balance (e.g. 500 credits) as a single labelled admin ledger entry ("QA grant"), no XP.
4. Add one low-cost and one higher-cost test redemption option (combined cost above 500) on a test program option, marked inactive for real users.
5. Verify: learner balance reads 500, reviewer sees the Excavation & Trenching review queue, both can sign in from the preview.
6. Record the accounts, grant and cleanup steps in the stage test report; nothing deleted until all open tests finish.

## Next (after approval, in order)
Concurrent redemption + refund test, then the pilot journey, then the browser sign-in return checks.

## Technical details
- Accounts created via admin auth API from a one-off edge invocation or Cloud auth tools; roles in `user_roles` / `community_memberships`.
- Grant inserted into `user_points` with `points_type='credits'`, `award_pathway='legacy_completion'`, `event_key='qa-grant-<date>'`, `origin_site='academy'`.
- Test options in `program_redemption_options` flagged inactive / QA-named.
- Sessions for Playwright minted with `lovable auth-session --user <uuid>`.
