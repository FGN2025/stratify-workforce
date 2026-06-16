# Work Order Name Contract — v1.0

Status: **Draft for review** (academy-side implementation conforms; Configurator implements against this after approval.)

Source of truth for the work-order display-name generation pipeline. Both implementations (fgn.academy + Configurator) MUST conform to this contract. Function signatures are HTTP-ready so the synthesizer can later back a hosted service with minimal change.

Companion to `docs/cover-prompt-contract.md`. The neutral-language rule and trade-context lookup are **shared** between the two contracts (one source of truth per concept).

## Changelog
- **v1.0** — Initial. Single-step synthesis (synthesize name → admin reviews/edits → admin persists). Forward-only column (`work_orders.generated_name`). Display resolver: `title || generated_name || play_source.name`. Neutral-language and trade-context lookups extracted into shared edge-function modules.

---

## 1. Pipeline

One visible step (simpler than cover, which has two: prompt then image):

```
            ┌─────────────────────────────────────┐
work_order ─►  synthesizeWorkOrderName(input)     ├──► editable candidate (UI)
            └─────────────────────────────────────┘
                                                     │ admin reviews, optionally edits
                                                     ▼
                                            UPDATE work_orders
                                            SET generated_name = <admin-edited>
                                            WHERE id = <work_order_id>
```

Step 1 returns a candidate name string. The admin sees it and may edit before clicking Save. Persistence is a plain `UPDATE` on `work_orders` from the admin UI — there is no separate generate-and-persist edge function (unlike cover, where image upload must happen server-side).

---

## 2. Inputs

### 2.1 `synthesizeWorkOrderName`

```ts
type SynthesizeWorkOrderNameInput = {
  work_order_id: string;            // UUID, required
  admin_steer?: string | null;       // optional admin guidance, e.g. "emphasize safety"
};

type SynthesizeWorkOrderNameOutput = {
  generated_name: string;            // 3–8 words, Title Case, neutral language enforced
};
```

