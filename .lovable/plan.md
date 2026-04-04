

## Google Sheets Sync — Manual, User-Selectable Data

### Cost Impact

**$0 ongoing cost.** Manual button-click means no scheduled edge function calls. Google Sheets API is free (500 req/100s quota). The only cost is the edge function invocation when a user clicks "Sync" — negligible even at scale.

### How It Works

1. User goes to Settings, sees a "Google Sheets Sync" panel
2. Since they already connected Google Calendar, we add the Sheets scope to the existing OAuth flow
3. User picks which data types to sync (tasks, daily plans, habits, etc.)
4. User clicks "Sync Now" — an edge function reads their data, writes it to a Google Sheet (one tab per data type)
5. The Sheet URL is saved so they can share it with Claude or other AI tools

### Technical Plan

**1. Add Google Sheets scope to OAuth flow**

Update `google-oauth-start/index.ts` to include `https://www.googleapis.com/auth/spreadsheets` in the scopes array. Users who already connected will need to reconnect once (we'll show a prompt).

**2. New database table: `google_sheets_sync`**

Stores the user's Sheet ID, selected data types, and last sync timestamp.

```sql
CREATE TABLE public.google_sheets_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spreadsheet_id TEXT,
  spreadsheet_url TEXT,
  selected_tables TEXT[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
-- RLS: users can only access their own row
```

**3. New edge function: `google-sheets-sync`**

- Authenticates user, gets their Google access token from `google_calendar_connection`
- Reads selected data types from the database (reusing the `fetchAll` pattern from `dataExport.ts`)
- Creates a new Google Sheet (first sync) or updates existing one
- Writes each selected data type as a separate tab (Tasks, Daily Plans, Habits, etc.)
- Saves the spreadsheet ID/URL back to the database

**4. Settings UI: `GoogleSheetsSyncPanel.tsx`**

- Shows sync status and last sync time
- Checkbox list of data types to include (tasks, cycles, daily plans, weekly plans, habits, coaching entries, etc.)
- "Sync Now" button with loading state
- Link to open the synced Google Sheet
- Note: "Requires Google Calendar connection" if not connected
- Reconnect prompt if connected but missing Sheets scope

**5. Files to create/modify**

| File | Action |
|------|--------|
| `supabase/functions/google-oauth-start/index.ts` | Add Sheets scope |
| `supabase/functions/google-oauth-callback/index.ts` | Store granted scopes for scope detection |
| `supabase/functions/google-sheets-sync/index.ts` | New — core sync logic |
| `src/components/google-sheets/GoogleSheetsSyncPanel.tsx` | New — settings UI |
| `src/hooks/useGoogleSheetsSync.ts` | New — hook for sync state/actions |
| Settings page | Add the new panel |
| Database migration | New `google_sheets_sync` table |

