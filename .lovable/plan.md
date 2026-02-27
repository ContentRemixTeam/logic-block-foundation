

# Auto-refresh Daily Agenda After Scratch Pad Tag Processing

## What's Already Working
The `#task` items from the scratch pad are already saved with today's date (`scheduled_date`) and no time slot, which places them in the "unscheduled" pool on the daily agenda. They ARE being created correctly in the database.

## The Gap
After processing tags, the UI doesn't automatically refresh the task list. The user has to navigate away and back to see the newly created tasks appear on the agenda.

## Fix
Invalidate the React Query task cache after successful tag processing so the daily agenda updates instantly.

### File: `src/components/daily-plan/DailyScratchPad.tsx` (or whichever scratch pad component calls `process-scratch-pad-tags` on the daily plan page)

1. Import `useQueryClient` from `@tanstack/react-query`
2. After a successful `process-scratch-pad-tags` call (inside the success branch of `handleProcessTags`), call `queryClient.invalidateQueries({ queryKey: ['all-tasks'] })` to trigger an immediate refetch of the task list
3. This will cause the daily agenda to re-render with the newly created tasks visible in the unscheduled pool -- no page reload needed

### File: `src/components/weekly-plan/WeeklyScratchPad.tsx`

Same change -- add query invalidation after successful tag processing so the weekly view also reflects new tasks immediately.

## Technical Detail
- Only the query cache invalidation call is added; no data logic or mutations are changed
- The existing `useTasks()` hook and `useTaskMutations()` pattern is respected -- we just tell React Query the cache is stale
- One-line addition per file after the success toast

