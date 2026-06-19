# Google Sheets Backend Architecture

## Goal

Build a customer-owned data backend where each user keeps their long-term planner data in their own Google Sheet, while the app still feels as reliable as a normal hosted app.

This is not only a privacy/export feature. It is a business-model requirement for a low-cost lifetime offer. The scalable costs should sit primarily with the customer's Google account and browser, not with an ever-growing Supabase database or high-volume Edge Function usage.

## Bottom Line

Use a reliability-first, low-cost hybrid architecture:

- Browser local storage/IndexedDB is the instant safety layer. It saves first so the user's work does not disappear if Google is slow, offline, or reconnecting.
- Google Sheets is the long-term source of truth for planner data: tasks, projects, daily plans, weekly plans, 90-day goals, ideas, habits, reviews, and brain dumps.
- Supabase is the small control plane and temporary reliability buffer: auth, purchase/license entitlement, Sheet ID, schema version, recent pending writes, recent sync errors, and AI connection keys.
- Supabase should not become the permanent planner database. Synced planner payloads should be cleaned up after a short recovery/support window.
- Google API work should happen in the customer's browser with the customer's Google authorization wherever practical, so usage scales with the customer rather than the app owner's Supabase project.
- Every write is append-first, versioned, locally recoverable, and never handled by clearing/replacing an entire tab during normal app use.

The product promise should be:

> Your planner data lives in a Google Sheet you own. The app saves locally first, backs up to your Sheet, and keeps a short-term safety buffer so your work is protected if syncing gets interrupted.

## Why This Is Feasible In This App

The app already has a useful foundation:

- Google OAuth exists and already requests Sheets permission in `supabase/functions/google-oauth-start/index.ts`.
- The current Sheets feature can create a spreadsheet and write tabs in `supabase/functions/google-sheets-sync/index.ts`.
- Core tasks and projects already call Edge Functions (`get-all-tasks`, `manage-task`, `get-projects`, `manage-project`) instead of only writing directly from React.
- The app already has local data protection patterns in `src/lib/storage.ts`, `src/lib/emergencySave.ts`, `src/hooks/useFormDraftProtection.ts`, and existing daily/weekly plan autosave flows.

The original safe-SaaS path was to change storage behind the Edge Functions. For the $50 lifetime model, the better end state is different: move high-volume planner reads/writes out of Supabase and into a browser-side storage service that writes to the customer's Sheet, with Supabase used only as control plane and temporary buffer.

This should still be migrated gradually. Do not flip every page at once.

## Cost Shape

Design the app so costs scale like this:

- Customer Google account pays storage/API quota for their own planner data.
- Customer browser/device handles most reads, writes, validation, and sync queue work.
- Supabase stores only small metadata plus temporary sync events.
- Static hosting serves the app bundle.

Avoid designs where every task keystroke, task load, or AI-created item requires a Supabase Edge Function call.

Accept that a thin Supabase buffer is still useful. It protects users from lost work across devices and gives support a short recovery window. The key is retention: Supabase should store pending/failed/recent events, not a lifetime history of every task and plan.

## Important Google Constraints

Design decisions should respect these current Google API realities:

- Sheets API has per-minute quotas. Current documented default limits are 300 read requests per minute per project, 60 read requests per minute per user per project, 300 write requests per minute per project, and 60 write requests per minute per user per project.
- Google recommends keeping request payloads around 2 MB for speed.
- Google recommends exponential backoff for 429 quota errors.
- Batch operations are important. The app should use `values.batchGet`, `values.batchUpdate`, and `spreadsheets.batchUpdate` instead of many tiny calls.
- Google Picker can let users pick an existing Drive file, and Google documents `drive.file` as the scope used for Picker views.
- OAuth scope changes may require Google verification. Use the narrowest set of scopes that supports the product.

Official references:

- https://developers.google.com/workspace/sheets/api/limits
- https://developers.google.com/workspace/sheets/api/guides/batchupdate
- https://developers.google.com/workspace/sheets/api/guides/values
- https://developers.google.com/workspace/drive/picker/guides/overview
- https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification

## User Setup Experience

The setup should be a short guided flow in Settings or onboarding:

