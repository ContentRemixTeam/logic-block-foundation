import { inaccessible, isAllowedOrigin, readBoundedJson } from "./replayVaultAccess.ts";
import { mapPlaybackResponse, mapSearchRow } from "./replayVaultProducer.mjs";
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
Deno.test("bounded JSON cancels an undeclared streamed body as soon as actual bytes exceed 16 KiB",async()=>{
  let pulls=0,cancelled=false;
  const stream=new ReadableStream<Uint8Array>({
    pull(controller) { pulls++; controller.enqueue(new Uint8Array(4096).fill(120)); if (pulls===20) controller.close(); },
    cancel() { cancelled=true; },
  });
  const req=new Request("https://edge.test",{method:"POST",body:stream});
  assert(req.headers.get("Content-Length")===null,"stream unexpectedly declared a length");
  let message="";
  try { await readBoundedJson(req); } catch (error) { message=error instanceof Error?error.message:""; }
  assert(message==="request_too_large","streamed oversized body was not rejected by byte limit");
  assert(cancelled,"oversized stream reader was not cancelled");
  assert(pulls<20,"reader consumed the complete oversized stream");
});
Deno.test("search endpoint mapper sanitizes and caps every free-text response field",()=>{
  const mapped=mapSearchRow({
    portal_resource_id:"replay-1",moment_id:"11111111-1111-4111-8111-111111111111",question_id:null,
    title:"https://private.example/title\u0000",product_title:"/Users/faithhawks/product/private.txt",
    category_title:"C:\\Secrets\\category.txt",resource_type:"dropbox_path:/vault/private.mp4",
    snippet:"pricing file:///private/tmp/raw.txt revex-membership-production/source\u0007 "+"s".repeat(400),
    starts_at_seconds:10,ends_at_seconds:20,reason:"matched https://private.example/reason",
    duration_seconds:3600,
  });
  const serialized=JSON.stringify(mapped);
  for (const sentinel of ["private.example","/Users/","C:\\\\Secrets","dropbox_path","/vault/private","file://","revex-membership-production","\\u0000","\\u0007"])
    assert(!serialized.includes(sentinel),`mapper leaked sentinel ${sentinel}`);
  assert(mapped.title.length<=160,"title cap failed");
  assert(mapped.productTitle.length<=120,"product cap failed");
  assert(mapped.category.length<=120,"category cap failed");
  assert(mapped.sourceType.length<=64,"sourceType cap failed");
  assert(mapped.snippet.length<=320,"snippet cap failed");
  assert(mapped.reason.length<=120,"reason cap failed");
  assert(mapped.startSeconds===10&&mapped.endSeconds===20,"UX timing names changed");

  const labeledSentinels=["local:/Users/faithhawks/private","path:/private/tmp/raw.txt","source:C:\\Secrets\\raw.txt","dropbox_path:/vault/raw.mp4","https://private.example/raw","control\u0001char"];
  for (const sentinel of labeledSentinels) {
    const search=mapSearchRow({ portal_resource_id:"replay-1",moment_id:"11111111-1111-4111-8111-111111111111",question_id:null,
      title:sentinel,product_title:sentinel,category_title:sentinel,resource_type:sentinel,snippet:sentinel,reason:sentinel,
      starts_at_seconds:1,ends_at_seconds:2,duration_seconds:3 });
    const playback=mapPlaybackResponse({ portal_resource_id:"replay-1",title:sentinel,access_scope:"vault",
      authoritative_start_seconds:1,authoritative_end_seconds:2,moment_id:"11111111-1111-4111-8111-111111111111",question_id:null },
      "https://content.dropboxapi.com/temporary-authorized-link","2026-08-09T13:00:00.000Z");
    const searchText=JSON.stringify(search), playbackText=JSON.stringify(playback);
    assert(!searchText.includes(sentinel),`search mapper leaked complete sentinel ${sentinel}`);
    assert(!playback.title.includes(sentinel),`playback title leaked complete sentinel ${sentinel}`);
    assert(playback.playbackUrl==="https://content.dropboxapi.com/temporary-authorized-link","authorized temporary playback URL was altered");
  }
});
Deno.test("invalid signature cannot produce a persistent payload hash",async()=>{
  const secret="test-secret",timestamp="1786286400",raw='{"eventId":"immutable-event"}';
  const signature=await sign(secret,timestamp,raw);
  assert(await verifiedPayloadHash(secret,timestamp,raw,"00".repeat(32),1786286400)===null,"invalid signature yielded hash");
  assert(await verifiedPayloadHash(secret,timestamp,raw,signature,1786286400)===await sha256Hex(raw),"valid retry did not yield exact payload hash");
  assert(await verifiedPayloadHash(secret,timestamp,raw,signature,1786287001)===null,"stale signature accepted");
  assert(await sha256Hex(raw)!==await sha256Hex(raw+" "),"payload binding is not byte-exact");
});
