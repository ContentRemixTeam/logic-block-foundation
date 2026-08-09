import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return json({ error: "Access check is not configured" }, 500);
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user?.email) return json({ error: "Unauthorized" }, 401);

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: accessScopes, error: scopeError } = await serviceClient.rpc(
      "get_mastermind_portal_access_scopes",
      { user_email: userData.user.email },
    );

    if (scopeError) {
      console.error("[get-mastermind-portal-access] Scope check failed", scopeError);
      return json({ error: "Could not verify access" }, 500);
    }

    const scopes = Array.isArray(accessScopes)
      ? accessScopes.filter((scope): scope is string => typeof scope === "string")
      : [];
    const hasMastermindAccess = scopes.length > 0;
    const hasFullReplayVault = scopes.includes("replay_vault") || scopes.includes("vault");

    return json({
      hasMastermindAccess,
      hasFullReplayVault,
      replayAccess: hasFullReplayVault ? "full_vault" : hasMastermindAccess ? "current_30_day" : "none",
      scopes,
    });
  } catch (error) {
    console.error("[get-mastermind-portal-access] Unexpected error", error);
    return json({ error: "Unexpected error" }, 500);
  }
});
