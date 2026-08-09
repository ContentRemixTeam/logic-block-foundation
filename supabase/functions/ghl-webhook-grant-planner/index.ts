import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readBoundedText, safeLogId, secureJson } from "../_shared/replayVaultAccess.ts";
import { verifiedPayloadHash } from "../_shared/replayVaultWebhook.ts";

type JsonObject = Record<string, unknown>;
const MAX_SIGNATURE_AGE_SECONDS=300;
const EVENT_TYPES=new Set(["grant","renewal","cancel_at_period_end","expiration","refund","chargeback","immediate_revocation"]);
function text(value:unknown):string { return typeof value === "string" ? value.trim() : ""; }
function nested(body:JsonObject,key:string):JsonObject { const v=body[key]; return v&&typeof v==="object"&&!Array.isArray(v)?v as JsonObject:{}; }
function isoOrNull(value:unknown):string|null {
  const raw=text(value); if (!raw) return null; const ms=Date.parse(raw); return Number.isFinite(ms)?new Date(ms).toISOString():null;
}

Deno.serve(async (req:Request)=>{
  if (req.method!=="POST") return secureJson(req,{ error:"Method not allowed" },405);
  const requestId=safeLogId();
  try {
    const secret=Deno.env.get("GHL_WEBHOOK_SECRET"),supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret||!supabaseUrl||!serviceKey) throw new Error("not_configured");
    let raw:string;
    try { raw=await readBoundedText(req); } catch (error) {
      if (error instanceof Error && error.message==="request_too_large") return secureJson(req,{ error:"Invalid request" },400);
      throw error;
    }
    let body:JsonObject; try { body=JSON.parse(raw||"{}") as JsonObject; } catch { return secureJson(req,{ error:"Invalid request" },400); }
    const data=nested(body,"data"),order=nested(body,"order"),contact=nested(body,"contact");
    const provider=text(body.provider||"ghl").toLowerCase();
    const eventId=text(req.headers.get("X-Webhook-Event-Id")||body.eventId||body.event_id||data.eventId);
    const orderId=text(body.orderId||body.order_id||data.orderId||order.id);
    const email=text(body.email||contact.email||data.email).toLowerCase();
    const eventType=text(body.eventType||body.event_type||data.eventType||"grant").toLowerCase();
    const productId=text(body.productId||body.product_id||data.productId||order.productId);
    const priceId=text(body.priceId||body.price_id||data.priceId||order.priceId);
    const accessExpiresAt=isoOrNull(body.accessExpiresAt||body.periodEnd||data.accessExpiresAt||data.periodEnd);
    const timestamp=text(req.headers.get("X-Webhook-Timestamp")), suppliedSignature=text(req.headers.get("X-Webhook-Signature"));
    if (provider!=="ghl"||!eventId||!orderId||!email.includes("@")||!productId||!priceId||!EVENT_TYPES.has(eventType)||!/^\d{10}$/.test(timestamp))
      return secureJson(req,{ error:"Invalid request" },400);
    const timestampSeconds=Number(timestamp);
    const payloadHash=await verifiedPayloadHash(secret,timestamp,raw,suppliedSignature,Date.now()/1000,MAX_SIGNATURE_AGE_SECONDS);
    if (!payloadHash) return secureJson(req,{ error:"Unauthorized" },401);

    const service=createClient(supabaseUrl,serviceKey);
    const { data:result,error }=await service.rpc("apply_replay_vault_webhook_event",{
      p_provider:provider,p_event_id:eventId,p_order_id:orderId,p_email:email,p_event_type:eventType,
      p_product_id:productId,p_price_id:priceId,p_payload_sha256:payloadHash,
      p_effective_at:new Date(timestampSeconds*1000).toISOString(),p_access_expires_at:accessExpiresAt,
    });
    if (error) throw error;
    if (result?.status==="event_id_payload_conflict"||result?.status==="semantic_transaction_payload_conflict")
      return secureJson(req,{ error:"Event conflict" },409);
    if (result?.status==="rejected_unmapped") return secureJson(req,{ error:"Unmapped product" },422);
    if (result?.status==="rejected_transition") return secureJson(req,{ error:"Invalid transition" },422);
    return secureJson(req,{ success:result?.success===true,replayed:result?.replayed===true,status:result?.status,
      tier:result?.tier??null,entitlementStatus:result?.entitlementStatus??null,accessExpiresAt:result?.accessExpiresAt??null });
  } catch (error) {
    console.error("[replay-vault-webhook]",requestId,error instanceof Error?error.message:"internal_error");
    return secureJson(req,{ error:"Webhook unavailable" },500);
  }
});
