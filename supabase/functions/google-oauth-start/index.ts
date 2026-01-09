/**
 * Google OAuth Start Handler
 * 
 * OAUTH FLOW TYPE: Edge Function Callback (NOT Supabase Auth OAuth)
 * 
 * This function initiates the Google OAuth flow by generating the authorization URL.
 * The callback will be handled by google-oauth-callback edge function.
 * 
 * Redirect URI: ${SUPABASE_URL}/functions/v1/google-oauth-callback
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default production origin
const DEFAULT_ORIGIN = 'https://plan.faithmariah.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    if (!clientId) {
      console.error('[OAuth Start] GOOGLE_CLIENT_ID not configured');
      return new Response(
        JSON.stringify({ error: 'Google OAuth not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the origin and return path from the request for redirect
    const { origin, returnPath } = await req.json().catch(() => ({}));
    
    // Use provided origin or default to production
    const safeOrigin = origin || DEFAULT_ORIGIN;
    const safeReturnPath = returnPath || '/settings';
    
    // The redirect URI for Google OAuth - this is the edge function callback URL
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`;

    console.log('[OAuth Start] Starting OAuth for user:', user.id);
    console.log('[OAuth Start] Origin:', safeOrigin, 'Return path:', safeReturnPath);
    console.log('[OAuth Start] Redirect URI:', redirectUri);

    // Generate state parameter with user ID for CSRF protection
    const state = btoa(JSON.stringify({ 
      userId: user.id, 
      timestamp: Date.now(),
      origin: safeOrigin,
      returnPath: safeReturnPath
    }));

    // Build OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log('[OAuth Start] Generated OAuth URL for user:', user.id);

    return new Response(
      JSON.stringify({ 
        url: authUrl,
        debug: {
          origin: safeOrigin,
          returnPath: safeReturnPath,
          redirectUri: redirectUri,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[OAuth Start] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
