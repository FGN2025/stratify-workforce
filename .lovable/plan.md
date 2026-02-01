

# FGN Academy Registration Form with Smarty Address Validation

## Overview

Create a multi-step onboarding flow that collects user information (Name, Address, ZIP, Discord ID) when they first join FGN Academy, with real-time address validation using the Smarty US Street API.

---

## User Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FGN Academy Onboarding Flow                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Join FGN Academy" button                       │
│                          ↓                                       │
│  2. Check if user has completed onboarding                      │
│          ↓                              ↓                        │
│     [Not Complete]                 [Complete]                    │
│          ↓                              ↓                        │
│  3. Show Registration Form         4. Show Sim Selection        │
│     - Full Name                       (current dialog)          │
│     - Street Address                                            │
│     - City                                                      │
│     - State                                                     │
│     - ZIP Code                                                  │
│     - Discord ID (placeholder)                                  │
│          ↓                                                      │
│  5. Validate address via Smarty API                             │
│          ↓                                                      │
│  6. Show validated/corrected address                            │
│          ↓                                                      │
│  7. Save to database → Proceed to Sim Selection                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### New Table: `user_addresses`

Store validated user addresses for FGN Academy membership verification.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth user (unique) |
| full_name | text | User's full name |
| street_address | text | Street address line |
| city | text | City name |
| state | text | State abbreviation (2 chars) |
| zip_code | text | 5-digit ZIP code |
| discord_id | text | Discord username (placeholder) |
| is_validated | boolean | Whether address was validated by Smarty |
| smarty_response | jsonb | Full Smarty API response for audit |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### RLS Policies

- Users can INSERT their own address
- Users can SELECT their own address
- Users can UPDATE their own address
- Admins can view all addresses

---

## Smarty API Integration

### API Details

- **Endpoint**: `https://us-street.api.smarty.com/street-address`
- **Embedded Key**: `260377163906526147` (client-side safe)
- **Method**: GET with query parameters

### Request Parameters

| Parameter | Value |
|-----------|-------|
| key | Embedded key |
| street | User's street address |
| city | User's city |
| state | User's state |
| zipcode | User's ZIP |
| candidates | 1 |

### Response Handling

The Smarty API returns an array of validated addresses. An empty array means the address could not be validated.

| Scenario | UI Behavior |
|----------|-------------|
| Valid address found | Show corrected address, allow user to accept |
| No match found | Show warning, allow user to proceed with manual entry |
| API error | Show error message, allow retry |

---

## Component Architecture

### New Components

1. **`AcademyOnboardingDialog.tsx`**
   - Multi-step dialog for collecting user registration info
   - Step 1: Personal Info (Name, Discord ID)
   - Step 2: Address Entry with Smarty validation
   - Step 3: Confirmation/Success

2. **`AddressValidationForm.tsx`**
   - Reusable address form with Smarty integration
   - Real-time validation on blur or submit
   - Shows validated vs original address comparison

3. **`useAddressValidation.ts`**
   - Custom hook for Smarty API calls
   - Handles loading, error, and validated states

### Modified Components

1. **`JoinFGNSkillsDialog.tsx`** (rename to `JoinFGNAcademyDialog.tsx`)
   - Check if user has completed onboarding first
   - If not, show onboarding flow before sim selection

2. **`HeroSection.tsx`**
   - Update import to use renamed dialog component

---

## Form Validation Schema

Using Zod for client-side validation:

```typescript
const registrationSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  streetAddress: z.string()
    .trim()
    .min(5, "Please enter a valid street address")
    .max(200, "Address too long"),
  city: z.string()
    .trim()
    .min(2, "Please enter a valid city")
    .max(100, "City name too long"),
  state: z.string()
    .length(2, "Please use 2-letter state code"),
  zipCode: z.string()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
  discordId: z.string()
    .trim()
    .max(50, "Discord ID too long")
    .optional(),
});
```

---

## Security Considerations

### Smarty Embedded Key

The embedded key (`260377163906526147`) is designed for client-side use and is safe to include in frontend code. It has:
- Domain restrictions (can be configured in Smarty dashboard)
- Rate limiting
- No access to account management APIs

### Address Data Protection

- RLS policies restrict access to own data only
- Sensitive fields not exposed via public API
- Smarty response stored for audit purposes only

---

## Implementation Steps

### Phase 1: Database Setup
1. Create `user_addresses` table with all columns
2. Add RLS policies for user-level access
3. Add index on `user_id` for fast lookups

### Phase 2: Address Validation Hook
1. Create `useAddressValidation.ts` hook
2. Implement Smarty API call with error handling
3. Add response parsing and normalization

### Phase 3: Registration Form Components
1. Create `AcademyOnboardingDialog.tsx` with multi-step flow
2. Create `AddressValidationForm.tsx` with validation UI
3. Add address comparison view (original vs validated)

### Phase 4: Integration
1. Rename `JoinFGNSkillsDialog.tsx` to `JoinFGNAcademyDialog.tsx`
2. Add onboarding check before showing sim selection
3. Update `HeroSection.tsx` import
4. Create hook to check onboarding status

### Phase 5: Testing
1. Test valid US addresses
2. Test invalid/unverifiable addresses
3. Test error handling and edge cases
4. Verify RLS policies work correctly

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_create_user_addresses.sql` | Database migration |
| `src/hooks/useAddressValidation.ts` | Smarty API integration hook |
| `src/hooks/useOnboardingStatus.ts` | Check if user completed onboarding |
| `src/components/onboarding/AcademyOnboardingDialog.tsx` | Main onboarding dialog |
| `src/components/onboarding/AddressValidationForm.tsx` | Address form with validation |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/marketplace/JoinFGNSkillsDialog.tsx` | Rename and add onboarding check |
| `src/components/marketplace/HeroSection.tsx` | Update dialog import |

---

## UI Preview

The registration form will match the existing app design:
- Glass card styling consistent with Auth page
- Step indicators showing progress
- Real-time validation feedback
- Address correction suggestions from Smarty
- Clear success/error states

The Discord ID field will be labeled as "Coming soon - Discord integration" to indicate it's a placeholder for the future connector.

