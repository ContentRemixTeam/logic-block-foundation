import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TASK_HEADERS } from "../_shared/planner_sheets.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskPayload {
  task_id: string;
  task_text: string;
  task_description?: string | null;
  status?: string | null;
  priority?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  project_id?: string | null;
  is_completed?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  source?: string | null;
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

async function userHash(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

async function getColumnValues(accessToken: string, spreadsheetId: string, range: string): Promise<string[]> {
  const encodedRange = encodeURIComponent(range);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (response.status === 404) return [];
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Google Sheets returned ${response.status}`);
  }

  const data = await response.json();
  return (data.values || []).map((row: string[]) => row?.[0]).filter(Boolean);
}

async function appendValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: unknown[][],
) {
  const encodedRange = encodeURIComponent(range);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function taskToRow(task: TaskPayload, ownerHash: string, writeId: string): string[] {
  const now = new Date().toISOString();
  return [
    cell(task.task_id),
    ownerHash,
    cell(task.task_text),
    cell(task.task_description),
    cell(task.status || 'backlog'),
    cell(task.priority),
    cell(task.scheduled_date),
    cell(task.scheduled_time),
    cell(task.project_id),
    cell(Boolean(task.is_completed)),
    cell(task.created_at || now),
    cell(task.updated_at || task.created_at || now),
    cell(task.deleted_at),
    '1',
    writeId,
    'backed_up_to_google',
    cell(task.source || 'manual'),
    JSON.stringify(task),
  ];
}

function changeLogRow(writeId: string, taskId: string): string[] {
  return [
    writeId,
    'task',
    taskId,
    'create',
    '',
    '',
    new Date().toISOString(),
    'planner-task-sync',
    'verified',
  ];
}

async function upsertAudit(
  supabase: any,
  input: {
    userId: string;
    storageConnectionId: string | null;
    writeId: string;
    taskId: string;
    status: 'queued' | 'written' | 'verified' | 'failed';
    errorMessage?: string | null;
  },
) {
  await supabase
    .from('planner_storage_write_audit')
    .upsert({
      user_id: input.userId,
      write_id: input.writeId,
      storage_connection_id: input.storageConnectionId,
      provider: 'google_sheets',
      entity_type: 'task',
      entity_id: input.taskId,
      action: 'create',
      status: input.status,
      error_message: input.errorMessage || null,
      verified_at: input.status === 'verified' ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,write_id' });
}

async function syncTaskCreate(adminSupabase: any, user: any, task: TaskPayload) {
  if (!task?.task_id || !task?.task_text) {
    return {
      status: 400,
      body: { error: 'Task payload must include task_id and task_text.' },
    };
  }

  const { data: storageConnection, error: storageError } = await adminSupabase
    .from('planner_storage_connections')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (storageError) throw storageError;
  if (
    !storageConnection?.spreadsheet_id ||
    !['sheets_shadow', 'sheets_primary'].includes(storageConnection.storage_mode)
  ) {
    return {
      status: 200,
      body: {
        ok: true,
        skipped: true,
        reason: 'Planner Sheet storage is not configured for this user.',
      },
    };
  }

  const { data: googleConnection, error: googleError } = await adminSupabase
    .from('google_calendar_connection')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (googleError) throw googleError;
  if (!googleConnection) {
    return {
      status: 400,
      body: {
        error: 'Google is not connected. Reconnect Google so planner tasks can back up to Sheets.',
        needsGoogleConnection: true,
      },
    };
  }

  const accessToken = await getValidAccessToken(adminSupabase, user.id, googleConnection);
  const spreadsheetId = storageConnection.spreadsheet_id;
  const writeId = task.task_id;

  await upsertAudit(adminSupabase, {
    userId: user.id,
    storageConnectionId: storageConnection.id,
    writeId,
    taskId: task.task_id,
    status: 'queued',
  });

  try {
    const existingTaskIds = await getColumnValues(accessToken, spreadsheetId, 'Tasks!A:A');
    const existingWriteIds = await getColumnValues(accessToken, spreadsheetId, '_Change_Log!A:A');

    if (existingTaskIds.includes(task.task_id) || existingWriteIds.includes(writeId)) {
      await upsertAudit(adminSupabase, {
        userId: user.id,
        storageConnectionId: storageConnection.id,
        writeId,
        taskId: task.task_id,
        status: 'verified',
      });

      return {
        status: 200,
        body: {
          ok: true,
          skipped: false,
          reused: true,
          write_id: writeId,
          spreadsheet_url: storageConnection.spreadsheet_url,
        },
      };
    }

    const ownerHash = await userHash(user.id);
    await appendValues(accessToken, spreadsheetId, `Tasks!A:${String.fromCharCode(64 + TASK_HEADERS.length)}`, [taskToRow(task, ownerHash, writeId)]);
    await appendValues(accessToken, spreadsheetId, '_Change_Log!A:I', [changeLogRow(writeId, task.task_id)]);

    const verifiedWriteIds = await getColumnValues(accessToken, spreadsheetId, '_Change_Log!A:A');
    if (!verifiedWriteIds.includes(writeId)) {
      throw new Error('Google write finished, but read-after-write verification did not find the task log row.');
    }

    await upsertAudit(adminSupabase, {
      userId: user.id,
      storageConnectionId: storageConnection.id,
      writeId,
      taskId: task.task_id,
      status: 'verified',
    });

    await adminSupabase
      .from('planner_storage_connections')
      .update({
        is_healthy: true,
        last_verified_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', storageConnection.id);

    return {
      status: 200,
      body: {
        ok: true,
        skipped: false,
        write_id: writeId,
        spreadsheet_url: storageConnection.spreadsheet_url,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not back up task to Google Sheets.';
    await upsertAudit(adminSupabase, {
      userId: user.id,
      storageConnectionId: storageConnection.id,
      writeId,
      taskId: task.task_id,
      status: 'failed',
      errorMessage: message,
    });

    await adminSupabase
      .from('planner_storage_connections')
      .update({ last_error: message })
      .eq('id', storageConnection.id);

    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'sync_task_create';

    if (action === 'sync_task_create') {
      const result = await syncTaskCreate(adminSupabase, user, body.task);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[planner-task-sync] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
