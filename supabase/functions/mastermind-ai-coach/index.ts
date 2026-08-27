// Mastermind AI Coach — unified BYOK proxy supporting OpenAI + Anthropic.
// Authenticates user, decrypts their stored API key, and forwards a chat request.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENCRYPTION_ALGORITHM = "AES-GCM";

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
    { name: "PBKDF2", salt: enc.encode("ai-copywriting-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    false,
    ["decrypt"]
  );
}

async function decryptAPIKey(encryptedKey: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const binaryString = atob(encryptedKey);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) combined[i] = binaryString.charCodeAt(i);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: ENCRYPTION_ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

function tierHasMastermindAccess(tier: string | null | undefined) {
  const normalized = tier?.toLowerCase() || "";
  return normalized === "mastermind" || normalized.includes("mastermind") || normalized.includes("vault");
}

async function callOpenAI(apiKey: string, messages: ChatMessage[], temperature: number, max_tokens: number) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature, max_tokens, response_format: { type: "json_object" } }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e?.error?.message || `OpenAI error ${r.status}`);
  }
  const j = await r.json();
  return { content: j.choices?.[0]?.message?.content || "", tokens: j.usage?.total_tokens || 0 };
}

async function callAnthropic(apiKey: string, messages: ChatMessage[], temperature: number, max_tokens: number) {
  let system = "";
  const conv: { role: string; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "system") system += (system ? "\n\n" : "") + m.content;
    else conv.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
  }
  // Reinforce JSON output via system since Anthropic has no response_format.
  system += (system ? "\n\n" : "") + "Respond with valid JSON only — no prose, no markdown fences.";
  if (conv.length === 0) conv.push({ role: "user", content: "Respond as instructed." });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens, system, messages: conv, temperature }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Anthropic error ${r.status}`);
  }
  const j = await r.json();
  const content = (j.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  const tokens = (j.usage?.input_tokens || 0) + (j.usage?.output_tokens || 0);
  return { content, tokens };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email?.toLowerCase();

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasMastermindAccess, error: entitlementError } = await supabase
      .rpc("check_mastermind_entitlement", { user_email: userEmail });

    const { data: entitlementRows, error: entitlementDetailsError } = await supabase
      .rpc("get_user_entitlement", { user_email: userEmail });

    if (entitlementError) {
      console.error("Error checking mastermind entitlement:", entitlementError);
    }

    if (entitlementDetailsError) {
      console.error("Error loading entitlement details:", entitlementDetailsError);
    }

    const entitlement = Array.isArray(entitlementRows) ? entitlementRows[0] : null;
    const canUseMastermindAI = hasMastermindAccess === true || tierHasMastermindAccess(entitlement?.tier);

    if (!canUseMastermindAI) {
      return new Response(JSON.stringify({ error: "Mastermind AI is available to active Mastermind members." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = body.messages;
    const temperature: number = body.temperature ?? 0.6;
    const max_tokens: number = body.max_tokens ?? 1500;
    const preferred: string | undefined = body.provider;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the user's API key — prefer requested provider, else first available.
    const { data: keys, error: keysError } = await supabase
      .from("user_api_keys")
      .select("encrypted_key, provider, key_status")
      .eq("user_id", userId);

    if (keysError || !keys || keys.length === 0) {
      return new Response(JSON.stringify({
        error: "No AI key configured. Add your OpenAI or Claude key in AI settings.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const chosen =
      (preferred && keys.find(k => k.provider === preferred)) ||
      keys.find(k => k.provider === "openai") ||
      keys.find(k => k.provider === "anthropic") ||
      keys[0];
    const provider = chosen.provider || "openai";
    const apiKey = await decryptAPIKey(chosen.encrypted_key, userId);

    const result = provider === "anthropic"
      ? await callAnthropic(apiKey, messages, temperature, max_tokens)
      : await callOpenAI(apiKey, messages, temperature, max_tokens);

    return new Response(JSON.stringify({ ...result, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mastermind-ai-coach error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
