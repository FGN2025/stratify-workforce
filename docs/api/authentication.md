# Authentication Guide

FGN.Academy APIs use three authentication methods depending on the endpoint type.

## Authentication Methods Overview

| Method | Header | Required For |
|--------|--------|--------------|
| **None** | - | Public endpoints |
| **Bearer Token** | `Authorization: Bearer <jwt>` | User's own data |
| **API Key** | `X-App-Key: <key>` | Authorized external apps |

---

## 1. Public Endpoints (No Auth)

These endpoints are accessible without any authentication:

**Public Catalog API:**
- `GET /games` - List simulation games
- `GET /courses` - List published courses
- `GET /courses/:id` - Get course details
- `GET /work-orders` - List active work orders
- `GET /work-orders/:id` - Get work order details
- `GET /skills` - Get skills taxonomy

**Credential API:**
- `GET /passport/:slug` - View public passport
- `POST /credentials/verify` - Verify a credential
- `GET /catalog/credential-types` - List credential types

### Example

```bash
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/games
```

---

## 2. Bearer Token Authentication (JWT)

For endpoints that require user authentication, pass a Supabase JWT token.

### Endpoints

**Credential API:**
- `GET /credentials/mine` - Get current user's credentials

### Getting a Token

Users authenticate through the FGN.Academy web app using Supabase Auth. The JWT is available from the session:

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Using the Token

```bash
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/mine \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Expiration

- Tokens expire after 1 hour
- Use `supabase.auth.refreshSession()` to get a new token
- Never store tokens in localStorage for long periods

---

## 3. API Key Authentication

External applications (CDL Quest, CDL Exchange, etc.) use API keys to access privileged endpoints.

### Endpoints

**Credential API:**
- `POST /credentials/issue` - Issue a credential to a user
- `GET /credentials/user/:email` - Get credentials for a specific user

### Registering Your App

1. Contact FGN Academy administrators
2. Provide your app name, description, and allowed origins
3. Specify which credential types your app should be able to issue
4. Receive your `X-App-Key`

### App Permissions

Each authorized app has specific permissions:

| Permission | Description |
|------------|-------------|
| `can_read_credentials` | Query user credentials |
| `can_issue_credentials` | Issue new credentials |
| `credential_types_allowed` | List of credential type keys app can issue |

### Using the API Key

```bash
curl -X POST \
  https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/issue \
  -H "X-App-Key: fgn_app_abc123xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "trainee@example.com",
    "credential_type_key": "ats_pre_trip",
    "score": 95
  }'
```

### Security Best Practices

1. **Never expose API keys in client-side code** - Use server-to-server calls
2. **Use environment variables** - Store keys in `process.env`
3. **Rotate keys periodically** - Contact admin to regenerate
4. **Restrict origins** - Configure allowed origins for your app
5. **Monitor usage** - Audit logs are available for all API calls

---

## Error Responses

### 401 Unauthorized

Missing or invalid authentication:

```json
{
  "error": "Authorization required"
}
```

```json
{
  "error": "Invalid token"
}
```

```json
{
  "error": "Invalid API key"
}
```

### 403 Forbidden

Authentication valid but insufficient permissions:

```json
{
  "error": "App does not have issue permission"
}
```

```json
{
  "error": "App cannot issue credential type: ats_hazmat"
}
```

---

## CORS

All APIs support CORS with the following headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-app-key
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

For browser-based applications, preflight `OPTIONS` requests are handled automatically.

---

## TypeScript SDK (Coming Soon)

A TypeScript SDK is planned for easier integration:

```typescript
import { FGNAcademyClient } from '@fgn/academy-sdk';

const client = new FGNAcademyClient({
  apiKey: process.env.FGN_API_KEY
});

// Issue a credential
const credential = await client.credentials.issue({
  userEmail: 'trainee@example.com',
  credentialType: 'ats_pre_trip',
  score: 95
});
```
