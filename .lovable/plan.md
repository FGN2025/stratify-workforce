# External review response: assessment and plan

## Where we stand (against the review's P0–P3 order)

| Priority | Review asks for | Status now |
|---|---|---|
| P0 Compatibility baseline | Consumer inventory, reconciled contracts, identity/event ownership, regression checks | Mostly done. Versioned contract inventory (2026-10-01.1), push/pull rules enforced, strict signing, X-App-Key retired where it wasn't needed, one source-aware retry queue. **Gaps:** no written regression suite for the challenge path; legacy award processing is not yet separated from the new evidence model; shadow-mode signature handling is documented but not checked in production; Merits outbox not reviewed. |
| P1 Discovery and navigation | Registry, homepage, shared nav, brand, search, honest labels | Mostly done. FGN Academy branding, Course-only public discovery, program registry and feed, three-part signed-in navigation, honest labels, broken search removed. **Gaps:** homepage program cards and "explore or join an organization" choice; pre-activity requirements panel; return path after sign-in when arriving from another site; registry admin screens. |
| P2 Complete journeys | One activity per vertical, end to end | Not started for any vertical. The Excavation/Trenching pilot only proves the model. |
| P3 Governed expansion | Migrate assignments, map requirements | Correctly on hold behind the Phase 2D review gate. |

The API rules the review wants protected (Work Order → FGN.GG challenge ID → simulation_activity_id, IDs issued by other systems and never created here, historical records kept) already hold. No planned step changes them.

## Plan

### Stage A: Close the P0 gaps (do first)
1. **Keep old and new awards separate.** Add an explicit tag on each record showing which flow it came from: `legacy_completion` for course/challenge completions, which can still issue credentials and XP, or `evidence_model`, which never does while Skill Verification is off. Enforce this in the award triggers and add tests to prove it.
2. **Shadow-mode check.** Read the live `learning_sources` settings. Any source in shadow mode must record events but produce no learner results (no progress, XP, credential or signal). Add tests to prove it.
3. **Stop completions bouncing between sites.** Record where each event started and what caused it. The outbound queue will skip events that came in from the same site they would go out to.
4. **Written regression suite.** Scripted checks against the live endpoints: duplicate event, events arriving out of order, unmatched learner, wrong-organization access, withdrawn approval, and the other site being down. Keep a clear split between tests actually run and tests only planned.
5. **Integration health by program.** Extend the existing health screen with each program's last success, backlog, failures, unmatched accounts and contract version.

### Stage B: Merits outcome delivery (review only, then decide)
- Look at the Merits project's passport-outbox (read-only, in the other project) and write up how it handles issuer, requirement versions, corrections and revocations, and whether its receiver would work with ours. Build on that mechanism; do not create a second one. Nothing in Merits changes.

### Stage C: Learning sequence and Skill Passport (P2 foundation)
1. **Standard stages.** Every Work Order task can be tagged with one stage: Prepare, Coached practice, Independent attempt, Evidence, Review, Next action. Railroading's Explain/Plan/Perform/Debrief and Maritime's critical gates map onto these stages. Anything specific to one program stays in that program's own settings.
2. **Two different "not yet" results.** "Not enough evidence" means send more evidence. "Needs more practice" means repeat the attempt. Each gets its own review result and its own next step for the learner.
3. **Versioned requirements for Merits.** Each requirement has a version, and each one says what the simulation supports and what must be shown elsewhere. A related topic alone never completes a requirement.
4. **Four sections in the Skill Passport:** Participation and competition, Reviewed simulation demonstrations, FGN educational merits, and Organization-issued achievements. Every entry shows source, activity, reviewer or issuer, date and scope. Game results are never shown as a professional qualification.
5. **AI coaches.** Coaches read the same approved activity and requirement details as the rest of the Academy. Conversations stay limited to the learner and their organization, and a coaching chat never counts as an assessment.

### Stage D: P1 interface work
- **Public homepage:** short explanation, program cards (Racing, Railroading, Maritime, Scout Merits), "Explore on your own" or "Join an organization", a practice → evidence → review strip, and featured activities showing game, difficulty and availability. No time estimates, per the standing rule.
- **Signed-in Workspace order:** continue where you left off, evidence to submit, feedback to act on, recommended next activity, progress by program.
- **Before starting an activity:** a panel showing the required game and version, equipment, what to submit, and how review works.
- **Coming from another site:** keep the destination through sign-in and show a "Return to <program>" link.
- **Accessibility requirements:** evidence submission works on mobile, keyboard navigation, readable contrast, and reduced motion is respected.
- **Admin screens:** finish the registry editor (platform admin) and the offering switch (community admin).

### Stage E: P2 pilot journeys (after A–C)
- Choose one representative activity per program, with your approval of each pick. Run each journey end to end, including retries and organization isolation, before any P3 expansion.

## Needs your input before or during build
- **Time on activities:** the review asks for "duration / expected time", but a standing rule bans time indicators. I recommend keeping the ban and showing difficulty and requirements instead.
- **Decision 4** (partner evidence approvals) is still open. Stage A step 1 assumes my earlier recommendation: supporting evidence only, with no credential or XP.
- **Pilot activity for each program** (Stage E).

## Technical details
- Tag each award record with its source flow (enum `award_pathway`). Credential, XP and badge triggers only fire for `legacy_completion`.
- Add `origin_site`, `causation_event_id` and a stable `event_id` to the inbound and outbound queues. Enqueue triggers skip events whose origin matches the target.
- Add a `stage` column to `work_order_tasks`. Add review result `needs_practice` alongside `needs_revision`.
- New `program_requirements` table (program_id, requirement_key, version, sim_supported, external_required, text), with every past evidence link tied to the version the learner actually attempted.
- Build the Skill Passport sections from existing tables. No history is rewritten.
- Every table change includes access grants and access rules. The Studio and program-registry contracts only gain optional fields, and the contract inventory version goes up.
- Not in scope: FGN.GG, Merits, Maritime, Railroading and Sim Racing codebases; Phase 4 writes; non-simulated Studio approvals.
