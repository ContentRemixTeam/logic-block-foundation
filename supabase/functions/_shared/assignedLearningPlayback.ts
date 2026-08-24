export const ASSIGNED_LEARNING_MAX_BODY_BYTES = 2_048;
export const ASSIGNED_LEARNING_TTL_SECONDS = 4 * 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESPONSE_KEYS = new Set([
  "assignmentItemId", "title", "provider", "playbackUrl", "expiresAt",
]);

export interface AssignedLearningPlaybackRequest {
  cycleId: string;
  assignmentItemId: string;
  requestId: string;
}

export interface AssignedLearningPlaybackRow {
  decision: "allowed" | "denied";
  reason: string;
  assignment_item_id?: string;
  title?: string;
  provider?: string;
  private_locator?: string;
}

export interface AssignedLearningDependencies {
  allowedOrigins: Set<string>;
  now: () => Date;
  authenticate: (authorization: string) => Promise<{ userId: string } | null>;
  authorize: (input: {
    userId: string;
    cycleId: string;
    assignmentItemId: string;
    requestId: string;
    asOf: string;
  }) => Promise<AssignedLearningPlaybackRow | null>;
  mintDropboxLink: (locator: string) => Promise<string | null>;
}

const baseHeaders = (origin: string | null, allowed: Set<string>): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  };
  if (origin && allowed.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, x-client-info, apikey, content-type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return headers;
};

const json = (request: Request, allowed: Set<string>, body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: baseHeaders(request.headers.get("Origin"), allowed),
  });

const inaccessible = (request: Request, allowed: Set<string>) =>
  json(request, allowed, { error: "Inaccessible" }, 404);

const unavailable = (request: Request, allowed: Set<string>) =>
  json(request, allowed, { error: "Playback is temporarily unavailable. Please try again." }, 503);

async function boundedBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > ASSIGNED_LEARNING_MAX_BODY_BYTES) {
    await request.body?.cancel("request_too_large").catch(() => undefined);
    throw new Error("invalid_request");
  }
  if (!request.body) throw new Error("invalid_request");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      length += value.byteLength;
      if (length > ASSIGNED_LEARNING_MAX_BODY_BYTES) {
        await reader.cancel("request_too_large").catch(() => undefined);
        throw new Error("invalid_request");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("invalid_request");
  }
}

function parseRequest(value: unknown): AssignedLearningPlaybackRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "assignmentItemId,cycleId,requestId") return null;
  if (![record.cycleId, record.assignmentItemId, record.requestId].every((item) =>
    typeof item === "string" && UUID.test(item)
  )) return null;
  return record as unknown as AssignedLearningPlaybackRequest;
}

function safeTitle(value: string): string | null {
  const title = value.trim();
  if (!title || title.length > 160 || [...title].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  })) return null;
  if (/(https?:\/\/|file:\/\/|dropbox[_ -]?path|private[_ -]?locator|\/users\/|\/private\/)/i.test(title)) return null;
  return title;
}

export function isClosedAssignedLearningPlaybackResponse(body: Record<string, unknown>): boolean {
  return Object.keys(body).every((key) => RESPONSE_KEYS.has(key)) &&
    Object.keys(body).length === RESPONSE_KEYS.size;
}

export function createAssignedLearningPlaybackHandler(deps: AssignedLearningDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    if (origin && !deps.allowedOrigins.has(origin)) return inaccessible(request, deps.allowedOrigins);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: baseHeaders(origin, deps.allowedOrigins) });
    }
    if (request.method !== "POST") return json(request, deps.allowedOrigins, { error: "Method not allowed" }, 405);

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json(request, deps.allowedOrigins, { error: "Unauthorized" }, 401);

    let body: AssignedLearningPlaybackRequest | null = null;
    try {
      body = parseRequest(await boundedBody(request));
    } catch {
      return inaccessible(request, deps.allowedOrigins);
    }
    if (!body) return inaccessible(request, deps.allowedOrigins);

    let identity: { userId: string } | null;
    try {
      identity = await deps.authenticate(authorization);
    } catch {
      return unavailable(request, deps.allowedOrigins);
    }
    if (!identity || !UUID.test(identity.userId)) return json(request, deps.allowedOrigins, { error: "Unauthorized" }, 401);

    let row: AssignedLearningPlaybackRow | null;
    try {
      row = await deps.authorize({
        userId: identity.userId,
        cycleId: body.cycleId,
        assignmentItemId: body.assignmentItemId,
        requestId: body.requestId,
        asOf: deps.now().toISOString(),
      });
    } catch {
      return unavailable(request, deps.allowedOrigins);
    }
    if (!row || row.decision !== "allowed" || row.assignment_item_id !== body.assignmentItemId) {
      return inaccessible(request, deps.allowedOrigins);
    }
    const title = typeof row.title === "string" ? safeTitle(row.title) : null;
    if (!title || row.provider !== "dropbox" || typeof row.private_locator !== "string" || !row.private_locator.trim()) {
      return unavailable(request, deps.allowedOrigins);
    }

    let playbackUrl: string | null;
    try {
      playbackUrl = await deps.mintDropboxLink(row.private_locator);
    } catch {
      playbackUrl = null;
    }
    if (!playbackUrl || !/^https:\/\/[^\s]+$/i.test(playbackUrl)) return unavailable(request, deps.allowedOrigins);

    const response = {
      assignmentItemId: row.assignment_item_id,
      title,
      provider: "private_media",
      playbackUrl,
      expiresAt: new Date(deps.now().getTime() + ASSIGNED_LEARNING_TTL_SECONDS * 1000).toISOString(),
    };
    if (!isClosedAssignedLearningPlaybackResponse(response)) return unavailable(request, deps.allowedOrigins);
    return json(request, deps.allowedOrigins, response, 200);
  };
}
