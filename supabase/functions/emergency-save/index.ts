import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmergencySavePayload {
  userId: string;
  pageType: string;
  pageId?: string;
  data: any;
  timestamp: number;
  source: 'beforeunload' | 'pagehide' | 'visibilitychange' | 'crash';
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmergencySavePayload = await req.json();
    
    // Validate required fields
    if (!payload.userId || !payload.pageType || !payload.data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store emergency save in a dedicated table
    const { error: insertError } = await supabase
      .from("emergency_saves")
      .upsert({
        user_id: payload.userId,
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

    console.log(`Emergency save stored: ${payload.pageType} for user ${payload.userId} (${payload.source})`);

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
