# Phase 2A — Build report (review gate)

Status: **BUILT AND TESTED.** Stopped at the Phase 2A review gate. No expansion to House
Flipper 2, no broad catalog migration, no Skill Verification, no credential issuance, no
retroactive XP or badges.

---

## 1. Schema actually created

Tables (all in `public`, all RLS-enabled, all with explicit GRANTs, no `USING (true)`):

`work_order_task_evidence_requirements`, `evidence_artifacts`,
`evidence_artifact_requirements`, `assessment_criteria`, `assessment_results`,
`task_skill_mappings`, `task_demonstrations`, `skill_signals`,
`skill_signal_evidence_bases`, `skill_verifications`, `skill_verification_signals`,
`signal_strength_schemes`.

Enums: `evidence_type`, `evidence_basis`, `artifact_status`, `association_status`,
`assessment_outcome`, `evidence_quality`, `skill_relationship`, `demonstration_status`.

Attempt anchor: the existing `user_work_order_completions.id`. No parallel attempt model.
Carried on `evidence_artifacts.completion_id`, `evidence_artifact_requirements.completion_id`,
`task_demonstrations.completion_id` (not null), `skill_signals.completion_id`.

### Changes made during implementation (deltas from the approved spec)

1. **`skill_signal_evidence_bases` added** (spec item 2 of the build approval): a signal keeps
   every contributing evidence basis, one flagged `is_primary`. `skill_signals.evidence_basis`
   remains as the primary basis for convenience; the junction is authoritative.
2. **`tenant_id` stamped durably** on `evidence_artifacts`, `evidence_artifact_requirements`,
   `assessment_results`, `task_demonstrations` and `skill_signals` by BEFORE-INSERT triggers,
   resolved from `current_or_user_tenant(learner)` — the existing Academy rule. Work Order
   ownership is never used to grant review rights.
3. **`legacy_task_attribution`** column added to `evidence_artifacts`
   (`not_applicable` | `deterministic` | `unknown`) to carry the legacy doctrine in data.
4. **Server-side progression functions** rather than client logic:
   `ensure_task_demonstration`, `recompute_task_demonstration`, `complete_task_review`,
   `reopen_task_review`, `create_skill_signals_for_demonstration` (internal, EXECUTE revoked
   from clients), plus recompute triggers on associations and assessment results.
5. **Catalog curation gate discovered during testing.** `is_work_order_visible()` hides a new
   public Work Order from any tenant that has curation rows, which also hid its requirements
   and criteria from the reviewer. The prototype was curated into FGN Global only. Any future
   authored Work Order needs the same curation step.

---

## 2. RLS actually applied

| Table | Read | Write |
| --- | --- | --- |
| `work_order_task_evidence_requirements`, `assessment_criteria`, `task_skill_mappings` | authenticated users who can see the parent Work Order | platform admins, tenant admins of the owning tenant |
| `evidence_artifacts` | owner or `can_review_tenant_evidence(tenant_id)` | owner inserts own, updates only while `draft`/`submitted`; reviewers update review fields |
| `evidence_artifact_requirements` | owner or authorized reviewer | owner may insert `claimed` and edit while `claimed`/`needs_revision`; reviewers may set decisions |
| `assessment_results` | subject learner and authorized reviewers | reviewers only, `reviewer_id = auth.uid()` |
| `task_demonstrations` | learner own, reviewers in tenant | no client path may set `demonstrated`; status only via the review functions |
| `skill_signals`, `skill_signal_evidence_bases` | learner own, admins in tenant | service_role / internal function only |
| `skill_verifications`, `skill_verification_signals` | subject and admins | human verifier insert only; no trigger, function or job may write |

`can_review_tenant_evidence(tenant_id)` = platform admin OR `is_tenant_admin(auth.uid(),
tenant_id)`. Evidence files live in the private `evidence` bucket and are read through
short-lived signed URLs.

---

## 3. ATS prototype as authored

