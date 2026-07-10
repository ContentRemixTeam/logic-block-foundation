import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TASK_HEADERS } from "../_shared/planner_sheets.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHEMA_VERSION = 1;

const visibleTabs = [
  { title: 'Tasks', headers: TASK_HEADERS },
  { title: 'Projects', headers: ['id', 'user_id_hash', 'name', 'description', 'status', 'color', 'created_at', 'updated_at', 'deleted_at', 'version', 'last_write_id', 'sync_status', 'source'] },
  { title: 'Daily Plans', headers: ['id', 'user_id_hash', 'plan_date', 'top_3', 'brain_dump', 'notes', 'created_at', 'updated_at', 'deleted_at', 'version', 'last_write_id', 'sync_status', 'source'] },
  { title: 'Weekly Plans', headers: ['id', 'user_id_hash', 'week_start', 'priorities', 'commitments', 'notes', 'created_at', 'updated_at', 'deleted_at', 'version', 'last_write_id', 'sync_status', 'source'] },
  { title: 'Cycles', headers: ['id', 'user_id_hash', 'start_date', 'end_date', 'goal', 'revenue_goal', 'created_at', 'updated_at', 'deleted_at', 'version', 'last_write_id', 'sync_status', 'source'] },
  { title: 'Habits', headers: ['id', 'user_id_hash', 'name', 'frequency', 'status', 'created_at', 'updated_at', 'deleted_at', 'version', 'last_write_id', 'sync_status', 'source'] },
  { title: 'Ideas', headers: ['id', 'user_id_hash', 'content', 'category', 'status', 'created_at', 'updated_at', 'deleted_at', 'version', 'last_write_id', 'sync_status', 'source'] },
  { title: 'Reviews', headers: ['id', 'user_id_hash', 'review_type', 'period_start', 'period_end', 'responses_json', 'created_at', 'updated_at', 'deleted_at', 'version', 'last_write_id', 'sync_status', 'source'] },
];

const systemTabs = [
  { title: '_App_Config', headers: ['key', 'value', 'updated_at'] },
  { title: '_Change_Log', headers: ['write_id', 'entity_type', 'entity_id', 'action', 'before_hash', 'after_hash', 'created_at', 'client_id', 'status'] },
  { title: '_Snapshots', headers: ['snapshot_id', 'created_at', 'schema_version', 'entity_counts_json', 'snapshot_hash', 'status'] },
  { title: '_Deleted_Items', headers: ['entity_type', 'entity_id', 'deleted_at', 'deleted_by', 'restore_payload_json'] },
  { title: '_Sync_Errors', headers: ['error_id', 'created_at', 'operation', 'message', 'payload_json', 'resolved_at'] },
  { title: '_Schema', headers: ['schema_version', 'tab_name', 'headers_json', 'updated_at'] },
];

const allTabs = [...visibleTabs, ...systemTabs];

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

async function getConnection(adminSupabase: any, userId: string) {
  const { data, error } = await adminSupabase
    .from('planner_storage_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function isUserAdmin(adminSupabase: any, userId: string): Promise<boolean> {
  const { data, error } = await adminSupabase.rpc('is_admin', { check_user_id: userId });
  if (error) {
    console.error('[planner-sheet-setup] Admin check failed:', error);
    return false;
  }

  return Boolean(data);
}

function buildStatusBody(connection: any, canSetSheetsPrimary: boolean) {
  return {
    connected: !!connection?.spreadsheet_id,
    storage_mode: connection?.storage_mode || 'supabase',
    spreadsheet_id: connection?.spreadsheet_id || null,
    spreadsheet_url: connection?.spreadsheet_url || null,
    schema_version: connection?.schema_version || null,
    is_healthy: connection?.is_healthy || false,
    last_verified_at: connection?.last_verified_at || null,
    last_snapshot_at: connection?.last_snapshot_at || null,
    last_error: connection?.last_error || null,
    setup_completed_at: connection?.setup_completed_at || null,
    can_set_sheets_primary: canSetSheetsPrimary,
  };
}

async function verifySpreadsheet(accessToken: string, spreadsheetId: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,sheets.properties(title,hidden)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    return { ok: false, status: response.status, data: null };
  }

  return { ok: true, status: response.status, data: await response.json() };
}

async function createPlannerSpreadsheet(accessToken: string, email: string) {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `Low Battery Business Planner Data - ${email || 'User'}`,
      },
      sheets: allTabs.map(tab => ({
        properties: {
          title: tab.title,
          hidden: tab.title.startsWith('_'),
          gridProperties: { frozenRowCount: 1 },
        },
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create planner Sheet: ${errorText}`);
  }

  return await response.json();
}

async function writeInitialSheetData(accessToken: string, spreadsheetId: string, userId: string, email: string) {
  const now = new Date().toISOString();
  const ownerHash = await userHash(userId);

  const tabWrites = allTabs.map(tab => ({
    range: `'${tab.title}'!A1`,
    values: [tab.headers],
  }));

  const configRows = [
    ['app', 'becoming_boss_planner', now],
    ['schema_version', String(SCHEMA_VERSION), now],
    ['storage_mode', 'sheets_shadow', now],
    ['owner_hash', ownerHash, now],
    ['owner_email', email || '', now],
    ['created_by', 'planner-sheet-setup', now],
  ];

  const schemaRows = allTabs.map(tab => [
    String(SCHEMA_VERSION),
    tab.title,
    JSON.stringify(tab.headers),
    now,
  ]);

  const changeLogFirstRow = [
    crypto.randomUUID(),
    'planner_sheet',
    spreadsheetId,
    'setup',
    '',
    '',
    now,
    'planner-sheet-setup',
    'verified',
  ];

  tabWrites.push(
    { range: `'_App_Config'!A2`, values: configRows },
    { range: `'_Schema'!A2`, values: schemaRows },
    { range: `'_Change_Log'!A2`, values: [changeLogFirstRow] },
  );

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: tabWrites,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to initialize planner Sheet: ${errorText}`);
  }
}

