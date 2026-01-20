import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decryptToken(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    const parts = decoded.split(':');
    return parts.slice(1).join(':');
  } catch {
    return encrypted;
  }
}

function encryptToken(token: string): string {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'default-key';
  const combined = `${key.substring(0, 10)}:${token}`;
  return btoa(combined);
}

async function refreshToken(
  refreshToken: string,
  userId: string,
  serviceSupabase: any
): Promise<{ success: boolean; error?: string }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  // Retry logic with exponential backoff
  const maxRetries = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();

      if (data.error) {
        lastError = data.error;
        
        // Don't retry on permanent errors
        if (data.error === 'invalid_grant') {
          console.log(`[Keepalive] User ${userId}: Token revoked (invalid_grant)`);
          
          // Mark connection as inactive
          await serviceSupabase
            .from('google_calendar_connection')
            .update({ 
              is_active: false, 
              updated_at: new Date().toISOString() 
            })
            .eq('user_id', userId);
          
          return { success: false, error: 'Token revoked' };
        }

        // Retry on transient errors
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          console.log(`[Keepalive] User ${userId}: Retry ${attempt}/${maxRetries} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      if (data.access_token) {
        const newExpiry = new Date(Date.now() + (data.expires_in * 1000));
        
        await serviceSupabase
          .from('google_calendar_connection')
          .update({
            access_token_encrypted: encryptToken(data.access_token),
            token_expiry: newExpiry.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        console.log(`[Keepalive] User ${userId}: Token refreshed, expires ${newExpiry.toISOString()}`);
        return { success: true };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[Keepalive] User ${userId}: All retries failed - ${lastError}`);
  return { success: false, error: lastError };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find connections with tokens expiring in the next 24 hours
    const expiryThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: connections, error } = await serviceSupabase
      .from('google_calendar_connection')
      .select('user_id, refresh_token_encrypted, token_expiry')
      .eq('is_active', true)
      .lt('token_expiry', expiryThreshold)
      .gt('token_expiry', now); // Not already expired

    if (error) {
      console.error('[Keepalive] Failed to query connections:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to query connections', refreshed: 0, failed: 0 }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Keepalive] Found ${connections?.length || 0} tokens expiring soon`);

    let refreshed = 0;
    let failed = 0;
    const results: { userId: string; status: string; error?: string }[] = [];

    for (const conn of connections || []) {
      const decryptedRefresh = decryptToken(conn.refresh_token_encrypted);
      const result = await refreshToken(decryptedRefresh, conn.user_id, serviceSupabase);
      
      if (result.success) {
        refreshed++;
        results.push({ userId: conn.user_id, status: 'refreshed' });
      } else {
        failed++;
        results.push({ userId: conn.user_id, status: 'failed', error: result.error });
      }
    }

    console.log(`[Keepalive] Complete: ${refreshed} refreshed, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        refreshed, 
        failed, 
        total: connections?.length || 0,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[Keepalive] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
