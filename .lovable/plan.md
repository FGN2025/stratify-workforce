# Fix MCP function tools + add 5 read-only tools (amended)

## Schema findings (no migrations)

- **Tenant membership**: no `tenant_users`. Real join table is `community_memberships` (filter `request_status='approved'`).
- **Work order state**: no `work_orders.status`. State is `is_active` (boolean). Mapped to `status: is_active ? "active" : "inactive"` in the response with a code comment.
- **Games catalog**: no `games` table. `game_channels` is the catalog, keyed by `game_title` enum.
- **Challenges**: no `challenges` table. `work_orders` is the app's challenge table (has `title`, `game_title`, `is_active`, `difficulty`, `fgn_origin_challenge_id`, `source_challenge_id`). B3/B4 map to `work_orders` + `work_order_tasks`.
- **Passport**: `skill_passport`, `skill_credentials`, `user_badges`/`badges`, and SECURITY DEFINER `calculate_readiness(user_id)` RPC exist.

## Guardrails honored

No migrations. `verify_jwt` stays true. All handlers use the caller's bearer token (RLS enforced). No service role. All tools read-only. Existing tool names + input schemas unchanged.

## Fixes

**A1 `list-my-communities.ts`** — query `community_memberships` joined to `tenants`, filter `user_id = caller` and `request_status='approved'`. Return `{ tenant_id, name, slug, logo_url, accent_color, brand_color, role }`.

**A2 `list-my-work-orders.ts`** — drop non-existent `status`. Select `id, title, generated_name, game_title, difficulty, is_active, xp_reward, created_at, tenant_id`. Map `status = is_active ? "active" : "inactive"` (comment noting mapping). Keep limit (default 25, max 100) + `created_at desc`.

**A3 `get-my-profile.ts`** — no change; retest.

## New tools

**B1 `list_tenants`** — `tenants` select `id, name, slug, logo_url, accent_color, brand_color, description, is_verified`, order by name, `limit?` (default 25 / max 100). RLS filters visibility.

**B2 `list_games`** — `game_channels` select `game_title, name, description, accent_color, cover_image_url, member_count, work_order_count`. Return `{ id: game_title, name, ... }`. `limit?` (default 50 / max 100).

**B3 `list_challenges`** — reads `work_orders`. **Amended inputs (per user):** `game_title?: string` (enum name — NOT `game_id`; deliberate asymmetry with the play.fgn.gg connector where `game_id` is a real uuid), `tenant_id?: uuid`, `is_active?: boolean`, `limit?: integer` (default 25 / max 100). Select `id, title, generated_name, game_title, is_active, difficulty, xp_reward, tenant_id, fgn_origin_challenge_id, source_challenge_id, created_at`. Order `created_at desc`. Each filter applied independently only when provided. Manifest description will note the enum-string parameter and asymmetry vs. play.

**B4 `get_challenge`** — required `id` (uuid). `work_orders` full row + `work_order_tasks` (`id, title, description, order_index, source_task_id`) ordered by `order_index`. Comment: no `verification_type` column on `work_order_tasks` in this project. Returns `{ challenge, tasks }`.

**B5 `get_passport`** — optional `user_id` (defaults to `ctx.getUserId()`). Steps:
  1. Read `profiles` for the resolved `user_id` under RLS. **If no row returned, return `{ profile: null, passport: null, credentials: [], badges: [], readiness: null }` immediately — do NOT call the readiness RPC.** (Amendment 1: `calculate_readiness` is SECURITY DEFINER and bypasses RLS, so gating it on the RLS-permitted profile read is what prevents an authenticated user from pulling readiness for anyone else.)
  2. In parallel: `skill_passport` for that user, `skill_credentials` for that passport, `user_badges` joined to `badges`.
  3. Only then call `supabase.rpc("calculate_readiness", { p_user_id: user_id })`.
  4. Return `{ profile, passport, credentials, badges, readiness }`.

## After edits

1. Run `app_mcp_server--extract_mcp_manifest`.
2. Deploy `mcp` via `supabase--deploy_edge_functions`.
3. Curl each tool via the preview session and confirm non-error JSON.

## Report to user (after deploy)

- Tenant membership table: `community_memberships` (`request_status='approved'`).
- Work order state column: `is_active` (mapped to `status` in response).
- Registered tools: `get_my_profile`, `list_my_communities`, `list_my_work_orders`, `list_tenants`, `list_games`, `list_challenges`, `get_challenge`, `get_passport`.
