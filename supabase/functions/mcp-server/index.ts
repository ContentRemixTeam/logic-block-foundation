// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tool definitions ──────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_current_90_day_plan",
    description: "Read the member's current 90-day goal, capacity versions, active Success Path section, milestone, and evidence target. Read-only.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "propose_planner_task",
    description: "Send one task proposal to the Planner for member approval. This does not create or schedule a canonical task.",
    inputSchema: {
      type: "object",
      properties: {
        idempotency_key: { type: "string", description: "Stable unique key for this proposal so retries cannot create duplicates." },
        task_text: { type: "string", description: "Short action-oriented task title." },
        task_description: { type: "string", description: "Optional context." },
        why_this_task: { type: "string", description: "Why this supports the current 90-day result." },
        done_enough: { type: "string", description: "Small observable finish line." },
        evidence_target: { type: "string", description: "What response, artifact, or evidence to collect." },
        suggested_date: { type: "string", description: "Optional proposed date (YYYY-MM-DD)." },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        source_context: { type: "object", description: "Small source receipt such as current stage or skill name." },
      },
      required: ["idempotency_key", "task_text", "why_this_task", "done_enough", "evidence_target"],
    },
  },
  // Tasks
  {
    name: "list_tasks",
    description: "List tasks. Optionally filter by status, date, or priority.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["backlog", "scheduled", "in_progress", "waiting", "done", "someday"], description: "Filter by status" },
        scheduled_date: { type: "string", description: "Filter by date (YYYY-MM-DD)" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Filter by priority" },
        limit: { type: "number", description: "Max results (default 25)" },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a new task.",
    inputSchema: {
      type: "object",
      properties: {
        task_text: { type: "string", description: "Task description" },
        task_description: { type: "string", description: "Longer task description or context" },
        scheduled_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        estimated_minutes: { type: "number", description: "Estimated time in minutes" },
        notes: { type: "string", description: "Additional notes" },
        context_tags: { type: "array", items: { type: "string" }, description: "Optional labels or context tags" },
      },
      required: ["task_text"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as completed.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "UUID of the task" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "update_task",
    description: "Update an existing task's text, date, priority, status, or notes.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "UUID of the task" },
        task_text: { type: "string" },
        scheduled_date: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        status: { type: "string", enum: ["backlog", "scheduled", "in_progress", "waiting", "done", "someday"] },
        notes: { type: "string" },
      },
      required: ["task_id"],
    },
  },
  // Daily plans & brain dumps
  {
    name: "get_daily_plan",
    description: "Get the daily plan for a specific date (today if omitted). Returns priorities, brain dump, reflections.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date (YYYY-MM-DD), defaults to today" },
      },
    },
  },
  {
    name: "update_daily_plan",
    description: "Create or update a daily plan. Can set priorities, brain dump, reflections, one_thing, etc.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date (YYYY-MM-DD), defaults to today" },
        top_3_today: { type: "array", items: { type: "string" }, description: "Top 3 priorities for the day" },
        brain_dump: { type: "string", description: "Brain dump / free-form notes" },
        one_thing: { type: "string", description: "The ONE most important thing today" },
        thought: { type: "string", description: "Current thought/mindset" },
        feeling: { type: "string", description: "How you're feeling" },
        end_of_day_reflection: { type: "string", description: "End of day reflection" },
      },
    },
  },
  // Habits
  {
    name: "list_habits",
    description: "List all active habits.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "log_habit",
    description: "Mark a habit as completed for a specific date.",
    inputSchema: {
      type: "object",
      properties: {
        habit_id: { type: "string", description: "UUID of the habit" },
        date: { type: "string", description: "Date (YYYY-MM-DD), defaults to today" },
      },
      required: ["habit_id"],
    },
  },
  {
    name: "get_habit_status",
    description: "Get habit completion status for a date range.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
        end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
      },
      required: ["start_date", "end_date"],
    },
  },
];

// ── Helper: get authenticated user ────────────────────────────────────
// Supports two auth modes:
//   1) Supabase JWT (Bearer eyJ...) — used by the planner web app
//   2) Long-lived AI connection key (Bearer bp_live_...) — used by Claude/Codex/etc
//
// For bp_live_ keys, we use the service-role client (bypassing RLS) but
// always scope every query to the resolved user_id.
const AI_KEY_PREFIX = "bp_live_";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getJwtClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Auth resolution result
type AuthCtx = {
  userId: string;
  // deno-lint-ignore no-explicit-any
  client: any;
  source: "jwt" | "ai_key";
  keyId?: string;
  scopes?: string[];
};

class AuthError extends Error {
  constructor(message: string, public code: "expired" | "revoked" | "invalid" = "invalid") {
    super(message);
  }
}

