# Credential API - Public Endpoints

These endpoints are accessible without authentication.

---

## GET /passport/:slug

Retrieve a public skill passport by its URL slug.

### Request

```
GET /passport/{slug}?game={game_filter}
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | Public URL slug of the passport |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `game` | string | No | Filter credentials by game (ATS, Farming_Sim, etc.) |

### Response

```json
{
  "passport": {
    "slug": "john-doe-cdl",
    "user": {
      "username": "john-doe",
      "avatar_url": "https://...",
      "employability_score": 85
    }
  },
  "credentials": [
    {
      "id": "uuid",
      "title": "Pre-Trip Inspection Certification",
      "credential_type": "certification",
      "issued_at": "2026-01-15T10:30:00Z",
      "expires_at": null,
      "score": 95,
      "issuer": "cdl-quest",
      "skills_verified": ["pre_trip_inspection", "vehicle_safety"],
      "game_title": "ATS",
      "credential_type_key": "ats_pre_trip",
      "verification_hash": "a1b2c3d4e5f6..."
    }
  ]
}
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Passport not found or not public` | Slug doesn't exist or passport is private |

### Example

```bash
# Get full passport
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/passport/john-doe-cdl

# Filter to ATS credentials only (CDL Passkey view)
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/passport/john-doe-cdl?game=ATS"
```

### TypeScript

```typescript
interface PassportResponse {
  passport: {
    slug: string;
    user: {
      username: string | null;
      avatar_url: string | null;
      employability_score: number | null;
    };
  };
  credentials: Credential[];
}

async function getPublicPassport(slug: string, game?: string): Promise<PassportResponse> {
  const url = new URL(`https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/passport/${slug}`);
  if (game) url.searchParams.set('game', game);
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Passport not found');
  return response.json();
}
```

---

## POST /credentials/verify

Verify the authenticity of a credential using its verification hash.

### Request

```
POST /credentials/verify
Content-Type: application/json

{
  "verification_hash": "a1b2c3d4e5f6..."
}
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `verification_hash` | string | Yes | SHA-256 hash from the credential |

### Response

**Valid Credential:**

```json
{
  "valid": true,
  "expired": false,
  "credential": {
    "id": "uuid",
    "title": "Pre-Trip Inspection Certification",
    "credential_type": "certification",
    "issued_at": "2026-01-15T10:30:00Z",
    "expires_at": null,
    "score": 95,
    "issuer": "cdl-quest",
    "skills_verified": ["pre_trip_inspection", "vehicle_safety"],
    "game_title": "ATS",
    "holder_username": "john-doe"
  }
}
```

**Expired Credential:**

```json
{
  "valid": false,
  "expired": true,
  "credential": {
    "id": "uuid",
    "title": "Hazmat Certification",
    "expires_at": "2025-12-31T23:59:59Z",
    "holder_username": "john-doe"
  }
}
```

### Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `verification_hash is required` | Missing hash in request body |
| 404 | `Credential not found` | Hash doesn't match any credential |

### Example

```bash
curl -X POST \
  https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/verify \
  -H "Content-Type: application/json" \
  -d '{"verification_hash": "a1b2c3d4e5f6789..."}'
```

### TypeScript

```typescript
interface VerifyResponse {
  valid: boolean;
  expired: boolean;
  credential: {
    id: string;
    title: string;
    credential_type: string;
    issued_at: string;
    expires_at: string | null;
    score: number | null;
    issuer: string;
    skills_verified: string[];
    game_title: string;
    holder_username: string | null;
  };
}

async function verifyCredential(hash: string): Promise<VerifyResponse> {
  const response = await fetch(
    'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_hash: hash })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}
```

---

## GET /catalog/credential-types

List all active credential types available in the system.

### Request

```
GET /catalog/credential-types?game={game_filter}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `game` | string | No | Filter by game (ATS, Farming_Sim, etc.) |

### Response

```json
{
  "credential_types": [
    {
      "id": "uuid",
      "type_key": "ats_pre_trip",
      "display_name": "Pre-Trip Inspection Certification",
      "description": "Demonstrates mastery of CDL pre-trip inspection procedures",
      "game_title": "ATS",
      "icon_name": "clipboard-check",
      "accent_color": "#3B82F6",
      "skills_granted": ["pre_trip_inspection", "vehicle_safety"],
      "issuer_app_slug": "cdl-quest",
      "sort_order": 1
    },
    {
      "id": "uuid",
      "type_key": "ats_backing",
      "display_name": "Backing Maneuvers Certification",
      "description": "Proves proficiency in reverse driving and dock procedures",
      "game_title": "ATS",
      "icon_name": "arrow-down-left",
      "accent_color": "#3B82F6",
      "skills_granted": ["backing_maneuvers", "docking"],
      "issuer_app_slug": "cdl-quest",
      "sort_order": 2
    }
  ]
}
```

### Example

```bash
# Get all credential types
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/catalog/credential-types

# Filter to ATS only
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/catalog/credential-types?game=ATS"
```

### TypeScript

```typescript
interface CredentialType {
  id: string;
  type_key: string;
  display_name: string;
  description: string | null;
  game_title: string | null;
  icon_name: string;
  accent_color: string;
  skills_granted: string[];
  issuer_app_slug: string | null;
  sort_order: number;
}

async function getCredentialTypes(game?: string): Promise<{ credential_types: CredentialType[] }> {
  const url = new URL('https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/catalog/credential-types');
  if (game) url.searchParams.set('game', game);
  
  const response = await fetch(url.toString());
  return response.json();
}
```
