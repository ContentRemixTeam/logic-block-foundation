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
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(req),
  });
}

export function inaccessible(req: Request): Response {
  return secureJson(req, { error: "Inaccessible" }, 404);
}

export async function readBoundedJson<T>(req: Request): Promise<T> {
  const declaredLength = Number(req.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    throw new Error("request_too_large");
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BODY_BYTES) {
    throw new Error("request_too_large");
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
