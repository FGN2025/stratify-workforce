

## AI Configuration and Open Notebook Integration

This plan adds two major capabilities: (1) an Admin panel for managing AI models and personas, and (2) integration with Open Notebook for segment-specific source-based research, alongside the existing Atlas tutor for general chat.

---

### What You'll Get

**For Admins:**
- A new "AI Configuration" tab in the Admin panel (super_admin only)
- Ability to manage which AI models are available (Gemini Flash, Gemini Pro, GPT-5, etc.)
- Editable system prompts/personas for each context (general, CDL, Fiber Tech, etc.)
- A default model selector and per-context model overrides
- Toggle models on/off for the platform

**For Students:**
- Atlas tutor dynamically uses admin-configured models and prompts (no hardcoded personas)
- A new "Research" mode toggle in the tutor panel that switches between:
  - **Tutor Mode** (default) -- guided learning with context-aware Atlas persona
  - **Research Mode** -- wider, more open-ended AI chat using a model the admin has designated for research
- An "Open Notebook" link/launcher that directs to the Open Notebook platform for deep, source-based study with uploaded documents

---

### Technical Details

#### 1. Database: `ai_model_configs` table

Stores available models and their settings, managed by admins.

```text
ai_model_configs
+------------------+-------------------+
| id (uuid, PK)   | model_id (text)   |
| display_name     | provider (text)   |
| is_enabled       | is_default (bool) |
| use_for (text[]) | max_tokens (int)  |
| created_at       | updated_at        |
+------------------+-------------------+

use_for values: 'tutor', 'research', 'all'
```

RLS: read for authenticated, write for admins only.

#### 2. Database: `ai_persona_configs` table

Stores editable system prompts per context, replacing the hardcoded `TUTOR_PERSONAS` object.

```text
ai_persona_configs
+---------------------+----------------------+
| id (uuid, PK)       | context_type (text)  |
| persona_name (text)  | system_prompt (text) |
| model_override (text)| is_active (bool)     |
| created_at           | updated_at           |
+---------------------+----------------------+
```

RLS: read for authenticated, write for admins only. Seeded with current hardcoded personas.

#### 3. Database: `ai_platform_settings` table

Simple key-value table for platform-wide AI settings (e.g., Open Notebook URL, default research model).

```text
ai_platform_settings
+------------------+-------------------+
| key (text, PK)   | value (jsonb)     |
| updated_at       | updated_by (uuid) |
+------------------+-------------------+
```

#### 4. Update `ai-tutor` Edge Function

- On each request, query `ai_persona_configs` for the matching context_type to get the system prompt
- Query `ai_model_configs` to determine which model to use (check for persona override, then default)
- Fall back to hardcoded defaults if no DB config exists (graceful degradation)

#### 5. New Admin Component: `AIConfigManager.tsx`

Added as a new tab in Admin panel (super_admin only). Three sub-sections:

- **Models** -- Table of available models with toggle switches, default selector
- **Personas** -- Editable cards for each context type with a textarea for system prompts and optional model override dropdown
- **Platform Settings** -- Open Notebook URL field, research mode toggle

#### 6. Update `TutorChatPanel.tsx`

- Add a mode toggle (Tutor / Research) in the header
- When in Research mode, send `context.type = 'research'` to the edge function, which uses the research-designated model
- Add an "Open Notebook" button that opens the configured URL (from `ai_platform_settings`) in a new tab

#### 7. Seed Migration

Insert current hardcoded personas into `ai_persona_configs` and available Lovable AI models into `ai_model_configs` so the system works immediately after deployment.

---

### Implementation Sequence

1. Create database tables and seed data (single migration)
2. Update `ai-tutor` edge function to read config from DB
3. Build `AIConfigManager` admin component
4. Add the new tab to `Admin.tsx`
5. Update `TutorChatPanel` with Research mode toggle and Open Notebook link
6. Test end-to-end

