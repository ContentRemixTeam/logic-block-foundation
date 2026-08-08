import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHLY_MEMBER_ACCESS_SCOPES = ["core_curriculum", "current_replay_30_day"];
const VALID_PATH_FILTERS = new Set(["offer", "find", "nurture", "sell", "deliver", "leverage"]);
const MAX_LIMIT = 25;
const DEFAULT_LIMIT = 12;
const MAX_SNIPPET_CHARS = 320;

const SOURCE_LEAK_PATTERN =
  /(https?:\/\/\S+|dropbox\.com\S*|bunnycdn\S*|storage\.googleapis\.com\S*|revex-membership-production\S*)/gi;

interface SearchRequest {
  query?: string;
  path?: string;
  limit?: number;
  filters?: {
    includeMetadataFallback?: boolean;
  };
}

interface SearchRow {
  portal_resource_id: string;
  title: string;
  product_title: string;
  category_title: string | null;
  portal_path: string;
  access_scope: string;
  stages: string[] | null;
  resource_type: string;
  snippet: string | null;
  starts_at_seconds: number | null;
  reason: string;
  rank: number;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampLimit(limit: unknown) {
  if (typeof limit !== "number" || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

function normalizePathFilter(path: unknown) {
  if (typeof path !== "string" || path.trim() === "") return null;
  const normalized = path.trim().toLowerCase();
  return VALID_PATH_FILTERS.has(normalized) ? normalized : "__invalid__";
}

function cleanSnippet(snippet: string | null) {
  if (!snippet) return "";
  return snippet.replace(SOURCE_LEAK_PATTERN, "[private source]").slice(0, MAX_SNIPPET_CHARS);
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function countAccessScopes(rows: SearchRow[]) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.access_scope] = (counts[row.access_scope] ?? 0) + 1;
    return counts;
  }, {});
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
      console.error("[search-mastermind-resources] Missing Supabase environment variables");
      return json({ error: "Search is not configured" }, 500);
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData?.user?.email) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as SearchRequest;
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const path = normalizePathFilter(body.path);

    if (path === "__invalid__") {
      return json({ error: "Invalid path filter" }, 400);
    }

    if (query.length < 2) {
      return json({ results: [] });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: hasMastermindAccess, error: entitlementError } = await serviceClient.rpc(
      "check_mastermind_entitlement",
      { user_email: userData.user.email },
    );

    if (entitlementError) {
      console.error("[search-mastermind-resources] Entitlement check failed", entitlementError);
      return json({ error: "Could not verify access" }, 500);
    }

    if (!hasMastermindAccess) {
      return json({ error: "Forbidden" }, 403);
    }

    const limit = clampLimit(body.limit);
    const includeMetadataFallback = Boolean(body.filters?.includeMetadataFallback);

    const { data, error } = await serviceClient.rpc("search_mastermind_portal_resources", {
      p_query: query,
      p_allowed_access: MONTHLY_MEMBER_ACCESS_SCOPES,
      p_stage: path,
      p_limit: limit,
      p_include_metadata_fallback: includeMetadataFallback,
    });

    if (error) {
      console.error("[search-mastermind-resources] Search failed", error);
      return json({ error: "Search failed" }, 500);
    }

    const rows = (data ?? []) as SearchRow[];
    const results = rows.map((row) => ({
      resourceId: row.portal_resource_id,
      title: row.title,
      productTitle: row.product_title,
      categoryTitle: row.category_title,
      portalPath: row.portal_path,
      accessScope: row.access_scope,
      stages: row.stages ?? [],
      resourceType: row.resource_type,
      snippet: cleanSnippet(row.snippet),
      startsAtSeconds: row.starts_at_seconds,
      reason: row.reason,
    }));

    const queryHash = await sha256Hex(query.toLowerCase());
    const accessScopeCounts = countAccessScopes(rows);
    const { error: eventError } = await serviceClient
      .from("mastermind_portal_search_events")
      .insert({
        user_id: userData.user.id,
        query_hash: queryHash,
        result_count: results.length,
        access_scope_counts: accessScopeCounts,
      });

    if (eventError) {
      console.warn("[search-mastermind-resources] Search event logging failed", eventError);
    }

    return json({ results });
  } catch (error) {
    console.error("[search-mastermind-resources] Unexpected error", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
