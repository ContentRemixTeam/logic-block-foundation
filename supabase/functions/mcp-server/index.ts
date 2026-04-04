import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tool definitions ──────────────────────────────────────────────────
const TOOLS = [
  // Tasks
  {
    name: "list_tasks",
    description: "List tasks. Optionally filter by status, date, or priority.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["scheduled", "in_progress", "done", "someday"], description: "Filter by status" },
        scheduled_date: { type: "string", description: "Filter by date (YYYY-MM-DD)" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Filter by priority" },
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
        scheduled_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        estimated_minutes: { type: "number", description: "Estimated time in minutes" },
        notes: { type: "string", description: "Additional notes" },
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
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        status: { type: "string", enum: ["scheduled", "in_progress", "done", "someday"] },
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
function getSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

async function getAuthUserId(authHeader: string): Promise<string> {
  const supabase = getSupabaseClient(authHeader);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  return data.claims.sub as string;
}

// ── Tool handlers ─────────────────────────────────────────────────────
async function handleTool(
  name: string,
  args: Record<string, unknown>,
  authHeader: string
): Promise<unknown> {
  const supabase = getSupabaseClient(authHeader);
  const userId = await getAuthUserId(authHeader);
  const today = new Date().toISOString().split("T")[0];

  switch (name) {
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
        scheduled_date: (args.scheduled_date as string) || null,
        priority: (args.priority as string) || "medium",
        estimated_minutes: (args.estimated_minutes as number) || null,
        notes: (args.notes as string) || null,
        status: "scheduled",
      }).select("task_id, task_text, status, priority, scheduled_date").single();
      if (error) throw error;
      return { message: "Task created", task: data };
    }

    case "complete_task": {
      const { data, error } = await supabase
        .from("tasks")
        .update({ is_completed: true, status: "done", completed_at: new Date().toISOString() })
        .eq("task_id", args.task_id)
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
        .eq("task_id", args.task_id)
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
        summary: (habits || []).map((h) => ({
          habit: h.habit_name,
          completed_days: (logs || []).filter((l) => l.habit_id === h.habit_id && l.completed).length,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── MCP Protocol handler ──────────────────────────────────────────────
async function handleMcpRequest(body: Record<string, unknown>, authHeader: string) {
  const { jsonrpc, id, method, params } = body as {
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
        result: { tools: TOOLS },
      };

    case "tools/call": {
      const toolName = (params as any)?.name as string;
      const toolArgs = (params as any)?.arguments || {};
      try {
        const result = await handleTool(toolName, toolArgs, authHeader);
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
            content: [{ type: "text", text: `Error: ${err.message}` }],
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
    return new Response(JSON.stringify({ error: "Unauthorized — pass your Supabase auth token as Bearer token" }), {
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
          const result = await handleMcpRequest(item, authHeader);
          if (result) results.push(result);
        }
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await handleMcpRequest(body, authHeader);
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
          version: "1.0.0",
          description: "MCP server for the 90-Day Planner app. Provides access to tasks, daily plans, brain dumps, and habits.",
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
          auth: "Bearer token required (Supabase auth JWT)",
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
