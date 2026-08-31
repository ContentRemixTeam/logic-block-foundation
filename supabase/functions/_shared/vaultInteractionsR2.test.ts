import { assert, assertEquals } from "@std/assert";
import { allowedOrigins, createInteractionsHandler, GENERIC_ERROR, validResourceId } from "./vaultInteractionsR2.ts";

const origin = "https://app.faithmariah.com";
type Call = { name: string; args: Record<string, unknown> };
function fixture(auth = true) {
  const calls: Call[] = [];
  const logs: unknown[] = [];
  return {
    calls,
    logs,
    handler: createInteractionsHandler({
      authenticate: () => Promise.resolve(auth ? { id: "11111111-1111-4111-8111-111111111111", email: "member@example.com" } : null),
      rpc: (name, args) => { calls.push({ name, args }); return Promise.resolve({ data: { ok: true } }); },
      log: (...values) => { logs.push(values); },
    }, origin),
  };
}
const req = (body: unknown, headers: Record<string, string> = {}) => new Request("https://edge.test", {
  method: "POST",
  headers: { origin, authorization: "Bearer token", "content-type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

Deno.test("exact origin preflight and disallowed or missing origin fail closed", async () => {
  const f = fixture();
  let response = await f.handler(new Request("https://edge.test", { method: "OPTIONS", headers: { origin } }));
  assertEquals(response.status, 204);
  assertEquals(response.headers.get("access-control-allow-origin"), origin);
  response = await f.handler(new Request("https://edge.test", { method: "OPTIONS", headers: { origin: "https://evil.test" } }));
  assertEquals(response.status, 403);
  assertEquals(response.headers.get("access-control-allow-origin"), null);
  response = await f.handler(new Request("https://edge.test", { method: "POST" }));
  assertEquals(response.status, 403);
});

Deno.test("default allowlist accepts the plan production origin for preflight and saved actions", async () => {
  const productionOrigin = "https://plan.faithmariah.com";
  assert(allowedOrigins("").has(productionOrigin));
  const calls: Call[] = [];
  const handler = createInteractionsHandler({
    authenticate: () => Promise.resolve({ id: "11111111-1111-4111-8111-111111111111", email: "member@example.com" }),
    rpc: (name, args) => { calls.push({ name, args }); return Promise.resolve({ data: { ok: true } }); },
    log: () => undefined,
  }, "");
  let response = await handler(new Request("https://edge.test", {
    method: "OPTIONS",
    headers: { origin: productionOrigin },
  }));
  assertEquals(response.status, 204);
  assertEquals(response.headers.get("access-control-allow-origin"), productionOrigin);
  response = await handler(new Request("https://edge.test", {
    method: "POST",
    headers: { origin: productionOrigin, authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify({ action: "set_bookmark", resourceId: "replay:r2", targetKind: "replay", saved: true }),
  }));
  assertEquals(response.status, 200);
  assertEquals(calls.at(-1)?.name, "replay_vault_set_bookmark");
});

Deno.test("auth, caller authority, malformed and bounded chunked bodies are generic", async () => {
  let f = fixture(false);
  let response = await f.handler(req({ action: "get_interaction" }));
  assertEquals(response.status, 401);
  assertEquals(await response.json(), GENERIC_ERROR);
  f = fixture();
  response = await f.handler(req({ action: "get_interaction", userId: "forged" }));
  assertEquals(response.status, 400);
  response = await f.handler(req("{PRIVATE_SENTINEL"));
  assertEquals(response.status, 400);
  assert(!JSON.stringify(f.logs).includes("PRIVATE_SENTINEL"));
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(9000))); controller.close(); } });
  response = await f.handler(new Request("https://edge.test", { method: "POST", headers: { origin, authorization: "Bearer token" }, body: stream }));
  assertEquals(response.status, 413);
});