1. User clicks `Set up my Google Sheet`.
2. App explains: "Your planning data will be stored in a Google Sheet owned by you. We keep a backup and never delete rows automatically."
3. User connects Google or reconnects if current scopes are missing.
4. User chooses:
   - `Create a new planner Sheet for me` (recommended)
   - `Use an existing Sheet`
5. If creating a new Sheet, app creates:
   - spreadsheet title: `Becoming Boss Planner Data - {user email}`
   - tabs and headers
   - protected header rows
   - hidden system tabs
   - metadata identifying the app, schema version, and user
6. Browser writes a first snapshot through the customer's Google authorization.
7. App runs a read-after-write health check.
8. User sees a connected status with:
   - Sheet link
   - last successful backup time
   - storage mode
   - rollback option

The user should not have to manually create tabs, copy headers, paste IDs, or understand database terms.

## Recommended Sheet Structure

Visible user data tabs:

- `Tasks`
- `Projects`
- `Daily Plans`
- `Weekly Plans`
- `Cycles`
- `Habits`
- `Ideas`
- `Reviews`

Hidden/protected system tabs:

- `_App_Config`
- `_Change_Log`
- `_Snapshots`
- `_Deleted_Items`
- `_Sync_Errors`
- `_Schema`

Every user-data tab should include these standard columns:

- `id`
- `user_id_hash`
- `created_at`
- `updated_at`
- `deleted_at`
- `version`
- `last_write_id`
- `sync_status`
- `source`

Do not expose raw Supabase user IDs in the Sheet if it is not necessary. Use a stable hash or opaque owner key.

## Data Safety Rules

These rules matter more than speed:

0. Save locally first.
   - Every mutation writes to local storage/IndexedDB before attempting Google.
   - The UI can say `Saved on this device` immediately.
   - Google sync can happen next and update the state to `Backed up to Google`.

1. Never hard-delete planner rows during normal app use.
   - Delete means set `deleted_at`.
   - Restore clears `deleted_at`.
   - Permanent delete can be a separate advanced/admin action later.

2. Never clear and rewrite full user tabs for normal saves.
   - The current export function uses clear-and-rewrite behavior. That is okay for export, but not safe enough for the primary backend.
   - Normal saves should update specific rows or append changes.

3. Every write gets an append-only change-log entry.
   - Write to `_Change_Log` before or with the visible tab update.
   - Include `write_id`, `entity_type`, `entity_id`, `action`, `before_hash`, `after_hash`, `created_at`, and `client_id`.

4. Every important write has an idempotency key.
   - If the browser retries, the backend can see the same `write_id` and avoid duplicates.

5. Every row has a version.
   - Updates must provide the version they read.
   - If the version changed, return a conflict instead of overwriting silently.

6. Use read-after-write verification.
   - After critical writes, confirm the row exists with the expected version/hash.
   - If verification fails, keep the write queued and show a recoverable warning.

7. Keep local pending writes.
   - Use IndexedDB/local app storage for pending mutations when offline, when Google is rate-limited, or when OAuth needs reconnect.
   - Show "saving" and "saved" states honestly.

8. Use Supabase as a temporary buffer, not lifetime storage.
   - Pending and failed writes can be sent to Supabase when the user is authenticated and local-only recovery is not enough.
   - Synced write payloads should be pruned after 7-30 days.
   - Long-term snapshots belong in the user's Sheet, not in Supabase.

9. Snapshot regularly.
   - Daily compact snapshots for active users.
   - Snapshot before schema migration.
   - Snapshot before switching storage mode.

10. Keep a Supabase fallback during rollout only.
   - Pilot users may temporarily mirror writes to Supabase while Sheets reliability is proven.
   - Do not let this become the permanent data model for the lifetime product.
   - Rollback can recover from the recent Supabase buffer plus the latest Sheet snapshot.

## Storage Shape

Add one storage interface used by planner pages:

```ts
interface PlannerStorageAdapter {
  getTasks(input): Promise<TasksResponse>;
  createTask(input): Promise<Task>;
  updateTask(input): Promise<Task>;
  deleteTask(input): Promise<Task>;
  getProjects(input): Promise<Project[]>;
  createProject(input): Promise<Project>;
  updateProject(input): Promise<Project>;
  deleteProject(input): Promise<void>;
}
```

