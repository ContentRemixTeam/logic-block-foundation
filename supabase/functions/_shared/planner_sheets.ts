export const TASK_HEADERS = [
  'id',
  'user_id_hash',
  'task_text',
  'task_description',
  'status',
  'priority',
  'scheduled_date',
  'scheduled_time',
  'project_id',
  'is_completed',
  'created_at',
  'updated_at',
  'deleted_at',
  'version',
  'last_write_id',
  'sync_status',
  'source',
  'payload_json',
];

export type StorageMode = 'supabase' | 'sheets_shadow' | 'sheets_primary';

export interface SheetsContext {
  connection: any;
  accessToken: string;
  spreadsheetId: string;
}

export interface SheetTask {
  task_id: string;
  task_text: string;
  task_description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  time_slot_duration: number | null;
  priority: string | null;
  source: string | null;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  recurrence_pattern: string | null;
  recurrence_days: unknown[] | null;
  parent_task_id: string | null;
  is_recurring_parent: boolean;
  sop_id: string | null;
  checklist_progress: unknown[] | null;
  sop: null;
  priority_order: number | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  time_block_start: string | null;
  time_block_end: string | null;
  energy_level: string | null;
  context_tags: string[] | null;
  goal_id: string | null;
  status: string | null;
  waiting_on: string | null;
  subtasks: unknown[] | null;
  notes: string | null;
  position_in_column: number | null;
  planned_day: string | null;
  day_order: number | null;
  project_id: string | null;
  project_column: string | null;
  project: null;
  section_id: string | null;
  cycle_id: string | null;
  is_system_generated: boolean | null;
  system_source: string | null;
  template_key: string | null;
  original_scheduled_at?: string | null;
  original_due_date?: string | null;
  reschedule_count_30d?: number;
  last_rescheduled_at?: string | null;
  reschedule_loop_active?: boolean;
  reschedule_nudge_dismissed_until?: string | null;
  recurrence_interval?: number | null;
  recurrence_unit?: string | null;
  recurrence_end_date?: string | null;
  category?: string | null;
  content_item_id?: string | null;
  content_type?: string | null;
  content_channel?: string | null;
  content_creation_date?: string | null;
  content_publish_date?: string | null;
}

export interface SheetTaskRecord {
  task: SheetTask;
  rowNumber: number;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function parseJson(value: string | undefined, fallback: unknown) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

function compactPayload(task: SheetTask): SheetTask {
  return {
    ...task,
    sop: null,
    project: null,
  };
}

export async function userHash(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get('ENCRYPTION_KEY');
  if (!keyHex) throw new Error('ENCRYPTION_KEY not configured');
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function decryptToken(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  const data = encrypted.startsWith('v2:') ? encrypted.slice(3) : encrypted;
  const raw = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ciphertext = raw.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function encryptToken(token: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(token);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return 'v2:' + btoa(String.fromCharCode(...combined));
}

async function getValidAccessToken(supabase: any, userId: string, connection: any): Promise<string> {
  const expiry = new Date(connection.token_expiry);
  if (expiry > new Date(Date.now() + 60_000)) {
    return await decryptToken(connection.access_token_encrypted);
  }

  const refreshToken = await decryptToken(connection.refresh_token_encrypted);
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error}`);

  const newExpiry = new Date(Date.now() + data.expires_in * 1000);
  await supabase
    .from('google_calendar_connection')
    .update({
      access_token_encrypted: await encryptToken(data.access_token),
      token_expiry: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return data.access_token;
}

export async function getSheetsContext(
  adminSupabase: any,
  userId: string,
  allowedModes: StorageMode[],
): Promise<SheetsContext | null> {
  const { data: storageConnection, error: storageError } = await adminSupabase
    .from('planner_storage_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (storageError) {
    console.warn('[PlannerSheets] Storage connection unavailable, falling back to Supabase:', storageError.message);
    return null;
  }
  if (!storageConnection?.spreadsheet_id || !allowedModes.includes(storageConnection.storage_mode)) {
    return null;
  }

  const { data: googleConnection, error: googleError } = await adminSupabase
    .from('google_calendar_connection')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (googleError) throw googleError;
  if (!googleConnection) {
    throw new Error('Google is not connected. Reconnect Google so planner data can sync with Sheets.');
  }

  return {
    connection: storageConnection,
    accessToken: await getValidAccessToken(adminSupabase, userId, googleConnection),
    spreadsheetId: storageConnection.spreadsheet_id,
  };
}

export async function getValues(
  context: SheetsContext,
  range: string,
): Promise<string[][]> {
  const encodedRange = encodeURIComponent(range);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${context.spreadsheetId}/values/${encodedRange}`,
    { headers: { Authorization: `Bearer ${context.accessToken}` } },
  );

  if (response.status === 404) return [];
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Google Sheets returned ${response.status}`);
  }

  const data = await response.json();
  return data.values || [];
}

export async function appendValues(
  context: SheetsContext,
  range: string,
  values: unknown[][],
) {
  const encodedRange = encodeURIComponent(range);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${context.spreadsheetId}/values/${encodedRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${context.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Google Sheets returned ${response.status}`);
  }
}

