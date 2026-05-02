

# Plan: Integrate Open Notebook API with Atlas AI Tutor

## Overview
Instead of Atlas merely linking students to Open Notebook, Atlas will query Open Notebook's Search/Ask API at runtime to retrieve game-specific knowledge and inject it as context into tutor responses. A single Open Notebook instance can serve all games — files within it are tagged by game, and Atlas searches with game-specific filters.

## Architecture

```text
Student asks question in Atlas Chat
        │
        ▼
  ai-tutor edge function
        │
        ├─ 1. Detect game context (e.g. "ATS")
        ├─ 2. Call Open Notebook /api/ask or /api/search
        │      with game-specific query + notebook_id
        ├─ 3. Inject retrieved content into system prompt
        └─ 4. Call Lovable AI Gateway with enriched prompt
        │
        ▼
  Streaming response back to student
```

## Key Design Decision: Single Notebook
One Open Notebook instance with all game materials. Atlas filters by notebook_id or search query context (e.g. prefixing with game title). No need for 6 separate notebooks — sources within Open Notebook are already organized by topic.

## Changes

### 1. Database: Add Open Notebook connection settings
Add columns/settings to `ai_platform_settings` for the Open Notebook API:
- `open_notebook_api_url` — base URL of the Open Notebook API (e.g. `https://your-instance:5055/api`)
- `open_notebook_api_password` — stored as a Supabase secret for the `X-Password` auth header

Update `ai_persona_configs.notebook_url` to store a `notebook_id` (the Open Notebook notebook ID for each game) instead of a URL, so Atlas knows which notebook to search per game context.

### 2. Edge function secret
Add `OPEN_NOTEBOOK_API_URL` and `OPEN_NOTEBOOK_API_PASSWORD` as Supabase secrets.

### 3. Update `ai-tutor/index.ts`
Add a new function `queryNotebook()` that:
- Takes the student's question + game context
- Calls `POST {OPEN_NOTEBOOK_API_URL}/ask` with the question and notebook_id from the persona config
- Returns the synthesized answer + source citations
- Falls back gracefully (skip enrichment) if the API is unavailable

Modify `buildSystemPrompt()` to inject retrieved notebook content as grounding context:
```
Current Knowledge Base Context:
{retrieved content from Open Notebook}
Sources: {citation list}

Use the above knowledge to inform your answer. Cite sources when relevant.
```

### 4. Update `ai_persona_configs` rows
- Insert `game_Roadcraft` persona
- Update all 6 game personas with their corresponding `notebook_id` from the Open Notebook instance (to be provided by admin after notebooks are organized)

### 5. Frontend: No changes needed for core functionality
The existing tutor chat panel already handles streaming responses. The notebook button can remain as a direct link for students who want to browse manually.

## Open Notebook API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /api/ask` | Ask a question against notebook content — returns synthesized answer with citations |
| `POST /api/search` | Semantic/keyword search across sources (fallback if /ask is too slow) |

Both require `X-Password` header for authentication.

## Secrets Needed
- `OPEN_NOTEBOOK_API_URL` — the base URL of your Open Notebook instance
- `OPEN_NOTEBOOK_API_PASSWORD` — the password for API authentication

## Files Modified
1. **`supabase/functions/ai-tutor/index.ts`** — Add notebook query logic, update prompt building
2. **Database migration** — Insert Roadcraft persona, add platform settings for notebook API config
3. **`src/components/admin/AIConfigManager.tsx`** — Add fields for Open Notebook API URL/password in platform settings (optional, can be managed via secrets)

