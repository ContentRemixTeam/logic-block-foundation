import { sha256Hex } from "./replayVaultWebhook.ts";

export type JsonObject = Record<string, unknown>;
export type CommercialRpcArgs = {
  p_provider:string; p_event_id:string; p_order_id:string|null; p_transaction_id:string|null;
  p_parent_order_id:string|null; p_parent_transaction_id:string|null; p_email:string; p_event_type:string;
  p_product_id:string; p_price_id:string; p_payload_sha256:string; p_signature_sha256:string;
  p_effective_at:string; p_access_expires_at:string|null;
};
export type CommercialDependencies = {
  verifyPayload:(timestamp:string,raw:string,signature:string)=>Promise<string|null>;
  rpc:(args:CommercialRpcArgs)=>Promise<Record<string,unknown>>;
};
const PURCHASE_TYPES=new Set(["grant","renewal"]);
const LIFECYCLE_TYPES=new Set(["cancel_at_period_end","expiration","refund","chargeback","immediate_revocation"]);
function object(value:unknown):JsonObject { return value&&typeof value==="object"&&!Array.isArray(value)?value as JsonObject:{}; }
function scalar(value:unknown):string { return typeof value==="string"?value.trim():typeof value==="number"?String(value):""; }
function exactAlias(name:string,values:unknown[],normalize:(value:string)=>string=(value)=>value):string {
  const supplied=values.map(scalar).filter(Boolean).map(normalize);
  if (!supplied.length) return "";
  if (new Set(supplied).size!==1) throw new Error(`conflicting_alias:${name}`);
  return supplied[0];
}
function dateAlias(name:string,values:unknown[],required=false):string|null {
  const raw=exactAlias(name,values);
  if (!raw) { if (required) throw new Error(`missing:${name}`); return null; }
  const milliseconds=Date.parse(raw);
  if (!Number.isFinite(milliseconds)) throw new Error(`malformed_date:${name}`);
  return new Date(milliseconds).toISOString();
}
function header(headers:Headers,name:string):string { return headers.get(name)?.trim()??""; }

export async function mapVerifiedCommercialWebhook(
  raw:string,headers:Headers,verifyPayload:(timestamp:string,raw:string,signature:string)=>Promise<string|null>,
):Promise<CommercialRpcArgs> {
  let body:JsonObject;
  try { body=object(JSON.parse(raw)); } catch { throw new Error("malformed_json"); }
  const data=object(body.data),order=object(body.order),transaction=object(body.transaction),contact=object(body.contact);
  const provider=exactAlias("provider",[body.provider,data.provider],(value)=>value.toLowerCase())||"ghl";
  if (provider!=="ghl") throw new Error("unknown_provider");
  const eventId=exactAlias("event_id",[header(headers,"X-Webhook-Event-Id"),body.eventId,body.event_id,data.eventId,data.event_id]);
  const eventType=exactAlias("event_type",[body.eventType,body.event_type,data.eventType,data.event_type],(value)=>value.toLowerCase());
  if (!PURCHASE_TYPES.has(eventType)&&!LIFECYCLE_TYPES.has(eventType)) throw new Error(eventType?"unknown_event_type":"missing_event_type");
  const orderId=exactAlias("order_id",[body.orderId,body.order_id,body.subscriptionId,body.subscription_id,
    data.orderId,data.order_id,data.subscriptionId,data.subscription_id,order.id]);
  const transactionId=exactAlias("transaction_id",[body.transactionId,body.transaction_id,body.chargeId,body.charge_id,
    data.transactionId,data.transaction_id,data.chargeId,data.charge_id,transaction.id,order.transactionId,order.transaction_id]);
  const parentOrderId=exactAlias("parent_order_id",[body.parentOrderId,body.parent_order_id,body.originalOrderId,body.original_order_id,
    body.parentSubscriptionId,body.parent_subscription_id,body.originalSubscriptionId,body.original_subscription_id,
    data.parentOrderId,data.parent_order_id,data.parentSubscriptionId,data.parent_subscription_id,
    transaction.parentOrderId,transaction.parent_order_id]);
  const parentTransactionId=exactAlias("parent_transaction_id",[body.parentTransactionId,body.parent_transaction_id,
    body.originalTransactionId,body.original_transaction_id,body.parentChargeId,body.parent_charge_id,
    data.parentTransactionId,data.parent_transaction_id,transaction.parentTransactionId,transaction.parent_transaction_id]);
  const email=exactAlias("email",[body.email,data.email,contact.email],(value)=>value.toLowerCase());
  const productId=exactAlias("product_id",[body.productId,body.product_id,data.productId,data.product_id,order.productId,order.product_id]);
  const priceId=exactAlias("price_id",[body.priceId,body.price_id,data.priceId,data.price_id,order.priceId,order.price_id]);
  const effectiveAt=dateAlias("effective_at",[body.occurredAt,body.occurred_at,body.effectiveAt,body.effective_at,
    data.occurredAt,data.occurred_at,data.effectiveAt,data.effective_at],true)!;
  const accessExpiresAt=dateAlias("access_expires_at",[body.accessExpiresAt,body.access_expires_at,body.periodEnd,body.period_end,
    data.accessExpiresAt,data.access_expires_at,data.periodEnd,data.period_end]);
  if (!eventId||!email.includes("@")||!productId||!priceId) throw new Error("missing_required_identity");
  if (PURCHASE_TYPES.has(eventType) && (!orderId||!transactionId)) throw new Error("missing_purchase_identity");
  if (LIFECYCLE_TYPES.has(eventType) && (!parentOrderId||!parentTransactionId)) throw new Error("missing_parent_purchase_identity");
  const timestamp=header(headers,"X-Webhook-Timestamp"),signature=header(headers,"X-Webhook-Signature");
  if (!/^\d{10}$/.test(timestamp)||!signature) throw new Error("missing_signature_evidence");
  const payloadHash=await verifyPayload(timestamp,raw,signature);
  if (!payloadHash) throw new Error("invalid_signature");
  return {
    p_provider:provider,p_event_id:eventId,
    p_order_id:PURCHASE_TYPES.has(eventType)?orderId:null,
    p_transaction_id:PURCHASE_TYPES.has(eventType)?transactionId:null,
    p_parent_order_id:LIFECYCLE_TYPES.has(eventType)?parentOrderId:null,
    p_parent_transaction_id:LIFECYCLE_TYPES.has(eventType)?parentTransactionId:null,
    p_email:email,p_event_type:eventType,p_product_id:productId,p_price_id:priceId,
    p_payload_sha256:payloadHash,p_signature_sha256:await sha256Hex(signature),
    p_effective_at:effectiveAt,p_access_expires_at:accessExpiresAt,
  };
}

export async function processCommercialWebhook(raw:string,headers:Headers,deps:CommercialDependencies) {
  const args=await mapVerifiedCommercialWebhook(raw,headers,deps.verifyPayload);
  return { args,result:await deps.rpc(args) };
}
