# CDL Quest Integration Guide

This guide shows how to integrate CDL Quest with FGN.Academy APIs for training content and credential issuance.

## Overview

CDL Quest is a CDL training application that:
1. Displays work orders from FGN.Academy
2. Tracks user training progress
3. Issues credentials when training is completed

## Prerequisites

- Registered as an Authorized App in FGN.Academy
- API key with `can_issue_credentials` permission
- `credential_types_allowed` includes relevant ATS credential types

## Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CDL QUEST INTEGRATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐                    ┌─────────────────────────────────────────┐ │
│  │   CDL QUEST │                    │           FGN.ACADEMY                   │ │
│  │   FRONTEND  │                    │                                         │ │
│  └──────┬──────┘                    │  ┌─────────────┐   ┌─────────────────┐  │ │
│         │                           │  │ Public      │   │ Credential API  │  │ │
│         │  1. GET /work-orders      │  │ Catalog API │   │                 │  │ │
│         ├──────────────────────────>│  └──────┬──────┘   └────────┬────────┘  │ │
│         │                           │         │                   │           │ │
│         │  Work orders list         │         │                   │           │ │
│         │<──────────────────────────│─────────┘                   │           │ │
│         │                           │                             │           │ │
│  ┌──────▼──────┐                    │                             │           │ │
│  │   Display   │                    │                             │           │ │
│  │   Training  │                    │                             │           │ │
│  └──────┬──────┘                    │                             │           │ │
│         │                           │                             │           │ │
│         │  User completes training  │                             │           │ │
│         ▼                           │                             │           │ │
│  ┌─────────────┐                    │                             │           │ │
│  │  CDL QUEST  │  2. POST /issue    │                             │           │ │
│  │   BACKEND   ├──────────────────────────────────────────────────>│           │ │
│  └──────┬──────┘                    │                             │           │ │
│         │                           │                             │           │ │
│         │  Credential created       │                             │           │ │
│         │<────────────────────────────────────────────────────────│           │ │
│         │                           │                             │           │ │
│         ▼                           │                             │           │ │
│  ┌─────────────┐                    │                             │           │ │
│  │   Show      │                    │                             │           │ │
│  │   Success   │                    │                             │           │ │
│  └─────────────┘                    └─────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Step 1: Fetch Work Orders

Display available ATS training challenges to users.

### Frontend Code

```typescript
// src/services/fgn-catalog.ts

const CATALOG_API = 'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/public-catalog';

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  game_title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  xp_reward: number;
  estimated_time_minutes: number;
  success_criteria: Record<string, unknown>;
}

export async function getATSWorkOrders(difficulty?: string): Promise<WorkOrder[]> {
  const url = new URL(`${CATALOG_API}/work-orders`);
  url.searchParams.set('game', 'ATS');
  if (difficulty) url.searchParams.set('difficulty', difficulty);
  
  const response = await fetch(url.toString());
  const { work_orders } = await response.json();
  return work_orders;
}

// Get skills for displaying verified skills
export async function getATSSkills(): Promise<Map<string, string>> {
  const response = await fetch(`${CATALOG_API}/skills?game=ATS`);
  const { skills } = await response.json();
  return new Map(skills.map((s: any) => [s.key, s.name]));
}
```

### Display Component

```tsx
// src/components/WorkOrderList.tsx
import { useEffect, useState } from 'react';
import { getATSWorkOrders, WorkOrder } from '../services/fgn-catalog';

export function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filter, setFilter] = useState<string>('');
  
  useEffect(() => {
    getATSWorkOrders(filter || undefined)
      .then(setWorkOrders);
  }, [filter]);
  
  return (
    <div>
      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="">All Difficulties</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      
      <div className="grid gap-4">
        {workOrders.map(wo => (
          <div key={wo.id} className="p-4 border rounded">
            <h3>{wo.title}</h3>
            <p>{wo.description}</p>
            <div className="flex gap-4 text-sm">
              <span>{wo.difficulty}</span>
              <span>{wo.xp_reward} XP</span>
              <span>{wo.estimated_time_minutes} min</span>
            </div>
            <button onClick={() => startTraining(wo.id)}>
              Start Training
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Step 2: Issue Credentials

After user completes training, issue a credential from your backend.

### Server-Side Code (Edge Function)

```typescript
// supabase/functions/issue-credential/index.ts

