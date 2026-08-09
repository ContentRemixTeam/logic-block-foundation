export const MAX_JSON_BODY_BYTES = 16_384;

const BASE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  Vary: "Origin",
};

export function allowedOrigins(): Set<string> {
  return new Set(
    (Deno.env.get("REPLAY_VAULT_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("Origin");
  return origin === null || allowedOrigins().has(origin);
}

export function responseHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const headers = { ...BASE_HEADERS };
  if (origin && allowedOrigins().has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] =
      "authorization, x-client-info, apikey, content-type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return headers;
}

export function secureJson(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(req) });
}

export function inaccessible(req: Request): Response {
  return secureJson(req, { error: "Inaccessible" }, 404);
}

export async function readBoundedText(req: Request): Promise<string> {
  const declaredHeader = req.headers.get("Content-Length");
  const declaredLength = declaredHeader === null ? null : Number(declaredHeader);
  if (declaredLength !== null && Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    await req.body?.cancel("request_too_large").catch(() => undefined);
    throw new Error("request_too_large");
  }
  if (!req.body) return "";

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      byteLength += value.byteLength;
      if (byteLength > MAX_JSON_BODY_BYTES) {
        await reader.cancel("request_too_large").catch(() => undefined);
        throw new Error("request_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function readBoundedJson<T>(req: Request): Promise<T> {
  let raw: string;
  try {
    raw = await readBoundedText(req);
  } catch (error) {
    if (error instanceof Error && error.message === "request_too_large") throw error;
    throw new Error("invalid_json");
  }
  try {
    return JSON.parse(raw || "{}") as T;
  } catch {
    throw new Error("invalid_json");
  }
}

export function bearerHeader(req: Request): string | null {
  const value = req.headers.get("Authorization");
  return value?.startsWith("Bearer ") ? value : null;
}

export function safeLogId(): string {
  return crypto.randomUUID();
}
