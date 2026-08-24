export const ASSIGNED_LEARNING_MAX_BODY_BYTES = 2_048;
export const ASSIGNED_LEARNING_TTL_SECONDS = 4 * 60 * 60;
export const ASSIGNED_LEARNING_MAX_PLAYBACK_URL_BYTES = 2_048;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const DROPBOX_LOCATOR = /^id:[A-Za-z0-9_-]{16,128}$/;
const DROPBOX_TEMPORARY_CONTENT_HOSTS = new Set(["dl.dropboxusercontent.com"]);
const RESPONSE_KEYS = new Set([
  "assignmentItemId",
  "title",
  "provider",
  "playbackUrl",
  "expiresAt",
]);
const ALLOWED_PRODUCER_KEYS = new Set([
  "decision",
  "reason",
  "replayed",
  "authorization_receipt_id",
  "authority_sha256",
  "evaluation_sequence",
  "assignment_item_id",
  "title",
  "provider",
  "private_locator",
]);
const DENIED_PRODUCER_KEYS = new Set([
  "decision",
  "reason",
  "replayed",
  "authorization_receipt_id",
  "authority_sha256",
  "evaluation_sequence",
]);
const CONFLICT_PRODUCER_KEYS = new Set(["decision", "reason"]);
const DENIED_REASONS = new Set([
  "inaccessible",
  "verification_unavailable",
  "review_required",
  "unconfirmed",
  "resource_not_ready",
  "stale_authority",
]);

export interface AssignedLearningPlaybackRequest {
  cycleId: string;
  assignmentItemId: string;
  requestId: string;
}

export interface AssignedLearningAuthorizationInput {
  userId: string;
  cycleId: string;
  assignmentItemId: string;
  requestId: string;
  asOf: string;
}

interface ReceiptProducer {
  replayed: boolean;
  authorization_receipt_id: string;
  authority_sha256: string;
  evaluation_sequence: number;
}

interface AllowedProducer extends ReceiptProducer {
  decision: "allowed";
  reason: "authorized";
  assignment_item_id: string;
  title: string;
  provider: "dropbox";
  private_locator: string;
}

interface DeniedProducer extends ReceiptProducer {
  decision: "denied";
  reason: string;
}

interface ConflictProducer {
  decision: "conflict";
  reason: "request_conflict";
}

type AuthorizationProducer = AllowedProducer | DeniedProducer | ConflictProducer;

export interface AssignedLearningDependencies {
  allowedOrigins: Set<string>;
  now: () => Date;
  authenticate: (authorization: string) => Promise<{ userId: string } | null>;
  authorize: (input: AssignedLearningAuthorizationInput) => Promise<unknown>;
  mintDropboxLink: (locator: string) => Promise<string | null>;
}

const exactKeys = (record: Record<string, unknown>, expected: Set<string>): boolean =>
  Object.keys(record).length === expected.size && Object.keys(record).every((key) => expected.has(key));

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

const conflict = (request: Request, allowed: Set<string>) =>
  json(request, allowed, { error: "Conflict" }, 409);

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

function safeTitle(value: unknown): string | null {
  if (typeof value !== "string" || value !== value.trim()) return null;
  if (!value || value.length > 160 || [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  })) return null;
  if (/(https?:\/\/|file:\/\/|dropbox[_ -]?path|private[_ -]?locator|\/users\/|\/private\/)/i.test(value)) return null;
  return value;
}

function validReceiptProducer(record: Record<string, unknown>): boolean {
  return typeof record.replayed === "boolean" &&
    typeof record.authorization_receipt_id === "string" && UUID.test(record.authorization_receipt_id) &&
    typeof record.authority_sha256 === "string" && SHA256.test(record.authority_sha256) &&
    typeof record.evaluation_sequence === "number" && Number.isSafeInteger(record.evaluation_sequence) &&
    record.evaluation_sequence > 0;
}

export function isValidDropboxLocator(value: unknown): value is string {
  return typeof value === "string" && DROPBOX_LOCATOR.test(value);
}

export function isValidDropboxPlaybackUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > ASSIGNED_LEARNING_MAX_PLAYBACK_URL_BYTES ||
    value !== value.trim() || [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "https:" && DROPBOX_TEMPORARY_CONTENT_HOSTS.has(parsed.hostname) &&
    parsed.username === "" && parsed.password === "" && parsed.port === "" && parsed.hash === "";
}