Deno.test("canonical 220-character producer resource journey and unsafe negatives", async () => {
  const f = fixture();
  const targetId = "22222222-2222-4222-8222-222222222222";
  const maxId = "A" + "._~:-az09".repeat(30).slice(0, 219);
  assertEquals(maxId.length, 220);
  for (const safe of ["replay-1", "replay:r2", `membershipio:${"a".repeat(64)}`, maxId]) assert(validResourceId(safe), safe);
  for (const unsafe of ["../replay", "replay/1", " replay-1", "replay-1?x=1", "A".repeat(221)]) {
    assert(!validResourceId(unsafe), unsafe);
    const rejected = await f.handler(req({ action: "begin_session", resourceId: unsafe, targetKind: "moment", targetId }));
    assertEquals(rejected.status, 400, unsafe);
  }
  for (const resourceId of [maxId, "replay:r2"]) {
    const response = await f.handler(req({ action: "begin_session", resourceId, targetKind: "moment", targetId }));
    assertEquals(response.status, 200, resourceId);
  }
  assertEquals(f.calls.length, 2);
  assertEquals(f.calls[0].name, "replay_vault_begin_session");
  assertEquals(f.calls[0].args.p_portal_resource_id, maxId);
});

Deno.test("every action has an exact root allowlist and rejects private locator shapes before RPC", async () => {
  const id = "22222222-2222-4222-8222-222222222222";
  const legitimate = { action: "set_bookmark", resourceId: "replay:r2", targetKind: "moment", targetId: id, saved: true };
  const attacks = [
    { dropboxPath: "/private/replay.mp4" },
    { providerLocator: "dbid:private" },
    { metadata: { providerLocator: "nested-private" } },
    { metadata: { layer: { playbackUrl: "https://private.example/video" } } },
    { permanentUrl: "https://private.example/permanent" },
    { sourceLocator: "private/source" },
    { transcriptVersionId: id },
    { mediaAttemptId: id },
    { playbackAttemptId: id },
    { unexpected: true },
  ];
  for (const attack of attacks) {
    const f = fixture();
    const response = await f.handler(req({ ...legitimate, ...attack }));
    assertEquals(response.status, 400, JSON.stringify(attack));
    assertEquals(f.calls.length, 0, JSON.stringify(attack));
  }
  const actions = [
    { action: "get_interaction", resourceId: "replay:r2", targetKind: "moment", targetId: id },
    legitimate,
    { action: "delete_bookmark", bookmarkId: id },
    { action: "begin_session", resourceId: "replay:r2", targetKind: "moment", targetId: id },
    { action: "media_event", sessionId: id, eventId: "33333333-3333-4333-8333-333333333333", sequence: 0, eventType: "pause", positionMs: 0, clientDurationMs: null },
    { action: "create_note", resourceId: "replay:r2", targetKind: "moment", targetId: id, requestId: "33333333-3333-4333-8333-333333333333", positionMs: 0 },
  ];
  const f = fixture();
  for (const body of actions) assertEquals((await f.handler(req(body))).status, 200, String(body.action));
  assertEquals(f.calls.length, actions.length);
});

Deno.test("fixed log taxonomy excludes request payload and generic envelope", async () => {
  const logs: unknown[] = [];
  const handler = createInteractionsHandler({
    authenticate: () => Promise.resolve({ id: "11111111-1111-4111-8111-111111111111", email: "x@y.com" }),
    rpc: () => Promise.resolve({ data: null, error: { code: "42501" } }),
    log: (...values) => { logs.push(values); },
  }, origin);
  const id = "22222222-2222-4222-8222-222222222222";
  const response = await handler(req({ action: "get_interaction", resourceId: "private-sentinel", targetKind: "moment", targetId: id }));
  assertEquals(response.status, 403);
  assertEquals(await response.json(), GENERIC_ERROR);
  assert(!JSON.stringify(logs).includes("private-sentinel"));
  assert(JSON.stringify(logs).includes("rpc_rejected"));
});

Deno.test("full replay bookmark uses canonical resource target without caller timestamp or scopes", async () => {
  const f = fixture();
  const resourceId = `membershipio:${"a".repeat(64)}`;
  const response = await f.handler(req({ action: "set_bookmark", resourceId, targetKind: "replay", saved: true }));
  assertEquals(response.status, 200);
  assertEquals(f.calls.at(-1)?.name, "replay_vault_set_bookmark");
  assertEquals(f.calls.at(-1)?.args.p_target_kind, "replay");
  assertEquals(f.calls.at(-1)?.args.p_target_id, null);
  for (const forged of [{ scopes: ["replay_vault"] }, { timestamp: "2020-01-01" }]) {
    const denied = await f.handler(req({ action: "set_bookmark", resourceId, targetKind: "replay", saved: true, ...forged }));
    assertEquals(denied.status, 400);
  }
});
