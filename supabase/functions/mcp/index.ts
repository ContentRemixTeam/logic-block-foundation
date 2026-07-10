// Supabase Edge Function: MCP server for the Low Battery Business Planner.
// Implements the MCP Streamable HTTP transport (JSON-RPC 2.0 over HTTP POST).
// Auth: Personal Access Tokens (sha-256 hashed in the DB), sent as
// `Authorization: Bearer <token>`. Every query is scoped to the token's user;
// client-supplied user_ids are ignored.
//
// Endpoints:
//   POST /functions/v1/mcp   → JSON-RPC (initialize | tools/list | tools/call)
//   GET  /functions/v1/mcp   → tiny discovery blob (helps humans confirm URL)
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RATE_LIMIT_PER_MIN = 60;

// Broad CORS so any MCP client (Claude web, Claude Code, Codex, custom) can reach it.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Expose-Headers': 'mcp-session-id',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// SHA-256 → hex
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface TokenRow {
  id: string;
  user_id: string;
  revoked_at: string | null;
  request_count_1m: number;
  window_start_1m: string;
}

async function resolveToken(bearer: string | null): Promise<
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; status: number; message: string }
> {
  if (!bearer) return { ok: false, status: 401, message: 'Missing bearer token' };
  const raw = bearer.replace(/^Bearer\s+/i, '').trim();
  if (!raw) return { ok: false, status: 401, message: 'Missing bearer token' };

  const hash = await sha256Hex(raw);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from('integration_tokens')
    .select('id, user_id, revoked_at, request_count_1m, window_start_1m')
    .eq('token_hash', hash)
    .maybeSingle<TokenRow>();

  if (error || !data) return { ok: false, status: 401, message: 'Invalid token' };
  if (data.revoked_at) return { ok: false, status: 401, message: 'Token has been revoked' };

  // Sliding 1-minute window rate limit.
  const now = new Date();
  const windowStart = new Date(data.window_start_1m);
  const withinWindow = now.getTime() - windowStart.getTime() < 60_000;
  const nextCount = withinWindow ? data.request_count_1m + 1 : 1;
  if (withinWindow && nextCount > RATE_LIMIT_PER_MIN) {
    return { ok: false, status: 429, message: 'Rate limit exceeded (60 req/min)' };
  }
  await admin
    .from('integration_tokens')
    .update({
      last_used_at: now.toISOString(),
      request_count_1m: nextCount,
      window_start_1m: withinWindow ? data.window_start_1m : now.toISOString(),
    })
    .eq('id', data.id);

  return { ok: true, userId: data.user_id, tokenId: data.id };
}

// ---------- Tool definitions (JSON schemas returned to tools/list) ----------
const TOOLS = [
  {
    name: 'get_today',
    description:
      "Return today's plan for the signed-in user: date, battery level (if checked in), bare-minimum items, and any tasks scheduled for today. Use this to answer 'what should I focus on today?' or 'how's my day looking?'.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_week',
    description:
      "Return an overview of this week's plan: top-3 priorities, weekly focus/feeling if set, and tasks scheduled Monday–Sunday of the current week.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_current_cycle',
    description:
      "Return the user's active 90-day cycle (goal, why, identity, target feeling, start/end dates, days remaining). Returns null if no cycle is active. Use when the user asks about long-term direction or how they're tracking against their 90-day goal.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_tasks',
    description:
      "List tasks for the signed-in user with optional filters. Use for 'what do I have on Thursday' or 'show me my low-energy tasks'.",
    inputSchema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'ISO date (YYYY-MM-DD) inclusive lower bound on scheduled_date.' },
        date_to: { type: 'string', description: 'ISO date (YYYY-MM-DD) inclusive upper bound on scheduled_date.' },
        status: {
          type: 'string',
          enum: ['scheduled', 'done', 'someday', 'focus', 'backlog'],
          description: 'Filter by task status.',
        },
        energy_cost: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Filter by task energy cost.',
        },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_task',
    description:
      "Create a new task for the signed-in user. If `date` is provided the task is scheduled to that date; otherwise it lands in the unscheduled bucket. Set `is_bare_minimum: true` to add it to the user's bare-minimum-for-the-day list. Set `energy_cost` to help energy-matching work.",
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 280 },
        description: { type: 'string', maxLength: 4000 },
        date: { type: 'string', description: 'ISO date YYYY-MM-DD.' },
        energy_cost: { type: 'string', enum: ['low', 'medium', 'high'] },
        importance: { type: 'string', enum: ['low', 'medium', 'high'] },
        is_bare_minimum: { type: 'boolean', default: false },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_task',
    description:
      "Update a task the signed-in user owns. Use to reschedule (set `date`), mark done (`status: 'done'`), rename (`title`), change energy (`energy_cost`), or toggle bare-minimum. Only fields you pass are changed.",
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: "UUID of the task to update." },
        title: { type: 'string', minLength: 1, maxLength: 280 },
        description: { type: 'string', maxLength: 4000 },
        date: { type: ['string', 'null'], description: 'ISO date YYYY-MM-DD, or null to unschedule.' },
        status: { type: 'string', enum: ['scheduled', 'done', 'someday', 'focus', 'backlog'] },
        energy_cost: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
        importance: { type: 'string', enum: ['low', 'medium', 'high'] },
        is_bare_minimum: { type: 'boolean' },
      },
      required: ['task_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_note',
    description:
      "Quick-capture a thought into the user's brain-dump/notes. Use for anything that isn't a task — ideas, decisions, things to remember.",
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', minLength: 1, maxLength: 8000 },
        title: { type: 'string', maxLength: 200, description: 'Optional short title.' },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },
] as const;

