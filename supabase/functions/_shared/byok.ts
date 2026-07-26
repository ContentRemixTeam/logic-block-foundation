// Shared bring-your-own-key (BYOK) AI caller.
// Reuses the EXACT decryption scheme used by mastermind-ai-coach / openai-proxy
// so keys already saved by users keep working. Never uses LOVABLE_API_KEY.

const ENCRYPTION_ALGORITHM = "AES-GCM";

export const NO_API_KEY_ERROR = {
  error: "NO_API_KEY",
  message: "Add your OpenAI or Anthropic API key in Settings to use AI features.",
};

// Same default models the AI Copywriting feature uses.
const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
};

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function deriveKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(userId.padEnd(32, "0")),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("ai-copywriting-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    false,
    ["decrypt"]
  );
}

export async function decryptAPIKey(encryptedKey: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const binaryString = atob(encryptedKey);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) combined[i] = binaryString.charCodeAt(i);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: ENCRYPTION_ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

async function callOpenAI(
  apiKey: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: DEFAULT_MODELS.openai,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e?.error?.message || `OpenAI error ${r.status}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

async function callAnthropic(
  apiKey: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  let system = "";
  const conv: { role: string; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "system") system += (system ? "\n\n" : "") + m.content;
    else conv.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
  }
  if (conv.length === 0) conv.push({ role: "user", content: "Respond as instructed." });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODELS.anthropic,
      max_tokens: maxTokens,
      system,
      messages: conv,
      temperature,
    }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Anthropic error ${r.status}`);
  }
  const j = await r.json();
  return (j.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
}

/**
 * Runs a chat completion with the user's own provider key.
 * Returns { ok: true, content } or { ok: false, response } (ready to return).
 */
export async function callUserAI(
  supabase: any,
  userId: string,
  messages: ChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<{ ok: true; content: string; provider: string } | { ok: false; response: Response }> {
  const headers = { ...(options.headers ?? {}), "Content-Type": "application/json" };
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 2000;

  const { data: keys, error } = await supabase
    .from("user_api_keys")
    .select("encrypted_key, provider, key_status")
    .eq("user_id", userId);

  if (error) {
    console.error("BYOK: failed to load user_api_keys", error.message);
  }

  const usable = (keys ?? []).filter(
    (k: any) => k.encrypted_key && k.key_status !== "invalid" && DEFAULT_MODELS[k.provider]
  );

  // Prefer OpenAI when both are present (matches AI Copywriting default).
  const chosen =
    usable.find((k: any) => k.provider === "openai") ?? usable[0] ?? null;

  if (!chosen) {
    return {
      ok: false,
      response: new Response(JSON.stringify(NO_API_KEY_ERROR), { status: 400, headers }),
    };
  }

  let apiKey: string;
  try {
    apiKey = await decryptAPIKey(chosen.encrypted_key, userId);
  } catch (e) {
    console.error("BYOK: decryption failed", (e as Error).message);
    return {
      ok: false,
      response: new Response(JSON.stringify(NO_API_KEY_ERROR), { status: 400, headers }),
    };
  }

  try {
    const content =
      chosen.provider === "anthropic"
        ? await callAnthropic(apiKey, messages, temperature, maxTokens)
        : await callOpenAI(apiKey, messages, temperature, maxTokens);
    return { ok: true, content, provider: chosen.provider };
  } catch (e) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "AI_PROVIDER_ERROR", message: (e as Error).message }),
        { status: 502, headers }
      ),
    };
  }
}
