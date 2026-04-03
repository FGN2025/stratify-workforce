

# Migration: Add `breakroom_identity` Table

Create a single database migration that adds the `breakroom_identity` table with the user's provided SQL, including indexes, RLS, and two policies (admin manage all, users view own).

## Technical Details

**File**: New migration via migration tool

**SQL**: Exactly as provided — creates table, two indexes, enables RLS, adds two policies.

**No UI or code changes** — migration only.

