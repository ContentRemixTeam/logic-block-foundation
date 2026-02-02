import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmergencySavePayload {
  token: string; // Access token for authentication
  pageType: string;
  pageId?: string;
  data: any;
  timestamp: number;
  source: 'beforeunload' | 'pagehide' | 'visibilitychange' | 'crash';
}

/**
 * Validate JWT token and extract user ID
 * Since sendBeacon can't set Authorization headers, we pass the token in the payload body
 */
async function validateTokenAndGetUserId(token: string): Promise<{ userId: string | null; error: string | null }> {
  if (!token) {
    return { userId: null, error: 'No token provided' };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  // Create client with anon key to validate the JWT
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  try {
    // Validate the JWT and get claims
    const { data, error } = await authClient.auth.getClaims(token);
    
    if (error || !data?.claims) {
      console.error('JWT validation failed:', error);
      return { userId: null, error: 'Invalid or expired token' };
    }

    const userId = data.claims.sub;
    if (!userId) {
      return { userId: null, error: 'No user ID in token' };
    }

    return { userId, error: null };
  } catch (err) {
    console.error('Token validation error:', err);
    return { userId: null, error: 'Token validation failed' };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmergencySavePayload = await req.json();
    
    // Validate required fields
    if (!payload.token || !payload.pageType || !payload.data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields (token, pageType, data)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURE: Validate token and extract user ID from JWT
    // We ignore any userId in the payload and derive it from the validated token
    const { userId, error: authError } = await validateTokenAndGetUserId(payload.token);
    
    if (authError || !userId) {
      console.error('Emergency save auth failed:', authError);
      return new Response(
        JSON.stringify({ error: authError || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for writes
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store emergency save in a dedicated table
    // User ID is derived from the validated token, not from the payload
    const { error: insertError } = await supabase
      .from("emergency_saves")
      .upsert({
        user_id: userId, // SECURE: Use validated user ID from token
        page_type: payload.pageType,
        page_id: payload.pageId || null,
        data: payload.data,
        source: payload.source,
        created_at: new Date(payload.timestamp).toISOString(),
      }, {
        onConflict: "user_id,page_type,page_id",
      });

    if (insertError) {
      console.error("Emergency save insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Emergency save stored: ${payload.pageType} for user ${userId} (${payload.source})`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Emergency save error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
