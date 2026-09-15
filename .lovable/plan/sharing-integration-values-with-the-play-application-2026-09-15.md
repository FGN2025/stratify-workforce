# Sharing integration values with the Play application

## Goal

Get the two values shown in the "Add secrets" dialog — `FGN_PLAY_API_URL` and `FGN_ECOSYSTEM_API_KEY` — into the other (Play) application, or confirm the matching values already stored here.

## Current state (confirmed)

The project already has these secrets stored (names differ slightly from the dialog):

| Dialog asks for | Already stored here as | Who owns the value |
|---|---|---|
| `FGN_PLAY_API_URL` | `FGN_PLAY_SUPABASE_URL` | Play team — it is Play's backend address, they must supply it |
| (Play's anon key) | `FGN_PLAY_SUPABASE_ANON_KEY` / `PLAY_FGN_ANON_KEY` | Play team — public key from their project |
| `FGN_ECOSYSTEM_API_KEY` | `ECOSYSTEM_API_KEY` | Shared key agreed by both sides |

## What cannot be done automatically

Secret values in this project are encrypted and write-only — they can never be read back out, by me or anyone. So "finding" a stored value to copy elsewhere is not possible. The options are:

1. If you (or the Play team) still have the original values: enter them directly into the other application's config, or paste them into the secure form here (values go straight to the encrypted store, never through chat).
2. If the original `ECOSYSTEM_API_KEY` value is lost: generate a fresh shared key, save it here, and give the same value to the Play team to store on their side. Both sides must hold the identical value.

## Steps

1. Confirm with the Play team which direction the values flow:
   - Play's backend URL + anon key → they send to you, you store here (dialog values `FGN_PLAY_API_URL`).
   - The shared ecosystem key → whoever generated it originally shares it; if lost, rotate (option 2 above).
2. If a new shared key is needed: I generate a strong random value and store it as `ECOSYSTEM_API_KEY` here — but since generated secrets are never revealed, instead you create the random value yourself (e.g. a password manager), save it via the secure form, and send it to the Play team through a one-time-secret link.
3. If you also need to give Play the address and public key for calling **this** app (Academy), those are safe to share: the Academy functions URL and the anon public key are public by design (data is protected by access rules, not by the key). I will provide these in chat on approval.

## Deliverable after approval

- A short chat message listing exactly what you can copy-paste to the Play team (Academy URL + anon public key), and what must come from them (their URL + anon key) or be rotated (shared ecosystem key).
- No code changes required.
