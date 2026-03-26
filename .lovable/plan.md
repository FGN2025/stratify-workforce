

# Create Integration Guide for play.fgn.gg Dev Team

Generate a markdown document with complete integration instructions for the play.fgn.gg Lovable development team, covering:

## Document Contents

1. **Overview** - What the integration does (challenge completion sync to FGN Academy Skill Passport)

2. **API Key Setup** - Store the API key as a secret/env var named `FGN_ACADEMY_API_KEY`

3. **Endpoint: Sync Challenge Completion**
   - URL: `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/sync-challenge-completion`
   - Method: `POST`
   - Header: `X-App-Key`
   - Payload: `user_email`, `challenge_id`, `score`, `skills_verified`, `metadata`
   - Response format and error codes
   - Score >= 70 = pass, < 70 = fail

4. **Endpoint: Credential API (Read/Issue)**
   - Read user credentials: `GET /credential-api/credentials/user/{email}`
   - Issue standalone credentials: `POST /credential-api/credentials/issue`

5. **When to Call** - Trigger the sync POST when a user completes a challenge on play.fgn.gg

6. **Implementation Example** - TypeScript edge function or server-side code showing exactly how to call the endpoint

7. **Important Notes**
   - Users must be registered on fgn.academy (matched by email)
   - `challenge_id` must match a work order's `source_challenge_id` on fgn.academy (imported by admin)
   - Server-side only, never expose API key in client code

## Output

A single markdown file saved to `/mnt/documents/play-fgn-gg-integration-guide.md`

## Files Changed

No codebase changes. One artifact file generated.