Implementations:

- `googleSheetsStorageAdapter`
- `localPendingWriteAdapter`
- `supabaseTemporaryBufferAdapter`
- temporary rollout-only `supabasePlannerAdapter`

Routing rule:

- User metadata says `storage_mode = supabase_legacy | sheets_shadow | sheets_primary`.
- Existing internal users can remain on `supabase_legacy` during migration.
- Test users move to `sheets_shadow` while the Sheet is verified and local queue works.
- New low-cost/lifetime users should move toward `sheets_primary` after the task vertical slice proves reliable.
- Pages should not call Google Sheets APIs directly. They should call the storage service, which handles local save, Google write, verification, retries, and buffer cleanup.

## Minimal Supabase Tables To Keep

Keep these in Supabase:

- `auth.users`
- `entitlements`
- `user_profiles`
- `google_calendar_connection` or renamed `google_connection` for OAuth metadata during the current transition
- `planner_storage_connections`
- `rate_limits`
- `error_logs`
- `feature_flags`
- `admin_users`
- `ai_connection_keys`
- `planner_pending_writes` or `planner_sync_events` with short retention

Add/replace with:

- `planner_storage_connections`
  - `user_id`
  - `storage_mode`
  - `provider`
  - `spreadsheet_id`
  - `spreadsheet_url`
  - `schema_version`
  - `last_verified_at`
  - `last_snapshot_at`
  - `last_error`
  - `is_healthy`

- `planner_storage_write_audit`
  - tiny audit copy of write metadata only, not full user planner data
  - useful for support when a user says "my task disappeared"

- `planner_pending_writes`
  - short-lived recovery queue only
  - may include compact payloads while pending/failed/recent
  - prune synced payloads after 7-30 days
  - keep non-sensitive metadata longer if needed

## Migration Phases

### Phase 0: Safety Harness

- Add storage mode metadata.
- Add browser-side storage service interface.
- Add local pending-write queue.
- Add health check function.
- Add setup status UI.
- No user-facing storage changes yet.

### Phase 1: Sheet Setup

- Convert the current `google-sheets-sync` export into a safer Sheet setup flow.
- Create or connect a Sheet.
- Write protected headers and hidden system tabs.
- Store the connection in Supabase.
- Run read-after-write verification.

Current experiment status:

- `planner-sheet-setup`, `planner_storage_connections`, `PlannerSheetStoragePanel`, and `usePlannerSheetSetup` create and verify the customer-owned planner Sheet.
- Task create now has a shadow backup path through `planner-task-sync`, with local retry support when Google backup fails.
- Tasks now have a first true `sheets_primary` path through the existing `get-all-tasks` and `manage-task` Edge Functions. When a user is switched to `sheets_primary`, task reads plus create/update/toggle/checklist/detach/soft-delete actions use the customer-owned Sheet instead of the permanent Supabase `tasks` table.
- The `Tasks` tab stores readable columns plus `payload_json` so full task details are preserved even when the visible columns are intentionally compact.
- Settings includes a test switch for moving a verified Sheet connection into `sheets_primary` and back to `sheets_shadow`.

This is enough to test the core task vertical slice after deployment. It still runs through Supabase Edge Functions, which is acceptable for setup/testing and removes permanent task storage from Supabase in `sheets_primary`. The later cost-optimization step is moving high-volume writes browser-side once the data shape and reliability rules are proven.

### Phase 2: First Sheets-Primary Vertical Slice

- Implement one task create flow through the new storage service. Done for deployed/testable code path.
- Save locally first. Done for shadow backup queue; true browser-first primary writes still need the later browser-side optimization.
- Write to the user's Google Sheet. Done for task create/update/toggle/checklist/detach/soft-delete in `sheets_primary`.
- Verify the row. Partially done through read paths and change-log writes; full automated verification script still needed.
- Store only small sync status and recent error/pending metadata in Supabase. Done for shadow audit metadata; true primary task data stays in the Sheet.
- Read the task back from the Sheet into the app. Done through `get-all-tasks` when `storage_mode = sheets_primary`.
- Confirm the task survives refresh, reconnect, and app reopen. Still needs end-to-end deployed testing with a logged-in Google-connected test user.