// ---------- Tool handlers ----------
type Admin = ReturnType<typeof createClient>;
const admin = (): Admin =>
  createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function startOfWeekISO(d = new Date()) {
  const day = d.getUTCDay(); // 0 Sun
  const diff = (day + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}
function addDaysISO(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function toolGetToday(userId: string) {
  const sb = admin();
  const date = todayISO();
  const [plan, battery, bm, tasks] = await Promise.all([
    sb.from('daily_plans').select('*').eq('user_id', userId).eq('date', date).maybeSingle(),
    sb.from('daily_battery_checkins').select('level').eq('user_id', userId).eq('date', date).maybeSingle(),
    sb.from('tasks').select('task_id, task_text, status, energy_cost')
      .eq('user_id', userId).eq('scheduled_date', date).eq('is_bare_minimum', true),
    sb.from('tasks').select('task_id, task_text, status, energy_cost, importance, is_bare_minimum, scheduled_time')
      .eq('user_id', userId).eq('scheduled_date', date).order('scheduled_time', { ascending: true, nullsFirst: false }),
  ]);
  return {
    date,
    battery_level: battery.data?.level ?? null,
    daily_plan: plan.data
      ? { top_3: (plan.data as any).top_3_today ?? [], thought: (plan.data as any).thought, feeling: (plan.data as any).feeling, low_battery_mode: (plan.data as any).low_battery_mode ?? false }
      : null,
    bare_minimum: bm.data ?? [],
    tasks: tasks.data ?? [],
  };
}

async function toolGetWeek(userId: string) {
  const sb = admin();
  const start = startOfWeekISO();
  const end = addDaysISO(start, 6);
  const [week, tasks] = await Promise.all([
    sb.from('weekly_plans').select('week_id, top_3_priorities, weekly_thought, weekly_feeling, start_of_week')
      .eq('user_id', userId).eq('start_of_week', start).maybeSingle(),
    sb.from('tasks').select('task_id, task_text, scheduled_date, status, energy_cost, is_bare_minimum')
      .eq('user_id', userId).gte('scheduled_date', start).lte('scheduled_date', end)
      .order('scheduled_date', { ascending: true }),
  ]);
  return { week_start: start, week_end: end, weekly_plan: week.data ?? null, tasks: tasks.data ?? [] };
}

async function toolGetCurrentCycle(userId: string) {
  const sb = admin();
  const today = todayISO();
  const { data } = await sb
    .from('cycles_90_day')
    .select('cycle_id, goal, why, identity, target_feeling, start_date, end_date')
    .eq('user_id', userId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { cycle: null };
  const start = new Date(data.start_date as string);
  const end = new Date(data.end_date as string);
  const now = new Date(today);
  const total = Math.max(1, Math.round((+end - +start) / 86400000));
  const elapsed = Math.max(0, Math.round((+now - +start) / 86400000));
  return {
    cycle: {
      ...data,
      days_remaining: Math.max(0, Math.round((+end - +now) / 86400000)),
      days_elapsed: elapsed,
      total_days: total,
      progress_percent: Math.min(100, Math.round((elapsed / total) * 100)),
    },
  };
}

async function toolListTasks(userId: string, input: any) {
  const sb = admin();
  let q = sb.from('tasks').select('task_id, task_text, task_description, status, scheduled_date, scheduled_time, energy_cost, importance, is_bare_minimum, project_id').eq('user_id', userId);
  if (input?.date_from) q = q.gte('scheduled_date', String(input.date_from));
  if (input?.date_to) q = q.lte('scheduled_date', String(input.date_to));
  if (input?.status) q = q.eq('status', String(input.status));
  if (input?.energy_cost) q = q.eq('energy_cost', String(input.energy_cost));
  const limit = Math.min(200, Math.max(1, Number(input?.limit ?? 50)));
  q = q.order('scheduled_date', { ascending: true, nullsFirst: false }).limit(limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { count: data?.length ?? 0, tasks: data ?? [] };
}

async function toolCreateTask(userId: string, input: any) {
  if (!input?.title || typeof input.title !== 'string') throw new Error('title is required');
  const sb = admin();
  const row = {
    user_id: userId,
    task_text: String(input.title).slice(0, 280),
    task_description: input.description ? String(input.description).slice(0, 4000) : null,
    scheduled_date: input.date ? String(input.date) : null,
    energy_cost: input.energy_cost ?? null,
    importance: input.importance ?? null,
    is_bare_minimum: !!input.is_bare_minimum,
    status: input.date ? 'scheduled' : 'someday',
    source: 'mcp',
  };
  const { data, error } = await sb.from('tasks').insert(row).select('task_id, task_text, scheduled_date, status').single();
  if (error) throw new Error(error.message);
  return { task: data };
}

async function toolUpdateTask(userId: string, input: any) {
  if (!input?.task_id) throw new Error('task_id is required');
  const sb = admin();
  const patch: Record<string, unknown> = {};
  if (typeof input.title === 'string') patch.task_text = input.title.slice(0, 280);
  if (typeof input.description === 'string') patch.task_description = input.description.slice(0, 4000);
  if ('date' in input) patch.scheduled_date = input.date === null ? null : String(input.date);
  if (input.status) patch.status = String(input.status);
  if (input.status === 'done') patch.completed_at = new Date().toISOString();
  if ('energy_cost' in input) patch.energy_cost = input.energy_cost;
  if (input.importance) patch.importance = String(input.importance);
  if (typeof input.is_bare_minimum === 'boolean') patch.is_bare_minimum = input.is_bare_minimum;

  const { data, error } = await sb
    .from('tasks')
    .update(patch)
    .eq('task_id', String(input.task_id))
    .eq('user_id', userId) // scope enforcement
    .select('task_id, task_text, scheduled_date, status, energy_cost, is_bare_minimum')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Task not found or not yours');
  return { task: data };
}

async function toolAddNote(userId: string, input: any) {
  if (!input?.text) throw new Error('text is required');
  const sb = admin();
  const text = String(input.text).slice(0, 8000);
  const title = input.title ? String(input.title).slice(0, 200) : text.split('\n')[0].slice(0, 80);
  const { data, error } = await sb
    .from('journal_pages')
    .insert({ user_id: userId, title, content: text, content_length: text.length })
    .select('id, title')
    .single();
  if (error) throw new Error(error.message);
  return { note: data };
}

async function runTool(userId: string, name: string, args: any) {
  switch (name) {
    case 'get_today': return await toolGetToday(userId);
    case 'get_week': return await toolGetWeek(userId);
    case 'get_current_cycle': return await toolGetCurrentCycle(userId);
    case 'list_tasks': return await toolListTasks(userId, args ?? {});
    case 'create_task': return await toolCreateTask(userId, args ?? {});
    case 'update_task': return await toolUpdateTask(userId, args ?? {});
    case 'add_note': return await toolAddNote(userId, args ?? {});
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------- JSON-RPC dispatcher ----------
function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}
function rpcError(id: unknown, code: number, message: string, data?: unknown) {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

async function handleRpc(userId: string, msg: any) {
  const { id, method, params } = msg ?? {};
  try {
    switch (method) {
      case 'initialize':
        return rpcResult(id, {
          protocolVersion: '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'low-battery-planner', version: '1.0.0' },
        });
      case 'notifications/initialized':
      case 'notifications/cancelled':
        return null; // notifications: no response
      case 'ping':
        return rpcResult(id, {});
      case 'tools/list':
        return rpcResult(id, { tools: TOOLS });
      case 'tools/call': {
        const name = params?.name as string;
        const args = params?.arguments ?? {};
        const out = await runTool(userId, name, args);
        return rpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify(out, null, 2) }],
          structuredContent: out,
        });
      }
      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return rpcError(id, -32000, message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  if (req.method === 'GET') {
    return json({
      name: 'Low Battery Business Planner — MCP',
      transport: 'streamable-http',
      endpoint: url.origin + url.pathname,
      auth: 'Bearer <personal-access-token from Settings → AI Assistant>',
      tools: TOOLS.map((t) => t.name),
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await resolveToken(req.headers.get('authorization'));
  if (!auth.ok) return json(rpcError(null, -32001, auth.message), auth.status);

  let body: any;
  try { body = await req.json(); } catch {
    return json(rpcError(null, -32700, 'Parse error'), 400);
  }

  // Support batched requests per JSON-RPC 2.0.
  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map((m) => handleRpc(auth.userId, m)))).filter(Boolean);
    return json(results);
  }
  const result = await handleRpc(auth.userId, body);
  if (result === null) return new Response(null, { status: 204, headers: corsHeaders });
  return json(result);
});
