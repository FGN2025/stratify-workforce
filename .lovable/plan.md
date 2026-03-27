

# User Journey: play.fgn.gg Player → fgn.academy Progress

## How It Works Today

The sync is **automatic and server-to-server**. Here's the flow:

```text
┌─────────────────────┐         ┌──────────────────────────┐
│   play.fgn.gg       │         │   fgn.academy            │
│                     │         │                          │
│ 1. Player completes │  POST   │ 3. Edge function:        │
│    a challenge      │────────►│    - Finds user by email  │
│                     │         │    - Matches work order   │
│ 2. Server calls     │         │    - Records completion   │
│    sync-challenge-  │         │    - Awards XP            │
│    completion with  │         │    - Issues credential    │
│    X-App-Key header │         │    - Syncs task progress  │
└─────────────────────┘         └──────────────────────────┘
```

### What the player experiences:

1. **Plays on play.fgn.gg** — completes a challenge (e.g., Gold Challenge)
2. **play.fgn.gg's server automatically calls** the sync endpoint with the player's email, challenge ID, score, and task progress
3. **Player logs into fgn.academy** (same email) and sees:
   - Work order marked as completed
   - XP awarded
   - Task-level progress recorded
   - Credential in their Skill Passport

**No API keys, no challenge IDs, no manual input from the user.** The API key (`X-App-Key`) is stored on play.fgn.gg's server and used for every sync call automatically.

## What's Needed from play.fgn.gg

The only requirement is that **play.fgn.gg implements the webhook call** on their side. When a player completes a challenge, their server must POST to the sync endpoint. This is a one-time development task for their team — the integration guide we created documents exactly what to send.

## Current Gaps for the Player Experience

### Gap 1: No player-facing progress view on Work Order Detail
When Darcy visits a work order page on fgn.academy, she can't yet see her task-level progress. The completion record exists in the database but the UI doesn't display it.

**Fix:** Add a "Your Progress" section to the Work Order Detail page showing:
- Overall completion status and score
- Individual task checkmarks (from `user_task_progress`)
- Credential link if issued

### Gap 2: No prompt to register on fgn.academy
If a player on play.fgn.gg hasn't registered on fgn.academy, the sync returns a 404 "User not found." There's no mechanism to notify the player they should sign up.

**Fix (play.fgn.gg side):** Their UI should show a message like "Sign up at fgn.academy with the same email to track your skills."

### Gap 3: No notification when progress syncs
When a sync happens, nothing alerts the user on fgn.academy.

**Fix (future):** Add a notification/activity feed showing "Your Gold Challenge completion was recorded!"

## Recommendation

The highest-impact change is **Gap 1** — showing Darcy her progress on the Work Order Detail page. The data is already there from the test we just ran. Should I plan that UI?

