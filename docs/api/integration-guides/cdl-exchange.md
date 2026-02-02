# CDL Exchange Integration Guide

This guide shows how to integrate CDL Exchange with FGN.Academy APIs for displaying credentials and connecting job seekers with employers.

## Overview

CDL Exchange is a marketplace/job board that:
1. Displays verified credentials from users' Skill Passports
2. Allows employers to verify credential authenticity
3. Shows available training to help users upskill

## Prerequisites

- Registered as an Authorized App (optional - for enhanced access)
- Understanding of public API endpoints

## Integration Points

| Feature | API | Auth Required |
|---------|-----|---------------|
| Display user credentials | `GET /passport/:slug` | No |
| Verify credentials | `POST /credentials/verify` | No |
| List credential types | `GET /catalog/credential-types` | No |
| Show training catalog | Public Catalog API | No |
| Query user credentials | `GET /credentials/user/:email` | API Key |

## Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       CDL EXCHANGE INTEGRATION                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         JOB SEEKER FLOW                                  │   │
│   │                                                                          │   │
│   │  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐    │   │
│   │  │  User adds  │────>│  CDL        │────>│  FGN.Academy API       │    │   │
│   │  │  passport   │     │  Exchange   │     │  GET /passport/:slug   │    │   │
│   │  │  slug       │     │  fetches    │     │                        │    │   │
│   │  └─────────────┘     └──────┬──────┘     └─────────────────────────┘    │   │
│   │                             │                                           │   │
│   │                             ▼                                           │   │
│   │                      ┌─────────────┐                                    │   │
│   │                      │  Display    │                                    │   │
│   │                      │  CDL        │                                    │   │
│   │                      │  Credentials│                                    │   │
│   │                      └─────────────┘                                    │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         EMPLOYER FLOW                                    │   │
│   │                                                                          │   │
│   │  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐    │   │
│   │  │  Employer   │────>│  CDL        │────>│  FGN.Academy API       │    │   │
│   │  │  clicks     │     │  Exchange   │     │  POST /credentials/    │    │   │
│   │  │  "Verify"   │     │  verifies   │     │       verify           │    │   │
│   │  └─────────────┘     └──────┬──────┘     └─────────────────────────┘    │   │
│   │                             │                                           │   │
│   │                             ▼                                           │   │
│   │                      ┌─────────────┐                                    │   │
│   │                      │  Show       │                                    │   │
│   │                      │  Verified   │                                    │   │
│   │                      │  Badge      │                                    │   │
│   │                      └─────────────┘                                    │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Step 1: Display User Credentials (CDL Passkey)

Fetch and display a user's ATS credentials from their public passport.

### Service Layer

```typescript
// src/services/fgn-passport.ts

const CREDENTIAL_API = 'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api';

export interface Credential {
  id: string;
  title: string;
  credential_type: string;
  issued_at: string;
  expires_at: string | null;
  score: number | null;
  issuer: string;
  skills_verified: string[];
  game_title: string;
  verification_hash: string;
}

export interface PassportData {
  passport: {
    slug: string;
    user: {
      username: string;
      avatar_url: string | null;
      employability_score: number | null;
    };
  };
  credentials: Credential[];
}

export async function getCDLPasskey(slug: string): Promise<PassportData> {
  // Filter to ATS credentials only (CDL Passkey view)
  const response = await fetch(
    `${CREDENTIAL_API}/passport/${encodeURIComponent(slug)}?game=ATS`
  );
  
  if (!response.ok) {
    throw new Error('Passport not found or not public');
  }
  
  return response.json();
}

export async function verifyCredential(hash: string): Promise<{
  valid: boolean;
  expired: boolean;
  credential: Credential & { holder_username: string };
}> {
  const response = await fetch(`${CREDENTIAL_API}/credentials/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verification_hash: hash }),
  });
  
  return response.json();
}
```

### Credential Display Component

```tsx
// src/components/CDLPasskey.tsx
import { useEffect, useState } from 'react';
import { getCDLPasskey, PassportData, Credential } from '../services/fgn-passport';
import { VerifiedBadge } from './VerifiedBadge';

