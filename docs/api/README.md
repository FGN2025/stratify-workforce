# FGN.Academy API Documentation

The FGN.Academy platform exposes two REST APIs for integration with external applications in the FGN ecosystem (CDL Quest, CDL Exchange, FGN.business, etc.).

## APIs Overview

| API | Purpose | Base URL |
|-----|---------|----------|
| **Credential API** | Issue, verify, and query skill credentials | `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api` |
| **Public Catalog** | Browse training content (courses, work orders, skills) | `https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog` |

## Quick Start

### 1. Public Catalog (No Auth Required)

Fetch available simulation games and training content:

```bash
# List all games with content counts
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/games

# Get ATS skills taxonomy
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/skills?game=ATS"

# List work orders for ATS
curl "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog/work-orders?game=ATS"
```

### 2. Credential API - Public Endpoints

Verify credentials and view public passports:

```bash
# View a public skill passport
curl https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/passport/john-doe

# Verify a credential by hash
curl -X POST \
  https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/verify \
  -H "Content-Type: application/json" \
  -d '{"verification_hash": "abc123..."}'
```

### 3. Credential API - Authorized Apps (API Key Required)

Issue credentials from external training apps:

```bash
# Issue a credential (requires API key)
curl -X POST \
  https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/issue \
  -H "X-App-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "trainee@example.com",
    "credential_type_key": "ats_pre_trip",
    "score": 95,
    "skills_verified": ["pre_trip_inspection", "defensive_driving"]
  }'
```

## Authentication Methods

| Method | Header | Use Case |
|--------|--------|----------|
| **None** | - | Public endpoints (catalog, passport view, verify) |
| **Bearer Token (JWT)** | `Authorization: Bearer <token>` | User's own credentials |
| **API Key** | `X-App-Key: <key>` | Authorized apps (issue, query users) |

## Response Format

All API responses are JSON with consistent structure:

```json
{
  "data": { ... },
  "error": null
}
```

Error responses include HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created (new credential issued) |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (missing/invalid auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Server Error |

## Rate Limiting

- Public endpoints: 100 requests/minute per IP
- Authenticated endpoints: 1000 requests/minute per API key
- Caching: Public Catalog responses are cached for 5 minutes

## Next Steps

- [Authentication Guide](./authentication.md) - Detailed auth setup
- [Credential API Reference](./credential-api/README.md) - Full endpoint docs
- [Public Catalog Reference](./public-catalog/README.md) - Full endpoint docs
- [Integration Guides](./integration-guides/) - CDL Quest, CDL Exchange examples

## Support

For API access, contact FGN Academy administrators to register your application and receive API credentials.
