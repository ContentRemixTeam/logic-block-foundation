// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readBoundedText, safeLogId, secureJson } from "../_shared/replayVaultAccess.ts";
import { verifiedPayloadHash } from "../_shared/replayVaultWebhook.ts";
import { processCommercialWebhook } from "../_shared/replayVaultCommercialWebhook.ts";

const MAX_SIGNATURE_AGE_SECONDS=300;
Deno.serve(async (req:Request)=>{
  if (req.method!=="POST") return secureJson(req,{ error:"Method not allowed" },405);
  const requestId=safeLogId();
  try {
    const secret=Deno.env.get("GHL_WEBHOOK_SECRET");
    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret||!supabaseUrl||!serviceKey) throw new Error("not_configured");
    let raw:string;
    try { raw=await readBoundedText(req); }
    catch (error) {
      if (error instanceof Error&&error.message==="request_too_large") return secureJson(req,{ error:"Invalid request" },400);
      throw error;
    }
    const service=createClient(supabaseUrl,serviceKey);
    const { result }=await processCommercialWebhook(raw,req.headers,{
      verifyPayload:(timestamp,body,signature)=>verifiedPayloadHash(secret,timestamp,body,signature,Date.now()/1000,MAX_SIGNATURE_AGE_SECONDS),
      rpc:async(args)=>{
        const { data,error }=await service.rpc("apply_replay_vault_commercial_event_r7",args);
        if (error) throw error;
        return (data??{}) as Record<string,unknown>;
      },
    });
    const status=String(result.status??"");
    if (status==="event_id_payload_conflict"||status==="commercial_transaction_conflict")
      return secureJson(req,{ error:"Event conflict" },409);
    if (status==="rejected_unmapped") return secureJson(req,{ error:"Unmapped product" },422);
    if (status==="rejected_transition") return secureJson(req,{ error:"Invalid transition" },422);
    return secureJson(req,{ success:result.success===true,replayed:result.replayed===true,status,
      tier:result.tier??null,entitlementStatus:result.entitlementStatus??null,accessExpiresAt:result.accessExpiresAt??null });
  } catch (error) {
    const reason=error instanceof Error?error.message:"internal_error";
    if (/^(malformed_json|conflicting_alias:|unknown_provider|unknown_event_type|missing_event_type|missing:|malformed_date:|missing_required_identity|missing_purchase_identity|missing_parent_purchase_identity|missing_signature_evidence)/.test(reason))
      return secureJson(req,{ error:"Invalid request" },400);
    if (reason==="invalid_signature") return secureJson(req,{ error:"Unauthorized" },401);
    console.error("[replay-vault-webhook]",requestId,reason);
    return secureJson(req,{ error:"Webhook unavailable" },500);
  }
});
