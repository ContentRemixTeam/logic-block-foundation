import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bearerHeader, inaccessible, isAllowedOrigin, readBoundedJson, responseHeaders, safeLogId, secureJson } from "../_shared/replayVaultAccess.ts";
import { mapPlaybackResponse } from "../_shared/replayVaultProducer.mjs";

const MAX_RESOURCE_ID = 220;
const RESOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$/;
const DROPBOX_TEMPORARY_LINK_TTL_SECONDS = 4 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PlaybackSurface = "curriculum" | "recent_replay" | "vault";
interface PlaybackRequest { resourceId?: string; questionId?: string; momentId?: string; surface?: PlaybackSurface; preview?: boolean }
interface PlaybackRow {
  resource_uuid: string; portal_resource_id: string; title: string; dropbox_locator: string; access_scope: string;
  authoritative_start_seconds: number; authoritative_end_seconds: number;
  moment_id: string | null; question_id: string | null;
}
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
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form,
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!body?.access_token) return null;
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 14_400) * 1000 };
  return cachedToken.value;
}

async function temporaryLink(locator: string): Promise<string | null> {
  const token = await dropboxToken();
  if (!token) return null;
  const response = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path: locator }),
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => null) as { link?: string } | null;
  return body?.link ?? null;
}

serve(async (req: Request) => {
  if (!isAllowedOrigin(req)) return inaccessible(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(req) });
  if (req.method !== "POST") return secureJson(req, { error: "Method not allowed" }, 405);
  const requestId = safeLogId();
  try {
    const authHeader = bearerHeader(req);
    if (!authHeader) return secureJson(req, { error: "Unauthorized" }, 401);
    const body = await readBoundedJson<PlaybackRequest>(req);
    const resourceId = typeof body.resourceId === "string" ? body.resourceId.trim() : "";
    const questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
    const momentId = typeof body.momentId === "string" ? body.momentId.trim() : "";
    const surface = body.surface ?? "vault";
    if (!resourceId || resourceId.length > MAX_RESOURCE_ID || !RESOURCE_ID.test(resourceId) || (Boolean(questionId) && Boolean(momentId)) ||
        !["curriculum", "recent_replay", "vault"].includes(surface) ||
        (questionId && !UUID.test(questionId)) || (momentId && !UUID.test(momentId))) return inaccessible(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("not_configured");
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user?.email) return secureJson(req, { error: "Unauthorized" }, 401);

    const service = createClient(supabaseUrl, serviceKey);
    let playbackDecision = await service.rpc("resolve_mastermind_media_playback", {
      p_user_id: authData.user.id, p_email: authData.user.email, p_resource_id: resourceId,
      p_surface: surface as PlaybackSurface,
      p_question_id: questionId || null, p_moment_id: momentId || null, p_preview: body.preview === true,
    });
    if (playbackDecision.error && surface === "vault") {
      playbackDecision = await service.rpc("resolve_replay_vault_playback", {
        p_user_id: authData.user.id, p_email: authData.user.email, p_resource_id: resourceId,
        p_question_id: questionId || null, p_moment_id: momentId || null, p_preview: body.preview === true,
      });
    }
    if (playbackDecision.error) throw playbackDecision.error;
    const row = ((playbackDecision.data ?? []) as PlaybackRow[])[0];
    if (!row || row.portal_resource_id !== resourceId || !RESOURCE_ID.test(row.portal_resource_id)) return inaccessible(req);
    const playbackUrl = await temporaryLink(row.dropbox_locator);
    if (!playbackUrl) throw new Error("dropbox_unavailable");

    const { error: eventError } = await service.rpc("record_replay_vault_playback_event", {
      p_user_id: authData.user.id, p_resource_id: row.resource_uuid, p_decision: "allowed", p_provider: "dropbox",
      p_moment_id: row.moment_id, p_question_id: row.question_id,
    });
    if (eventError) console.warn("[replay-vault-playback-audit]", requestId, "audit_write_failed");
    return secureJson(req, mapPlaybackResponse(
      row,
      playbackUrl,
      new Date(Date.now() + DROPBOX_TEMPORARY_LINK_TTL_SECONDS * 1000).toISOString(),
    ));
  } catch (error) {
    console.error("[replay-vault-playback]", requestId, error instanceof Error ? error.message : "internal_error");
    return secureJson(req, { error: "Playback unavailable" }, 500);
  }
});
