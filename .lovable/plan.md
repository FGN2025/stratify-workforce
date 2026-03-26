

## Two-Way Challenge Integration: Import Config + Sync User Completions

### The Big Picture

The system already has everything needed for user completion sync — the **Credential Interchange Protocol** (`credential-api` edge function) with its `POST /credentials/issue` endpoint. The missing pieces are:

1. **Config import** (admin side): Import challenge definitions from play.fgn.gg → work orders
2. **User completion sync** (play.fgn.gg side): When a user completes a challenge on play.fgn.gg, it calls the credential API to write a credential to their Skill Passport on fgn.academy

### What Already Exists (No Changes Needed)

- `POST /credentials/issue` — Authorized apps can issue credentials to users by email
- `GET /credentials/mine` — Users can view their own credentials
- `authorized_apps` registry with API key auth, permission scoping, and credential type restrictions
- Skill Passport with SHA256-verified credentials
- Work order completion tracking (`user_work_order_completions` table)

### What Needs to Be Built

#### Part 1: Challenge Import (Admin Config) — Previously Approved Plan

Same as the approved plan:
1. **DB migration**: Add `source_challenge_id` to `work_orders`
2. **Edge function `fetch-challenges`**: Proxy play.fgn.gg's public API
3. **`ImportChallengeDialog.tsx`**: Challenge picker for admins
4. **Update `WorkOrderEditDialog.tsx`**: "Import from FGN" button that auto-fills the form

#### Part 2: Register play.fgn.gg as an Authorized App

This is an **admin action**, not code — done through the existing Authorized Apps Manager in the Admin Dashboard:
1. Register "play.fgn.gg" as an authorized app with `can_issue_credentials = true`
2. Assign the credential types it can issue (e.g., `ats_pre_trip`, challenge completion types)
3. Generate an API key for play.fgn.gg to use

#### Part 3: Completion Webhook Endpoint (New)

Create a new edge function `sync-challenge-completion` that play.fgn.gg calls when a user finishes a challenge. This function:

1. Receives: `{ user_email, challenge_id, score, skills_verified }`
2. Maps the `challenge_id` to a work order via `source_challenge_id`
3. Creates/updates a `user_work_order_completions` record (so the work order page shows the user's status)
4. Calls the existing credential issuance logic to add a credential to the user's Skill Passport
5. Awards XP via `user_points`

This is essentially a wrapper that ties the credential API + work order completion tracking together, triggered by play.fgn.gg.

#### Part 4: Display User-Specific Data on Work Orders

Update the work order cards and detail page to show per-user status pulled from:
- `user_work_order_completions` — attempt count, score, completion status (already exists via `useWorkOrderCompletion` hook)
- `skill_credentials` — credentials earned from that challenge (query by `source_challenge_id` linkage)

This is mostly already wired — the `useUserWorkOrderStatus` hook exists. We just need to ensure imported work orders display the same completion indicators.

### Implementation Sequence

1. **Part 1**: Challenge import (DB migration → edge function → UI components) — 4 files
2. **Part 3**: `sync-challenge-completion` edge function — 1 file
3. **Part 4**: Verify work order cards show user completion status for imported orders — minor UI tweaks
4. **Part 2**: Document the admin steps to register play.fgn.gg as an authorized app

### Data Flow

```text
┌─────────────────┐     import config      ┌──────────────────┐
│  play.fgn.gg    │ ──────────────────────► │  fgn.academy     │
│  /challenges    │     (fetch-challenges)  │  work_orders     │
│                 │                         │  (source_id link)│
│                 │     user completes      │                  │
│  challenge      │ ──────────────────────► │  sync-challenge  │
│  completion     │  (sync-challenge-       │  -completion     │
│                 │   completion endpoint)  │                  │
│                 │                         │  ┌──────────────┐│
│                 │                         │  │ work_order   ││
│                 │                         │  │ _completions ││
│                 │                         │  ├──────────────┤│
│                 │                         │  │ skill        ││
│                 │                         │  │ _credentials ││
│                 │                         │  ├──────────────┤│
│                 │                         │  │ user_points  ││
│                 │                         │  │ (XP)         ││
│                 │                         │  └──────────────┘│
└─────────────────┘                         └──────────────────┘
```

### Technical Notes

- The `sync-challenge-completion` endpoint uses an `X-App-Key` header (same auth pattern as credential API) so only registered apps can trigger it
- User matching is by email (same as credential API)
- The `source_challenge_id` column on `work_orders` links imported challenges to their play.fgn.gg origin, enabling the completion sync to find the right work order
- No new secrets needed — play.fgn.gg's public API uses their anon key; the API key for play.fgn.gg to call back is generated through the existing Authorized Apps admin UI

