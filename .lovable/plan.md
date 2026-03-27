

# Set Password for Test User darcylorincz@gmail.com

## Problem
The user `darcylorincz@gmail.com` was auto-created by the system and no password was set/known. Passwords are hashed and cannot be retrieved.

## Solution

Use the `supabase--curl_edge_functions` tool (or a quick one-off edge function call) to reset the password via the Supabase Admin API. Specifically, we'll call `auth.admin.updateUserById()` to set a known password.

### Approach: Add a `/reset-password` route to the existing `admin-users` edge function

Add a new `POST /reset-password` handler that accepts `{ user_id, new_password }` — restricted to super_admins only. This is also useful long-term for admin user management.

### Changes

**File: `supabase/functions/admin-users/index.ts`**

Add a new route handler:

```typescript
if (req.method === "POST" && path === "/reset-password") {
  // Super admin only
  if (!isSuperAdmin) {
    return new Response(JSON.stringify({ error: "Super admin required" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const { user_id, new_password } = await req.json();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: new_password });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  // Audit log
  await supabaseAdmin.from("system_audit_logs").insert({
    actor_id: user.id, action: "password_reset_by_admin",
    resource_type: "user", resource_id: user_id,
    details: { target_user_id: user_id }
  });
  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
```

After deploying, we'll call it from the admin session (logged in as darcy@fgn.gg) to set a known password for darcylorincz@gmail.com, then log in as that user to verify the Work Order progress card.

### Test Steps
1. Deploy the updated edge function
2. Log in as darcy@fgn.gg (super admin) in the preview
3. Call the reset-password endpoint for user darcylorincz@gmail.com with a test password
4. Log out, log in as darcylorincz@gmail.com with the new password
5. Navigate to the ATS Gold Challenge work order to verify progress card

