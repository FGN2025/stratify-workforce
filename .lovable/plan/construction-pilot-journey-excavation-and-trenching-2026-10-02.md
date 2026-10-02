# Construction pilot journey (Excavation and Trenching)

## Goal
Show, with live accounts and no shortcuts, that a learner's reviewed evidence gives the right outcomes once and only once.

Pilot Work Order: "Excavation and Trenching Operations" (active, 5 tasks, 8 evidence requirements). Accounts: qa-learner (500-credit balance) and qa-reviewer (FGN Global organization admin only).

## Steps
1. **Baseline snapshot:** record the learner's XP, credentials, badges, Skill Passport, credit balance and skill signals before anything happens.
2. **Learner submits evidence** through the preview (Playwright, signed in as qa-learner): open the Work Order, upload evidence for every required piece on one task, and submit.
3. **Partial review:** the reviewer accepts one piece and asks for a revision on another. Check that the step stays open, nothing is awarded, and the learner sees the revision request.
4. **Resubmit and accept:** the learner resubmits and the reviewer accepts the rest. Check that the step closes as demonstrated.
5. **Verify outcomes:**
   - The Skill Passport shows the reviewed demonstration and the new skill signals.
   - The pilot points are issued exactly once.
   - XP, credentials and badges are unchanged from the baseline.
6. **Repeat protection:** reopen the review and accept it again, then call the pilot reward a second time. Check that no new points, signals or credentials appear.
7. **Negative checks:**
   - A pilot reward on an unreviewed task is refused.
   - A reviewer from another organization can't see or decide this evidence.
8. **Pathway redemption:** activate a QA pathway-step option for Heavy Equipment and redeem it with the earned points. It should succeed only now that reviewed evidence exists. Switch the option off afterwards.
9. **Record:** add the results, screenshots and any defects to the review test report. Fix any defect found and test it again before moving on to the sign-in return checks.

## Out of scope
FGN.GG, Merits, Maritime, Railroading and Sim Racing. No catalog migration and no promotion beyond this Work Order.

## Technical details
- UI path: TaskEvidencePanel (learner) and TaskEvidenceReviewQueue (reviewer). Sessions are minted per user with `lovable auth-session --user <uuid>`.
- Checks: `task_demonstrations.status` / `review_completed_at`, `skill_signals` (v2_fit_weighted), `user_points` filtered on `award_pathway='pilot_review_reward'` (count = 1), and `skill_credentials` / XP sums against the baseline.
- `award_pilot_review_reward` is called twice to test the once-per-task rule. `reopen_task_review` followed by a second accept should add no new signals.
- Cross-organization check uses a temporary membership in another tenant, removed afterwards.
- Test rows stay in place until cleanup at the end of all open tests.