async function resolveAuth(authHeader: string): Promise<AuthCtx> {
  const token = authHeader.replace("Bearer ", "").trim();

  // ── AI connection key path ──
  if (token.startsWith(AI_KEY_PREFIX)) {
    const admin = getServiceClient();
    const keyHash = await sha256Hex(token);
    const { data: row, error } = await admin
      .from("ai_connection_keys")
      .select("id, user_id, expires_at, revoked_at, scopes")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (error) throw new Error("Auth lookup failed");
    if (!row) {
      throw new AuthError(
        "Invalid AI connection key. Open Boss Planner → Settings → AI Task Connection, create a new key, and reconnect.",
        "invalid",
      );
    }
    if (row.revoked_at) {
      throw new AuthError(
        "This AI connection key has been revoked. Open Boss Planner → Settings → AI Task Connection and create a new key.",
        "revoked",
      );
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      throw new AuthError(
        "This AI connection key has expired. Open Boss Planner → Settings → AI Task Connection and create a new key.",
        "expired",
      );
    }

    // Touch last_used_at (best-effort, fire-and-forget)
    admin
      .from("ai_connection_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id)
      .then(() => {});

    return {
      userId: row.user_id as string,
      client: admin,
      source: "ai_key",
      keyId: row.id as string,
      scopes: (row.scopes as string[]) || [],
    };
  }

  // ── Supabase JWT path ──
  const client = getJwtClient(authHeader);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new AuthError("Unauthorized — invalid Supabase token", "invalid");
  }
  return { userId: data.user.id, client, source: "jwt" };
}

const AI_KEY_TOOLS = new Set([
  "get_current_90_day_plan",
  "propose_planner_task",
  "list_tasks",
  "get_daily_plan",
  "list_habits",
  "get_habit_status",
]);

function toolsFor(ctx: AuthCtx) {
  return ctx.source === "ai_key" ? TOOLS.filter((tool) => AI_KEY_TOOLS.has(tool.name)) : TOOLS;
}

function assertToolAllowed(name: string, ctx: AuthCtx) {
  if (ctx.source !== "ai_key") return;
  if (!AI_KEY_TOOLS.has(name)) {
    throw new Error("This AI connection is approval-first. Use propose_planner_task; the member approves it in Planner.");
  }
  const requiredScope = name === "propose_planner_task" ? "mcp:write" : "mcp:read";
  if (!ctx.scopes?.includes(requiredScope)) throw new Error(`Connection key is missing ${requiredScope} permission`);
}

