# Retire the Breakroom integration

Breakroom is no longer a partner. Stop all background work and remove every learner, admin and help reference, while keeping past learner records intact.

## 1. Stop all activity
- Unschedule the 15-minute Breakroom check job.
- Delete the `breakroom-lms-poll` and `breakroom-lms-sync` functions.
- Deactivate any Breakroom learning-source rows and drop its stored sign-in secret.

## 2. Remove from the app
- Delete `OpenInBreakroomButton`, `BreakroomUsersTab`, and Breakroom identity UI.
- Work Order page: remove "Open in Breakroom" and the spatial task badge's Breakroom wording.
- Profile: remove the Breakroom "Spatial Verifications" section.
- Admin: remove Breakroom from Admin overview, Challenges tab and Parity Monitor.
- Help (student, admin, guide), Privacy and EULA: remove Breakroom mentions.

## 3. Docs and memory
- Delete `docs/breakroom-integration.md` and `docs/api/breakroom-sync.md`; strip mentions from the admin guide, OSHA plan and roadmap.
- Remove Breakroom memory files (integration, dedupe, UX surfaces, test identity) and add one rule: Breakroom is retired, never re-integrate.

## Data handling
- Existing Breakroom tables (sync attempts, user mappings, verifications) are kept read-only and unused, not deleted, so history and earned XP/skill signals are preserved. Can be dropped later on request.

## Verification
- Confirm the cron job and functions are gone, no `breakroom` text remains in the app code, typecheck clean, and Work Order, Profile and Admin pages load.
