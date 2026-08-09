// deno-lint-ignore no-import-prefix
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { processCommercialWebhook, type CommercialRpcArgs } from "./replayVaultCommercialWebhook.ts";

const headers=()=>new Headers({
  "X-Webhook-Event-Id":"evt-1","X-Webhook-Timestamp":"1786291200","X-Webhook-Signature":"sha256="+"a".repeat(64),
});
const purchase={provider:"ghl",eventType:"renewal",orderId:"sub-1",transactionId:"ch-1",email:"BUYER@EXAMPLE.COM",
  productId:"vault",priceId:"annual",occurredAt:"2026-08-09T16:00:00Z",accessExpiresAt:"2027-08-09T16:00:00Z"};
async function run(body:Record<string,unknown>,customHeaders=headers()) {
  let called:CommercialRpcArgs|null=null;
  const result=await processCommercialWebhook(JSON.stringify(body),customHeaders,{
    verifyPayload:()=>Promise.resolve("b".repeat(64)),rpc:(args)=>{called=args;return Promise.resolve({success:true,status:"applied"});},
  });
  return { result,called:called! };
}
Deno.test("purchase mapper sends separate delivery/order/charge identities to R7 RPC",async()=>{
  const {called}=await run(purchase);
  assertEquals(called.p_event_id,"evt-1"); assertEquals(called.p_order_id,"sub-1");
  assertEquals(called.p_transaction_id,"ch-1"); assertEquals(called.p_parent_transaction_id,null);
  assertEquals(called.p_email,"buyer@example.com"); assertEquals(called.p_event_type,"renewal");
  assertEquals(called.p_effective_at,"2026-08-09T16:00:00.000Z");
});
Deno.test("lifecycle mapper requires and sends exact parent purchase",async()=>{
  const {called}=await run({provider:"ghl",eventType:"refund",parentOrderId:"sub-1",parentTransactionId:"ch-1",
    email:"buyer@example.com",productId:"vault",priceId:"annual",occurredAt:"2026-09-01T00:00:00Z"});
  assertEquals(called.p_order_id,null); assertEquals(called.p_transaction_id,null);
  assertEquals(called.p_parent_order_id,"sub-1"); assertEquals(called.p_parent_transaction_id,"ch-1");
});
Deno.test("no grant default and unknown event types fail before RPC",async()=>{
  await assertRejects(()=>run({...purchase,eventType:undefined as unknown as string}),Error,"missing_event_type");
  await assertRejects(()=>run({...purchase,eventType:"sale-ish"}),Error,"unknown_event_type");
});
Deno.test("conflicting aliases fail closed",async()=>{
  await assertRejects(()=>run({...purchase,transaction_id:"other-charge"}),Error,"conflicting_alias:transaction_id");
  await assertRejects(()=>run({...purchase,data:{email:"other@example.com"}}),Error,"conflicting_alias:email");
});
Deno.test("malformed supplied dates are rejected rather than erased",async()=>{
  await assertRejects(()=>run({...purchase,accessExpiresAt:"not-a-date"}),Error,"malformed_date:access_expires_at");
  await assertRejects(()=>run({...purchase,occurredAt:"not-a-date"}),Error,"malformed_date:effective_at");
});
Deno.test("purchase and lifecycle stable IDs are mandatory",async()=>{
  await assertRejects(()=>run({...purchase,transactionId:""}),Error,"missing_purchase_identity");
  await assertRejects(()=>run({provider:"ghl",eventType:"refund",parentOrderId:"sub-1",email:"buyer@example.com",
    productId:"vault",priceId:"annual",occurredAt:"2026-09-01T00:00:00Z"}),Error,"missing_parent_purchase_identity");
});
Deno.test("signature failure prevents injected RPC call",async()=>{
  let calls=0;
  await assertRejects(()=>processCommercialWebhook(JSON.stringify(purchase),headers(),{
    verifyPayload:()=>Promise.resolve(null),rpc:()=>{calls++;return Promise.resolve({});},
  }),Error,"invalid_signature");
  assertEquals(calls,0);
});
