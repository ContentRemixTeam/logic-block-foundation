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

type AccessSurface = "curriculum" | "recent_replay" | "vault";
interface AccessRequest { preview?: boolean; surface?: AccessSurface }
const VALID_SURFACES = new Set<AccessSurface>(["curriculum", "recent_replay", "vault"]);

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

    const surface = VALID_SURFACES.has(body.surface as AccessSurface) ? body.surface as AccessSurface : "vault";
    const service = createClient(supabaseUrl, serviceKey);
    // Single surface-aware policy; no fallback to the older pre-surface Vault access decision.
    const accessDecision = await service.rpc("mastermind_media_access_decision", {
      p_user_id: data.user.id,
      p_email: data.user.email,
      p_resource_id: null,
      p_action: "access",
      p_surface: surface,
      p_preview: body.preview === true,
    });
    const { data: decision, error } = accessDecision;
    if (error) throw error;

    return secureJson(req, {
      allowed: decision?.allowed === true,
      memberEntitled: decision?.memberEntitled === true,
      memberTier: decision?.memberTier ?? null,
      memberScopes: Array.isArray(decision?.memberScopes) ? decision.memberScopes : [],
      previewCapabilities: Array.isArray(decision?.previewCapabilities) ? decision.previewCapabilities : [],
      previewActive: decision?.previewActive === true,
      launchState: decision?.launchState ?? "disabled",
      surface: decision?.surface ?? surface,
    });
  } catch (error) {
    console.error("[replay-vault-access]", requestId, error instanceof Error ? error.message : "internal_error");
    return secureJson(req, { error: "Could not verify access" }, 500);
  }
});
