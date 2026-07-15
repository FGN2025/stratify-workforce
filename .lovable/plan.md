# Fix: MCP tools connect but every call fails

## Real root cause (from edge function logs)

Claude guessed "auth failed," but the logs disagree. For every call the function logs:

```
oauth.verify.ok { sub: "aa46...", clientId: "e31d...", scopes: [...] }
tool.invoked { outcome: "handler_error", durationMs: 0.33 }
```

OAuth verification succeeds. The handler then throws in ~0.3ms — before any Supabase query could run. That's a synchronous crash inside the client factory.

## Why it crashes

All three tool files (`get-my-profile.ts`, `list-my-work-orders.ts`, `list-my-communities.ts`) do:

```ts
createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,
  ...
)
```

Two problems in the Supabase Edge Function (Deno) runtime:
1. Env vars must be read via `Deno.env.get(...)`. `process.env` returns `undefined` here.
2. The auto-injected secret is named `SUPABASE_ANON_KEY`, not `SUPABASE_PUBLISHABLE_KEY`.

So `createClient(undefined, undefined, …)` throws immediately → `handler_error`.

## Changes

Edit each of the three tool files under `src/lib/mcp/tools/` to build the client using Deno env with the correct key name, keeping the user's bearer token forwarding intact:

```ts
function supabaseForUser(ctx: ToolContext) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

Files touched:
- `src/lib/mcp/tools/get-my-profile.ts`
- `src/lib/mcp/tools/list-my-work-orders.ts`
- `src/lib/mcp/tools/list-my-communities.ts`

The mcp-js Vite plugin will regenerate `supabase/functions/mcp/index.ts` from these sources; then redeploy the `mcp` edge function so the live endpoint picks up the fix.

## Verification

1. Redeploy `mcp` edge function.
2. From Claude/desktop, call `get_my_profile`. Expect the profile row back.
3. Recheck edge logs — should now show `outcome: "ok"` (not `handler_error`) after `oauth.verify.ok`.

## Out of scope

No changes to OAuth setup, consent route, RLS, or the MCP entry — auth is already working per the logs.
