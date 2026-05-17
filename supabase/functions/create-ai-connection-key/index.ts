import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate a random URL-safe key body. ~43 chars of base64url = 256 bits.
function generateKeyBody(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user via their JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      token,
    );
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Parse optional body { name?: string }
    let name = "Boss Planner AI Key";
    try {
      const body = await req.json();
      if (body?.name && typeof body.name === "string") {
        name = body.name.slice(0, 100);
      }
    } catch {
      // no body is fine
    }

    // Generate key — bp_live_<random>
    const prefix = "bp_live_";
    const body = generateKeyBody(32);
    const fullKey = `${prefix}${body}`;
    const keyHash = await sha256Hex(fullKey);
    const keyLast4 = fullKey.slice(-4);

    // Default expiration: 1 year
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Insert with service role (bypasses RLS, but we lock user_id)
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: inserted, error: insertErr } = await admin
      .from("ai_connection_keys")
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash,
        key_prefix: prefix,
        key_last4: keyLast4,
        scopes: ["mcp:read", "mcp:write"],
        expires_at: expiresAt.toISOString(),
      })
      .select("id, name, key_prefix, key_last4, expires_at, created_at")
      .single();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        key: fullKey, // shown ONCE
        record: inserted,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("create-ai-connection-key error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
