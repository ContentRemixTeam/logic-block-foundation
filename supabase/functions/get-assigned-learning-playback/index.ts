// deno-lint-ignore no-import-prefix
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createAssignedLearningPlaybackHandler,
} from "../_shared/assignedLearningPlayback.ts";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function dropboxToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300_000) return cachedToken.value;
  const refreshToken = Deno.env.get("DROPBOX_REFRESH_TOKEN");
  const clientId = Deno.env.get("DROPBOX_CLIENT_ID");
  const clientSecret = Deno.env.get("DROPBOX_CLIENT_SECRET");
  if (!refreshToken || !clientId) return null;
  const form = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId });
  if (clientSecret) form.set("client_secret", clientSecret);
  const response = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!body?.access_token) return null;
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 14_400) * 1000 };
  return cachedToken.value;
}

async function mintDropboxLink(locator: string): Promise<string | null> {
  const token = await dropboxToken();
  if (!token) return null;
  const response = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path: locator }),
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => null) as { link?: string } | null;
  return typeof body?.link === "string" ? body.link : null;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const service = createClient(supabaseUrl, serviceKey);

const handler = createAssignedLearningPlaybackHandler({
  allowedOrigins: new Set((Deno.env.get("ASSIGNED_LEARNING_ALLOWED_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean)),
  now: () => new Date(),
  authenticate: async (authorization) => {
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("not_configured");
    const auth = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const token = authorization.slice("Bearer ".length);
    const { data, error } = await auth.auth.getUser(token);
    return error || !data.user ? null : { userId: data.user.id };
  },
  authorize: async (input) => {
    const { data, error } = await service.rpc("resolve_assigned_learning_playback", {
      p_user_id: input.userId,
      p_cycle_id: input.cycleId,
      p_assignment_item_id: input.assignmentItemId,
      p_request_id: input.requestId,
      p_as_of: input.asOf,
    });
    if (error) throw new Error("authorization_unavailable");
    return data;
  },
  mintDropboxLink,
});

serve(async (request) => {
  try {
    return await handler(request);
  } catch {
    return new Response(JSON.stringify({ error: "Playback is temporarily unavailable. Please try again." }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store, max-age=0" },
    });
  }
});
