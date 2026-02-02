import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface CredentialIssueRequest {
  user_email: string;
  credential_type_key: string;
  score?: number;
  skills_verified?: string[];
  external_reference_id?: string;
}

interface VerifyRequest {
  verification_hash: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Remove 'credential-api' from path if present (edge function routing)
  const path = pathParts[0] === 'credential-api' ? pathParts.slice(1) : pathParts;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ==========================================
    // PUBLIC ENDPOINTS (no auth required)
    // ==========================================

    // GET /passport/:slug - Public passport view
    if (req.method === 'GET' && path[0] === 'passport' && path[1]) {
      const slug = path[1];
      
      const { data: passport, error: passportError } = await supabase
        .from('skill_passport')
        .select('id, user_id, is_public, public_url_slug')
        .eq('public_url_slug', slug)
        .eq('is_public', true)
        .single();

      if (passportError || !passport) {
        return new Response(
          JSON.stringify({ error: 'Passport not found or not public' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get credentials with game filter if provided
      const gameFilter = url.searchParams.get('game');
      
      let credentialsQuery = supabase
        .from('skill_credentials')
        .select(`
          id,
          title,
          credential_type,
          issued_at,
          expires_at,
          score,
          issuer,
          skills_verified,
          game_title,
          credential_type_key,
          verification_hash
        `)
        .eq('passport_id', passport.id);

      if (gameFilter) {
        credentialsQuery = credentialsQuery.eq('game_title', gameFilter);
      }

      const { data: credentials, error: credError } = await credentialsQuery;

      if (credError) throw credError;

      // Get profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url, employability_score')
        .eq('id', passport.user_id)
        .single();

      return new Response(
        JSON.stringify({
          passport: {
            slug: passport.public_url_slug,
            user: profile,
          },
          credentials: credentials || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /credentials/verify - Verify credential by hash
    if (req.method === 'POST' && path[0] === 'credentials' && path[1] === 'verify') {
      const body: VerifyRequest = await req.json();
      
      if (!body.verification_hash) {
        return new Response(
          JSON.stringify({ error: 'verification_hash is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: credential, error } = await supabase
        .from('skill_credentials')
        .select(`
          id,
          title,
          credential_type,
          issued_at,
          expires_at,
          score,
          issuer,
          skills_verified,
          game_title,
          passport_id
        `)
        .eq('verification_hash', body.verification_hash)
        .single();

      if (error || !credential) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Credential not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiration
      const isExpired = credential.expires_at && new Date(credential.expires_at) < new Date();

      // Get user info from passport
      const { data: passport } = await supabase
        .from('skill_passport')
        .select('user_id')
        .eq('id', credential.passport_id)
        .single();

      let username = null;
      if (passport) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', passport.user_id)
          .single();
        username = profile?.username;
      }

      return new Response(
        JSON.stringify({
          valid: !isExpired,
          expired: isExpired,
          credential: {
            ...credential,
            holder_username: username,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /catalog/credential-types - Public catalog of credential types
    if (req.method === 'GET' && path[0] === 'catalog' && path[1] === 'credential-types') {
      const gameFilter = url.searchParams.get('game');
      
      let query = supabase
        .from('credential_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (gameFilter) {
        query = query.eq('game_title', gameFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ credential_types: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // AUTHENTICATED ENDPOINTS (user JWT required)
    // ==========================================
    
    const authHeader = req.headers.get('Authorization');
    const appKey = req.headers.get('X-App-Key');

    // GET /credentials/mine - Current user's credentials
    if (req.method === 'GET' && path[0] === 'credentials' && path[1] === 'mine') {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const gameFilter = url.searchParams.get('game');

      // Get user's passport
      const { data: passport } = await supabase
        .from('skill_passport')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!passport) {
        return new Response(
          JSON.stringify({ credentials: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let credQuery = supabase
        .from('skill_credentials')
        .select('*')
        .eq('passport_id', passport.id);

      if (gameFilter) {
        credQuery = credQuery.eq('game_title', gameFilter);
      }

      const { data: credentials, error } = await credQuery;
      if (error) throw error;

      return new Response(
        JSON.stringify({ credentials: credentials || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // AUTHORIZED APP ENDPOINTS (API key required)
    // ==========================================

    if (appKey) {
      // Verify API key
      const { data: appAuth, error: appError } = await supabase
        .rpc('verify_app_api_key', { p_api_key: appKey });

      if (appError || !appAuth || appAuth.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const app = appAuth[0];

      // GET /credentials/user/:email - Get credentials for a user
      if (req.method === 'GET' && path[0] === 'credentials' && path[1] === 'user' && path[2]) {
        if (!app.can_read) {
          return new Response(
            JSON.stringify({ error: 'App does not have read permission' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const email = decodeURIComponent(path[2]);
        const gameFilter = url.searchParams.get('game');

        // Find user by email using profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', email)
          .maybeSingle();

        // Also try to find by looking up auth users list (limited approach)
        // Since we can't getUserByEmail, we look up profiles by username which often matches email
        if (!profile) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const userId = profile.id;

        // Get passport
        const { data: passport } = await supabase
          .from('skill_passport')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!passport) {
          return new Response(
            JSON.stringify({ credentials: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let credQuery = supabase
          .from('skill_credentials')
          .select('*')
          .eq('passport_id', passport.id);

        if (gameFilter) {
          credQuery = credQuery.eq('game_title', gameFilter);
        }

        const { data: credentials, error } = await credQuery;
        if (error) throw error;

        // Get profile info
        const { data: profileInfo } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .single();

        return new Response(
          JSON.stringify({ 
            user: profileInfo,
            credentials: credentials || [] 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST /credentials/issue - Issue a credential
      if (req.method === 'POST' && path[0] === 'credentials' && path[1] === 'issue') {
        if (!app.can_issue) {
          return new Response(
            JSON.stringify({ error: 'App does not have issue permission' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body: CredentialIssueRequest = await req.json();

        // Validate credential type is allowed for this app
        if (!app.types_allowed.includes(body.credential_type_key)) {
          return new Response(
            JSON.stringify({ error: `App cannot issue credential type: ${body.credential_type_key}` }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get credential type details
        const { data: credType, error: typeError } = await supabase
          .from('credential_types')
          .select('*')
          .eq('type_key', body.credential_type_key)
          .single();

        if (typeError || !credType) {
          return new Response(
            JSON.stringify({ error: 'Invalid credential type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find user by looking up profiles (we use username which often contains email)
        const { data: userProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', body.user_email)
          .maybeSingle();

        if (!userProfile) {
          return new Response(
            JSON.stringify({ error: 'User not found. User must be registered in FGN.Academy first.' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const targetUserId = userProfile.id;

        // Get or create passport
        let { data: passport } = await supabase
          .from('skill_passport')
          .select('id')
          .eq('user_id', targetUserId)
          .single();

        if (!passport) {
          // Create passport
          const passportHash = crypto.randomUUID();
          const { data: newPassport, error: createError } = await supabase
            .from('skill_passport')
            .insert({
              user_id: targetUserId,
              passport_hash: passportHash,
              is_public: false,
            })
            .select('id')
            .single();

          if (createError) throw createError;
          passport = newPassport;
        }

        // Generate verification hash
        const payload = JSON.stringify({
          type: body.credential_type_key,
          user: targetUserId,
          issued: new Date().toISOString(),
          score: body.score,
          random: crypto.randomUUID(),
        });
        const encoder = new TextEncoder();
        const data = encoder.encode(payload);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const verificationHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Create credential
        const { data: credential, error: credError } = await supabase
          .from('skill_credentials')
          .insert({
            passport_id: passport.id,
            title: credType.display_name,
            credential_type: credType.id ? 'skill_verification' : 'certification',
            issuer: app.app_slug,
            issuer_app_slug: app.app_slug,
            game_title: credType.game_title,
            credential_type_key: body.credential_type_key,
            score: body.score,
            skills_verified: body.skills_verified || credType.skills_granted,
            external_reference_id: body.external_reference_id,
            verification_hash: verificationHash,
          })
          .select()
          .single();

        if (credError) throw credError;

        return new Response(
          JSON.stringify({ 
            success: true,
            credential,
            verification_url: `${supabaseUrl}/functions/v1/credential-api/credentials/verify`,
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // No matching route
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Credential API error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});