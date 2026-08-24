import {
  createAssignedLearningPlaybackHandler,
  isClosedAssignedLearningPlaybackResponse,
  type AssignedLearningAuthorizationInput,
} from "./assignedLearningPlayback.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const ids = {
  user: "11111111-1111-4111-8111-111111111111",
  cycle: "22222222-2222-4222-8222-222222222222",
  item: "33333333-3333-4333-8333-333333333333",
  request: "44444444-4444-4444-8444-444444444444",
  receipt1: "55555555-5555-4555-8555-555555555555",
  receipt2: "66666666-6666-4666-8666-666666666666",
};
const hash1 = "a".repeat(64);
const hash2 = "b".repeat(64);
const locator = "id:AbCdEfGhIjKlMnOpQrStUvWxYz_12345";
const validPlaybackUrl = "https://dl.dropboxusercontent.com/apitl/1/AABBCC?rlkey=synthetic";
const request = (body: unknown, origin = "https://app.example.test") =>
  new Request("https://edge.test", {
    method: "POST",
    headers: {
      Origin: origin,
      Authorization: "Bearer verified-session",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
const validBody = {
  cycleId: ids.cycle,
  assignmentItemId: ids.item,
  requestId: ids.request,
};
const allowed = (overrides: Record<string, unknown> = {}) => ({
  decision: "allowed",
  reason: "authorized",
  replayed: false,
  authorization_receipt_id: ids.receipt1,
  authority_sha256: hash1,
  evaluation_sequence: 1,
  assignment_item_id: ids.item,
  title: "Synthetic Offer Lesson",
  provider: "dropbox",
  private_locator: locator,
  ...overrides,
});
const denied = (overrides: Record<string, unknown> = {}) => ({
  decision: "denied",
  reason: "inaccessible",
  replayed: false,
  authorization_receipt_id: ids.receipt1,
  authority_sha256: hash1,
  evaluation_sequence: 1,
  ...overrides,
});

function dependencies(authorize: () => Promise<unknown>) {
  return {
    allowedOrigins: new Set(["https://app.example.test"]),
    now: () => new Date("2026-08-23T12:00:00.000Z"),
    authenticate: () => Promise.resolve({ userId: ids.user }),
    authorize,
    mintDropboxLink: () => Promise.resolve(validPlaybackUrl),
  };
}

Deno.test("verified identity is fenced by the same exact receipt after Dropbox mint", async () => {
  const authorityInputs: AssignedLearningAuthorizationInput[] = [];
  let dropboxCalls = 0;
  const handler = createAssignedLearningPlaybackHandler({
    ...dependencies(() => Promise.resolve(allowed())),
    authorize: (input) => {
      authorityInputs.push(input);
      return Promise.resolve(allowed({ replayed: authorityInputs.length === 2 }));
    },
    mintDropboxLink: (value) => {
      assert(value === locator, "validated locator changed before Dropbox");
      dropboxCalls += 1;
      return Promise.resolve(validPlaybackUrl);
    },
  });
  const response = await handler(request(validBody));
  assert(response.status === 200, "valid fenced request failed");
  assert(authorityInputs.length === 2, "authorization was not evaluated before and after mint");
  for (const input of authorityInputs) {
    assert(input.userId === ids.user, "verified identity did not win");
    assert(input.cycleId === ids.cycle && input.assignmentItemId === ids.item && input.requestId === ids.request,
      "authority fence changed the bound request");
  }
  assert(dropboxCalls === 1, "Dropbox was not called exactly once");
  const body = await response.json();
  assert(Object.keys(body).sort().join(",") === "assignmentItemId,expiresAt,playbackUrl,provider,title",
    "response schema is not closed");
  const serialized = JSON.stringify(body);
  for (const privateValue of [locator, ids.receipt1, hash1, "private_locator", "authority_sha256"]) {
    assert(!serialized.includes(privateValue), `browser response leaked ${privateValue}`);
  }
});

Deno.test("origin, body shape, exact denial, and exact conflict fail before Dropbox", async () => {
  const calls = { auth: 0, rpc: 0, dropbox: 0 };
  let producer: unknown = denied();
  const handler = createAssignedLearningPlaybackHandler({
    ...dependencies(() => Promise.resolve(producer)),
    authenticate: () => {
      calls.auth += 1;
      return Promise.resolve({ userId: ids.user });
    },
    authorize: () => {
      calls.rpc += 1;
      return Promise.resolve(producer);
    },
    mintDropboxLink: () => {
      calls.dropbox += 1;
      return Promise.resolve(validPlaybackUrl);
    },
  });
  assert((await handler(request(validBody, "https://evil.example"))).status === 404,
    "cross-origin request was not hidden");
  assert(calls.auth === 0 && calls.rpc === 0 && calls.dropbox === 0,
    "cross-origin request caused a side effect");
  assert((await handler(request({ ...validBody, userId: ids.user }))).status === 404,
    "unknown body field accepted");
  assert(calls.auth === 0 && calls.rpc === 0 && calls.dropbox === 0,
    "malformed request caused a side effect");
  assert((await handler(request(validBody))).status === 404, "RPC denial was distinguishable");
  assert(Number(calls.rpc) === 1 && Number(calls.dropbox) === 0, "denial reached Dropbox");
  producer = { decision: "conflict", reason: "request_conflict" };
  const conflict = await handler(request(validBody));
  assert(conflict.status === 409 && await conflict.text() === '{"error":"Conflict"}',
    "exact request conflict did not fail closed safely");
  assert(calls.dropbox === 0, "conflict reached Dropbox");
});

Deno.test("real RPC producer path rejects open, missing, mistyped, and opposite-state fields", async () => {
  const malformed: unknown[] = [
    allowed({ unknownProducerField: "PRIVATE" }),
    (() => {
      const value: Record<string, unknown> = allowed();
      delete value.authority_sha256;
      return value;
    })(),
    allowed({ authorization_receipt_id: "not-a-uuid" }),
    allowed({ authority_sha256: null }),
    allowed({ authority_sha256: "A".repeat(64) }),
    allowed({ evaluation_sequence: 0 }),
    allowed({ decision: "denied" }),
    allowed({ reason: "inaccessible" }),
    allowed({ provider: "youtube" }),
    allowed({ private_locator: null }),
    allowed({ title: "https://private.example/title" }),
    denied({ private_locator: locator }),
    denied({ decision: "allowed" }),
    denied({ reason: "authorized" }),
    denied({ reason: { toString: () => "inaccessible" } }),
    { decision: "conflict", reason: "request_conflict", authorization_receipt_id: ids.receipt1 },
    { decision: "conflict", reason: "inaccessible" },
    { decision: "denied", reason: "inaccessible" },
    null,
  ];
  for (const producer of malformed) {
    let dropboxCalls = 0;
    const handler = createAssignedLearningPlaybackHandler({
      ...dependencies(() => Promise.resolve(producer)),
      mintDropboxLink: () => {
        dropboxCalls += 1;
        return Promise.resolve(validPlaybackUrl);
      },
    });
    const response = await handler(request(validBody));
    assert(response.status === 503, `malformed producer was accepted: ${JSON.stringify(producer)}`);
    assert(dropboxCalls === 0, "malformed producer reached Dropbox");
    const serialized = await response.text();
    for (const privateValue of [locator, ids.receipt1, hash1, "PRIVATE"]) {
      assert(!serialized.includes(privateValue), `malformed producer leaked ${privateValue}`);
    }
  }
});

Deno.test("post-mint fence rejects revocation, authority rotation, transition, and outage", async () => {
  const cases: Array<[string, (call: number) => unknown | Promise<unknown>]> = [
    ["revocation", (call) => call === 1 ? allowed() : denied({
      reason: "resource_not_ready", authorization_receipt_id: ids.receipt2,
      authority_sha256: hash2, evaluation_sequence: 2,
    })],
    ["authority hash rotation", (call) => call === 1 ? allowed() : allowed({
      replayed: false, authorization_receipt_id: ids.receipt2,
      authority_sha256: hash2, evaluation_sequence: 2,
    })],
    ["denial to allow transition", (call) => call === 1 ? allowed() : allowed({
      replayed: false, authorization_receipt_id: ids.receipt2,
      authority_sha256: hash1, evaluation_sequence: 3,
    })],
    ["second call outage", (call) => call === 1 ? allowed() : Promise.reject(new Error("synthetic outage"))],
  ];
  for (const [label, producer] of cases) {
    let authorityCalls = 0;
    const handler = createAssignedLearningPlaybackHandler({
      ...dependencies(() => Promise.resolve(null)),
      authorize: () => Promise.resolve(producer(++authorityCalls)),
    });
    const response = await handler(request(validBody));
    assert(response.status !== 200, `${label} returned playback`);
    assert(authorityCalls === 2, `${label} did not execute the post-mint fence`);
    const serialized = await response.text();
    for (const privateValue of [validPlaybackUrl, locator, ids.receipt1, ids.receipt2, hash1, hash2]) {
      assert(!serialized.includes(privateValue), `${label} leaked ${privateValue}`);
    }
  }
});

Deno.test("strict Dropbox locator grammar blocks URL, traversal, controls, and ambiguity before mint", async () => {
  const invalidLocators = [
    "https://dropbox.com/file",
    "/private/file.mp4",
    "../private/file.mp4",
    "id:../../private",
    "id:short",
    "id:AbCdEfGhIjKlMnOp /ambiguous",
    " id:AbCdEfGhIjKlMnOpQrSt ",
    "id:AbCdEfGhIjKlMnOp\nQrSt",
    "file:id:AbCdEfGhIjKlMnOpQrSt",
  ];
  for (const private_locator of invalidLocators) {
    let dropboxCalls = 0;
    const handler = createAssignedLearningPlaybackHandler({
      ...dependencies(() => Promise.resolve(allowed({ private_locator }))),
      mintDropboxLink: () => {
        dropboxCalls += 1;
        return Promise.resolve(validPlaybackUrl);
      },
    });
    const response = await handler(request(validBody));
    assert(response.status === 503, `invalid locator reached playback: ${JSON.stringify(private_locator)}`);
    assert(dropboxCalls === 0, `invalid locator reached Dropbox: ${JSON.stringify(private_locator)}`);
  }
});

Deno.test("minted playback URL requires exact HTTPS Dropbox content host and safe URL shape", async () => {
  const invalidUrls = [
    "https://evil.example/file",
    "https://dl.dropboxusercontent.com.evil.example/file",
    "https://dropboxusercontent.com/file",
    "https://user:pass@dl.dropboxusercontent.com/file",
    "https://dl.dropboxusercontent.com:444/file",
    "http://dl.dropboxusercontent.com/file",
    "https://dl.dropboxusercontent.com/file#fragment",
    " https://dl.dropboxusercontent.com/file",
    "not-a-url",
    `https://dl.dropboxusercontent.com/${"a".repeat(2_100)}`,
  ];
  for (const playbackUrl of invalidUrls) {
    let authorityCalls = 0;
    const handler = createAssignedLearningPlaybackHandler({
      ...dependencies(() => Promise.resolve(allowed())),
      authorize: () => {
        authorityCalls += 1;
        return Promise.resolve(allowed({ replayed: authorityCalls === 2 }));
      },
      mintDropboxLink: () => Promise.resolve(playbackUrl),
    });
    const response = await handler(request(validBody));
    assert(response.status === 503, `invalid playback URL accepted: ${JSON.stringify(playbackUrl.slice(0, 100))}`);
    assert(authorityCalls === 1, "invalid playback URL reached post-mint authority fence");
    assert(!(await response.text()).includes(playbackUrl), "invalid playback URL leaked in error");
  }
  let calls = 0;
  const validHandler = createAssignedLearningPlaybackHandler({
    ...dependencies(() => Promise.resolve(allowed())),
    authorize: () => Promise.resolve(allowed({ replayed: ++calls === 2 })),
  });
  assert((await validHandler(request(validBody))).status === 200, "valid Dropbox content host was rejected");
});

Deno.test("closed browser response mutation rejects unknown and private fields", () => {
  const valid = {
    assignmentItemId: ids.item,
    title: "Synthetic Lesson",
    provider: "private_media",
    playbackUrl: validPlaybackUrl,
    expiresAt: "2026-08-24T12:00:00.000Z",
  };
  assert(isClosedAssignedLearningPlaybackResponse(valid), "valid response rejected");
  assert(!isClosedAssignedLearningPlaybackResponse({ ...valid, private_locator: locator }),
    "private field mutation passed governing closed-schema assertion");
  assert(!isClosedAssignedLearningPlaybackResponse({ ...valid, unknownProducerField: "PRIVATE" }),
    "unknown field mutation passed governing closed-schema assertion");
});
