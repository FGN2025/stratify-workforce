# Integration contract hardening (inventory v2026-10-01.1)

Apply decisions 1–5 to the deployed handlers, then bump the contract inventory. Nothing changes for FGN.GG, Merits, Maritime, Railroading or Sim Racing apart from what's listed below.

## 1. Reject pushes for pull-only sources
- The general receiver returns `409 { error: "source_is_pull_only", slug }` when a source is marked pull. The attempt is still logged as `failed` so the rejection is visible.
- BBW is currently the only pull source. If BBW later ships its own sender, an admin switches it to push; no code change is needed.
- Suggestion (no objection to your decision): return 409 rather than 401, so partners can tell "wrong mode" apart from "bad signature".

## 2. Fail closed on a missing signing secret
- A strict source whose signing secret isn't configured gets `503 { error: "signing_secret_unconfigured" }` and is logged as a failure. This matches how Play's receiver already behaves.
- A non-strict source stays lenient but is labelled `unsigned`, as it is today.

## 3. X-App-Key: retire it only where it isn't needed
- **Critical, stays:** the header is the per-partner app key used by the Credential API, the Studio token exchange, media upload and SCORM publish. Removing it would break authorized apps.
- **Retire:** the challenge-completion endpoint's fallback to `X-App-Key`. All 17 recorded direct completions on file used the ecosystem key; none used the app key. After the change, the app key gets a 401 with a message naming the correct header.
- Update the admin Play health check, which currently tests the endpoint with the app key, to use the ecosystem key.
- Mark the old header as retired on this endpoint in the partner guides and the in-app developer docs.

## 4. Approved evidence vs. dormant Skill Verification (needs your pick)
Today approved evidence from a partner creates a `skill_verification` credential, while Phase 2D keeps Skill Verification dormant. Options:
- **A (recommended):** record the approval as partner evidence (Task Demonstration input / Skill Signal basis) with no credential and no XP until Skill Verification is activated. Consistent with Phase 2D.
- **B:** keep accepting the event but hold it in a review queue, unprocessed, until activation.
- **C:** reject the event with `501 not_enabled` until activation.
Until you choose, the plan applies C as a safe interim: nothing is minted and senders get a clear status. No partner sends this event today.

## 5. Consistent automatic retry across all inbound sources
- Generalize the Play-only retry queue so it also records the source (`play`, `bbw`, future sources).
- When any source can't match a learner, the event is queued. That covers Play webhooks, the general receiver, the BBW pull and forwarded challenge completions.
- When a learner signs up or links a matching identity, queued events for that email are re-run through the same shared credential path. Existing duplicate protection prevents double credentials or XP.
- BBW: an enrollment from an unmatched learner is no longer marked plain `completed`. It's marked `unmapped` and queued, so moving the pull forward no longer loses it.
- Existing Play replay behavior and its schedule stay as they are.

## 6. Future `*.fgn.academy` host family
- The inventory adds a Host Aliases section: today's endpoint URLs stay canonical, and future subdomains (e.g. `api.fgn.academy`) are recorded there once DNS and routing exist. No host is claimed until it resolves.
- Contract rules stay host-independent, so moving hosts later won't change headers or response formats.

## Verification (deployed endpoints)
- Push to `bbw` gets 409.
- A strict source with its secret removed (temporary test source) gets 503.
- `X-App-Key` on the challenge-completion endpoint gets 401, while the ecosystem key succeeds.
- `evidence.approved` gets 501.
- An unmatched-learner event from a test source is queued; creating that user replays it once, with no duplicate on a second replay.
- Test rows are cleaned up. Results are reported as deployed tests vs. planned checks.

## Technical details
- Files: `supabase/functions/learning-source-webhook/index.ts`, `_shared/learning-source/handlers.ts` (`verifySignature`, `handleEvidenceApproved`, unmapped enqueue), `learning-source-pull-bbw/index.ts`, `sync-challenge-completion/index.ts` (drop `x-app-key` branch), `play-webhook-receiver/index.ts` (enqueue via shared helper), `process-play-replay-queue/index.ts` (source-aware dispatch), `health-check-play/index.ts`, `src/lib/api-docs.ts`.
- Migration: add `source_slug text not null default 'play'` and `payload jsonb` to `play_replay_queue`, plus an index on `(status, email)`. Extend `enqueue_play_replay_on_signup` to cover all sources. Grants unchanged (service role only).
- Docs: `docs/api/contract-inventory.md` (version bump, decisions log, host aliases), `integration-guides/inbound-learning-source.md`, `authentication.md`, `outbound-progress-to-play.md` as needed. `AGENTS.md`: one rule stating that inbound identity retries go through a single source-aware queue.