### Phase 3: Task Reliability Coverage

- Add task update, complete, soft-delete, and restore.
- Add `_Change_Log`, `_Sync_Errors`, and local pending-write recovery for each action.
- Add a Settings data-safety panel: last Google backup, pending changes, retry backup, open Sheet, emergency export.

### Phase 4: Expand Domain Coverage

After task reliability works, migrate additional domains:

- projects
- weekly plans
- daily plans
- 90-day goals/cycles
- habits
- ideas
- reviews

Leave more complex/high-risk areas for later:

- financial tracker
- AI generation history
- admin/member entitlement data
- rate limits
- Google calendar sync state

### Phase 5: AI Inbox Without App-Owned API Cost

- Let Codex/Claude/customer AI tools write to controlled inbox tabs in the user's Sheet when the user grants them Sheet access.
- The browser app imports from `AI_Task_Inbox`, `AI_Project_Inbox`, and `AI_Weekly_Plan_Inbox`.
- Importing validates fields, assigns stable IDs, moves clean data into app tabs, and writes status back to the inbox row.
- This keeps scalable AI/write costs on the customer/tool side instead of requiring the app owner's API for every AI-generated task.

## Reliability UX

The app should always tell the user the truth in plain language:

- `Saved`
- `Saving...`
- `Saved locally, syncing to Google`
- `Google is taking a minute. Your changes are safe on this device.`
- `Needs reconnect`
- `Backup complete`
- `Backed up to Google`
- `Saved on this device. Google backup will resume when you reconnect.`

Avoid scary messages unless action is needed. The key promise is: "Your change is not lost."

## What Not To Do

The original safe-SaaS version said not to make the browser write directly to Google Sheets. For this low-cost lifetime product, direct browser-to-Sheets writes are acceptable and likely necessary, but only through the storage service and only with local save, versioning, verification, and retry behavior.

- Do not clear full tabs as the normal save mechanism.
- Do not make users manually edit hidden system tabs.
- Do not make Sheets the only copy on day one.
- Do not migrate every feature at once.
- Do not store secrets in the Sheet.
- Do not rely on row number as the permanent ID.
- Do not keep permanent planner payloads in Supabase after they are safely synced.
- Do not make all AI/Codex/Claude writes depend on app-owned API calls if the goal is to push scalable costs to the customer.

## First Build Slice

The first code slice should be:

1. Keep/save the current setup slice:
   - `planner_storage_connections` migration
   - `planner-sheet-setup`
   - `PlannerSheetStoragePanel`
   - `usePlannerSheetSetup`
2. Add the browser-side storage service contract.
3. Add local pending-write queue support using IndexedDB/local fallback.
4. Implement one action: create task.
5. Create task flow:
   - save locally
   - assign stable ID and version
   - write row to `Tasks`
   - append `_Change_Log`
   - verify read-after-write
   - mark local write synced
   - write small sync status to Supabase
6. Tests or scripts verify:
   - Sheet creation
   - header creation
   - write one task
   - read it back
   - survive refresh
   - recover pending write if Google fails
   - no full-tab clear/rewrite

## Open Decisions

- Should existing Supabase-heavy users be migrated automatically, or only offered an opt-in?
- Should member-owned Sheets live in their root Drive or a named folder?
- Do we want Google Picker now, or start with "create a new Sheet" only?
- What is the exact Supabase retention window for synced payloads: 7, 14, or 30 days?
- What support/admin screen does Faith need to diagnose sync health?
- Does the low-cost/lifetime product require users to connect Google before they can use the app?
- Should Google access be requested through GIS/browser tokens for high-volume writes while keeping current server OAuth only for legacy calendar features?

## Recommendation

Start with "create a new Sheet for me" and skip existing-Sheet import until the core storage path is reliable. That gives users the easiest setup and gives us a predictable schema.

The safest initial promise is:

"Your planner data is stored in a private Google Sheet that you own. The app saves your work on this device first, backs it up to Google, and keeps a short-term recovery buffer so your work is protected if syncing gets interrupted."
