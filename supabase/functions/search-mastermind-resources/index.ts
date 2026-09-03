import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bearerHeader, inaccessible, isAllowedOrigin, readBoundedJson, responseHeaders, safeLogId, secureJson } from "../_shared/replayVaultAccess.ts";
import { mapSearchRow } from "../_shared/replayVaultProducer.mjs";

const VALID_PATHS = new Set(["offer","find","nurture","sell","deliver","leverage"]);
type SearchSurface = "curriculum" | "recent_replay" | "vault";
const VALID_SURFACES = new Set<SearchSurface>(["curriculum", "recent_replay", "vault"]);
interface SearchRequest {
  query?: string;
  path?: string;
  limit?: number;
  momentsPerReplay?: number;
  surface?: SearchSurface;
  preview?: boolean;
  filters?: { includeMetadataFallback?: boolean };
}
interface SearchRow {
  portal_resource_id: string; moment_id: string; question_id: string | null; title: string; product_title: string;
  category_title: string | null; resource_type: string; snippet: string | null;
  starts_at_seconds: number; ends_at_seconds: number; reason: string; duration_seconds: number | null;
  access_scope?: string | null; approved_access_scope?: string | null;
}

serve(async (req: Request) => {
  if (!isAllowedOrigin(req)) return inaccessible(req);
  if (req.method === "OPTIONS") return new Response(null,{ status:204,headers:responseHeaders(req) });
  if (req.method !== "POST") return secureJson(req,{ error:"Method not allowed" },405);
  const requestId = safeLogId();
  try {
    const authHeader = bearerHeader(req);
    if (!authHeader) return secureJson(req,{ error:"Unauthorized" },401);
    const body = await readBoundedJson<SearchRequest>(req);
    const supabaseUrl=Deno.env.get("SUPABASE_URL"), anonKey=Deno.env.get("SUPABASE_ANON_KEY"), serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("not_configured");
    const token=authHeader.slice("Bearer ".length);
    const authClient=createClient(supabaseUrl,anonKey,{ global:{ headers:{ Authorization:authHeader } } });
    const { data:authData,error:authError }=await authClient.auth.getUser(token);
    if (authError || !authData.user?.email) return secureJson(req,{ error:"Unauthorized" },401);

    const service=createClient(supabaseUrl,serviceKey), preview=body.preview===true;
    const surface = VALID_SURFACES.has(body.surface as SearchSurface) ? body.surface as SearchSurface : "vault";
    // Single surface-aware policy. The pre-surface replay_vault_* functions are no longer consulted,
    // so a denial or error here is final instead of being re-evaluated under older rules.
    const accessDecision = await service.rpc("mastermind_media_access_decision",{
      p_user_id:authData.user.id,p_email:authData.user.email,p_resource_id:null,p_action:"access",p_surface:surface,p_preview:preview,
    });
    const { data:access,error:accessError }=accessDecision;
    if (accessError) throw accessError;
    if (access?.allowed !== true) return inaccessible(req);
    const query=typeof body.query === "string" ? body.query.trim() : "";
    if (query.length<2 || query.length>200) return secureJson(req,{ error:"Invalid query" },400);
    const path=typeof body.path === "string" && body.path.trim() ? body.path.trim().toLowerCase() : null;
    if (path && !VALID_PATHS.has(path)) return secureJson(req,{ error:"Invalid path filter" },400);
    const limit=Math.min(Math.max(Number.isFinite(body.limit) ? Math.trunc(body.limit as number) : 12,1),25);
    const momentsPerReplay=Math.min(Math.max(Number.isFinite(body.momentsPerReplay) ? Math.trunc(body.momentsPerReplay as number) : 3,1),8);
    const searchResult=await service.rpc("search_mastermind_media_resources",{
      p_user_id:authData.user.id,p_email:authData.user.email,p_query:query,p_stage:path,p_limit:limit,
      p_moments_per_replay:momentsPerReplay,p_include_metadata_fallback:body.filters?.includeMetadataFallback===true,
      p_surface:surface,p_preview:preview,
    });
    const { data,error }=searchResult;
    if (error) {
      // 57014 = query_canceled (the function's own statement_timeout). Report it as a
      // too-broad search rather than a generic failure so the member can narrow it.
      const code = (error as { code?: string }).code;
      if (code === "57014") return secureJson(req,{ results:[], tooBroad:true });
      throw error;
    }
    return secureJson(req,{ results:((data??[]) as SearchRow[]).map(mapSearchRow) });
  } catch (error) {
    console.error("[replay-vault-search]",requestId,error instanceof Error ? error.message : "internal_error");
    return secureJson(req,{ error:"Search unavailable" },500);
  }
});
