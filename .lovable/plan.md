
# Reliability & Scalability Fixes Plan

## Overview
This plan addresses 10 critical issues across security, reliability, and scalability categories to ensure the app can handle thousands of users without data loss.

---

## P0: Must-Do (Critical Security & Reliability)

### 1. Secure emergency-save with Token Validation

**Problem**: The endpoint trusts `payload.userId` and uses service role to write, allowing anyone to write emergency saves for any user_id (data poisoning, abuse, privacy issues).

**Solution**:
- Client: Include access token in sendBeacon payload (sendBeacon can't set Authorization headers)
- Server: Validate token with `supabase.auth.getUser(token)` and derive user_id from the token, ignoring payload's userId
- Add cron job to cleanup old emergency saves (>7 days)

**Files to modify**:
| File | Changes |
|------|---------|
| `src/lib/emergencySave.ts` | Add `token` to payload from session.access_token |
| `supabase/functions/emergency-save/index.ts` | Validate token, extract user_id from auth, ignore payload.userId |

**Database migration**:
- Create cron job to delete emergency_saves older than 7 days

---

### 2. Calendar Updates: Await Saves + Error Handling

**Problem**: `handleSaveEdit` fires `updateItemDate()` but doesn't await it, then immediately shows `toast.success()`. Same issue in drag/drop. Users see "success" even when saves fail.

**Solution**:
- Expose `mutateAsync` from the mutation hook
- Await the mutation before showing success toast
- Show error toast on failure
- Keep drawer open if save fails

**Files to modify**:
| File | Changes |
|------|---------|
| `src/hooks/useEditorialCalendar.ts` | Return both `mutate` and `mutateAsync` from updateItemDate |
| `src/components/editorial-calendar/EditorialCalendarView.tsx` | Await `updateItemDateAsync`, show error toast on failure, keep drawer open on error |

---

### 3. Namespace DnD Draggable IDs (Source:SourceId)

**Problem**: DnD uses `item.id` which is prefixed (`content-X`, `plan-Y`, `task-Z`), but items from different tables could have UUID collisions, and the current `laneContext` approach only handles same-item-in-multiple-lanes, not cross-source collisions.

**Current Implementation**: `${item.id}:${laneContext}` → e.g., `content-abc:create`

**Improved Solution**: Already partially fixed, but the `item.id` is already namespaced with source prefix. The current implementation is adequate but should be documented. The real issue is that `item.sourceId` (the raw UUID) could collide across tables.

**Verification**: The current implementation using `${item.id}:${laneContext}` where `item.id` is already prefixed (e.g., `content-uuid`, `plan-uuid`, `task-uuid`) is sufficient. No code change needed, but add comments for clarity.

---

### 4. Fix Week-Range Filter Logic

**Problem**: The current query logic was already fixed in a previous change to use proper `and()/or()` grouping. Need to verify it's applied consistently.

**Current Code** (already correct):
```typescript
.or(
  `and(planned_creation_date.gte.${weekStartStr},planned_creation_date.lte.${weekEndStr}),` +
  `and(planned_publish_date.gte.${weekStartStr},planned_publish_date.lte.${weekEndStr})`
)
```

**Verification**: The fix is already in place in `useEditorialCalendar.ts` for both content_items and tasks queries.

---

## P1: Should-Do (Performance & Scalability)

### 5. Replace select('*') with Skinny Selects

**Problem**: Calendar queries currently use explicit field selection (already correct), but unscheduled query and other views may still use `*`.

**Current State**: `useEditorialCalendar.ts` already uses explicit selects:
- `select('id, title, type, channel, planned_creation_date, planned_publish_date, status')`

**Verification**: Already implemented. Check other hooks for `select('*')` patterns.

---

### 6. Add Composite Indexes (user_id + date)

**Problem**: Date-only indexes exist but queries are `WHERE user_id = X AND date in range`, requiring composite indexes for optimal performance.

**Solution**: Create composite indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_content_items_user_creation_date 
ON content_items(user_id, planned_creation_date) 
WHERE planned_creation_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_items_user_publish_date 
ON content_items(user_id, planned_publish_date) 
WHERE planned_publish_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_plan_items_user_date 
ON content_plan_items(user_id, planned_date) 
WHERE planned_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_content_creation 
ON tasks(user_id, content_creation_date) 
WHERE content_creation_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_content_publish 
ON tasks(user_id, content_publish_date) 
WHERE content_publish_date IS NOT NULL;
```

---

### 7. Add Pagination Strategy for Tasks

**Problem**: Task fetching is capped at 500 with no pagination. Heavy users will hit the ceiling and think tasks "disappeared".

**Current State**: 
- `useTasks.tsx` calls `{ limit: 500, offset: 0 }`
- `get-all-tasks` edge function supports pagination but client doesn't use it

**Solution Options** (recommend Option B):

**Option A**: Infinite query pagination
- Use `useInfiniteQuery` to load more as user scrolls
- Complex but most complete

**Option B**: Smart filtering (recommended for V1)
- Default fetch: last 90 days + incomplete + pinned
- "Load all" button for full history
- Simpler implementation, sufficient for most users

**Option C**: Split by context
- Calendar: fetch by date range
- Project view: fetch by project_id
- Inbox: fetch recent/open only

**Files to modify**:
| File | Changes |
|------|---------|
| `src/hooks/useTasks.tsx` | Add date range filter, "load more" capability |
| `supabase/functions/get-all-tasks/index.ts` | Add date_from/date_to parameters |

---

### 8. Extend Offline Mutation Queue to Content Calendar

**Problem**: Tasks use offline queue via `useTaskMutations`, but calendar scheduling updates (content_items, content_plan_items) are direct Supabase calls that fail silently offline.

**Solution**: 
- Extend `offlineSync.processMutation` to handle `content_items` and `content_plan_items` tables
- Create edge functions for content calendar mutations (or use direct table updates with queue)
- Wrap calendar mutations in queueMutation when offline

**Files to modify**:
| File | Changes |
|------|---------|
| `src/lib/offlineSync.ts` | Add cases for `content_items` and `content_plan_items` in processMutation |
| `src/hooks/useEditorialCalendar.ts` | Use offline queue for mutations when `!navigator.onLine` |

---

### 9. Update manage-task to Accept Content Calendar Fields

**Problem**: Tasks table has `content_type`, `content_channel`, `content_creation_date`, `content_publish_date`, `content_item_id` but manage-task's Zod schema doesn't include them.

**Solution**: Add these optional fields to the Zod schema and update handler logic:

```typescript
// Add to OptionalTaskFields in manage-task/index.ts
content_type: z.string().nullable().optional(),
content_channel: z.string().nullable().optional(),
content_creation_date: z.string().nullable().optional(),
content_publish_date: z.string().nullable().optional(),
content_item_id: z.string().uuid().nullable().optional(),
```

**Files to modify**:
| File | Changes |
|------|---------|
| `supabase/functions/manage-task/index.ts` | Add content calendar fields to Zod schemas and update handler |

---

### 10. Create Data Access Layer (Future-Proofing)

**Problem**: Supabase access is scattered across hooks, making refactors fragile and error-prone.

**Solution**: Create per-domain data access modules:
```
src/data/
├── tasks.ts          // Task CRUD, consistent error handling
├── contentCalendar.ts // Content items + plan items
├── contentItems.ts   // Content vault operations
└── index.ts          // Re-exports
```

Each module exports:
- Typed fetch functions with explicit field lists
- Typed update functions
- Consistent error handling
- No accidental `select('*')`

**Files to create**:
| File | Purpose |
|------|---------|
| `src/data/contentCalendar.ts` | Calendar-specific queries and mutations |
| `src/data/tasks.ts` | Task queries extracted from useTasks |
| `src/data/index.ts` | Barrel exports |

---

## Implementation Order

1. **Day 1**: P0 items (security + reliability)
   - Emergency-save token validation + cleanup cron
   - Calendar await saves + error handling

2. **Day 2**: P1 performance items
   - Composite indexes (database migration)
   - Task pagination strategy

3. **Day 3**: P1 reliability items
   - Extend offline queue to content calendar
   - Update manage-task with content fields

4. **Day 4**: Future-proofing
   - Create data access layer structure
   - Migrate one domain (contentCalendar) as template

---

## Database Migration Summary

```sql
-- Composite indexes for calendar performance
CREATE INDEX IF NOT EXISTS idx_content_items_user_creation_date 
ON content_items(user_id, planned_creation_date) 
WHERE planned_creation_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_items_user_publish_date 
ON content_items(user_id, planned_publish_date) 
WHERE planned_publish_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_plan_items_user_date 
ON content_plan_items(user_id, planned_date) 
WHERE planned_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_content_creation 
ON tasks(user_id, content_creation_date) 
WHERE content_creation_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_content_publish 
ON tasks(user_id, content_publish_date) 
WHERE content_publish_date IS NOT NULL;

-- Cleanup cron for emergency_saves
SELECT cron.schedule(
  'cleanup-emergency-saves',
  '0 3 * * *', -- Daily at 3 AM
  $$
  DELETE FROM public.emergency_saves 
  WHERE created_at < NOW() - INTERVAL '7 days';
  $$
);
```

---

## Technical Notes

### Token in sendBeacon
Since `sendBeacon` can't set Authorization headers, we pass the token in the JSON payload body. The edge function extracts and validates it server-side.

### Optimistic Updates + Error Recovery
The calendar already uses react-query mutations. We just need to:
1. Return `mutateAsync` alongside `mutate`
2. Use `try/catch` with `mutateAsync` in handlers
3. Only show success toast in the `try` block
4. Show error toast in `catch` block

### Offline Queue Extension
The existing `offlineSync.processMutation` switch statement can be extended with new table cases. For content_items and content_plan_items, we can use direct Supabase updates (with service role) or create new edge functions for consistency.
