import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-256-GCM decryption
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get('ENCRYPTION_KEY');
  if (!keyHex) throw new Error('ENCRYPTION_KEY not configured');
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function decryptToken(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  let data: string;
  if (encrypted.startsWith('v2:')) {
    data = encrypted.slice(3);
  } else {
    data = encrypted;
  }
  const raw = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ciphertext = raw.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// Refresh access token if expired
async function getValidAccessToken(
  supabase: any,
  userId: string,
  connection: any
): Promise<string> {
  const expiry = new Date(connection.token_expiry);
  if (expiry > new Date(Date.now() + 60_000)) {
    return await decryptToken(connection.access_token_encrypted);
  }

  // Refresh
  const refreshToken = await decryptToken(connection.refresh_token_encrypted);
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error}`);

  // Encrypt and store new access token
  const encKey = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data.access_token);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  const encryptedToken = 'v2:' + btoa(String.fromCharCode(...combined));

  const newExpiry = new Date(Date.now() + data.expires_in * 1000);
  await supabase
    .from('google_calendar_connection')
    .update({
      access_token_encrypted: encryptedToken,
      token_expiry: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return data.access_token;
}

// Paginated fetch helper
async function fetchAll(supabase: any, table: string, userId: string): Promise<any[]> {
  const PAGE = 1000;
  let all: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all = all.concat(data || []);
    hasMore = (data?.length ?? 0) === PAGE;
    from += PAGE;
  }
  return all;
}

// Table display names and DB table names
const TABLE_MAP: Record<string, { db: string; label: string; filterDeleted?: boolean }> = {
  tasks: { db: 'tasks', label: 'Tasks', filterDeleted: true },
  cycles: { db: 'cycles_90_day', label: 'Cycles' },
  daily_plans: { db: 'daily_plans', label: 'Daily Plans' },
  weekly_plans: { db: 'weekly_plans', label: 'Weekly Plans' },
  habits: { db: 'habits', label: 'Habits', filterDeleted: true },
  habit_logs: { db: 'habit_logs', label: 'Habit Logs' },
  coaching_entries: { db: 'coaching_entries', label: 'Coaching Entries' },
  beliefs: { db: 'beliefs', label: 'Beliefs' },
  ideas: { db: 'ideas', label: 'Ideas', filterDeleted: true },
  sops: { db: 'sops', label: 'SOPs', filterDeleted: true },
  projects: { db: 'projects', label: 'Projects' },
  content_items: { db: 'content_items', label: 'Content Items' },
  weekly_reviews: { db: 'weekly_reviews', label: 'Weekly Reviews' },
  monthly_reviews: { db: 'monthly_reviews', label: 'Monthly Reviews' },
};

// Convert rows to a 2D array for Sheets API
function rowsToSheet(rows: any[]): string[][] {
  if (rows.length === 0) return [['No data']];
  const headers = Object.keys(rows[0]);
  const values = rows.map(row =>
    headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    })
  );
  return [headers, ...values];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth as user
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client for reading tokens & writing sync config
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Google connection
    const { data: connection, error: connErr } = await adminSupabase
      .from('google_calendar_connection')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (connErr || !connection) {
      return new Response(JSON.stringify({ error: 'Google not connected. Please connect Google Calendar first.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(adminSupabase, user.id, connection);

    // Get sync config
    const { data: syncConfig } = await userSupabase
      .from('google_sheets_sync')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const selectedTables: string[] = syncConfig?.selected_tables || Object.keys(TABLE_MAP);

    if (selectedTables.length === 0) {
      return new Response(JSON.stringify({ error: 'No data types selected for sync' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Sheets Sync] Starting sync for user:', user.id, 'tables:', selectedTables);

    // Fetch all selected data
    const tableData: Record<string, any[]> = {};
    for (const key of selectedTables) {
      const config = TABLE_MAP[key];
      if (!config) continue;
      let rows = await fetchAll(adminSupabase, config.db, user.id);
      if (config.filterDeleted) {
        rows = rows.filter((r: any) => !r.deleted_at);
      }
      tableData[key] = rows;
    }

    let spreadsheetId = syncConfig?.spreadsheet_id;
    let spreadsheetUrl = syncConfig?.spreadsheet_url;

    if (!spreadsheetId) {
      // Create new spreadsheet
      console.log('[Sheets Sync] Creating new spreadsheet...');
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { title: 'Planner Data Export' },
          sheets: selectedTables
            .filter(k => TABLE_MAP[k])
            .map((key, i) => ({
              properties: { sheetId: i, title: TABLE_MAP[key].label },
            })),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error('[Sheets Sync] Create spreadsheet error:', err);
        return new Response(JSON.stringify({ error: 'Failed to create Google Sheet. You may need to reconnect Google with Sheets permissions.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sheet = await createRes.json();
      spreadsheetId = sheet.spreadsheetId;
      spreadsheetUrl = sheet.spreadsheetUrl;
      console.log('[Sheets Sync] Created spreadsheet:', spreadsheetId);
    } else {
      // Ensure all needed sheets exist
      console.log('[Sheets Sync] Updating existing spreadsheet:', spreadsheetId);
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!metaRes.ok) {
        // Spreadsheet may have been deleted - recreate
        console.warn('[Sheets Sync] Cannot access existing sheet, will create new one');
        spreadsheetId = null;
        spreadsheetUrl = null;
        // Recursive retry by returning a re-invoke hint
        return new Response(JSON.stringify({ error: 'Previous spreadsheet not accessible. Please try syncing again to create a new one.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const meta = await metaRes.json();
      const existingSheets = new Set(meta.sheets?.map((s: any) => s.properties.title) || []);
      const requests: any[] = [];

      for (const key of selectedTables) {
        const config = TABLE_MAP[key];
        if (!config || existingSheets.has(config.label)) continue;
        requests.push({
          addSheet: { properties: { title: config.label } },
        });
      }

      if (requests.length > 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        });
      }
    }

    // Write data to each sheet tab
    const batchData: any[] = [];
    for (const key of selectedTables) {
      const config = TABLE_MAP[key];
      if (!config) continue;
      const sheetData = rowsToSheet(tableData[key] || []);
      batchData.push({
        range: `'${config.label}'!A1`,
        values: sheetData,
      });
    }

    // Clear existing data first
    const clearRanges = selectedTables
      .filter(k => TABLE_MAP[k])
      .map(k => `'${TABLE_MAP[k].label}'!A:ZZ`);

    if (clearRanges.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ranges: clearRanges }),
        }
      );
    }

    // Write all data
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'RAW',
          data: batchData,
        }),
      }
    );

    if (!writeRes.ok) {
      const err = await writeRes.text();
      console.error('[Sheets Sync] Write error:', err);
      return new Response(JSON.stringify({ error: 'Failed to write data to Google Sheet' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save sync config
    await userSupabase
      .from('google_sheets_sync')
      .upsert({
        user_id: user.id,
        spreadsheet_id: spreadsheetId,
        spreadsheet_url: spreadsheetUrl,
        selected_tables: selectedTables,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    const totalRows = Object.values(tableData).reduce((sum, rows) => sum + rows.length, 0);
    console.log('[Sheets Sync] Success! Wrote', totalRows, 'rows across', selectedTables.length, 'tabs');

    return new Response(JSON.stringify({
      success: true,
      spreadsheet_url: spreadsheetUrl,
      spreadsheet_id: spreadsheetId,
      tables_synced: selectedTables.length,
      total_rows: totalRows,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[Sheets Sync] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