async function updateValues(
  context: SheetsContext,
  range: string,
  values: unknown[][],
) {
  const encodedRange = encodeURIComponent(range);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${context.spreadsheetId}/values/${encodedRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${context.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Google Sheets returned ${response.status}`);
  }
}

export function defaultTask(input: Partial<SheetTask> & { task_id: string; task_text: string }): SheetTask {
  const now = new Date().toISOString();
  return {
    task_id: input.task_id,
    task_text: input.task_text,
    task_description: input.task_description ?? null,
    is_completed: input.is_completed ?? false,
    completed_at: input.completed_at ?? null,
    scheduled_date: input.scheduled_date ?? null,
    scheduled_time: input.scheduled_time ?? null,
    time_slot_duration: input.time_slot_duration ?? null,
    priority: input.priority ?? null,
    source: input.source ?? 'manual',
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? input.created_at ?? now,
    deleted_at: input.deleted_at ?? null,
    recurrence_pattern: input.recurrence_pattern ?? null,
    recurrence_days: input.recurrence_days ?? [],
    parent_task_id: input.parent_task_id ?? null,
    is_recurring_parent: input.is_recurring_parent ?? false,
    sop_id: input.sop_id ?? null,
    checklist_progress: input.checklist_progress ?? [],
    sop: null,
    priority_order: input.priority_order ?? null,
    estimated_minutes: input.estimated_minutes ?? null,
    actual_minutes: input.actual_minutes ?? null,
    time_block_start: input.time_block_start ?? null,
    time_block_end: input.time_block_end ?? null,
    energy_level: input.energy_level ?? null,
    context_tags: input.context_tags ?? [],
    goal_id: input.goal_id ?? null,
    status: input.status ?? 'backlog',
    waiting_on: input.waiting_on ?? null,
    subtasks: input.subtasks ?? [],
    notes: input.notes ?? null,
    position_in_column: input.position_in_column ?? null,
    planned_day: input.planned_day ?? null,
    day_order: input.day_order ?? 0,
    project_id: input.project_id ?? null,
    project_column: input.project_column ?? 'todo',
    project: null,
    section_id: input.section_id ?? null,
    cycle_id: input.cycle_id ?? null,
    is_system_generated: input.is_system_generated ?? null,
    system_source: input.system_source ?? null,
    template_key: input.template_key ?? null,
    original_scheduled_at: input.original_scheduled_at ?? null,
    original_due_date: input.original_due_date ?? null,
    reschedule_count_30d: input.reschedule_count_30d ?? 0,
    last_rescheduled_at: input.last_rescheduled_at ?? null,
    reschedule_loop_active: input.reschedule_loop_active ?? false,
    reschedule_nudge_dismissed_until: input.reschedule_nudge_dismissed_until ?? null,
    recurrence_interval: input.recurrence_interval ?? null,
    recurrence_unit: input.recurrence_unit ?? null,
    recurrence_end_date: input.recurrence_end_date ?? null,
    category: input.category ?? null,
    content_item_id: input.content_item_id ?? null,
    content_type: input.content_type ?? null,
    content_channel: input.content_channel ?? null,
    content_creation_date: input.content_creation_date ?? null,
    content_publish_date: input.content_publish_date ?? null,
  };
}

function taskFromRow(headers: string[], row: string[], rowNumber: number): SheetTaskRecord | null {
  const record = Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));
  const payload = parseJson(record.payload_json, {}) as Partial<SheetTask>;
  const id = payload.task_id || record.id;
  const text = payload.task_text || record.task_text;

  if (!id || !text) return null;

  const task = defaultTask({
    ...payload,
    task_id: id,
    task_text: text,
    task_description: record.task_description || payload.task_description || null,
    is_completed: record.is_completed ? parseBoolean(record.is_completed) : Boolean(payload.is_completed),
    scheduled_date: record.scheduled_date || payload.scheduled_date || null,
    scheduled_time: record.scheduled_time || payload.scheduled_time || null,
    priority: record.priority || payload.priority || null,
    source: record.source || payload.source || 'manual',
    status: record.status || payload.status || 'backlog',
    project_id: record.project_id || payload.project_id || null,
    created_at: record.created_at || payload.created_at || new Date().toISOString(),
    updated_at: record.updated_at || payload.updated_at || record.created_at || new Date().toISOString(),
    deleted_at: record.deleted_at || payload.deleted_at || null,
  });

  return { task, rowNumber };
}

export async function readSheetTasks(context: SheetsContext): Promise<SheetTaskRecord[]> {
  const values = await getValues(context, "'Tasks'!A:R");
  if (values.length <= 1) return [];

  const headers = values[0].length ? values[0] : TASK_HEADERS;
  return values
    .slice(1)
    .map((row, index) => taskFromRow(headers, row, index + 2))
    .filter((record): record is SheetTaskRecord => Boolean(record));
}

export async function appendChangeLog(
  context: SheetsContext,
  input: {
    writeId: string;
    entityId: string;
    action: string;
    status?: string;
  },
) {
  await appendValues(context, "'_Change_Log'!A:I", [[
    input.writeId,
    'task',
    input.entityId,
    input.action,
    '',
    '',
    new Date().toISOString(),
    'planner-sheets-primary',
    input.status || 'verified',
  ]]);
}

export async function appendSheetTask(
  context: SheetsContext,
  userId: string,
  task: SheetTask,
  writeId: string,
) {
  await appendValues(context, "'Tasks'!A:R", [await taskToSheetRow(userId, task, writeId)]);
  await appendChangeLog(context, { writeId, entityId: task.task_id, action: 'create' });
}

export async function updateSheetTask(
  context: SheetsContext,
  userId: string,
  rowNumber: number,
  task: SheetTask,
  writeId: string,
  action: string,
) {
  await updateValues(context, `'Tasks'!A${rowNumber}:R${rowNumber}`, [await taskToSheetRow(userId, task, writeId)]);
  await appendChangeLog(context, { writeId, entityId: task.task_id, action });
}

export async function taskToSheetRow(
  userId: string,
  task: SheetTask,
  writeId: string,
): Promise<string[]> {
  const ownerHash = await userHash(userId);
  const payload = compactPayload({
    ...task,
    updated_at: task.updated_at || new Date().toISOString(),
  });

  return [
    cell(task.task_id),
    ownerHash,
    cell(task.task_text),
    cell(task.task_description),
    cell(task.status),
    cell(task.priority),
    cell(task.scheduled_date),
    cell(task.scheduled_time),
    cell(task.project_id),
    cell(Boolean(task.is_completed)),
    cell(task.created_at),
    cell(task.updated_at || task.created_at),
    cell(task.deleted_at),
    '1',
    writeId,
    'backed_up_to_google',
    cell(task.source),
    JSON.stringify(payload),
  ];
}

export function filterAndPageTasks(input: {
  tasks: SheetTask[];
  loadAll: boolean;
  pageSize: number;
  cursor: string | null;
  filters: { status?: string; project_id?: string; section_id?: string };
}) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const smartDateFrom = ninetyDaysAgo.toISOString().split('T')[0];

  let tasks = input.tasks.filter(task => !task.deleted_at);

  if (!input.loadAll) {
    tasks = tasks.filter(task => (
      (task.created_at && task.created_at.split('T')[0] >= smartDateFrom) ||
      !task.is_completed
    ));
  }

  if (input.filters.status) {
    tasks = tasks.filter(task => task.status === input.filters.status);
  }

  if (input.filters.project_id) {
    tasks = tasks.filter(task => task.project_id === input.filters.project_id);
  }

  if (input.filters.section_id) {
    tasks = tasks.filter(task => task.section_id === input.filters.section_id);
  }

  tasks = tasks.sort((a, b) => (
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  ));

  const totalCount = tasks.length;

  if (input.cursor) {
    tasks = tasks.filter(task => new Date(task.created_at).getTime() < new Date(input.cursor!).getTime());
  }

  const page = tasks.slice(0, input.pageSize);
  const hasMore = page.length === input.pageSize && tasks.length > input.pageSize;
  const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].created_at : null;

  return {
    data: page,
    metadata: {
      count: page.length,
      totalCount,
      hasMore,
      nextCursor,
      pageSize: input.pageSize,
      filters: input.filters,
      useSmartFilter: !input.loadAll,
    },
  };
}
