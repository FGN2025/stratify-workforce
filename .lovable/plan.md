

# Registration Override Code Feature

## Overview

Add an optional override code field to the FGN Academy registration form that allows users to bypass address verification. These codes are created and managed by Tenant Admins or Super Admins, enabling them to pre-authorize users for specific organizations.

---

## User Flow

```text
Registration Flow with Override Code
=====================================

User enters registration info:
  - Full Name
  - Discord ID (placeholder)
  - Override Code (optional)       <-- NEW FIELD
  - Street Address
  - City, State, ZIP

                    |
                    v
          Is Override Code provided?
         /                           \
       Yes                            No
        |                              |
        v                              v
  Validate code against           Continue normal
  registration_codes table        Smarty address
        |                         verification
        v                              |
  Is code valid & active?              |
   /              \                    |
 Yes              No                   |
  |                |                   |
  v                v                   v
Mark registration  Show error     Smarty validates
as verified       "Invalid code"   address
(skip Smarty)          |               |
  |                    |               v
  v                    |         Show validated
Associate user    <----+         or original
with tenant                      address options
from code                              |
  |                                    |
  v                                    v
  Save to user_addresses with:
  - is_validated = true (code) OR from Smarty
  - override_code_id = code.id (if used)
  - tenant_id = code.tenant_id (if used)
```

---

## Database Changes

### New Table: `registration_codes`

Store override codes that bypass address verification.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | text | Unique alphanumeric code (e.g., "ACADEMY2025") |
| tenant_id | uuid | Associated tenant (nullable for global codes) |
| created_by | uuid | Admin who created the code |
| description | text | Internal note about code purpose |
| max_uses | integer | Maximum redemptions allowed (null = unlimited) |
| current_uses | integer | Number of times code has been used |
| is_active | boolean | Whether code is currently valid |
| expires_at | timestamptz | Optional expiration date |
| created_at | timestamptz | Creation timestamp |

### Modify Table: `user_addresses`

Add columns to track override code usage:

| Column | Type | Description |
|--------|------|-------------|
| override_code_id | uuid | Reference to the code used (nullable) |
| tenant_id | uuid | Tenant the user is associated with via code |

### RLS Policies for `registration_codes`

| Policy | Description |
|--------|-------------|
| Select (Public) | Anyone can check if a code exists (for validation) |
| Insert/Update/Delete | Only admins and super_admins can manage codes |

---

## Component Architecture

### New Components

1. **`RegistrationCodeManager.tsx`** (Admin Panel)
   - Add to Admin page under User Management or new tab
   - CRUD interface for managing override codes
   - Shows usage statistics, expiration, tenant association

2. **`OverrideCodeInput.tsx`**
   - Collapsible section in registration form: "Have an override code?"
   - Real-time code validation with visual feedback
   - Shows associated tenant name when valid code entered

### Modified Components

1. **`AcademyOnboardingDialog.tsx`**
   - Add override code field to Personal Info step
   - Pass override code to Address step

2. **`AddressValidationForm.tsx`**
   - Accept optional override code prop
   - If valid code provided, skip Smarty validation
   - Show confirmation: "Code accepted - address verification bypassed"

3. **`useOnboardingStatus.ts`**
   - Update `SaveAddressInput` interface to include override code
   - Track code usage when saving address

### New Hooks

1. **`useRegistrationCode.ts`**
   - Validate code against database
   - Return code details (tenant, validity, remaining uses)
   - Handle code redemption (increment usage count)

---

## Validation Logic

When a user enters an override code:

1. Query `registration_codes` table by code value
2. Check conditions:
   - `is_active = true`
   - `expires_at IS NULL OR expires_at > now()`
   - `max_uses IS NULL OR current_uses < max_uses`
3. If valid:
   - Display tenant name (if associated)
   - Allow proceeding without Smarty verification
   - Mark `is_validated = true` on save
   - Increment `current_uses` on code
   - Store `override_code_id` and `tenant_id` in user_addresses

---

## Admin Management Interface

Add a new tab or section in the Admin panel for code management:

**Features:**
- Create new codes with:
  - Custom code string (or auto-generate)
  - Optional tenant association
  - Optional usage limit
  - Optional expiration date
  - Description/notes
- View all codes with usage statistics
- Activate/deactivate codes
- Delete expired codes
- Filter by tenant, status, usage

**Access Control:**
- Tenant Admins: Can create/manage codes for their tenant only
- Super Admins: Can create/manage all codes (including global ones)

---

## UI Design

### Personal Info Step (Updated)

```text
+------------------------------------------+
| Full Name *                              |
| [John Doe                            ]   |
|                                          |
| Discord ID (optional)                    |
| [username#1234                       ]   |
| Coming soon: Discord integration         |
|                                          |
| ▼ Have an override code?                 |
| +--------------------------------------+ |
| | Override Code                        | |
| | [ACADEMY2025                     ]   | |
| | ✓ Code valid - FGN Academy          | |
| +--------------------------------------+ |
|                                          |
|                          [Continue]      |
+------------------------------------------+
```

### Address Step with Valid Code

```text
+------------------------------------------+
| Code Override Active                     |
| You're registering with code ACADEMY2025 |
| associated with FGN Academy.             |
|                                          |
| Your address (for records):              |
| Street: [123 Main St              ]      |
| City:   [Springfield  ] State: [IL]      |
| ZIP:    [62701      ]                    |
|                                          |
| ⓘ Address verification bypassed         |
|                                          |
| [Back]              [Complete Registration]
+------------------------------------------+
```

---

## Security Considerations

1. **Code Validation**: Server-side validation in database (RLS)
2. **Rate Limiting**: Consider limiting code validation attempts
3. **Audit Trail**: Log code creation/usage in system_audit_logs
4. **Case Insensitivity**: Codes should be case-insensitive
5. **No Code Enumeration**: Generic error message for invalid codes

---

## Implementation Steps

### Phase 1: Database Setup
1. Create `registration_codes` table with columns
2. Add `override_code_id` and `tenant_id` to `user_addresses` table
3. Set up RLS policies for code management
4. Add database index on `code` column (case-insensitive)

### Phase 2: Code Validation Hook
1. Create `useRegistrationCode.ts` hook
2. Implement code lookup and validation
3. Handle usage counting and expiration checks

### Phase 3: Update Registration Form
1. Add collapsible override code input to Personal Info step
2. Modify AddressValidationForm to accept and honor override codes
3. Update save logic to record code usage

### Phase 4: Admin Management UI
1. Create RegistrationCodeManager component
2. Add new tab to Admin panel (or sub-section under User Management)
3. Implement CRUD operations for codes

### Phase 5: Testing
1. Test valid code bypasses verification
2. Test expired/depleted codes are rejected
3. Test tenant association flows
4. Verify RLS policies work correctly

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_create_registration_codes.sql` | Database migration |
| `src/hooks/useRegistrationCode.ts` | Code validation and redemption hook |
| `src/components/admin/RegistrationCodeManager.tsx` | Admin CRUD interface |
| `src/components/onboarding/OverrideCodeInput.tsx` | Collapsible code input component |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/onboarding/AcademyOnboardingDialog.tsx` | Add override code state and pass to form |
| `src/components/onboarding/AddressValidationForm.tsx` | Accept override code, skip Smarty if valid |
| `src/hooks/useOnboardingStatus.ts` | Update interface and save logic for code tracking |
| `src/pages/Admin.tsx` | Add Registration Codes tab |

