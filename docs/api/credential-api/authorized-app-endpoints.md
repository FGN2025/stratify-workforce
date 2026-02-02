# Credential API - Authorized App Endpoints

These endpoints require an API key (`X-App-Key` header) from a registered authorized app.

---

## POST /credentials/issue

Issue a new credential to a user on behalf of your application.

### Request

```
POST /credentials/issue
X-App-Key: <api_key>
Content-Type: application/json

{
  "user_email": "trainee@example.com",
  "credential_type_key": "ats_pre_trip",
  "score": 95,
  "skills_verified": ["pre_trip_inspection", "defensive_driving"],
  "external_reference_id": "session_12345"
}
```

### Headers

| Header         | Value          | Required |
|----------------|----------------|----------|
| `X-App-Key`    | Your API key   | Yes      |
| `Content-Type` | `application/json` | Yes   |

### Request Body

| Field                 | Type     | Required | Description                                  |
|-----------------------|----------|----------|----------------------------------------------|
| `user_email`          | string   | Yes      | Email/username of the user                    |
| `credential_type_key` | string   | Yes      | Type key (e.g., `ats_pre_trip`)               |
| `score`               | number   | No       | Score achieved (0-100)                        |
| `skills_verified`     | string[] | No       | Skills to record (defaults to credential type's skills) |
| `external_reference_id` | string | No       | Your app's reference ID for linking           |

### Response

```json
{
  "success": true,
  "credential": {
    "id": "uuid",
    "passport_id": "uuid",
    "title": "Pre-Trip Inspection Certification",
    "credential_type": "skill_verification",
    "credential_type_key": "ats_pre_trip",
    "game_title": "ATS",
    "issued_at": "2026-01-15T10:30:00Z",
    "expires_at": null,
    "score": 95,
    "issuer": "cdl-quest",
    "issuer_app_slug": "cdl-quest",
    "skills_verified": ["pre_trip_inspection", "defensive_driving"],
    "external_reference_id": "session_12345",
    "verification_hash": "a1b2c3d4e5f6..."
  },
  "verification_url": "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/verify"
}
```

### Errors

| Status | Error                                      | Description                                  |
|--------|--------------------------------------------|----------------------------------------------|
| 400    | `Invalid credential type`                   | Credential type key doesn't exist            |
| 401    | `Invalid API key`                           | API key not found or inactive                 |
| 403    | `App does not have issue permission`       | App not authorized to issue                   |
| 403    | `App cannot issue credential type: {type}`| Type not in app's allowed list                |
| 404    | `User not found. User must be registered...` | Email not found in FGN.Academy               |

### Example

```bash
curl -X POST \
  https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/issue \
  -H "X-App-Key: fgn_app_abc123xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "trainee@example.com",
    "credential_type_key": "ats_pre_trip",
    "score": 95,
    "skills_verified": ["pre_trip_inspection", "defensive_driving"],
    "external_reference_id": "training_session_12345"
  }'
```

### TypeScript (Server-Side)

```typescript
interface IssueCredentialRequest {
  user_email: string;
  credential_type_key: string;
  score?: number;
  skills_verified?: string[];
  external_reference_id?: string;
}

interface IssueCredentialResponse {
  success: boolean;
  credential: {
    id: string;
    title: string;
    verification_hash: string;
    // ... other fields
  };
  verification_url: string;
}

async function issueCredential(
  apiKey: string,
  request: IssueCredentialRequest
): Promise<IssueCredentialResponse> {
  const response = await fetch(
    'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/issue',
    {
      method: 'POST',
      headers: {
        'X-App-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

// Usage (in your server/edge function)
const result = await issueCredential(process.env.FGN_API_KEY!, {
  user_email: 'trainee@example.com',
  credential_type_key: 'ats_pre_trip',
  score: 95
});

console.log('Credential issued:', result.credential.id);
console.log('Verify at:', result.verification_url);
```

---

## GET /credentials/user/:email

Retrieve all credentials for a specific user by their email/username.

### Request

```
GET /credentials/user/{email}?game={game_filter}
X-App-Key: <api_key>
```

### Headers

| Header      | Value        | Required |
|-------------|--------------|----------|
| `X-App-Key` | Your API key | Yes      |

### Path Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `email`   | string | Yes      | URL-encoded email/username |

### Query Parameters

| Parameter | Type   | Required | Description                      |
|-----------|--------|----------|----------------------------------|
| `game`    | string | No       | Filter by game (ATS, Farming_Sim, etc.) |

### Response

```json
{
  "user": {
    "username": "trainee",
    "avatar_url": "https://..."
  },
  "credentials": [
    {
      "id": "uuid",
      "title": "Pre-Trip Inspection Certification",
      "credential_type": "certification",
      "credential_type_key": "ats_pre_trip",
      "game_title": "ATS",
      "issued_at": "2026-01-15T10:30:00Z",
      "expires_at": null,
      "score": 95,
      "issuer": "cdl-quest",
      "skills_verified": ["pre_trip_inspection", "vehicle_safety"],
      "verification_hash": "a1b2c3d4e5f6..."
    }
  ]
}
```

### Errors

| Status | Error                        | Description                  |
|--------|------------------------------|------------------------------|
| 401    | `Invalid API key`             | API key not found or inactive |
| 403    | `App does not have read permission` | App not authorized to read    |
| 404    | `User not found`              | Email not found               |

### Example

```bash
# Get all credentials for a user
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/user/trainee%40example.com" \
  -H "X-App-Key: fgn_app_abc123xyz789"

# Filter to ATS credentials
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/user/trainee%40example.com?game=ATS" \
  -H "X-App-Key: fgn_app_abc123xyz789"
```

### TypeScript (Server-Side)

```typescript
interface UserCredentialsResponse {
  user: {
    username: string;
    avatar_url: string | null;
  };
  credentials: Credential[];
}

async function getUserCredentials(
  apiKey: string,
  email: string,
  game?: string
): Promise<UserCredentialsResponse> {
  const url = new URL(
    `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/user/${encodeURIComponent(email)}`
  );
  if (game) url.searchParams.set('game', game);
  
  const response = await fetch(url.toString(), {
    headers: { 'X-App-Key': apiKey }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

// Usage
const { user, credentials } = await getUserCredentials(
  process.env.FGN_API_KEY!,
  'trainee@example.com',
  'ATS'
);

console.log(`${user.username} has ${credentials.length} ATS credentials`);
```

---

## App Registration

To obtain an API key, your application must be registered with FGN.Academy.

### Registration Process

1. **Contact administrators** with:
   - App name and description
   - Website URL
   - Allowed origins (CORS)
   - Requested permissions

2. **Permissions granted:**
   - `can_read_credentials` - Query user data
   - `can_issue_credentials` - Create new credentials
   - `credential_types_allowed` - List of types you can issue

3. **Receive API key** in format: `fgn_app_<unique_identifier>`

### Best Practices

1. **Store keys securely** - Use environment variables
2. **Server-side only** - Never expose in client code
3. **Handle errors** - Implement retry with exponential backoff
4. **Log responsibly** - Audit your API calls
5. **Respect rate limits** - 1000 requests/minute per key
