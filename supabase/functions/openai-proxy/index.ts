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

async function decryptAPIKey(
  encryptedKey: string,
  userId: string
): Promise<string> {
  const key = await deriveKey(userId);

  // Decode base64
  const binaryString = atob(encryptedKey);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Get encrypted API key
    const { data: keyData, error: keyError } = await supabase
      .from("user_api_keys")
      .select("encrypted_key, key_status")
      .eq("user_id", userId)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({
          error:
            "No API key configured. Please add your OpenAI API key in settings.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Decrypt the API key
    const apiKey = await decryptAPIKey(keyData.encrypted_key, userId);

    // Parse request body
    const { messages, temperature = 0.8, max_tokens = 2000 } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Forward to OpenAI
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
          temperature,
          max_tokens,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      const errorMessage =
        errorData.error?.message || "OpenAI API call failed";

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: openaiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await openaiResponse.json();

    return new Response(
      JSON.stringify({
        content: result.choices?.[0]?.message?.content || "",
        tokens: result.usage?.total_tokens || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("openai-proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
