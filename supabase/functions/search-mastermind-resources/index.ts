import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bearerHeader, inaccessible, isAllowedOrigin, readBoundedJson, responseHeaders, safeLogId, secureJson } from "../_shared/replayVaultAccess.ts";
import { mapSearchRow } from "../_shared/replayVaultProducer.mjs";

const VALID_PATHS = new Set(["offer","find","nurture","sell","deliver","leverage"]);
interface SearchRequest { query?: string; path?: string; limit?: number; preview?: boolean; filters?: { includeMetadataFallback?: boolean } }
interface SearchRow {
  portal_resource_id: string; moment_id: string; question_id: string | null; title: string; product_title: string;
  category_title: string | null; resource_type: string; snippet: string | null;
  starts_at_seconds: number; ends_at_seconds: number; reason: string; duration_seconds: number | null;
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
    const { data:access,error:accessError }=await service.rpc("replay_vault_access_decision",{
      p_user_id:authData.user.id,p_email:authData.user.email,p_resource_id:null,p_action:"access",p_preview:preview,
    });
    if (accessError) throw accessError;
    if (access?.allowed !== true) return inaccessible(req);
    const query=typeof body.query === "string" ? body.query.trim() : "";
    if (query.length<2 || query.length>200) return secureJson(req,{ error:"Invalid query" },400);
    const path=typeof body.path === "string" && body.path.trim() ? body.path.trim().toLowerCase() : null;
    if (path && !VALID_PATHS.has(path)) return secureJson(req,{ error:"Invalid path filter" },400);
    const limit=Math.min(Math.max(Number.isFinite(body.limit) ? Math.trunc(body.limit as number) : 12,1),25);
    const { data,error }=await service.rpc("search_replay_vault_resources",{
      p_user_id:authData.user.id,p_email:authData.user.email,p_query:query,p_stage:path,p_limit:limit,
      p_include_metadata_fallback:body.filters?.includeMetadataFallback===true,p_preview:preview,
    });
    if (error) throw error;
    return secureJson(req,{ results:((data??[]) as SearchRow[]).map(mapSearchRow) });
  } catch (error) {
    console.error("[replay-vault-search]",requestId,error instanceof Error ? error.message : "internal_error");
    return secureJson(req,{ error:"Search unavailable" },500);
  }
});