export function parseAssignedLearningAuthorizationProducer(value: unknown): AuthorizationProducer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.decision === "conflict") {
    return exactKeys(record, CONFLICT_PRODUCER_KEYS) && record.reason === "request_conflict"
      ? record as unknown as ConflictProducer
      : null;
  }
  if (record.decision === "denied") {
    return exactKeys(record, DENIED_PRODUCER_KEYS) && typeof record.reason === "string" &&
        DENIED_REASONS.has(record.reason) &&
        validReceiptProducer(record)
      ? record as unknown as DeniedProducer
      : null;
  }
  if (record.decision !== "allowed" || !exactKeys(record, ALLOWED_PRODUCER_KEYS) ||
    record.reason !== "authorized" || !validReceiptProducer(record) ||
    typeof record.assignment_item_id !== "string" || !UUID.test(record.assignment_item_id) ||
    record.provider !== "dropbox" || !isValidDropboxLocator(record.private_locator)) return null;
  const title = safeTitle(record.title);
  return title === null ? null : { ...record, title } as unknown as AllowedProducer;
}

function sameAllowedAuthority(first: AllowedProducer, second: AllowedProducer): boolean {
  return second.authorization_receipt_id === first.authorization_receipt_id &&
    second.authority_sha256 === first.authority_sha256 &&
    second.evaluation_sequence === first.evaluation_sequence &&
    second.assignment_item_id === first.assignment_item_id &&
    second.title === first.title && second.provider === first.provider &&
    second.private_locator === first.private_locator;
}

export function isClosedAssignedLearningPlaybackResponse(body: Record<string, unknown>): boolean {
  return exactKeys(body, RESPONSE_KEYS);
}

export function createAssignedLearningPlaybackHandler(deps: AssignedLearningDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    if (origin && !deps.allowedOrigins.has(origin)) return inaccessible(request, deps.allowedOrigins);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: baseHeaders(origin, deps.allowedOrigins) });
    }
    if (request.method !== "POST") {
      return json(request, deps.allowedOrigins, { error: "Method not allowed" }, 405);
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json(request, deps.allowedOrigins, { error: "Unauthorized" }, 401);
    }

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
    if (!identity || !UUID.test(identity.userId)) {
      return json(request, deps.allowedOrigins, { error: "Unauthorized" }, 401);
    }

    const authorize = async (): Promise<AuthorizationProducer | null> => {
      const raw = await deps.authorize({
        userId: identity.userId,
        cycleId: body.cycleId,
        assignmentItemId: body.assignmentItemId,
        requestId: body.requestId,
        asOf: deps.now().toISOString(),
      });
      return parseAssignedLearningAuthorizationProducer(raw);
    };

    let first: AuthorizationProducer | null;
    try {
      first = await authorize();
    } catch {
      return unavailable(request, deps.allowedOrigins);
    }
    if (!first) return unavailable(request, deps.allowedOrigins);
    if (first.decision === "conflict") return conflict(request, deps.allowedOrigins);
    if (first.decision === "denied") return inaccessible(request, deps.allowedOrigins);
    if (first.assignment_item_id !== body.assignmentItemId) return unavailable(request, deps.allowedOrigins);

    const mintedAt = deps.now();
    let playbackUrl: string | null;
    try {
      playbackUrl = await deps.mintDropboxLink(first.private_locator);
    } catch {
      playbackUrl = null;
    }
    if (!isValidDropboxPlaybackUrl(playbackUrl)) return unavailable(request, deps.allowedOrigins);

    let second: AuthorizationProducer | null;
    try {
      second = await authorize();
    } catch {
      return unavailable(request, deps.allowedOrigins);
    }
    if (!second || second.decision !== "allowed" || !sameAllowedAuthority(first, second)) {
      return unavailable(request, deps.allowedOrigins);
    }

    const response = {
      assignmentItemId: first.assignment_item_id,
      title: first.title,
      provider: "private_media",
      playbackUrl,
      expiresAt: new Date(mintedAt.getTime() + ASSIGNED_LEARNING_TTL_SECONDS * 1000).toISOString(),
    };
    if (!isClosedAssignedLearningPlaybackResponse(response)) return unavailable(request, deps.allowedOrigins);
    return json(request, deps.allowedOrigins, response, 200);
  };
}