async function setupPlannerSheet(adminSupabase: any, user: any) {
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
        error: 'Google is not connected. Connect Google first so the app can create your planner Sheet.',
        needsGoogleConnection: true,
      },
    };
  }

  const accessToken = await getValidAccessToken(adminSupabase, user.id, googleConnection);
  const existingConnection = await getConnection(adminSupabase, user.id);

  if (existingConnection?.spreadsheet_id) {
    const verification = await verifySpreadsheet(accessToken, existingConnection.spreadsheet_id);
    const now = new Date().toISOString();

    await adminSupabase
      .from('planner_storage_connections')
      .update({
        is_healthy: verification.ok,
        last_verified_at: verification.ok ? now : existingConnection.last_verified_at,
        last_error: verification.ok ? null : `Google returned ${verification.status} for the connected planner Sheet.`,
      })
      .eq('user_id', user.id);

    return {
      status: 200,
      body: {
        success: verification.ok,
        reused: true,
        storage_mode: existingConnection.storage_mode,
        spreadsheet_id: existingConnection.spreadsheet_id,
        spreadsheet_url: existingConnection.spreadsheet_url,
        schema_version: existingConnection.schema_version,
        is_healthy: verification.ok,
        last_error: verification.ok ? null : `Google returned ${verification.status} for the connected planner Sheet.`,
      },
    };
  }

  const sheet = await createPlannerSpreadsheet(accessToken, user.email || '');
  await writeInitialSheetData(accessToken, sheet.spreadsheetId, user.id, user.email || '');

  const verification = await verifySpreadsheet(accessToken, sheet.spreadsheetId);
  if (!verification.ok) {
    throw new Error('Planner Sheet was created, but verification failed. Please try again before using it for data.');
  }

  const now = new Date().toISOString();
  const { data: savedConnection, error: saveError } = await adminSupabase
    .from('planner_storage_connections')
    .upsert({
      user_id: user.id,
      storage_mode: 'sheets_shadow',
      provider: 'google_sheets',
      spreadsheet_id: sheet.spreadsheetId,
      spreadsheet_url: sheet.spreadsheetUrl,
      schema_version: SCHEMA_VERSION,
      last_verified_at: now,
      setup_completed_at: now,
      last_error: null,
      is_healthy: true,
    }, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (saveError) throw saveError;

  return {
    status: 200,
    body: {
      success: true,
      reused: false,
      storage_mode: savedConnection?.storage_mode || 'sheets_shadow',
      spreadsheet_id: sheet.spreadsheetId,
      spreadsheet_url: sheet.spreadsheetUrl,
      schema_version: SCHEMA_VERSION,
      is_healthy: true,
      last_verified_at: now,
    },
  };
}

async function setStorageMode(adminSupabase: any, userId: string, storageMode: string, canSetSheetsPrimary: boolean) {
  if (!['supabase', 'sheets_shadow', 'sheets_primary'].includes(storageMode)) {
    return {
      status: 400,
      body: { error: 'Unsupported storage mode' },
    };
  }

  if (storageMode === 'sheets_primary' && !canSetSheetsPrimary) {
    return {
      status: 403,
      body: { error: 'Only an admin can turn on Sheets primary mode during rollout.' },
    };
  }

  const existingConnection = await getConnection(adminSupabase, userId);
  if (!existingConnection?.spreadsheet_id && storageMode !== 'supabase') {
    return {
      status: 400,
      body: { error: 'Create and verify a planner Sheet before switching storage modes.' },
    };
  }

  if (storageMode === 'sheets_primary' && !existingConnection?.is_healthy) {
    return {
      status: 400,
      body: { error: 'Planner Sheet must be healthy before switching to Sheets primary.' },
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await adminSupabase
    .from('planner_storage_connections')
    .update({
      storage_mode: storageMode,
      last_verified_at: storageMode === 'sheets_primary' ? now : existingConnection?.last_verified_at,
      last_error: null,
    })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;

  return {
    status: 200,
    body: buildStatusBody(data || { storage_mode: storageMode }, canSetSheetsPrimary),
  };
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
      { global: { headers: { Authorization: authHeader } } }
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'status';
    const canSetSheetsPrimary = await isUserAdmin(adminSupabase, user.id);

    if (action === 'status') {
      const connection = await getConnection(adminSupabase, user.id);
      return new Response(JSON.stringify(buildStatusBody(connection, canSetSheetsPrimary)), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'setup') {
      const result = await setupPlannerSheet(adminSupabase, user);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set_mode') {
      const result = await setStorageMode(adminSupabase, user.id, body.storage_mode, canSetSheetsPrimary);
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
    console.error('[planner-sheet-setup] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
