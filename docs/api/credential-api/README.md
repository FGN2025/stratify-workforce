# Credential API

The Credential API enables external applications to issue, verify, and query skill credentials in the FGN.Academy ecosystem.

## Base URL

```
https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api
```

## Endpoints Summary

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/passport/:slug` | View a public skill passport |
| POST | `/credentials/verify` | Verify a credential by hash |
| GET | `/catalog/credential-types` | List available credential types |

### Authenticated Endpoints (JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/credentials/mine` | Get current user's credentials |

### Authorized App Endpoints (API Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/credentials/issue` | Issue a credential to a user |
| GET | `/credentials/user/:email` | Get credentials for a user |

## Concepts

### Skill Passport

A Skill Passport is a user's verified credential portfolio. Each user has one passport that contains all their earned credentials. Passports can be made public with a shareable URL slug.

### Credentials

Credentials represent verified skills, certifications, or achievements:

```json
{
  "id": "uuid",
  "title": "Pre-Trip Inspection Certification",
  "credential_type": "certification",
  "game_title": "ATS",
  "score": 95,
  "skills_verified": ["pre_trip_inspection", "vehicle_safety"],
  "issued_at": "2026-01-15T10:30:00Z",
  "expires_at": null,
  "issuer": "cdl-quest",
  "verification_hash": "abc123..."
}
```

### Credential Types

Credential types define what credentials can be issued. They specify:
- Display name and description
- Which game they apply to (ATS, Farming_Sim, etc.)
- Skills that are granted when earned
- Visual styling (icon, accent color)

### Verification Hash

Every credential has a SHA-256 verification hash that proves authenticity. Employers can verify credentials by submitting the hash to the verification endpoint.

## Workflow Example

### CDL Quest Training Flow

1. **User completes training** in CDL Quest
2. **CDL Quest calls** `POST /credentials/issue` with user email and score
3. **Credential is created** in FGN.Academy with verification hash
4. **User views credential** on their Skill Passport
5. **Employer verifies** via `POST /credentials/verify` with the hash

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  CDL Quest  │──────│ FGN.Academy │──────│  Employer   │
│  (Training) │ API  │ (Passport)  │ API  │ (Verify)    │
└─────────────┘      └─────────────┘      └─────────────┘
      │                     │                     │
      │ POST /issue         │                     │
      │────────────────────>│                     │
      │                     │                     │
      │ Credential Created  │                     │
      │<────────────────────│                     │
      │                     │                     │
      │                     │  POST /verify       │
      │                     │<────────────────────│
      │                     │                     │
      │                     │  Valid: true        │
      │                     │────────────────────>│
      └─────────────────────┴─────────────────────┘
```

## Detailed Endpoint Documentation

- [Public Endpoints](./public-endpoints.md)
- [Authenticated Endpoints](./authenticated-endpoints.md)
- [Authorized App Endpoints](./authorized-app-endpoints.md)
