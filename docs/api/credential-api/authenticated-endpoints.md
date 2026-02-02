# Credential API - Authenticated Endpoints

These endpoints require a valid Supabase JWT token.

---

## GET /credentials/mine

Retrieve all credentials for the currently authenticated user.

### Request

```
GET /credentials/mine?game={game_filter}
Authorization: Bearer <jwt_token>
```

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <jwt_token>` | Yes |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `game` | string | No | Filter by game (ATS, Farming_Sim, etc.) |

### Response

```json
{
  "credentials": [
    {
      "id": "uuid",
      "passport_id": "uuid",
      "title": "Pre-Trip Inspection Certification",
      "credential_type": "certification",
      "credential_type_key": "ats_pre_trip",
      "game_title": "ATS",
      "issued_at": "2026-01-15T10:30:00Z",
      "expires_at": null,
      "score": 95,
      "issuer": "cdl-quest",
      "issuer_app_slug": "cdl-quest",
      "skills_verified": ["pre_trip_inspection", "vehicle_safety"],
      "external_reference_id": "session_12345",
      "verification_hash": "a1b2c3d4e5f6...",
      "metadata": null,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Authorization required` | Missing Authorization header |
| 401 | `Invalid token` | JWT is expired or invalid |

### Example

```bash
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/mine \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### TypeScript

```typescript
import { supabase } from '@/integrations/supabase/client';

interface Credential {
  id: string;
  passport_id: string;
  title: string;
  credential_type: string;
  credential_type_key: string | null;
  game_title: string | null;
  issued_at: string;
  expires_at: string | null;
  score: number | null;
  issuer: string;
  issuer_app_slug: string | null;
  skills_verified: string[] | null;
  external_reference_id: string | null;
  verification_hash: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

async function getMyCredentials(game?: string): Promise<{ credentials: Credential[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  
  const url = new URL('https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/mine');
  if (game) url.searchParams.set('game', game);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

// Usage
const { credentials } = await getMyCredentials('ATS');
console.log(`You have ${credentials.length} ATS credentials`);
```

### Notes

- Returns empty array if user has no passport yet
- Passport is automatically created when first credential is issued
- Credentials are sorted by `issued_at` descending (newest first)
