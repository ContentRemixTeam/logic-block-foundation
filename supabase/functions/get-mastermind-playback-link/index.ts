import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHLY_MEMBER_ACCESS_SCOPES = ["core_curriculum", "current_replay_30_day"];
const MAX_RESOURCE_ID_CHARS = 220;

interface PlaybackRequest {
  resourceId?: string;
}

interface PortalResource {
  id: string;
  portal_resource_id: string;
  title: string;
  product_title: string;
  category_title: string | null;
  portal_path: string;
  access_scope: string;
  resource_type: string;
  available_until: string | null;
}

interface PlaybackEvidence {
  source_url: string | null;
  dropbox_path: string | null;
  ghl_video_url: string | null;
  bunny_video_id: string | null;
  youtube_video_id: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeResourceId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_RESOURCE_ID_CHARS);
}

function isAllowedMonthlyResource(resource: PortalResource) {
  if (!MONTHLY_MEMBER_ACCESS_SCOPES.includes(resource.access_scope)) return false;
  if (resource.access_scope !== "current_replay_30_day") return true;
  if (!resource.available_until) return false;
  return resource.available_until >= new Date().toISOString().slice(0, 10);
}

async function dropboxTemporaryLink(dropboxPath: string) {
  const dropboxAccessToken = Deno.env.get("DROPBOX_ACCESS_TOKEN");
  if (!dropboxAccessToken) {
    console.error("[get-mastermind-playback-link] Missing DROPBOX_ACCESS_TOKEN");
    return null;
  }

  const response = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dropboxAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: dropboxPath }),
  });

  if (!response.ok) {
    console.error("[get-mastermind-playback-link] Dropbox temporary link failed", response.status);
    return null;
  }

  const body = (await response.json().catch(() => null)) as { link?: string } | null;
  return body?.link ?? null;
}

async function resolvePlayback(evidence: PlaybackEvidence) {
  if (evidence.ghl_video_url) {
    return {
      provider: "ghl_google_storage",
      playbackUrl: evidence.ghl_video_url,
      expiresAt: null,
      urlType: "access_checked_direct_url",
    };
  }

  if (evidence.dropbox_path) {
    const playbackUrl = await dropboxTemporaryLink(evidence.dropbox_path);
    if (!playbackUrl) return null;
    return {
      provider: "dropbox",
      playbackUrl,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      urlType: "temporary_url",
    };
  }

  if (evidence.youtube_video_id) {
    return {
      provider: "youtube",
      playbackUrl: `https://www.youtube.com/embed/${encodeURIComponent(evidence.youtube_video_id)}`,
      expiresAt: null,
      urlType: "access_checked_embed_url",
    };
  }

  if (evidence.source_url) {
    return {
      provider: "direct",
      playbackUrl: evidence.source_url,
      expiresAt: null,
      urlType: "access_checked_direct_url",
    };
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("[get-mastermind-playback-link] Missing Supabase environment variables");
      return json({ error: "Playback is not configured" }, 500);
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData?.user?.email) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as PlaybackRequest;
    const resourceId = normalizeResourceId(body.resourceId);

    if (!resourceId) {
      return json({ error: "Missing resourceId" }, 400);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: hasMastermindAccess, error: entitlementError } = await serviceClient.rpc(
      "check_mastermind_entitlement",
      { user_email: userData.user.email },
    );

    if (entitlementError) {
      console.error("[get-mastermind-playback-link] Entitlement check failed", entitlementError);
      return json({ error: "Could not verify access" }, 500);
    }

    if (!hasMastermindAccess) {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: resource, error: resourceError } = await serviceClient
      .from("mastermind_portal_resources")
      .select(
        "id, portal_resource_id, title, product_title, category_title, portal_path, access_scope, resource_type, available_until",
      )
      .eq("portal_resource_id", resourceId)
      .maybeSingle();

    if (resourceError) {
      console.error("[get-mastermind-playback-link] Resource lookup failed", resourceError);
      return json({ error: "Playback lookup failed" }, 500);
    }

    if (!resource) {
      return json({ error: "Resource not found" }, 404);
    }

    const portalResource = resource as PortalResource;
    if (!isAllowedMonthlyResource(portalResource)) {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: sourceRows, error: sourceError } = await serviceClient
      .from("mastermind_portal_source_evidence")
      .select("source_url, dropbox_path, ghl_video_url, bunny_video_id, youtube_video_id")
      .eq("resource_id", portalResource.id)
      .eq("source_system", "portal_playback_source")
      .eq("review_status", "approved");

    if (sourceError) {
      console.error("[get-mastermind-playback-link] Playback source lookup failed", sourceError);
      return json({ error: "Playback lookup failed" }, 500);
    }

    for (const evidence of (sourceRows ?? []) as PlaybackEvidence[]) {
      const playback = await resolvePlayback(evidence);
      if (!playback) continue;
      return json({
        resourceId: portalResource.portal_resource_id,
        title: portalResource.title,
        productTitle: portalResource.product_title,
        categoryTitle: portalResource.category_title,
        portalPath: portalResource.portal_path,
        accessScope: portalResource.access_scope,
        resourceType: portalResource.resource_type,
        ...playback,
      });
    }

    return json({ error: "Playback source needs review" }, 409);
  } catch (error) {
    console.error("[get-mastermind-playback-link] Unexpected error", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
