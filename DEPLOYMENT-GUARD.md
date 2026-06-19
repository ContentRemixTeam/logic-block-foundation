# Google Sheets Rollout Guard

This branch adds Google Sheets as an optional planner-data backend while keeping
Supabase as the default live storage path.

Do not switch any customer to `sheets_primary` until the full setup, write,
read, retry, and rollback path has been tested in staging or with an internal
test account.

Safe rollout order:

1. Deploy the schema and Edge Functions without changing any existing user rows.
2. Confirm the live app still reads and writes tasks through Supabase.
3. Use an internal account to connect Google and create the planner Sheet.
4. Keep `storage_mode = 'sheets_shadow'` while verifying backup writes.
5. Only set `storage_mode = 'sheets_primary'` for one internal test account
   after reads, writes, updates, deletes, and retries are verified.

Required Edge Function secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ENCRYPTION_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional redirect controls:

- `APP_ORIGIN`
- `ALLOWED_APP_ORIGINS`

The production Supabase project ID stays `wdxelomsouudmidakxiz` unless Faith
explicitly chooses to deploy this branch somewhere else.