The function reads the work order server-side and synthesizes from:
- `title` (may be NULL — that's the whole point)
- `description`
- `game_title` → resolved via shared trade-context lookup (§5)
- `category_key`
- `difficulty`
- `metadata.play_source.name` and `metadata.play_source.description` (preferred scene reference when present)

Field-mapping rules:
- `game_title` enum → human trade context via the shared table in `supabase/functions/_shared/trade-context.ts`. Unknown enums fall back to `"industrial trade work"`.
- `metadata.play_source.name` is the canonical upstream challenge name from play.fgn.gg. The synthesizer uses it as a hint, NOT as the output — the model translates it into trade-framed language.
- `admin_steer` is injected BEFORE the hard rules in the user message; it cannot override the neutral-language rule or word-count constraints.

---

## 3. Neutral-language rule (ENFORCED, shared with cover contract)

Same banned-term list as `docs/cover-prompt-contract.md` §3. Implemented once in `supabase/functions/_shared/neutral-language.ts` and imported by both synthesizers.

### Banned in output name
- "load out", "loadout", "loadouts"
- "plan the route", "route plan", "plan your route"
- "sim", "simulator", "simulation", "in-game", "gameplay"
- "challenge", "work order", "job task", "objective", "mission"
- "tutorial", "training scenario", "playthrough"
- Sim-type / archetype labels (e.g. "spatial task", "sequence task", "loadout task", "debrief")
- Platform-flavored verbs (e.g. "deploy", "spawn")

### Required substitutions
- "loadout" → describe the actual tools/equipment ("Roof Tool-Belt Build-Out")
- "plan the route" → describe the actual movement/location ("Phoenix Refrigerated Run")
- "challenge / work order" → describe the work itself ("Frame a Hip Roof")
- Sim names → the trade context

Enforcement is server-side: the synthesizer runs `findBannedTerms()` on the model's output. Any hit returns `422 { code: "validation", field: "output" }` with the offending terms and the raw candidate (so the admin can choose to manually clean and save).

---

## 4. System prompt (synthesizer)

The synthesizer model receives this exact system prompt (excerpt; full text is inlined in `supabase/functions/synthesize-work-order-name/index.ts`):

```
You write short display names for work orders that describe real-world
industrial and trade work.

Each work order represents a real job. Translate its metadata into a
concise, trade-framed name suitable as a card heading and page heading
on a learning platform.

NEUTRAL-LANGUAGE RULE (non-negotiable):
[shared text from _shared/neutral-language.ts]

HARD RULES (non-negotiable):

1. Length: 3 to 8 words. Title Case. No trailing punctuation. No quotes.
   No emoji. No markdown.

2. Trade-framed: name the real-world work (e.g. "Build a Pitched
   Asphalt-Shingle Roof", "Long-Haul Refrigerated Delivery to Phoenix").
   NEVER name the sim, game, archetype, or platform mechanic.

3. Specific over generic. Prefer the concrete job ("Replace a Fiber
   Drop at a Service Pedestal") over the abstract category ("Fiber
   Work").

4. Do not echo banned terms even if they appear in the input title or
   description. Rewrite them.

OUTPUT: only the name. Nothing else. No preface, no explanation.
```

---

## 5. Trade-context lookup (shared with cover contract)

Single source: `supabase/functions/_shared/trade-context.ts`. Both `synthesize-cover-prompt` and `synthesize-work-order-name` import from it. See `docs/cover-prompt-contract.md` §5 for the canonical table contents. Implementations MUST extend the shared module (not duplicate the table) when adding sims.

---

## 6. Output validation (server-side, before return)

After the model responds, the synthesizer:

1. Strips surrounding quotes, markdown emphasis chars, and trailing punctuation.
2. Runs `findBannedTerms()`. Any hit → `422 { code: "validation", field: "output", banned_hits: [...] }`.
3. Checks word count (split on whitespace). Outside `[2, 12]` → `422 { code: "validation", field: "output" }`. The contract target is 3–8 words; the validator allows 2–12 to absorb minor model variance, and the admin is expected to tighten in the UI.
4. Returns `200 { generated_name }`.

The 422 responses include the raw `generated_name` so the admin UI can offer "Edit and save anyway" instead of forcing a regeneration.

---

## 7. Persistence and display resolver

### Schema
- `work_orders.title` — text, **nullable** (relaxed in this migration). NULL = unauthored. Configurator and academy import paths SHOULD leave NULL on creation and let a human author it later.
- `work_orders.generated_name` — text, nullable. AI-synthesized neutral display name. Fallback. Never overrides title.
- `work_orders.metadata.play_source.name` — JSONB, captured by the convergence sweep in Phase 1.

### Resolver

Single source of truth: `src/lib/work-order-display.ts` exports `getWorkOrderDisplayName(wo)`.

```ts
function getWorkOrderDisplayName(wo): string {
  return (
    (wo.title?.trim() || null) ||
    (wo.generated_name?.trim() || null) ||
    (wo.metadata?.play_source?.name?.trim() || null) ||
    "Untitled work order"
  );
}
```

All three legs are trimmed and null-guarded so whitespace-only values fall through.

Every UI surface that renders a work order display name MUST use this helper. Raw `.title` access on work-order objects (dot or destructured) is treated as a bug outside the admin edit dialog (where the raw title field is being edited by a human).

---

## 8. Errors (uniform shape)

```ts
type WorkOrderNameError =
  | { code: "unauthorized" }
  | { code: "not_found", entity: "work_order" }
  | { code: "validation", field: string, message: string, generated_name?: string, banned_hits?: string[] }
  | { code: "gateway", status: number, message: string }
  | { code: "internal", message: string };
```

4xx from the AI Gateway is terminal — do NOT retry. Surface `gateway` to the UI with the upstream message. `validation` with a `generated_name` field means the model produced output but failed server-side checks; the admin can edit and save manually.

---

## 9. Implementation notes

### Academy (v1.0, this build)
- Edge function: `supabase/functions/synthesize-work-order-name/index.ts`.
- Admin-only (validate JWT + `has_role(uid, 'admin')`).
- Shared modules: `_shared/trade-context.ts`, `_shared/neutral-language.ts`. Cover-prompt synthesizer refactored to import from these.
- Admin UI: a panel inside `WorkOrderEditDialog` with **Generate** / **Edit** / **Save generated name** / **Use as title** actions. "Use as title" only copies into the title input — admin still clicks the dialog Save.
- Import pre-fill (`handleImportChallenge`): leaves title BLANK so newly imported work orders land with `title = NULL`, exercising the resolver fallback.
- Save validation: empty title input persists as `title: null`.

### Configurator (future, contract-conforming)
- Configurator-driven imports MUST leave `title = NULL` on new work-order rows. Title is for human-authored content only.
- Configurator MAY optionally pre-compute a `generated_name` against this contract and ship it inline. If it does, the synthesized string MUST pass §3 (neutral language) and §6 (validation). The academy will trust the value as-is.
- Configurator MUST NOT seed `title` from `play_source.name` (that was the Phase A behavior; this contract supersedes it).

### Future hosted-service migration
- The function signature in §2.1 is already HTTP-ready.
- To host: wrap as `POST /v1/work-order-name/synthesize`. Auth becomes a shared HMAC or OAuth client-credentials flow instead of Supabase JWT.

---

## 10. Known limitations

- v1.0 is forward-only. The 48 existing work orders all carry authored titles and therefore short-circuit at the title leg of the resolver. They are not retro-named. An admin may clear a title to NULL to opt a row into `generated_name || play_source.name` rendering.
- The word-count validator (`[2, 12]`) is generous to absorb model variance. The UI should encourage tighter editing to the 3–8 contract target without enforcing rejection.
- Banned-term detection is substring/word-boundary based, not semantic. A model that paraphrases sim jargon ("game") will pass the validator even though the contract intent is broader. The system prompt + neutral-language rule are the primary defenses; the validator is a backstop.
