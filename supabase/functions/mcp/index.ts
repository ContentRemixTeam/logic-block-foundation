// Supabase Edge Function: MCP server for the Low Battery Business Planner.
// Implements MCP Streamable HTTP transport (JSON-RPC 2.0 over HTTP POST)
// with the MCP 2025-06-18 authorization spec:
//
//   • Unauthenticated requests → 401 + WWW-Authenticate: Bearer resource_metadata="..."
//   • GET /functions/v1/mcp/.well-known/oauth-protected-resource
//     → resource metadata pointing at Supabase's OAuth server.
//   • GET /functions/v1/mcp/.well-known/oauth-authorization-server
//     → proxied AS metadata from Supabase (some clients fetch it here).
//   • Authorization: Bearer <token>  accepts EITHER:
//       (a) A Supabase OAuth-issued access token (JWT) — verified via JWKS,
//           requires iss + client_id + not expired. This is the claude.ai
//           web/desktop/mobile custom-connector path (PKCE, dynamic
//           registration handled by Supabase).
//       (b) A Personal Access Token (sha-256 hashed row in
//           integration_tokens). Used by Claude Code / Codex / Cursor.
//   • Every query is scoped to the resolved user; client-supplied user_ids
//     are ignored.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RATE_LIMIT_PER_MIN = 60;

// Direct issuer (never the .lovable.cloud proxy). Built from SUPABASE_URL.
// Supabase's discovery document publishes issuer as
// https://<ref>.supabase.co/auth/v1 — match it exactly.
const OAUTH_ISSUER = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;
const JWKS = createRemoteJWKSet(new URL(`${OAUTH_ISSUER}/.well-known/jwks.json`));

// The MCP resource URL as advertised in the WWW-Authenticate hint and in
// resource metadata. Must be stable across redeploys.
function mcpResourceUrl(req: Request): string {
  const url = new URL(req.url);
  // Force https — Supabase's edge runtime hands us a URL with `http` even
  // though clients (Claude) always reach us over HTTPS, and MCP clients
  // refuse non-HTTPS resource URLs.
  const host = req.headers.get('x-forwarded-host') ?? url.host;
  return `https://${host}/functions/v1/mcp`;
}

// Broad CORS so any MCP client (Claude web, Claude Code, Codex, custom) can reach it.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version, accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Expose-Headers': 'mcp-session-id, www-authenticate',
};

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });

function unauthorized(req: Request, reason: string) {
  const resource = mcpResourceUrl(req);
  const metadataUrl = `${resource}/.well-known/oauth-protected-resource`;
  return json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message: reason } },
    401,
    {
      // Per MCP auth spec + RFC 9728: point clients at the resource metadata.
      'WWW-Authenticate': `Bearer realm="mcp", resource_metadata="${metadataUrl}", error="invalid_token"`,
    },
  );
}

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

type AuthResult =
  | { ok: true; userId: string; kind: 'oauth' | 'pat'; tokenId?: string }
  | { ok: false; status: number; message: string };

/** Try to verify a Supabase-issued OAuth access token (JWT). */
async function tryOAuthJwt(raw: string): Promise<AuthResult | null> {
  // Cheap shape check: JWTs have three base64url segments.
  if (raw.split('.').length !== 3) return null;
  try {
    const { payload } = await jwtVerify(raw, JWKS, {
      issuer: OAUTH_ISSUER,
      // Supabase issues access tokens with aud="authenticated". We do not
      // strict-check against the MCP resource URL because Supabase's OAuth
      // server does not yet echo a `resource` param into `aud`; instead we
      // require `client_id` (present only on OAuth-issued tokens, absent on
      // copied user-session JWTs) — this is the same guard mcp-js uses.
    });
    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    const clientId = typeof (payload as { client_id?: unknown }).client_id === 'string'
      ? (payload as { client_id: string }).client_id
      : null;
    if (!sub) return { ok: false, status: 401, message: 'Token missing subject' };
    if (!clientId) {
      // Reject app-session JWTs pasted as bearer tokens — those are not
      // OAuth-client tokens and should not grant MCP access.
      return { ok: false, status: 401, message: 'Token is not an OAuth-client token' };
    }
    return { ok: true, userId: sub, kind: 'oauth' };
  } catch {
    // Not a valid Supabase-issued JWT (bad signature, expired, wrong iss).
    // Fall through so the caller can try the PAT path.
    return null;
  }
}

