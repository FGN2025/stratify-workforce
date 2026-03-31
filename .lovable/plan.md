

# Review: Approved Plan vs. Developer Brief v2

## Alignment Summary

The previously approved plan and the v2 brief are **well-aligned**. Both specify the same three items, same scope boundary (academy project only), and same architecture. Key confirmations:

| Requirement | Plan Status |
|-------------|-------------|
| Hardcoded TRACK3/TRACK4 challenge ID arrays in edge function | **V2 uses hardcoded arrays** — the plan proposed a `track_quiz_map` table instead. **The brief explicitly wants inline constants, not a lookup table.** Adjust to match. |
| Tenant lookup via `profiles.tenant_id` | ✅ Aligned — brief says "reuse existing profile lookup pattern" and `profiles` has `tenant_id` FK |
| No `tenant_id` in payload | ✅ Aligned — derive from user profile |
| 10 quiz questions in `lessons` table as JSONB | ✅ Aligned — `lesson_type = 'quiz'`, `content.questions: QuizQuestion[]` |
| `correct_index` values (0-based) | ✅ Aligned — T3: 1,2,3,2,1 / T4: 1,2,2,1,1 |
| 80% pass threshold (4/5) | ✅ Aligned — `passing_score = 80` |
| Notification strings | ✅ Aligned — same wording |
| No new tables, no new quiz table | **Gap** — plan proposed `track_quiz_map` table. Brief says NO new tables. |
| Staging validation before prod | ✅ Aligned |

## Required Adjustments to the Plan

### 1. Drop the `track_quiz_map` table
The v2 brief explicitly states: "No new quiz table", "No new notification infrastructure." Track detection should use **hardcoded constants** inside the edge function, not a database lookup table. This is simpler and matches the brief's pseudocode exactly.

### 2. Use inline constants for challenge IDs
The brief provides exact UUIDs:

**TRACK3 (OSHA Safety — 4 challenges):**
- `bcb4a446-d0b7-4432-bedb-4f7ce42ff557`
- `452f8199-9e08-484c-bf8c-887cb24ad3ce`
- `7c7ae072-81a1-4dac-8307-268266a786e6`
- `d098fcac-09a6-41b3-b196-97b98e4435e1`

**TRACK4 (Fiber Optics — 7 challenges):**
- `02481a75-383c-485a-bdff-f0a4dd2b9121`
- `1c899b1a-a527-4023-aeb4-43d387993578`
- `260d4700-7f7a-431f-9768-097284293cd6`
- `e18786a7-043f-4900-8a07-c892c36af1b9`
- `ae4c4228-f107-4f31-ae3d-ec819b0b6863`
- `2a7c0a85-8f05-4c15-965b-e94f72f3672f`
- `858d2e0d-6d78-4d7f-8377-0dc40ab269dd`

### 3. Quiz lesson seeding still needed
The brief still requires inserting 2 lesson rows into `lessons` (via a migration or insert). A parent course and module are needed since `lessons` references `module_id`. This is a data insert, not a schema change.

### 4. Track detection logic placement
Add after step 8 (notifications) in `sync-challenge-completion/index.ts`:
- Check if `challenge_id` is in TRACK3 or TRACK4
- Query `user_work_order_completions` for all challenge IDs in that track (joined via `work_orders.source_challenge_id`)
- If all completed → look up `profiles.tenant_id` for the user → insert `knowledge_check_available` notification

## Revised Implementation Plan

| Step | What |
|------|------|
| 1 | Insert course → module → 2 quiz lessons with all 10 questions into `lessons` table (data insert, not schema migration) |
| 2 | Update `sync-challenge-completion/index.ts`: add TRACK3/TRACK4 constants, completion check helper, tenant lookup from `profiles`, and notification insert after step 8 |
| 3 | Test via `ChallengeSyncTester` in staging before production deploy |

**No new tables. No schema changes. Two files touched: migration SQL (data seed) and the edge function.**

