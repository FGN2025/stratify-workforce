

## Code Review Assessment

### Overall Health
The codebase is in solid shape. Auth patterns are correct (roles in separate table, server-side RLS), routing is well-organized, and the admin/developer/protected route guards are properly implemented. Here are the items worth addressing:

---

### 1. Cleanup Items

**Breakroom poll function - header duplication**
The `fetchAllStudents` and `fetchCompletedQuizzes` functions in `breakroom-lms-poll/index.ts` have identical 12-line header blocks. Extract into a shared `getBreakroomHeaders(token)` helper to reduce duplication and make future token/cookie changes a single edit.

**Type assertion hacks in poll results**
Lines like `(results as Record<string, number>).quizzes_found++` are unsafe casts repeated throughout. Define a proper typed `PollResults` interface instead.

**useProgress.ts dead code comment**
Line 94: `supabase.rpc ? 1 : 1, // Increment would need RPC` -- this is a no-op ternary. Clean up to just `attempts: (existing.attempts ?? 0) + 1`.

**Database linter warnings**
- Extensions installed in `public` schema (should be moved to a dedicated `extensions` schema)
- Leaked password protection is disabled (should be enabled for production)

---

### 2. Documentation Gaps

**Breakroom integration runbook is missing.** The admin guide (`docs/admin-user-guide.md`) does not mention the Breakroom polling system at all. This is critical because the session tokens require manual refresh. A runbook should document:
- How the polling works (cron every 15 min)
- Which secrets need refreshing (`BREAKROOM_SESSION_TOKEN`, `BREAKROOM_SESSION_COOKIES`, `BREAKROOM_JWT`)
- How to get a new token (login to curator.sine.space, extract cookies)
- How to check if polling is working (query `system_audit_logs`)
- How to manually invoke the function

**Edge function README**
`docs/api/` has good coverage for credential-api and public-catalog but no documentation for the breakroom-lms-sync or breakroom-lms-poll functions.

---

### 3. Proposed Plan

**Step 1 -- Extract shared headers in breakroom-lms-poll**
Create a `getBreakroomHeaders(token: string)` function used by both fetch calls. Reduces the 12-line header block duplication to a single function call.

**Step 2 -- Type the poll results properly**
Replace the `Record<string, unknown>` with a typed `PollResults` interface, eliminating all unsafe casts.

**Step 3 -- Fix useProgress.ts dead code**
Replace the no-op ternary with a proper increment.

**Step 4 -- Add Breakroom integration runbook**
Create `docs/breakroom-integration.md` documenting the full polling pipeline, secret management, troubleshooting, and manual invocation steps.

**Step 5 -- Add edge function docs**
Add `docs/api/breakroom-sync.md` documenting the breakroom-lms-sync and breakroom-lms-poll function APIs, payloads, and authentication.

---

### Technical Details

| Item | File | Scope |
|------|------|-------|
| Header dedup | `supabase/functions/breakroom-lms-poll/index.ts` | ~20 lines removed |
| Type cleanup | `supabase/functions/breakroom-lms-poll/index.ts` | Interface + 8 cast removals |
| Dead code fix | `src/hooks/useProgress.ts` | 1 line |
| Runbook | `docs/breakroom-integration.md` | New file |
| API docs | `docs/api/breakroom-sync.md` | New file |
| DB linter | Migration for extension schema move | Optional, low priority |

