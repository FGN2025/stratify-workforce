Redeploy the `scorm-launch-status` edge function so the new unauthenticated `POST /check` route (added in commit b081897) goes live.

## Steps

1. Deploy `scorm-launch-status` via `supabase--deploy_edge_functions`.
2. Smoke-test `POST /check` with a sample `{challengeId, scormStudentId}` body to confirm the route returns a 200 with the expected `{ userExists, completed, ... }` shape (no `X-App-Key` header).
3. Confirm `/mint` and `/status` still reject requests missing `X-App-Key` (quick 401 check).

## Notes

- No DB migrations, no new secrets, no config.toml changes.
- The `/check` route is intentionally public; this is documented in the file header and is an accepted enumeration risk for v0.