/** Look up a Personal Access Token by hashed value. */
async function tryPersonalAccessToken(raw: string): Promise<AuthResult | null> {
  const hash = await sha256Hex(raw);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await admin
    .from('integration_tokens')
    .select('id, user_id, revoked_at, request_count_1m, window_start_1m')
    .eq('token_hash', hash)
    .maybeSingle<TokenRow>();

  if (!data) return null;
  if (data.revoked_at) return { ok: false, status: 401, message: 'Token has been revoked' };

  // Sliding 1-minute window rate limit (PAT only — OAuth clients are trusted).
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

  return { ok: true, userId: data.user_id, kind: 'pat', tokenId: data.id };
}

async function resolveToken(bearer: string | null): Promise<AuthResult> {
  if (!bearer) return { ok: false, status: 401, message: 'Missing bearer token' };
  const raw = bearer.replace(/^Bearer\s+/i, '').trim();
  if (!raw) return { ok: false, status: 401, message: 'Missing bearer token' };

  const oauth = await tryOAuthJwt(raw);
  if (oauth) return oauth; // either success or definitive failure
  const pat = await tryPersonalAccessToken(raw);
  if (pat) return pat;

  return { ok: false, status: 401, message: 'Invalid token' };
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
        project_id: { type: 'string', description: 'Filter by project UUID.' },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'search_tasks',
    description:
      "Full-text search across the user's task titles and descriptions. Case-insensitive. Use when the user says 'find my task about X' or 'what did I write about the launch email?'.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 200 },
        include_completed: { type: 'boolean', default: false },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_task',
    description:
      "Create a new task for the signed-in user. If `date` is provided the task is scheduled to that date; otherwise it lands in the unscheduled bucket. Set `is_bare_minimum: true` to add it to the user's bare-minimum-for-the-day list. Set `energy_cost` to help energy-matching work. Optionally attach to a project via `project_id` (use `list_projects` to find one).",
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 280 },
        description: { type: 'string', maxLength: 4000 },
        date: { type: 'string', description: 'ISO date YYYY-MM-DD.' },
        energy_cost: { type: 'string', enum: ['low', 'medium', 'high'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        is_bare_minimum: { type: 'boolean', default: false },
        project_id: { type: 'string', description: 'Optional project UUID from list_projects.' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_task',
    description:
      "Update a task the signed-in user owns. Use to reschedule (set `date`), rename (`title`), change energy (`energy_cost`), or toggle bare-minimum. To mark a task done, prefer `complete_task`. Only fields you pass are changed.",
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: "UUID of the task to update." },
        title: { type: 'string', minLength: 1, maxLength: 280 },
        description: { type: 'string', maxLength: 4000 },
        date: { type: ['string', 'null'], description: 'ISO date YYYY-MM-DD, or null to unschedule.' },
        status: { type: 'string', enum: ['scheduled', 'done', 'someday', 'focus', 'backlog'] },
        energy_cost: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        is_bare_minimum: { type: 'boolean' },
      },
      required: ['task_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'complete_task',
    description:
      "Mark a task done for the signed-in user. Sets status='done', is_completed=true, and completed_at=now(). Use when the user says 'I finished X' or 'mark X as done'.",
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to complete.' },
      },
      required: ['task_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_projects',
    description:
      "List the user's active projects (id, name, color, status). Use to find a project_id before creating a task inside a project, or to answer 'what am I working on?'.",
    inputSchema: {
      type: 'object',
      properties: {
        include_archived: { type: 'boolean', default: false },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'add_note',
    description:
      "Quick-capture a thought into the user's brain-dump/notes. Use for anything that isn't a task — meeting notes, decisions, things to remember.",
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
  {
    name: 'create_idea',
    description:
      "Capture an idea into the user's Ideas inbox (for content, offers, or future exploration). Different from a task or note — ideas are things to think about later.",
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 4000 },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
      },
      required: ['content'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_ideas',
    description:
      "List recent ideas from the user's Ideas inbox. Use for 'what ideas have I been sitting on?' or to help pick something to act on.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_latest_weekly_review',
    description:
      "Return the user's most recent weekly review (wins, challenges, adjustments). Use when the user asks 'what did I reflect on last week?' or wants to plan based on last week's learnings.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
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
  let q = sb.from('tasks').select('task_id, task_text, task_description, status, scheduled_date, scheduled_time, energy_cost, priority, is_bare_minimum, project_id').eq('user_id', userId);
  if (input?.date_from) q = q.gte('scheduled_date', String(input.date_from));
  if (input?.date_to) q = q.lte('scheduled_date', String(input.date_to));
  if (input?.status) q = q.eq('status', String(input.status));
  if (input?.energy_cost) q = q.eq('energy_cost', String(input.energy_cost));
  if (input?.project_id) q = q.eq('project_id', String(input.project_id));
  const limit = Math.min(200, Math.max(1, Number(input?.limit ?? 50)));
  q = q.order('scheduled_date', { ascending: true, nullsFirst: false }).limit(limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { count: data?.length ?? 0, tasks: data ?? [] };
}

async function toolCreateTask(userId: string, input: any) {
  if (!input?.title || typeof input.title !== 'string') throw new Error('title is required');
  const sb = admin();
  const row: Record<string, unknown> = {
    user_id: userId,
    task_text: String(input.title).slice(0, 280),
    task_description: input.description ? String(input.description).slice(0, 4000) : null,
    scheduled_date: input.date ? String(input.date) : null,
    energy_cost: input.energy_cost ?? null,
    priority: input.priority ?? null,
    is_bare_minimum: !!input.is_bare_minimum,
    status: input.date ? 'scheduled' : 'someday',
    source: 'mcp',
  };
  if (input.project_id) row.project_id = String(input.project_id);
  const { data, error } = await sb.from('tasks').insert(row).select('task_id, task_text, scheduled_date, status, project_id').single();
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
  if (input.status) {
    patch.status = String(input.status);
    if (input.status === 'done') {
      patch.is_completed = true;
      patch.completed_at = new Date().toISOString();
    }
  }
  if ('energy_cost' in input) patch.energy_cost = input.energy_cost;
  if (input.priority) patch.priority = String(input.priority);
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

async function toolCompleteTask(userId: string, input: any) {
  if (!input?.task_id) throw new Error('task_id is required');
  const sb = admin();
  const { data, error } = await sb
    .from('tasks')
    .update({ status: 'done', is_completed: true, completed_at: new Date().toISOString() })
    .eq('task_id', String(input.task_id))
    .eq('user_id', userId)
    .select('task_id, task_text, status, completed_at')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Task not found or not yours');
  return { task: data };
}

async function toolListProjects(userId: string, input: any) {
  const sb = admin();
  let q = sb.from('projects').select('id, name, color, status, description').eq('user_id', userId);
  if (!input?.include_archived) q = q.neq('status', 'archived');
  q = q.order('created_at', { ascending: false }).limit(100);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { count: data?.length ?? 0, projects: data ?? [] };
}

async function toolSearchTasks(userId: string, input: any) {
  if (!input?.query) throw new Error('query is required');
  const sb = admin();
  const term = String(input.query).replace(/[%_]/g, ' ').slice(0, 200);
  const pattern = `%${term}%`;
  const limit = Math.min(100, Math.max(1, Number(input.limit ?? 25)));
  let q = sb.from('tasks')
    .select('task_id, task_text, task_description, status, scheduled_date, energy_cost, is_bare_minimum, project_id')
    .eq('user_id', userId)
    .or(`task_text.ilike.${pattern},task_description.ilike.${pattern}`);
  if (!input.include_completed) q = q.neq('status', 'done');
  q = q.order('scheduled_date', { ascending: false, nullsFirst: false }).limit(limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { count: data?.length ?? 0, tasks: data ?? [] };
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

async function toolCreateIdea(userId: string, input: any) {
  if (!input?.content) throw new Error('content is required');
  const sb = admin();
  const row: Record<string, unknown> = {
    user_id: userId,
    content: String(input.content).slice(0, 4000),
    priority: input.priority ?? 'medium',
  };
  if (Array.isArray(input.tags)) row.tags = input.tags.slice(0, 10).map((t: unknown) => String(t).slice(0, 40));
  const { data, error } = await sb.from('ideas').insert(row).select('id, content, priority, created_at').single();
  if (error) throw new Error(error.message);
  return { idea: data };
}

async function toolListIdeas(userId: string, input: any) {
  const sb = admin();
  const limit = Math.min(100, Math.max(1, Number(input?.limit ?? 20)));
  const { data, error } = await sb
    .from('ideas')
    .select('id, content, priority, tags, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return { count: data?.length ?? 0, ideas: data ?? [] };
}

async function toolGetLatestWeeklyReview(userId: string) {
  const sb = admin();
  const { data, error } = await sb
    .from('weekly_reviews')
    .select('review_id, week_id, wins, challenges, adjustments, goal_support, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { review: data ?? null };
}

async function runTool(userId: string, name: string, args: any) {
  switch (name) {
    case 'get_today': return await toolGetToday(userId);
    case 'get_week': return await toolGetWeek(userId);
    case 'get_current_cycle': return await toolGetCurrentCycle(userId);
    case 'list_tasks': return await toolListTasks(userId, args ?? {});
    case 'search_tasks': return await toolSearchTasks(userId, args ?? {});
    case 'create_task': return await toolCreateTask(userId, args ?? {});
    case 'update_task': return await toolUpdateTask(userId, args ?? {});
    case 'complete_task': return await toolCompleteTask(userId, args ?? {});
    case 'list_projects': return await toolListProjects(userId, args ?? {});
    case 'add_note': return await toolAddNote(userId, args ?? {});
    case 'create_idea': return await toolCreateIdea(userId, args ?? {});
    case 'list_ideas': return await toolListIdeas(userId, args ?? {});
    case 'get_latest_weekly_review': return await toolGetLatestWeeklyReview(userId);
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
  const resource = mcpResourceUrl(req);

  // ---- Well-known discovery routes ----
  // Supabase strips the function name from the incoming URL, so the path we
  // see is the trailing sub-path. We match both to be safe.
  const isWellKnown = (marker: string) =>
    url.pathname.endsWith(`/.well-known/${marker}`) || url.pathname === `/.well-known/${marker}`;

  if (req.method === 'GET' && isWellKnown('oauth-protected-resource')) {
    // RFC 9728: point clients at the OAuth authorization server.
    return json({
      resource,
      authorization_servers: [OAUTH_ISSUER],
      bearer_methods_supported: ['header'],
      scopes_supported: ['openid', 'profile', 'email'],
      resource_documentation: `${url.origin}/functions/v1/mcp`,
    });
  }

  if (req.method === 'GET' && isWellKnown('oauth-authorization-server')) {
    // Proxy Supabase's AS metadata verbatim so clients that fetch it relative
    // to the resource origin still get a valid document.
    try {
      const upstream = await fetch(`${OAUTH_ISSUER}/.well-known/oauth-authorization-server`);
      const doc = await upstream.json();
      return json(doc);
    } catch {
      return json({ error: 'authorization_server_metadata_unavailable' }, 502);
    }
  }

  // ---- Human-readable landing (GET root) ----
  if (req.method === 'GET') {
    return json({
      name: 'Low Battery Business Planner — MCP',
      transport: 'streamable-http',
      endpoint: resource,
      auth: 'OAuth 2.1 (PKCE) via Supabase, or Personal Access Token from Settings → AI Assistant',
      oauth_metadata: `${resource}/.well-known/oauth-protected-resource`,
      tools: TOOLS.map((t) => t.name),
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await resolveToken(req.headers.get('authorization'));
  if (!auth.ok) {
    // Per MCP spec: 401 with WWW-Authenticate points clients at resource
    // metadata so they can discover the OAuth server and begin the flow.
    if (auth.status === 401) return unauthorized(req, auth.message);
    return json(rpcError(null, -32001, auth.message), auth.status);
  }

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

