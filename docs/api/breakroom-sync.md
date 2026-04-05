# Breakroom LMS Edge Functions

## breakroom-lms-sync

Processes a single Breakroom quiz/course completion event and writes it to both FGN Academy and Broadband Workforce platforms.

### Endpoint

```
POST /functions/v1/breakroom-lms-sync
```

### Authentication

Requires `x-api-key` header matching the `BREAKROOM_SYNC_SECRET` secret.

### Request Body

```json
{
  "breakroom_username": "string (required)",
  "event_type": "quiz_complete | course_complete | module_complete (required)",
  "course_id_external": "string (required) — maps to work_orders.source_challenge_id",
  "score": "number (optional) — 0-100",
  "passed": "boolean (optional, default: inferred from score)",
  "xp_reward": "number (optional, default: 100)",
  "completion_time_minutes": "number (optional, default: 0)",
  "metadata": "object (optional) — stored with completion record"
}
```

### Response

```json
{
  "success": true,
  "results": {
    "email_resolved": true,
    "fgn_completion": "completed | failed | no_matching_work_order",
    "fgn_achievements": "0_awarded",
    "bbw_quiz": "written | no_matching_quiz",
    "bbw_passed": true,
    "bbw_achievements": "0_awarded"
  }
}
```

### Processing Pipeline

1. Resolve `breakroom_username` → FGN `user_id` via `breakroom_identity` table
2. Resolve FGN user email for cross-platform matching
3. **FGN Academy**: Match `course_id_external` to `work_orders.source_challenge_id`, write completion + XP + game stats
4. **Broadband Workforce**: Find user by email, match quiz, write attempt + lesson progress + enrollment status + user stats
5. Evaluate achievements on both platforms
6. Write audit log

### Error Responses

| Status | Reason |
|--------|--------|
| 401 | Invalid or missing `x-api-key` |
| 400 | Missing required fields or invalid JSON |
| 404 | Unknown Breakroom username (no `breakroom_identity` record) |

---

## breakroom-lms-poll

Automated polling function that fetches all student quiz completions from the Breakroom API and forwards new ones to `breakroom-lms-sync`.

### Endpoint

```
POST /functions/v1/breakroom-lms-poll
```

### Authentication

No authentication required (designed to be called by pg_cron).

### Request Body

None required (empty `{}` or no body).

### Response

```json
{
  "success": true,
  "results": {
    "students_found": 3,
    "quizzes_found": 5,
    "already_synced": 3,
    "synced": 2,
    "sync_errors": 0,
    "errors": []
  }
}
```

### Processing Pipeline

1. Read `BREAKROOM_SESSION_TOKEN` for API authentication
2. Fetch all enrolled students from Breakroom LMS API (paginated)
3. Match students to FGN users via `breakroom_identity.breakroom_user_id`
4. For each matched student, fetch completed quizzes (paginated)
5. Deduplicate: skip quizzes already recorded in `user_work_order_completions` (checked via `metadata->>breakroom_quiz_id`)
6. Match quiz to FGN work order by `metadata->>breakroom_course_name` or fuzzy title match
7. Forward to `breakroom-lms-sync` for processing
8. Write summary to `system_audit_logs`

### Required Secrets

| Secret | Usage |
|--------|-------|
| `BREAKROOM_SESSION_TOKEN` | Bearer token for Breakroom API |
| `BREAKROOM_SESSION_COOKIES` | Cookie header for Breakroom API |
| `BREAKROOM_SYNC_SECRET` | Auth key for calling breakroom-lms-sync |

### Breakroom API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /web/breakroom/grid/lms/course/members/all/list` | List all enrolled students |
| `POST /web/breakroom/grid/lms/quiz/user/list` | List completed quizzes for a student |

Both use Grid ID `257` and require session-based authentication with browser-mimicking headers.
