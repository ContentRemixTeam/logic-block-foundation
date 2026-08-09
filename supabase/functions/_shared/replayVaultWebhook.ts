function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function sha256Hex(value: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
export async function verifyHmacSignature(secret: string, timestamp: string, raw: string, supplied: string): Promise<boolean> {
  const signature = supplied.replace(/^sha256=/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(signature)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = new Uint8Array(signature.match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)));
  return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`${timestamp}.${raw}`));
}
export async function verifiedPayloadHash(
  secret: string, timestamp: string, raw: string, supplied: string,
  nowSeconds = Date.now() / 1000, maxAgeSeconds = 300,
): Promise<string | null> {
  if (!/^\d{10}$/.test(timestamp)) return null;
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > maxAgeSeconds) return null;
  return await verifyHmacSignature(secret, timestamp, raw, supplied) ? await sha256Hex(raw) : null;
}
