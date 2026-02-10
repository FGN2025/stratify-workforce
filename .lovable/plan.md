

## Add API Key Management for AI Services

This plan adds an `api_key` column to the `ai_model_configs` table and an `open_notebook_api_key` setting to `ai_platform_settings`, so admins can configure API keys for each LLM provider and for Open Notebook directly from the Admin panel.

---

### What Changes

**For Admins:**
- A new "API Key" column in the Models table where each model can have its own API key configured
- An "API Key" field in the Platform Settings section for Open Notebook
- API keys are masked in the UI (showing only the last 4 characters) for security
- Keys are stored encrypted in the database and only read by backend functions

**For the Backend:**
- The `ai-tutor` edge function will check for a model-specific API key before falling back to the default `LOVABLE_API_KEY`
- This prepares the system for connecting directly to OpenAI, Google, or other providers when their own keys are provided

---

### Technical Details

#### 1. Database Migration

- Add `api_key_encrypted` (text, nullable) column to `ai_model_configs` -- stores the API key for each model/provider
- Insert a new `open_notebook_api_key` row into `ai_platform_settings`
- The column is nullable so existing models continue working with the default Lovable AI gateway key

#### 2. Update `ai_model_configs` RLS

- The existing read policy for authenticated users should NOT return the `api_key_encrypted` column. We will handle this by only selecting it in the edge function (service role), and never exposing it to the frontend. The admin UI will use a separate "set key" flow that writes but never reads back the full key.

#### 3. Admin UI Updates (`AIConfigManager.tsx`)

**Models tab:**
- Add an "API Key" column to the models table
- Show a masked indicator (e.g., "****abcd" or "Not set")
- Clicking opens a small dialog/input to set or update the key
- Save writes the key to the `api_key_encrypted` column

**Platform Settings tab:**
- Add an "Open Notebook API Key" field below the URL field
- Same masked display pattern -- shows status but not the full key

#### 4. Hooks Update (`useAIConfig.ts`)

- Add a `useSetModelApiKey` mutation that updates only the `api_key_encrypted` column
- Add query/mutation support for the `open_notebook_api_key` platform setting
- The read query for models will include a `has_api_key` derived field (checking if key is non-null) rather than returning the actual key

#### 5. Edge Function Update (`ai-tutor`)

- When selecting a model, also fetch `api_key_encrypted`
- If a model-specific key exists, use it in the Authorization header instead of `LOVABLE_API_KEY`
- For models with their own keys, route to the appropriate provider endpoint (future consideration -- for now all go through Lovable AI gateway)

#### 6. Security Considerations

- API keys are never returned to the frontend in full -- only a boolean "has key" or last 4 chars
- Only the service role (edge function) reads the actual key value
- The admin UI writes keys but the read query excludes them

---

### Implementation Sequence

1. Database migration: add `api_key_encrypted` column + seed Open Notebook API key setting
2. Update `useAIConfig.ts` with new mutation for setting keys
3. Update `AIConfigManager.tsx` Models table with API Key column and input
4. Update Platform Settings section with Open Notebook API Key field
5. Update `ai-tutor` edge function to use model-specific keys when available
6. Test end-to-end

