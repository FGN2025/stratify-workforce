import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  banner: string | null;
  accent_color: number | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/discord-oauth", "");

  // Check if Discord integration is configured
  const clientId = Deno.env.get("DISCORD_CLIENT_ID");
  const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");

  // GET /status - Check if Discord OAuth is configured
  if (req.method === "GET" && (path === "/status" || path === "")) {
    return new Response(
      JSON.stringify({
        configured: Boolean(clientId && clientSecret),
        message: clientId && clientSecret 
          ? "Discord integration is configured" 
          : "Discord integration not yet configured by administrator",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // All other endpoints require Discord to be configured
  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({
        error: "Discord integration not configured",
        configured: false,
        message: "Administrator needs to add Discord credentials to enable this feature",
      }),
      { 
        status: 503, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  // Get auth token from request
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify user token
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // POST /connect - Exchange authorization code for tokens
    if (req.method === "POST" && path === "/connect") {
      const { code, redirect_uri } = await req.json();

      if (!code || !redirect_uri) {
        return new Response(
          JSON.stringify({ error: "Missing code or redirect_uri" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("Discord token exchange failed:", errorData);
        return new Response(
          JSON.stringify({ error: "Failed to exchange authorization code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens: DiscordTokenResponse = await tokenResponse.json();

      // Fetch Discord user profile
      const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch Discord user profile" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const discordUser: DiscordUser = await userResponse.json();

      // Calculate token expiration
      const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Upsert Discord connection
      const { error: upsertError } = await supabase
        .from("user_discord_connections")
        .upsert({
          user_id: user.id,
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_discriminator: discordUser.discriminator,
          discord_avatar_hash: discordUser.avatar,
          discord_banner_hash: discordUser.banner,
          discord_accent_color: discordUser.accent_color,
          discord_global_name: discordUser.global_name,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt,
          scopes: tokens.scope.split(" "),
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          is_active: true,
        }, {
          onConflict: "user_id",
        });

      if (upsertError) {
        console.error("Failed to save Discord connection:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to save Discord connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          discord: {
            id: discordUser.id,
            username: discordUser.username,
            discriminator: discordUser.discriminator,
            globalName: discordUser.global_name,
            avatarHash: discordUser.avatar,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /refresh - Refresh access token
    if (req.method === "POST" && path === "/refresh") {
      // Get current connection
      const { data: connection, error: fetchError } = await supabase
        .from("user_discord_connections")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError || !connection) {
        return new Response(
          JSON.stringify({ error: "No Discord connection found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Refresh the token
      const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
        }),
      });

      if (!tokenResponse.ok) {
        // Token refresh failed - mark connection as inactive
        await supabase
          .from("user_discord_connections")
          .update({ is_active: false })
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ error: "Token refresh failed - please reconnect Discord" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens: DiscordTokenResponse = await tokenResponse.json();
      const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Update tokens
      await supabase
        .from("user_discord_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt,
          last_synced_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /disconnect - Remove Discord connection
    if (req.method === "DELETE" && path === "/disconnect") {
      const { error: deleteError } = await supabase
        .from("user_discord_connections")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Failed to disconnect Discord" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Discord OAuth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
