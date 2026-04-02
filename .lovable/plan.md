

# Atlas AI Tutor: Combined Gap Analysis + Welcome Message Plan

This plan consolidates all remaining Atlas AI Tutor gaps into a single implementation pass.

```text
GAP 1 — Open Notebook is global, not per-SIM          [CRITICAL]  ← from prior plan
GAP 2 — Tutor never knows which SIM the user is in    [CRITICAL]  ← from prior plan
GAP 3 — Missing personas for 3 SIM categories         [MODERATE]  ← from prior plan
GAP 4 — No notebook reference in AI system prompt      [MODERATE]  ← from prior plan
GAP 5 — Chat panel shows global notebook link only     [LOW]       ← from prior plan
GAP 6 — No welcome message or starter questions        [MODERATE]  ← NEW (this request)
```

---

## Step 1: Database — Add `notebook_url` to persona configs (Gap 1)

Migration to add a `notebook_url` column to `ai_persona_configs`:

```sql
ALTER TABLE ai_persona_configs ADD COLUMN notebook_url text DEFAULT NULL;
```

## Step 2: Insert missing game personas (Gap 3)

Data inserts for `game_Farming_Sim`, `game_Construction_Sim`, and `game_Mechanic_Sim` with relevant system prompts and empty `notebook_url` (admins fill in later).

## Step 3: Pass `gameTitle` through tutor context (Gap 2)

**`src/hooks/useTutorContext.ts`** — The work order detail branch currently returns `type: 'work_order'` with no `gameTitle`. Since the hook doesn't have the work order data, add a lightweight mechanism:

- Add a module-level setter/getter (`setCurrentGameTitle` / `getCurrentGameTitle`) exported from `useTutorContext.ts`
- When the work order detail page renders and has data, call `setCurrentGameTitle(workOrder.game_title)`; clean up on unmount
- In `useTutorContext`, read this value when on `/work-orders/:id` and include it as `pageContext.gameTitle`

**`src/pages/WorkOrderDetail.tsx`** — Call `setCurrentGameTitle` in a `useEffect` when work order data loads.

## Step 4: Inject notebook URL into system prompt (Gap 4)

**`supabase/functions/ai-tutor/index.ts`** — Update `getPersonaFromDB` to also select `notebook_url`. In `buildSystemPrompt`, if a `notebook_url` is present, append an instruction like:

```
Reference knowledge base: {notebook_url}
When students ask domain questions about this simulation, draw on this source.
```

## Step 5: Admin UI — Add notebook URL field to persona editor (Gap 1 + 5)

**`src/components/admin/AIConfigManager.tsx`** — In the `PersonaEditor` component, add a "Notebook URL" `Input` field for game-type personas (those with `context_type` starting with `game_`). Update `AIPersonaConfig` type in `useAIConfig.ts` to include `notebook_url`.

## Step 6: Chat panel — Use per-SIM notebook link (Gap 5)

**`src/components/tutor/TutorChatPanel.tsx`** — Instead of reading the global `open_notebook_url` from platform settings for the notebook icon, query the current persona's `notebook_url` based on `pageContext.gameTitle`. Fall back to the global URL if no SIM-specific one exists.

## Step 7: Welcome message + starter questions on first open (Gap 6)

**`src/hooks/useTutorChat.ts`** — After creating a new conversation (the `else` branch in `loadOrCreateConversation`), inject a local-only assistant welcome message:

```typescript
const welcomeMessage: TutorMessage = {
  id: crypto.randomUUID(),
  conversation_id: newConversation.id,
  role: 'assistant',
  content: buildWelcomeMessage(userContext, pageContext, chatMode),
  created_at: new Date().toISOString(),
};
dispatch({ type: 'ADD_MESSAGE', payload: welcomeMessage });
```

The `buildWelcomeMessage` function generates a personalized greeting referencing the user's level/XP and current page context. This message is NOT persisted to the database.

**`src/components/tutor/TutorChatPanel.tsx`** — Replace the current static empty-state block (`messages.length === 0`) with starter question chips that appear after the welcome message. Condition: `messages.length === 1 && messages[0].role === 'assistant' && !isStreaming`.

Clicking a chip calls `sendMessage(question)` directly (not just filling the input). Starter questions are context-aware:

- **General**: "How do I improve my XP?", "What work order should I try next?", "What skills am I building?"
- **Work Order page**: "What should I focus on in this challenge?", "Tips for improving my score", "What skills does this build?"
- **Research mode**: "Compare CDL endorsement types", "Fiber optic cable standards", "DOT inspection requirements"

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/...` | Add `notebook_url` column to `ai_persona_configs` |
| Database inserts | 3 new game personas (Farming, Construction, Mechanic) |
| `src/hooks/useTutorContext.ts` | Add `setCurrentGameTitle`/`getCurrentGameTitle`; use in work order context |
| `src/pages/WorkOrderDetail.tsx` | Call `setCurrentGameTitle` on mount with work order's game_title |
| `src/hooks/useAIConfig.ts` | Add `notebook_url` to `AIPersonaConfig` type |
| `src/components/admin/AIConfigManager.tsx` | Add Notebook URL input to `PersonaEditor` for game personas |
| `supabase/functions/ai-tutor/index.ts` | Select `notebook_url` from persona; inject into system prompt |
| `src/hooks/useTutorChat.ts` | Inject welcome message on new conversation; add `buildWelcomeMessage` helper |
| `src/components/tutor/TutorChatPanel.tsx` | Replace empty-state with starter question chips after welcome message; use per-SIM notebook link |
| `src/contexts/TutorContext.tsx` | Pass `userContext` through to `useTutorChat` for welcome message personalization |

