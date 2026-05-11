# Link Completion Cards Back to Play

Add a deep-link CTA on each Skill Passport completion card that came from Play, so users can jump back to the source challenge (and its evidence) on play.fgn.gg.

## What we already have

Every Play-issued row in `skill_credentials` carries the data we need — no schema change required:

- `issuer_app_slug = 'fgn-play'` — identifies Play as the source
- `external_reference_id` — the Play challenge UUID (e.g. `40733510-…`)
- `metadata.challenge_id`, `metadata.challenge_name`, `metadata.attempt_number`, `metadata.awarded_points`, `metadata.tasks_synced/tasks_total`, `metadata.completed_at`

Play URL convention is already locked in project memory: plural `/challenges/:id`, so the link target is:
`https://play.fgn.gg/challenges/{external_reference_id}`

## Scope

Files:
- `src/hooks/useProfile.ts` — extend the `SkillCredential` interface and select the extra columns
- `src/components/profile/CertificationCard.tsx` — render the new CTA + small attempt/score chip when present

No backend, edge function, RLS, or migration changes.

## UX

On each card that has `issuer_app_slug = 'fgn-play'` (and an `external_reference_id`):

1. Add a small "View on Play" link button at the bottom-right of the card with an external-link icon.
   - Opens `https://play.fgn.gg/challenges/{external_reference_id}` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).
   - Styled as a ghost/link button using the Play pillar accent (cyan), not the Pathways amber, so it reads as a cross-app jump.
2. Add a subtle metadata line under the existing "Issued …" line when Play metadata is present:
   - `Attempt {n} • Score {awarded_points}/{max_points} • {tasks_synced}/{tasks_total} tasks`
3. For non-Play credentials (FGN Academy course completions, FMCSA, etc.), the card renders unchanged — no CTA, no metadata line. This keeps the door open for a future BBW SCORM CTA without changing the layout contract.

The user will land on the Play challenge page logged in (shared SSO), where their own evidence is already visible — so we don't need a deeper per-evidence URL today. If/when Play exposes a stable per-submission URL, we can swap the target without touching the card.

## Future-proofing (not built now)

- When Play publishes a per-submission URL pattern, replace the link target with `…/challenges/{id}/submissions/{metadata.completion_id}` (Play hasn't confirmed the path yet — open ask).
- Same pattern will apply to broadbandworkforce.com SCORM completions later: branch on `issuer_app_slug` and pick the right base URL + label ("View on Broadband Workforce").

## Open question

The Profile screenshot shows two cards for the same Speed Management run (attempt #1 and attempt #2). That's a separate issue from this request — flag only, fix not in scope here. Want me to file it as a follow-up?