interface Props {
  passportSlug: string;
}

export function CDLPasskey({ passportSlug }: Props) {
  const [data, setData] = useState<PassportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    getCDLPasskey(passportSlug)
      .then(setData)
      .catch(e => setError(e.message));
  }, [passportSlug]);
  
  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div>Loading credentials...</div>;
  
  const { passport, credentials } = data;
  
  return (
    <div className="space-y-4">
      {/* User Header */}
      <div className="flex items-center gap-4">
        <img 
          src={passport.user.avatar_url || '/default-avatar.png'} 
          className="w-16 h-16 rounded-full"
          alt={passport.user.username}
        />
        <div>
          <h2 className="text-xl font-bold">{passport.user.username}</h2>
          {passport.user.employability_score && (
            <div className="text-sm text-gray-600">
              Employability Score: {passport.user.employability_score}%
            </div>
          )}
        </div>
      </div>
      
      {/* Credentials List */}
      <div className="grid gap-3">
        {credentials.length === 0 ? (
          <p className="text-gray-500">No CDL credentials yet</p>
        ) : (
          credentials.map(cred => (
            <CredentialCard key={cred.id} credential={cred} />
          ))
        )}
      </div>
    </div>
  );
}

function CredentialCard({ credential }: { credential: Credential }) {
  const [verified, setVerified] = useState<boolean | null>(null);
  
  const handleVerify = async () => {
    const result = await verifyCredential(credential.verification_hash);
    setVerified(result.valid);
  };
  
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{credential.title}</h3>
          <p className="text-sm text-gray-600">
            Issued by {credential.issuer} on {new Date(credential.issued_at).toLocaleDateString()}
          </p>
          {credential.score && (
            <p className="text-sm">Score: {credential.score}%</p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {credential.skills_verified?.map(skill => (
              <span key={skill} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                {skill.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          {verified === null ? (
            <button onClick={handleVerify} className="text-sm text-blue-600 hover:underline">
              Verify
            </button>
          ) : verified ? (
            <VerifiedBadge />
          ) : (
            <span className="text-red-600">Invalid</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Step 2: Employer Verification

Allow employers to verify any credential by its hash.

### Verification Page

```tsx
// src/pages/Verify.tsx
import { useState } from 'react';
import { verifyCredential } from '../services/fgn-passport';

export function VerifyPage() {
  const [hash, setHash] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const handleVerify = async () => {
    setLoading(true);
    try {
      const data = await verifyCredential(hash);
      setResult(data);
    } catch (e) {
      setResult({ error: 'Verification failed' });
    }
    setLoading(false);
  };
  
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Verify CDL Credential</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Verification Hash
          </label>
          <input
            type="text"
            value={hash}
            onChange={e => setHash(e.target.value)}
            placeholder="Enter verification hash..."
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          onClick={handleVerify}
          disabled={!hash || loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify Credential'}
        </button>
        
        {result && (
          <div className={`p-4 rounded ${result.valid ? 'bg-green-50' : 'bg-red-50'}`}>
            {result.valid ? (
              <>
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  Credential Verified
                </div>
                <div className="mt-2 text-sm">
                  <p><strong>Title:</strong> {result.credential.title}</p>
                  <p><strong>Holder:</strong> {result.credential.holder_username}</p>
                  <p><strong>Issued:</strong> {new Date(result.credential.issued_at).toLocaleDateString()}</p>
                  <p><strong>Score:</strong> {result.credential.score}%</p>
                </div>
              </>
            ) : result.expired ? (
              <div className="text-yellow-700">
                Credential has expired
              </div>
            ) : (
              <div className="text-red-700">
                Invalid or unknown credential
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

## Step 3: Show Training Opportunities

Display available training to help users earn more credentials.

```typescript
// src/services/fgn-catalog.ts

const CATALOG_API = 'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog';

export async function getATSCourses() {
  const response = await fetch(`${CATALOG_API}/courses`);
  const { courses } = await response.json();
  return courses;
}

export async function getCredentialTypes() {
  const response = await fetch(
    'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/catalog/credential-types?game=ATS'
  );
  const { credential_types } = await response.json();
  return credential_types;
}
```

### Training Recommendations Component

```tsx
// src/components/TrainingRecommendations.tsx
import { useEffect, useState } from 'react';
import { getCredentialTypes, getATSCourses } from '../services/fgn-catalog';

interface Props {
  earnedCredentialKeys: string[]; // User's existing credentials
}

export function TrainingRecommendations({ earnedCredentialKeys }: Props) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  useEffect(() => {
    async function load() {
      const [types, courses] = await Promise.all([
        getCredentialTypes(),
        getATSCourses(),
      ]);
      
      // Find credential types the user doesn't have
      const missing = types.filter(
        (t: any) => !earnedCredentialKeys.includes(t.type_key)
      );
      
      setRecommendations(missing.slice(0, 3)); // Top 3 recommendations
    }
    load();
  }, [earnedCredentialKeys]);
  
  return (
    <div>
      <h3 className="font-semibold mb-2">Earn More Credentials</h3>
      <div className="grid gap-2">
        {recommendations.map(rec => (
          <div key={rec.type_key} className="p-3 bg-gray-50 rounded">
            <p className="font-medium">{rec.display_name}</p>
            <p className="text-sm text-gray-600">{rec.description}</p>
            <a 
              href={`https://fgn.academy/credentials/${rec.type_key}`}
              className="text-sm text-blue-600 hover:underline"
            >
              Learn how to earn →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Step 4: Deep Link to FGN.Academy

Link users to their profiles and training on FGN.Academy.

```typescript
// src/utils/fgn-links.ts

const FGN_ACADEMY_URL = 'https://fgn.academy';

export function getProfileLink(passportSlug: string): string {
  return `${FGN_ACADEMY_URL}/passport/${passportSlug}`;
}

export function getTrainingLink(courseId: string): string {
  return `${FGN_ACADEMY_URL}/learn/${courseId}`;
}

export function getWorkOrderLink(workOrderId: string): string {
  return `${FGN_ACADEMY_URL}/work-orders/${workOrderId}`;
}
```

## Enhanced Access (API Key)

With an API key, you can query credentials by email:

```typescript
// Server-side only - requires API key
export async function getUserCredentialsByEmail(email: string) {
  const response = await fetch(
    `${CREDENTIAL_API}/credentials/user/${encodeURIComponent(email)}?game=ATS`,
    {
      headers: {
        'X-App-Key': process.env.FGN_API_KEY!,
      },
    }
  );
  
  return response.json();
}
```

This allows you to:
- Pre-populate profiles when users register with their email
- Check credentials during job application submission
- Build richer employer dashboards

## Best Practices

1. **Cache responses** - Passport data rarely changes, cache for 5-10 minutes
2. **Handle missing passports** - User may not have made their passport public
3. **Show verification status** - Let employers verify credentials inline
4. **Link to FGN.Academy** - Help users complete training to earn credentials
5. **Use skills taxonomy** - Display skill names consistently using the skills API
6. **Respect privacy** - Only show public passport data; don't store hashes

## Error Handling

```typescript
async function safeGetPassport(slug: string) {
  try {
    return await getCDLPasskey(slug);
  } catch (e) {
    if (e.message.includes('not found')) {
      return { error: 'PASSPORT_NOT_FOUND', message: 'Passport not found or not public' };
    }
    if (e.message.includes('network')) {
      return { error: 'NETWORK_ERROR', message: 'Could not connect to FGN.Academy' };
    }
    return { error: 'UNKNOWN_ERROR', message: 'An error occurred' };
  }
}
```