// ── Tool handlers ─────────────────────────────────────────────────────
async function handleTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AuthCtx,
): Promise<unknown> {
  const supabase = ctx.client;
  const userId = ctx.userId;
  const today = new Date().toISOString().split("T")[0];

  switch (name) {
    case "get_current_90_day_plan": {
      const { data: cycle, error: cycleError } = await supabase
        .from("cycles_90_day")
        .select("cycle_id, goal, outcome, start_date, end_date, focus_area, biggest_bottleneck, minimum_viable_version, low_energy_version, medium_energy_version, high_energy_version, metric_1_name, metric_1_start, metric_1_goal, metric_2_name, metric_2_start, metric_2_goal, updated_at")
        .eq("user_id", userId)
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cycleError) throw cycleError;
      if (!cycle) return { state: "no_plan", message: "No 90-day plan is saved yet." };

      const { data: path, error: pathError } = await supabase
        .from("cycle_success_path_snapshots")
        .select("confirmed_stage, recommended_stage, current_milestone_id, current_milestone_title, capacity_mode, recommendation_reason, updated_at")
        .eq("user_id", userId)
        .eq("cycle_id", cycle.cycle_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pathError) throw pathError;

      const metrics = [
        cycle.metric_1_name ? { name: cycle.metric_1_name, start: cycle.metric_1_start, goal: cycle.metric_1_goal } : null,
        cycle.metric_2_name ? { name: cycle.metric_2_name, start: cycle.metric_2_start, goal: cycle.metric_2_goal } : null,
      ].filter(Boolean);

      return {
        state: "ready",
        cycle_id: cycle.cycle_id,
        result: cycle.goal,
        outcome: cycle.outcome,
        dates: { start: cycle.start_date, end: cycle.end_date },
        current_focus: path?.confirmed_stage || cycle.focus_area || null,
        recommended_focus: path?.recommended_stage || null,
        milestone: path?.current_milestone_title || null,
        milestone_id: path?.current_milestone_id || null,
        bottleneck: cycle.biggest_bottleneck,
        capacity_mode: path?.capacity_mode || null,
        action_versions: {
          minimum: cycle.minimum_viable_version,
          low: cycle.low_energy_version,
          medium: cycle.medium_energy_version,
          high: cycle.high_energy_version,
        },
        evidence_targets: metrics,
        recommendation_reason: path?.recommendation_reason || null,
        source_updated_at: path?.updated_at || cycle.updated_at,
      };
    }

    case "propose_planner_task": {
      const idempotencyKey = String(args.idempotency_key || "").trim().slice(0, 160);
      const taskText = String(args.task_text || "").trim().slice(0, 500);
      if (idempotencyKey.length < 8 || !taskText) throw new Error("idempotency_key (8+ characters) and task_text are required");
      const suggestedDate = args.suggested_date ? String(args.suggested_date) : null;
      if (suggestedDate && !/^\d{4}-\d{2}-\d{2}$/.test(suggestedDate)) throw new Error("suggested_date must use YYYY-MM-DD");
      const priority = String(args.priority || "medium");
      if (!["low", "medium", "high"].includes(priority)) throw new Error("priority must be low, medium, or high");
      const rawSource = typeof args.source_context === "object" && args.source_context && !Array.isArray(args.source_context)
        ? args.source_context as Record<string, unknown>
        : {};
      // Keep only small provenance fields. Never persist prompts, uploaded docs,
      // transcripts, credentials, or private business source material here.
      const sourceContext = Object.fromEntries(
        ["skill_name", "current_stage", "resource_id", "reason"]
          .filter((key) => rawSource[key] !== undefined)
          .map((key) => [key, String(rawSource[key]).slice(0, 240)]),
      );

      const proposal = {
        user_id: userId,
        connection_key_id: ctx.keyId || null,
        idempotency_key: idempotencyKey,
        task_text: taskText,
        task_description: args.task_description ? String(args.task_description).slice(0, 2000) : null,
        why_this_task: String(args.why_this_task || "").slice(0, 1000),
        done_enough: String(args.done_enough || "").slice(0, 1000),
        evidence_target: String(args.evidence_target || "").slice(0, 1000),
        suggested_date: suggestedDate,
        priority,
        source_context: sourceContext,
      };

      const { data, error } = await supabase
        .from("ai_planner_task_proposals")
        .upsert(proposal, { onConflict: "user_id,idempotency_key", ignoreDuplicates: true })
        .select("proposal_id, task_text, suggested_date, priority, status, created_at")
        .single();
      if (error) {
        const { data: existing, error: existingError } = await supabase
          .from("ai_planner_task_proposals")
          .select("proposal_id, task_text, suggested_date, priority, status, created_at")
          .eq("user_id", userId)
          .eq("idempotency_key", idempotencyKey)
          .single();
        if (existingError) throw error;
        return { state: "proposal_already_exists", member_approval_required: true, proposal: existing };
      }
      return { state: "proposal_created", member_approval_required: true, proposal: data };
    }

    // ── Tasks ──
    case "list_tasks": {
      let query = supabase
        .from("tasks")
        .select("task_id, task_text, status, priority, scheduled_date, is_completed, estimated_minutes, notes, project_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit((args.limit as number) || 25);

      if (args.status) query = query.eq("status", args.status);
      if (args.scheduled_date) query = query.eq("scheduled_date", args.scheduled_date);
      if (args.priority) query = query.eq("priority", args.priority);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }

    case "create_task": {
      const { data, error } = await supabase.from("tasks").insert({
        user_id: userId,
        task_text: args.task_text as string,
        task_description: (args.task_description as string) || null,
        scheduled_date: (args.scheduled_date as string) || null,
        priority: (args.priority as string) || "medium",
        estimated_minutes: (args.estimated_minutes as number) || null,
        notes: (args.notes as string) || null,
        source: "ai_mcp",
        context_tags: Array.isArray(args.context_tags)
          ? Array.from(new Set([...(args.context_tags as string[]), "ai-created"]))
          : ["ai-created"],
        status: args.scheduled_date ? "scheduled" : "backlog",
      }).select("task_id, task_text, status, priority, scheduled_date").single();
      if (error) throw error;
      return { message: "Task created", task: data };
    }

    case "complete_task": {
      const { data, error } = await supabase
        .from("tasks")
        .update({ is_completed: true, status: "done", completed_at: new Date().toISOString() })
        .eq("task_id", String(args.task_id))
        .eq("user_id", userId)
        .select("task_id, task_text")
        .single();
      if (error) throw error;
      return { message: "Task completed", task: data };
    }

    case "update_task": {
      const updates: Record<string, unknown> = {};
      for (const key of ["task_text", "scheduled_date", "priority", "status", "notes"]) {
        if (args[key] !== undefined) updates[key] = args[key];
      }
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("task_id", String(args.task_id))
        .eq("user_id", userId)
        .select("task_id, task_text, status, priority, scheduled_date")
        .single();
      if (error) throw error;
      return { message: "Task updated", task: data };
    }

    // ── Daily Plans ──
    case "get_daily_plan": {
      const date = (args.date as string) || today;
      const { data, error } = await supabase
        .from("daily_plans")
        .select("day_id, date, top_3_today, brain_dump, one_thing, thought, feeling, end_of_day_reflection, alignment_score, daily_wins, scratch_pad_content")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;
      return data || { message: `No plan found for ${date}` };
    }

    case "update_daily_plan": {
      const date = (args.date as string) || today;
      const updates: Record<string, unknown> = {};
      if (args.top_3_today) updates.top_3_today = args.top_3_today;
      if (args.brain_dump !== undefined) updates.brain_dump = args.brain_dump;
      if (args.one_thing !== undefined) updates.one_thing = args.one_thing;
      if (args.thought !== undefined) updates.thought = args.thought;
      if (args.feeling !== undefined) updates.feeling = args.feeling;
      if (args.end_of_day_reflection !== undefined) updates.end_of_day_reflection = args.end_of_day_reflection;

      const { data, error } = await supabase
        .from("daily_plans")
        .upsert({
          user_id: userId,
          date,
          ...updates,
        }, { onConflict: "user_id,date" })
        .select("day_id, date, top_3_today, brain_dump, one_thing")
        .single();
      if (error) throw error;
      return { message: `Daily plan for ${date} updated`, plan: data };
    }

    // ── Habits ──
    case "list_habits": {
      const { data, error } = await supabase
        .from("habits")
        .select("habit_id, habit_name, category, type, description, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("display_order");
      if (error) throw error;
      return data;
    }

    case "log_habit": {
      const date = (args.date as string) || today;
      const result = await supabase.rpc("toggle_habit", {
        p_user_id: userId,
        p_habit_id: args.habit_id,
        p_date: date,
      });
      if (result.error) throw result.error;
      return { message: `Habit toggled for ${date}`, completed: result.data };
    }

    case "get_habit_status": {
      const { data: habits } = await supabase
        .from("habits")
        .select("habit_id, habit_name")
        .eq("user_id", userId)
        .eq("is_active", true)
        .is("deleted_at", null);

      const { data: logs, error } = await supabase
        .from("habit_logs")
        .select("habit_id, date, completed")
        .eq("user_id", userId)
        .gte("date", args.start_date)
        .lte("date", args.end_date);
      if (error) throw error;

      return {
        habits: habits || [],
        logs: logs || [],
        summary: (habits || []).map((h: Record<string, unknown>) => ({
          habit: h.habit_name,
          completed_days: (logs || []).filter((l: Record<string, unknown>) => l.habit_id === h.habit_id && l.completed).length,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── MCP Protocol handler ──────────────────────────────────────────────
async function handleMcpRequest(body: Record<string, unknown>, ctx: AuthCtx) {
  const { id, method, params } = body as {
    jsonrpc: string;
    id: unknown;
    method: string;
    params?: Record<string, unknown>;
  };

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "90-day-planner-mcp", version: "1.0.0" },
        },
      };

    case "notifications/initialized":
      return null; // No response for notifications

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: toolsFor(ctx) },
      };

    case "tools/call": {
      const callParams = params as { name?: string; arguments?: Record<string, unknown> } | undefined;
      const toolName = callParams?.name || "";
      const toolArgs = callParams?.arguments || {};
      try {
        assertToolAllowed(toolName, ctx);
        const result = await handleTool(toolName, toolArgs, ctx);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          },
        };
      } catch (err) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : "Unknown error"}` }],
            isError: true,
          },
        };
      }
    }

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

// ── HTTP handler ──────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({
        error:
          "Unauthorized — pass a Boss Planner AI connection key (bp_live_...) or Supabase JWT as Bearer token. Create one in Boss Planner → Settings → AI Task Connection.",
      }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Resolve auth (JWT or bp_live_ key). On AuthError, return a clear 401 message.
  let ctx: AuthCtx;
  try {
    ctx = await resolveAuth(authHeader);
  } catch (err) {
    const message =
      err instanceof AuthError
        ? err.message
        : `Unauthorized: ${(err as Error).message}`;
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (req.method === "POST" && contentType.includes("application/json")) {
      const body = await req.json();

      // Handle single request or batch
      if (Array.isArray(body)) {
        const results = [];
        for (const item of body) {
          const result = await handleMcpRequest(item, ctx);
          if (result) results.push(result);
        }
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await handleMcpRequest(body, ctx);
      if (!result) return new Response(null, { status: 204, headers: corsHeaders });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET — return server info for discovery
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          name: "90-day-planner-mcp",
          version: "1.1.0",
          description: "Approval-first Planner connection. External AI can read member-scoped plan context and propose tasks for member review.",
          tools: toolsFor(ctx).map((t) => ({ name: t.name, description: t.description })),
          auth: "Bearer token required (Boss Planner AI connection key 'bp_live_...' or Supabase JWT)",
          authenticated_as: ctx.userId,
          auth_source: ctx.source,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("MCP server error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
