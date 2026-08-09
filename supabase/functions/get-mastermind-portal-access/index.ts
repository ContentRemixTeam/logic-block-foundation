import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  bearerHeader,
  inaccessible,
  isAllowedOrigin,
  readBoundedJson,
  responseHeaders,
  safeLogId,
  secureJson,
} from "../_shared/replayVaultAccess.ts";

interface AccessRequest { preview?: boolean }

serve(async (req: Request) => {
  if (!isAllowedOrigin(req)) return inaccessible(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(req) });
  if (req.method !== "POST") return secureJson(req, { error: "Method not allowed" }, 405);

  const requestId = safeLogId();
  try {
    const authHeader = bearerHeader(req);
    if (!authHeader) return secureJson(req, { error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("not_configured");

    const body = await readBoundedJson<AccessRequest>(req);
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data, error: authError } = await authClient.auth.getUser(token);
    if (authError || !data.user?.email) return secureJson(req, { error: "Unauthorized" }, 401);

    const service = createClient(supabaseUrl, serviceKey);
    const { data: decision, error } = await service.rpc("replay_vault_access_decision", {
      p_user_id: data.user.id,
      p_email: data.user.email,
      p_resource_id: null,
      p_action: "access",
      p_preview: body.preview === true,
    });
    if (error) throw error;

    return secureJson(req, {
      allowed: decision?.allowed === true,
      memberEntitled: decision?.memberEntitled === true,
      memberTier: decision?.memberTier ?? null,
      memberScopes: Array.isArray(decision?.memberScopes) ? decision.memberScopes : [],
      previewCapabilities: Array.isArray(decision?.previewCapabilities) ? decision.previewCapabilities : [],
      previewActive: decision?.previewActive === true,
      launchState: decision?.launchState ?? "disabled",
    });
  } catch (error) {
    console.error("[replay-vault-access]", requestId, error instanceof Error ? error.message : "internal_error");
    return secureJson(req, { error: "Could not verify access" }, 500);
  }
});
