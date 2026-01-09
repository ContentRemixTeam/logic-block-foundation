/**
 * Google OAuth Callback Handler
 * 
 * OAUTH FLOW TYPE: Edge Function Callback (NOT Supabase Auth OAuth)
 * 
 * This function handles the OAuth callback from Google after user authorization.
 * It exchanges the authorization code for tokens and stores them in the database.
 * 
 * Supported origins:
 * - https://plan.faithmariah.com (production)
 * - https://*.lovableproject.com (preview/staging)
 * - http://localhost:* (local development)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple encryption using base64 encoding (in production, use proper encryption)
function encryptToken(token: string): string {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'default-key';
  const combined = `${key.substring(0, 10)}:${token}`;
  return btoa(combined);
}

// Validate origin is from allowed domains
function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    // Allow production domain
    if (url.hostname === 'plan.faithmariah.com') return true;
    // Allow lovable preview domains
    if (url.hostname.endsWith('.lovableproject.com')) return true;
    // Allow localhost for development
    if (url.hostname === 'localhost') return true;
    return false;
  } catch {
    return false;
  }
}

// Default fallback origin (production)
const DEFAULT_ORIGIN = 'https://plan.faithmariah.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('[OAuth Callback] Received callback, state present:', !!state, 'code present:', !!code);

    // Decode state to get origin for redirect
    let stateData: { userId: string; origin: string; returnPath: string; timestamp: number } | null = null;
    let redirectOrigin = DEFAULT_ORIGIN;
    let returnPath = '/settings';
    
    try {
      if (state) {
        stateData = JSON.parse(atob(state));
        console.log('[OAuth Callback] Parsed state, origin:', stateData?.origin);
        
        // Validate and use origin from state
        if (stateData?.origin && isValidOrigin(stateData.origin)) {
          redirectOrigin = stateData.origin;
        } else {
          console.warn('[OAuth Callback] Invalid or missing origin in state, using default:', DEFAULT_ORIGIN);
        }
        
        if (stateData?.returnPath) {
          returnPath = stateData.returnPath;
        }
      }
    } catch (e) {
      console.error('[OAuth Callback] Failed to parse state:', e);
    }

    // Handle OAuth errors from Google
    if (error) {
      console.error('[OAuth Callback] Google OAuth error:', error, errorDescription);
      const errorMsg = errorDescription || error;
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=${encodeURIComponent(errorMsg)}`;
      console.log('[OAuth Callback] Redirecting to error URL:', redirectUrl);
      return Response.redirect(redirectUrl, 302);
    }

    if (!code || !state) {
      console.error('[OAuth Callback] Missing code or state params');
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=missing_authorization_code`;
      return Response.redirect(redirectUrl, 302);
    }

    // Validate state was parsed
    if (!stateData) {
      console.error('[OAuth Callback] Could not parse state data');
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=invalid_state_data`;
      return Response.redirect(redirectUrl, 302);
    }

    const { userId } = stateData;

    // Check state timestamp (5 minute expiry)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      console.error('[OAuth Callback] State expired');
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=authorization_expired_please_try_again`;
      return Response.redirect(redirectUrl, 302);
    }

    // Exchange code for tokens
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`;

    console.log('[OAuth Callback] Exchanging code for tokens...');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[OAuth Callback] Token exchange error:', tokenData.error, tokenData.error_description);
      const errorMsg = tokenData.error_description || tokenData.error;
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=${encodeURIComponent(errorMsg)}`;
      return Response.redirect(redirectUrl, 302);
    }

    console.log('[OAuth Callback] Token exchange successful, fetching user info...');

    // Get Google user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    console.log('[OAuth Callback] User info retrieved, email:', userInfo.email);

    // Fetch calendar list
    const calendarListResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const calendarList = await calendarListResponse.json();

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Store connection using service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[OAuth Callback] Storing connection for user:', userId);

    const { error: upsertError } = await supabase
      .from('google_calendar_connection')
      .upsert({
        user_id: userId,
        google_user_id: userInfo.id,
        refresh_token_encrypted: encryptToken(tokenData.refresh_token),
        access_token_encrypted: encryptToken(tokenData.access_token),
        token_expiry: tokenExpiry.toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('[OAuth Callback] Error storing connection:', upsertError);
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=failed_to_save_connection`;
      return Response.redirect(redirectUrl, 302);
    }

    // Build calendar list for client
    const calendars = calendarList.items?.map((cal: any) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    })) || [];

    console.log('[OAuth Callback] SUCCESS for user:', userId, '- Found', calendars.length, 'calendars');

    // Redirect back to app with success and calendar data
    const calendarsParam = encodeURIComponent(JSON.stringify(calendars));
    const emailParam = encodeURIComponent(userInfo.email || '');
    const redirectUrl = `${redirectOrigin}${returnPath}?oauth=success&calendars=${calendarsParam}&email=${emailParam}`;
    
    console.log('[OAuth Callback] Redirecting to:', redirectOrigin + returnPath);
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error);
    // Try to redirect with error to production domain as fallback
    try {
      const errorMsg = error instanceof Error ? error.message : 'server_error';
      return Response.redirect(`${DEFAULT_ORIGIN}/settings?oauth=error&error=${encodeURIComponent(errorMsg)}`, 302);
    } catch {
      return new Response(JSON.stringify({ error: 'Server error' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }
});
