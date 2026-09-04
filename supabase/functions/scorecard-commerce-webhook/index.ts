// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readBoundedText, safeLogId, secureJson } from "../_shared/replayVaultAccess.ts";
import { formValues, processScorecardPlannerWebhook } from "../_shared/scorecardPlannerCommerceWebhook.ts";

async function parseForm(req: Request, raw: string) {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("multipart/form-data")) {
    const headers = new Headers(req.headers);
    headers.delete("content-length");
    const replay = new Request(req.url, { method: "POST", headers, body: raw });
    const form = await replay.formData();
    return formValues([...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  }
  return formValues(new URLSearchParams(raw).entries());
}

Deno.serve(async (req: Request) => {
  if (req.method === "HEAD") return new Response(null, { status: 204 });
  if (req.method !== "POST") return secureJson(req, { error: "Method not allowed" }, 405);

  const requestId = safeLogId();
  try {
    const webhookSecret = Deno.env.get("THRIVECART_WEBHOOK_SECRET");
    const acceptedModes = (Deno.env.get("THRIVECART_ACCEPTED_MODES") ?? "live")
      .split(",")
      .map((mode) => mode.trim().toLowerCase())
      .filter(Boolean);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!webhookSecret || !supabaseUrl || !serviceKey) throw new Error("not_configured");

    const raw = await readBoundedText(req);
    const values = await parseForm(req, raw);
    const service = createClient(supabaseUrl, serviceKey);
    const outcome = await processScorecardPlannerWebhook(values, raw, {
      expectedSecret: webhookSecret,
      acceptedModes,
      rpc: async (args) => {
        const { data, error } = await service.rpc("apply_scorecard_planner_commerce_event", args);
        if (error) throw error;
        return (data ?? {}) as Record<string, unknown>;
      },
    });

    const rejected = outcome.results.find((result) =>
      result.success === false || String(result.status ?? "").startsWith("rejected_")
    );
    if (rejected) {
      console.error("[scorecard-commerce-webhook]", requestId, String(rejected.status));
      return secureJson(req, { error: "Purchase could not be matched" }, 422);
    }

    return secureJson(req, { success: true, processed: outcome.processed, ignored: outcome.ignored });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "internal_error";
    if (reason === "invalid_secret") return secureJson(req, { error: "Unauthorized" }, 401);
    if (/^(missing_customer_email|missing_purchase_items|invalid_checkout_mode|invalid_event_timestamp)$/.test(reason)) {
      return secureJson(req, { error: "Invalid request" }, 400);
    }
    console.error("[scorecard-commerce-webhook]", requestId, reason);
    return secureJson(req, { error: "Webhook unavailable" }, 500);
  }
});
