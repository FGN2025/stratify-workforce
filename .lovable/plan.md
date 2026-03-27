

## Fix: Import from FGN Challenges — Invalid API Key

### Problem

The `fetch-challenges` edge function is failing with **"Invalid API key"** when trying to connect to play.fgn.gg's database. The anon key hardcoded in the function is no longer valid — it was likely rotated on the play.fgn.gg Supabase project.

### What You Need

The **current anon key** from the play.fgn.gg Supabase project. Someone on the play.fgn.gg team needs to provide it (found in their Supabase dashboard under Settings → API → `anon` `public` key).

### Fix Plan

1. **Store the play.fgn.gg anon key as a secret** instead of hardcoding it — this way it can be updated without redeploying code
2. **Update `fetch-challenges` edge function** to read `PLAY_FGN_ANON_KEY` from environment variables via `Deno.env.get()`
3. **Redeploy** the edge function

### Technical Detail

**`supabase/functions/fetch-challenges/index.ts`** — Replace the hardcoded key:
```typescript
// Before (broken):
const PLAY_FGN_ANON_KEY = 'eyJhbGci...';

// After:
const PLAY_FGN_ANON_KEY = Deno.env.get('PLAY_FGN_ANON_KEY')!;
```

Add a secret named `PLAY_FGN_ANON_KEY` with the current valid key from the play.fgn.gg team.

### What This Means for You

Once you provide the updated anon key from play.fgn.gg, the "Import from FGN Challenges" dialog will load and display all active challenges, letting you select and import them as work orders — including the Champion Challenge (`ac1cb8c7-aec5-44e8-942b-f13ffb307b4d`).