const CREDENTIAL_API = 'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api';
const FGN_API_KEY = Deno.env.get('FGN_ACADEMY_API_KEY')!;

interface IssueRequest {
  userEmail: string;
  credentialType: string;
  score: number;
  skills: string[];
  sessionId: string;
}

Deno.serve(async (req) => {
  const { userEmail, credentialType, score, skills, sessionId }: IssueRequest = await req.json();
  
  // Issue credential to FGN.Academy
  const response = await fetch(`${CREDENTIAL_API}/credentials/issue`, {
    method: 'POST',
    headers: {
      'X-App-Key': FGN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_email: userEmail,
      credential_type_key: credentialType,
      score: score,
      skills_verified: skills,
      external_reference_id: sessionId, // Link to your training session
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    return new Response(JSON.stringify({ error: error.error }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const result = await response.json();
  
  return new Response(JSON.stringify({
    success: true,
    credentialId: result.credential.id,
    verificationHash: result.credential.verification_hash,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Training Completion Handler

```typescript
// src/services/training.ts

export async function completeTraining(
  userEmail: string,
  workOrderId: string,
  score: number,
  skillsVerified: string[]
) {
  // Determine credential type based on work order or training content
  const credentialType = mapWorkOrderToCredentialType(workOrderId);
  
  const response = await fetch('/functions/v1/issue-credential', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail,
      credentialType,
      score,
      skills: skillsVerified,
      sessionId: generateSessionId(),
    }),
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Show success message with verification info
    showSuccessModal({
      message: 'Credential issued successfully!',
      verificationHash: result.verificationHash,
    });
  }
}

function mapWorkOrderToCredentialType(workOrderId: string): string {
  // Map your work orders to FGN credential types
  const mapping: Record<string, string> = {
    'pre-trip-challenge': 'ats_pre_trip',
    'backing-challenge': 'ats_backing',
    'highway-delivery': 'ats_road_driving',
  };
  return mapping[workOrderId] || 'ats_general';
}
```

## Step 3: Verify Credentials (Optional)

Allow users to verify credentials they've earned.

```typescript
// src/services/verification.ts

export async function verifyCredential(hash: string) {
  const response = await fetch(
    'https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_hash: hash }),
    }
  );
  
  return response.json();
}
```

## Environment Setup

### Required Secrets

Add these to your Supabase project secrets:

| Secret | Description |
|--------|-------------|
| `FGN_ACADEMY_API_KEY` | Your authorized app API key |

### Credential Types

Ensure your app is authorized to issue these credential types:

| Type Key | Description |
|----------|-------------|
| `ats_pre_trip` | Pre-Trip Inspection Certification |
| `ats_backing` | Backing Maneuvers Certification |
| `ats_road_driving` | Road Driving Skills |
| `ats_hazmat` | Hazmat Handling Certification |

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid API key` | Wrong or expired key | Verify key in environment |
| `App cannot issue credential type` | Type not in allowed list | Contact FGN admin to add type |
| `User not found` | Email not registered | User must have FGN.Academy account |

### Error Response Handler

```typescript
async function handleCredentialError(response: Response) {
  const { error } = await response.json();
  
  switch (response.status) {
    case 401:
      console.error('API key invalid - check configuration');
      break;
    case 403:
      console.error('Permission denied:', error);
      // May need to request additional permissions
      break;
    case 404:
      // User not found - prompt to create FGN.Academy account
      showCreateAccountPrompt();
      break;
    default:
      console.error('Credential API error:', error);
  }
}
```

## Testing

### Test with curl

```bash
# Set your API key
export FGN_API_KEY="your_api_key_here"

# Test issuing a credential
curl -X POST \
  https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/credential-api/credentials/issue \
  -H "X-App-Key: $FGN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "test@example.com",
    "credential_type_key": "ats_pre_trip",
    "score": 95,
    "skills_verified": ["pre_trip_inspection", "vehicle_safety"]
  }'
```

## Best Practices

1. **Cache work orders** - They don't change frequently, cache for 5 minutes
2. **Batch skill lookups** - Fetch skills taxonomy once and reuse
3. **Store external_reference_id** - Link credentials to your training sessions
4. **Handle user not found** - Prompt users to create FGN.Academy account first
5. **Show verification hash** - Let users save/share their verification info
