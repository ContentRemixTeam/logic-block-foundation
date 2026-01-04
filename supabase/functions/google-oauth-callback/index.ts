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

    // Decode state to get origin for redirect
    let stateData: { userId: string; origin: string; returnPath: string; timestamp: number } | null = null;
    try {
      if (state) {
        stateData = JSON.parse(atob(state));
      }
    } catch (e) {
      console.error('Failed to parse state:', e);
    }

    const redirectOrigin = stateData?.origin || 'https://lovable.dev';
    const returnPath = stateData?.returnPath || '/settings';

    if (error) {
      console.error('OAuth error:', error);
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=${encodeURIComponent(error)}`;
      return Response.redirect(redirectUrl, 302);
    }

    if (!code || !state) {
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=missing_params`;
      return Response.redirect(redirectUrl, 302);
    }

    // Validate state was parsed
    if (!stateData) {
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=invalid_state`;
      return Response.redirect(redirectUrl, 302);
    }

    const { userId } = stateData;

    // Check state timestamp (5 minute expiry)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=state_expired`;
      return Response.redirect(redirectUrl, 302);
    }

    // Exchange code for tokens
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`;

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
      console.error('Token exchange error:', tokenData);
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=${encodeURIComponent(tokenData.error)}`;
      return Response.redirect(redirectUrl, 302);
    }

    // Get Google user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

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
      console.error('Error storing connection:', upsertError);
      const redirectUrl = `${redirectOrigin}${returnPath}?oauth=error&error=storage_error`;
      return Response.redirect(redirectUrl, 302);
    }

    // Build calendar list for client
    const calendars = calendarList.items?.map((cal: any) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    })) || [];

    console.log('OAuth successful for user:', userId, 'Found', calendars.length, 'calendars');

    // Redirect back to app with success and calendar data
    const calendarsParam = encodeURIComponent(JSON.stringify(calendars));
    const redirectUrl = `${redirectOrigin}${returnPath}?oauth=success&calendars=${calendarsParam}`;
    
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error('Error in google-oauth-callback:', error);
    // Try to redirect with error, fallback to generic response
    try {
      return Response.redirect('https://lovable.dev/settings?oauth=error&error=server_error', 302);
    } catch {
      return new Response('Server error', { status: 500 });
    }
  }
});
