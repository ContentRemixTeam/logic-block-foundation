import { inaccessible, isAllowedOrigin, readBoundedJson } from "./replayVaultAccess.ts";
import { sha256Hex, verifiedPayloadHash } from "./replayVaultWebhook.ts";
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function sign(secret: string, timestamp: string, raw: string): Promise<string> {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${timestamp}.${raw}`)));
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("");
}
Deno.test("origin allowlist and inaccessible envelope are fail closed",async()=>{
  Deno.env.set("REPLAY_VAULT_ALLOWED_ORIGINS","https://app.example.com");
  assert(isAllowedOrigin(new Request("https://edge.test",{headers:{Origin:"https://app.example.com"}})),"allowed origin denied");
  const deniedReq=new Request("https://edge.test",{headers:{Origin:"https://evil.example"}});
  assert(!isAllowedOrigin(deniedReq),"unknown origin allowed");
  const response=inaccessible(deniedReq);
  assert(response.status===404,"inaccessible status differs");
  assert(await response.text()==='{"error":"Inaccessible"}',"inaccessible envelope differs");
});
Deno.test("bounded JSON rejects oversized bodies",async()=>{
  let rejected=false;
  try { await readBoundedJson(new Request("https://edge.test",{method:"POST",body:"x".repeat(16_385)})); } catch { rejected=true; }
  assert(rejected,"oversized body accepted");
});
Deno.test("invalid signature cannot produce a persistent payload hash",async()=>{
  const secret="test-secret",timestamp="1786286400",raw='{"eventId":"immutable-event"}';
  const signature=await sign(secret,timestamp,raw);
  assert(await verifiedPayloadHash(secret,timestamp,raw,"00".repeat(32),1786286400)===null,"invalid signature yielded hash");
  assert(await verifiedPayloadHash(secret,timestamp,raw,signature,1786286400)===await sha256Hex(raw),"valid retry did not yield exact payload hash");
  assert(await verifiedPayloadHash(secret,timestamp,raw,signature,1786287001)===null,"stale signature accepted");
  assert(await sha256Hex(raw)!==await sha256Hex(raw+" "),"payload binding is not byte-exact");
});
