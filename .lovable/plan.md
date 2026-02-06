
# Smart Task Loading with Cursor-Based Pagination

## Overview

Transform the task loading system from "load all at once" to "load on demand" using cursor-based pagination. This ensures fast initial loads (~300ms for 50 tasks) and smooth performance even for users with 5,000+ tasks.

## Current State

| Component | Status |
|-----------|--------|
| `get-all-tasks` edge function | Supports offset pagination, not cursor-based |
| `useTasks` hook | Loads all tasks up to 500 limit, no pagination |
| `usePaginatedQuery` hook | Exists but uses offset-based approach |
| Task views | No "Load More" UI |

## Implementation

### Step 1: Update Edge Function for Cursor-Based Pagination

Modify `supabase/functions/get-all-tasks/index.ts` to:

| Parameter | Default | Max | Purpose |
|-----------|---------|-----|---------|
| `page_size` | 50 | 100 | Items per request |
| `cursor` | null | - | ISO timestamp for pagination |
| `filters.status` | null | - | Optional status filter |
| `filters.project_id` | null | - | Optional project filter |

**Key changes:**
- Accept `page_size` (default 50, max 100) instead of `limit`
- Accept `cursor` (ISO timestamp) for pagination
- When cursor provided, add `.lt('created_at', cursor)` to query
- Keep existing smart filtering (90 days + incomplete tasks)
- Return enhanced metadata structure:

```typescript
{
  data: Task[],
  metadata: {
    count: number,
    hasMore: boolean,
    nextCursor: string | null,
    filters: object
  }
}
```

### Step 2: Enhance useTasks Hook

Add pagination state management to `src/hooks/useTasks.tsx`:

**New state variables:**
- `cursor` - current pagination cursor (null = first page)
- `allTasks` - accumulated tasks across pages

**New interface:**
```typescript
interface UseTasksOptions {
  pageSize?: number;
  filters?: { status?: string; project_id?: string };
  enabled?: boolean;
}
```

**New return values:**
```typescript
{
  tasks: Task[],           // Accumulated tasks
  isLoading: boolean,      // Initial load
  isFetching: boolean,     // Any load (initial or more)
  hasMore: boolean,        // More pages available
  loadMore: () => void,    // Load next page
  reset: () => void,       // Clear and reload
  refetch: () => void,     // Refresh current data
}
```

**Key behaviors:**
- First page replaces `allTasks`
- Subsequent pages append to `allTasks`
- Filter changes call `reset()` automatically
- Real-time updates still work (update in-memory array)
- Performance warning when > 500 tasks loaded

### Step 3: Update Tasks Page UI

Add pagination UI to `src/pages/Tasks.tsx`:

**Task count indicator:**
```
Showing 50 tasks (more available)
```

**Load More button (at bottom of list):**
- Shows when `hasMore` is true and not fetching
- Displays loading spinner during fetch
- Styled as outline button, full width

**Filter reset handling:**
- When activeTab, filters, or searchQuery change → call `reset()`
- Ensures fresh data when switching views

### Step 4: Propagate to Child Views

Update view components to receive pagination props:

**TaskListView, TaskKanbanView, TaskThreeDayView:**
- Add optional `hasMore` prop
- Add optional `onLoadMore` prop
- Add optional `isLoadingMore` prop
- Render "Load More" button after task list

This keeps the UI consistent across all view modes.

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/get-all-tasks/index.ts` | Add cursor-based pagination logic |
| `src/hooks/useTasks.tsx` | Add pagination state, loadMore, reset functions |
| `src/pages/Tasks.tsx` | Use new hook interface, add UI indicators |
| `src/components/tasks/views/TaskListView.tsx` | Add "Load More" button |

## Technical Details

### Cursor-Based vs Offset-Based

Cursor-based pagination is more reliable for real-time data:
- Offset skips items if new tasks are added between pages
- Cursor always fetches tasks older than the last seen item
- No duplicate or missing items when data changes

### Query Key Strategy

Include cursor in query key for proper caching:
```typescript
queryKey: [...taskQueryKeys.all, { loadAll, cursor, pageSize }]
```

### Real-Time Integration

When real-time events occur:
- INSERT: Prepend to `allTasks` (newest first)
- UPDATE: Modify matching task in `allTasks`
- DELETE: Remove from `allTasks`

The accumulated array is updated directly, no refetch needed.

### Performance Safeguards

1. **Page size limit**: Max 100 items per request
2. **Warning at 500 tasks**: Console message suggests archiving
3. **Smart filtering preserved**: Only loads relevant tasks by default
4. **Cache accumulation**: Navigation preserves loaded pages

## Expected Behavior

| Scenario | Before | After |
|----------|--------|-------|
| Initial load | 300-2000ms (all tasks) | ~300ms (50 tasks) |
| User with 1000 tasks | Slow, laggy UI | Fast, incremental loading |
| Filter change | Full reload | Reset to first page |
| Real-time update | Full reload | In-memory update |
| Navigation away/back | Refetch all | Resume from cache |

## Testing Checklist

After implementation:
- Initial load shows first 50 tasks
- "Load More" button appears when hasMore is true
- Clicking "Load More" appends next batch without duplicates
- Changing filters resets to first page
- Console warning appears if > 500 tasks loaded
- Real-time updates work with paginated data
- Query performance < 500ms per page
