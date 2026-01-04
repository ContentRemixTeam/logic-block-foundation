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

    if (error) {
      console.error('OAuth error:', error);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'google-oauth-error', error: '${error}' }, '*'); window.close();</script>OAuth failed: ${error}</body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'google-oauth-error', error: 'missing_params' }, '*'); window.close();</script>Missing authorization code or state</body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      console.error('Invalid state parameter:', e);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'google-oauth-error', error: 'invalid_state' }, '*'); window.close();</script>Invalid state parameter</body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const { userId, origin } = stateData;

    // Check state timestamp (5 minute expiry)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'google-oauth-error', error: 'state_expired' }, '*'); window.close();</script>Authorization expired. Please try again.</body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
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
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'google-oauth-error', error: '${tokenData.error}' }, '*'); window.close();</script>Token exchange failed: ${tokenData.error}</body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
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
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'google-oauth-error', error: 'storage_error' }, '*'); window.close();</script>Failed to store connection</body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Build calendar list for client
    const calendars = calendarList.items?.map((cal: any) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    })) || [];

    console.log('OAuth successful for user:', userId, 'Found', calendars.length, 'calendars');

    // Return HTML that posts message to opener window
    const successHtml = `
<!DOCTYPE html>
<html>
<head><title>Google Calendar Connected</title></head>
<body>
<script>
  const data = {
    type: 'google-oauth-success',
    calendars: ${JSON.stringify(calendars)},
    email: '${userInfo.email}'
  };
  if (window.opener) {
    window.opener.postMessage(data, '*');
    window.close();
  } else {
    document.body.innerHTML = '<h3>Connected successfully! You can close this window.</h3>';
  }
</script>
<h3>Connecting...</h3>
</body>
</html>`;

    return new Response(successHtml, { 
      status: 200, 
      headers: { 'Content-Type': 'text/html' } 
    });
  } catch (error) {
    console.error('Error in google-oauth-callback:', error);
    return new Response(
      `<html><body><script>window.opener?.postMessage({ type: 'google-oauth-error', error: 'server_error' }, '*'); window.close();</script>Server error</body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
});
