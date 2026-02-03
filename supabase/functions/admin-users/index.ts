import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/admin-users", "");

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create user client for auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userRole = roleData.role;
    const isSuperAdmin = userRole === "super_admin";

    // Route handling
    if (req.method === "POST" && path === "/invite") {
      return handleInvite(req, supabaseAdmin, user.id, isSuperAdmin);
    }

    if (req.method === "GET" && path === "/pending") {
      return handleGetPending(supabaseAdmin);
    }

    if (req.method === "DELETE" && path.startsWith("/invite/")) {
      const inviteId = path.replace("/invite/", "");
      return handleRevoke(supabaseAdmin, inviteId, user.id);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleInvite(
  req: Request,
  supabaseAdmin: any,
  inviterId: string,
  isSuperAdmin: boolean
) {
  const body = await req.json();
  const { email, username, role, tenant_id } = body;

  // Validate required fields
  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ error: "Invalid email format" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Validate role permissions
  const validRoles = ["user", "developer", "moderator", "admin"];
  if (isSuperAdmin) {
    validRoles.push("super_admin");
  }

  if (!validRoles.includes(role)) {
    return new Response(
      JSON.stringify({
        error: `You cannot assign the role: ${role}`,
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check if email already exists in auth
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    return new Response(
      JSON.stringify({ error: "A user with this email already exists" }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check if there's already a pending invitation
  const { data: existingInvite } = await supabaseAdmin
    .from("user_invitations")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return new Response(
      JSON.stringify({
        error: "An invitation is already pending for this email",
      }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Create invitation record first
  const { data: invitation, error: inviteDbError } = await supabaseAdmin
    .from("user_invitations")
    .insert({
      email: email.toLowerCase(),
      username: username || null,
      role: role || "user",
      tenant_id: tenant_id || null,
      invited_by: inviterId,
      status: "pending",
    })
    .select()
    .single();

  if (inviteDbError) {
    console.error("Invitation DB error:", inviteDbError);
    return new Response(
      JSON.stringify({ error: "Failed to create invitation record" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Send invitation email via Supabase Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        username: username || null,
        pending_role: role,
        invitation_id: invitation.id,
      },
    });

  if (authError) {
    // Rollback the invitation record
    await supabaseAdmin
      .from("user_invitations")
      .delete()
      .eq("id", invitation.id);

    console.error("Auth invite error:", authError);
    return new Response(
      JSON.stringify({
        error: authError.message || "Failed to send invitation email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Log to audit trail
  await supabaseAdmin.from("system_audit_logs").insert({
    actor_id: inviterId,
    action: "user_invited",
    resource_type: "user_invitation",
    resource_id: invitation.id,
    details: {
      invited_email: email,
      assigned_role: role,
      tenant_id: tenant_id || null,
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      invitation: invitation,
      message: `Invitation sent to ${email}`,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleGetPending(supabaseAdmin: any) {
  const { data, error } = await supabaseAdmin
    .from("user_invitations")
    .select("*, tenants(name, slug)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ invitations: data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleRevoke(
  supabaseAdmin: any,
  inviteId: string,
  actorId: string
) {
  // Get invitation details first
  const { data: invitation, error: fetchError } = await supabaseAdmin
    .from("user_invitations")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (fetchError || !invitation) {
    return new Response(JSON.stringify({ error: "Invitation not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (invitation.status !== "pending") {
    return new Response(
      JSON.stringify({ error: "Only pending invitations can be revoked" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Update status to revoked
  const { error: updateError } = await supabaseAdmin
    .from("user_invitations")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Log to audit trail
  await supabaseAdmin.from("system_audit_logs").insert({
    actor_id: actorId,
    action: "invitation_revoked",
    resource_type: "user_invitation",
    resource_id: inviteId,
    details: {
      revoked_email: invitation.email,
      original_role: invitation.role,
    },
  });

  return new Response(
    JSON.stringify({ success: true, message: "Invitation revoked" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
