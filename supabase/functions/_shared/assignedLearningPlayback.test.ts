import { createAssignedLearningPlaybackHandler, isClosedAssignedLearningPlaybackResponse } from "./assignedLearningPlayback.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const ids = {
  user: "11111111-1111-4111-8111-111111111111",
  cycle: "22222222-2222-4222-8222-222222222222",
  item: "33333333-3333-4333-8333-333333333333",
  request: "44444444-4444-4444-8444-444444444444",
};
const request = (body: unknown, origin = "https://app.example.test") => new Request("https://edge.test", {
  method: "POST",
  headers: { Origin: origin, Authorization: "Bearer verified-session", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const validBody = { cycleId: ids.cycle, assignmentItemId: ids.item, requestId: ids.request };

Deno.test("verified JWT identity is the only identity passed to the service RPC", async () => {
  const observed: { authorityInput: Record<string, string> | null; dropboxCalls: number } = {
    authorityInput: null, dropboxCalls: 0,
  };
  const handler = createAssignedLearningPlaybackHandler({
    allowedOrigins: new Set(["https://app.example.test"]),
    now: () => new Date("2026-08-23T12:00:00.000Z"),
    authenticate: () => Promise.resolve({ userId: ids.user }),
    authorize: (input) => {
      observed.authorityInput = input;
      return Promise.resolve({ decision: "allowed" as const, reason: "authorized", assignment_item_id: ids.item,
        title: "Synthetic Offer Lesson", provider: "dropbox", private_locator: "/private/synthetic.mp4" });
    },
    mintDropboxLink: () => { observed.dropboxCalls += 1; return Promise.resolve("https://content.dropboxapi.com/synthetic-temporary"); },
  });
  const response = await handler(request(validBody));
  assert(response.status === 200, "valid request failed");
  assert(observed.authorityInput?.userId === ids.user, "verified identity did not win");
  assert(observed.dropboxCalls === 1, "Dropbox was not called exactly once");
  const body = await response.json();
  assert(Object.keys(body).sort().join(",") === "assignmentItemId,expiresAt,playbackUrl,provider,title", "response schema is not closed");
  const serialized = JSON.stringify(body);
  assert(!serialized.includes("private_locator") && !serialized.includes("/private/synthetic"), "locator leaked");
});

Deno.test("origin, body shape, and RPC denial fail before Dropbox", async () => {
  const calls: { auth: number; rpc: number; dropbox: number } = { auth: 0, rpc: 0, dropbox: 0 };
  const handler = createAssignedLearningPlaybackHandler({
    allowedOrigins: new Set(["https://app.example.test"]), now: () => new Date(),
    authenticate: () => { calls.auth += 1; return Promise.resolve({ userId: ids.user }); },
    authorize: () => { calls.rpc += 1; return Promise.resolve({ decision: "denied" as const, reason: "inaccessible" }); },
    mintDropboxLink: () => { calls.dropbox += 1; return Promise.resolve(null); },
  });
  assert((await handler(request(validBody, "https://evil.example"))).status === 404, "cross-origin request was not hidden");
  assert(calls.auth === 0 && calls.rpc === 0 && calls.dropbox === 0, "cross-origin request caused a side effect");
  assert((await handler(request({ ...validBody, userId: ids.user }))).status === 404, "unknown body field accepted");
  assert(calls.auth === 0 && calls.rpc === 0 && calls.dropbox === 0, "malformed request caused a side effect");
  assert((await handler(request(validBody))).status === 404, "RPC denial was distinguishable");
  assert(Number(calls.rpc) === 1 && Number(calls.dropbox) === 0, "denial reached Dropbox");
});

Deno.test("provider outage is honest and provider allowlist blocks forbidden transport", async () => {
  for (const provider of ["dropbox", "youtube"]) {
    let dropboxCalls = 0;
    const handler = createAssignedLearningPlaybackHandler({
      allowedOrigins: new Set(["https://app.example.test"]), now: () => new Date(),
      authenticate: () => Promise.resolve({ userId: ids.user }),
      authorize: () => Promise.resolve({ decision: "allowed" as const, reason: "authorized", assignment_item_id: ids.item,
        title: "Synthetic Lesson", provider, private_locator: "/private/synthetic.mp4" }),
      mintDropboxLink: () => { dropboxCalls += 1; return Promise.resolve(null); },
    });
    const response = await handler(request(validBody));
    assert(response.status === 503, `${provider} failure did not return honest unavailable state`);
    const text = await response.text();
    assert(!text.includes("synthetic.mp4") && !text.includes("token"), "provider failure leaked authority");
    assert(dropboxCalls === (provider === "dropbox" ? 1 : 0), "provider allowlist touched a forbidden transport");
  }
});

Deno.test("closed response mutation rejects unknown and private producer fields", () => {
  const valid = { assignmentItemId: ids.item, title: "Synthetic Lesson", provider: "private_media",
    playbackUrl: "https://content.dropboxapi.com/synthetic", expiresAt: "2026-08-24T12:00:00.000Z" };
  assert(isClosedAssignedLearningPlaybackResponse(valid), "valid response rejected");
  assert(!isClosedAssignedLearningPlaybackResponse({ ...valid, private_locator: "/PRIVATE-LOCATOR" }),
    "private field mutation passed governing closed-schema assertion");
  assert(!isClosedAssignedLearningPlaybackResponse({ ...valid, unknownProducerField: "PRIVATE" }),
    "unknown field mutation passed governing closed-schema assertion");
});