Work Order **Trailer Positioning and Dock Approach** (`3b9cd4ba-…`), ATS, public, curated to
FGN Global, canonical activity `b6e90c9b-0c62-4232-ab04-a92064af191b`, GG challenge
`f969023f-d69e-4323-a508-778c6a92e7fa`. No new canonical activity was minted.

5 tasks, 6 evidence requirements, 11 assessment criteria, 7 approved task→skill mappings
(`backing_maneuvers`, `docking`, `defensive_driving`, `route_planning` — all existing keys,
no taxonomy change). Written setup rationale is stored as real text, not a screenshot.

---

## 4. Acceptance test (executed end to end)

Learner **Maria_Roads** (no platform role), tenant context **FGN Global**, reviewer
**Sam_Diesel** (tenant admin, no platform role), attempt `6967e4a6-…`.

| Step | Result |
| --- | --- |
| One video claimed for two requirements | 1 artifact, 2 associations — no duplicate upload |
| Mirror discipline 0:00–2:30 | accepted → task **demonstrated**, 2 skill signals |
| Alley dock 0:42–0:58 | needs revision → task **not demonstrated** |
| Learner submits corrected still | new artifact + new association; old association kept `is_active = false` with its assessment results intact |
| Re-review of the revision | accepted → alley dock **demonstrated**, 1 skill signal; the mirror acceptance untouched |
| Skill signals | `defensive_driving` strong (0.85), `backing_maneuvers` moderate (0.60), `docking` moderate (0.60) |
| Provenance | every signal stores association, artifact, requirement, task, attempt, Work Order and `simulation_activity_id` |
| Skill verifications | **0** — none created |
| Credentials / XP / badges | none issued as a side effect |

Evidence-only never demonstrates: before review, both tasks sat at `not_demonstrated` with
gating criteria unmet.

---

## 5. Security / multi-tenant test results

| Check | Result |
| --- | --- |
| Learner reads own evidence | 2 artifacts, 3 associations, 7 results, 3 signals |
| Different learner, same community | 0 rows everywhere |
| Tenant reviewer (FGN Global) | full read, review succeeded |
| Administrator of another community (Acme) | 0 rows read; attempted update affected 0 rows |
| Global/public Work Order shared across tenants | granted no cross-tenant evidence access |
| Platform admin | full oversight retained |
| Signed-out visitor | 0 rows |
| Files | private bucket, signed URLs only |

---

## 6. Learner and reviewer experience shipped

- Work Order page: **Evidence for each step** — per-task requirements, what the reviewer looks
  for, upload or write a response, reuse an already-submitted item for another requirement,
  optional start/end time for a clip, per-requirement status (submitted / accepted / needs
  revision / not accepted), and earlier submissions kept visible.
- Admin → Evidence Review: **Step evidence awaiting review** — learner, community, Work Order,
  step, requirement, artifact with signed-URL open, clip range, written text, learner note, and
  per-criterion outcome + quality with gating marked, then Accept / Needs revision / Not
  accepted. Human review only; no AI scoring anywhere.
- No internal terminology ("artifact requirement", "skill signal confidence") is shown to
  learners.

---

## 7. Friction observed

1. Curation gate (above) silently hid an authored Work Order from a curated tenant — needs a
   check in the authoring flow.
2. Assessment currently records one row per criterion per association; a reviewer who leaves a
   criterion blank gets a default derived from the decision. A "no opinion" state may be worth
   modelling.
3. Outcome-only capture with adequate quality lands at `weak` under `v1_three_band`; the real
   test only reached `moderate` because the still was graded `strong`. Worth recalibrating.
4. Skills taxonomy is game-scoped, so cross-industry skills will fragment as prototypes spread.

## 8. Recommended before a second prototype

- Add a curation/visibility check to the authoring path.
- Decide the "criterion not assessed" representation.
- Review the `v1_three_band` bands with a second, non-driving Work Order (HF2 painting is the
  natural contrast: quantity take-off plus written reasoning).
- Keep Skill Verification dormant until a verification policy exists.

Test fixtures retained (learner Maria_Roads, reviewer Sam_Diesel as FGN Global admin, Carlos
Builder as Acme admin) so these results stay reproducible; say the word and they are removed.
