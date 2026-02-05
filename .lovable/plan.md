
# Critical Task Manager Fixes for Group Assignment

## Overview

After auditing the code, I've confirmed the following:

- **Backend (Edge Function)**: `section_id` IS properly handled and saved
- **Frontend Wiring**: The parent component correctly passes `section_id` when calling `onCreateTask`
- **Main Issue**: Race condition between optimistic updates and real-time causing potential duplicates/misplacement

---

## Root Cause Analysis

The current `createTask` mutation has this flow:

```text
1. User clicks "Add" in BoardGroup
2. onCreateTask(text) called → parent adds section_id
3. createTask.mutate() fires with { task_text, project_id, section_id }
4. onMutate creates TEMP task (temp-{timestamp}) and adds to cache
5. Edge function creates REAL task in database
6. Real-time subscription fires INSERT event → adds REAL task to cache
7. onSuccess fires → tries to remove temp + add real (might already exist from step 6)
```

**Problems:**
- Step 6 and 7 can race, causing duplicates to briefly appear
- If real-time fires before onSuccess, the deduplication logic handles it, but there may be visual jank
- The optimistic task doesn't have all the server-generated fields

---

## Fixes to Implement

### Fix 1: Simplify createTask Mutation (Remove Race Condition)

**File**: `src/hooks/useTasks.tsx` (lines 131-233)

**Changes**:
1. Remove the `onMutate` optimistic update entirely
2. Keep the mutation simple - let real-time handle the UI update
3. Add a backup invalidation in `onSuccess` in case real-time is slow

```typescript
// Simplified mutation - no optimistic updates, rely on real-time
const createTask = useMutation({
  mutationFn: async (params: Partial<Task> & { task_text: string }) => {
    const session = await getSession();
    
    const logId = mutationLogger.log({
      type: 'create',
      taskText: params.task_text,
      updates: params,
      status: 'pending',
    });
    const startTime = Date.now();
    
    try {
      const response = await supabase.functions.invoke('manage-task', {
        body: { action: 'create', ...params },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (checkAndHandleRateLimit(response)) {
        throw new Error('Rate limit exceeded');
      }
      
      if (response.error) throw response.error;
      
      mutationLogger.updateStatus(logId, 'success', undefined, Date.now() - startTime);
      return response.data?.data as Task;
    } catch (error: any) {
      mutationLogger.updateStatus(logId, 'error', error?.message, Date.now() - startTime);
      throw error;
    }
  },
  // NO onMutate - rely on real-time subscription for UI update
  onSuccess: (createdTask) => {
    // Backup: If real-time didn't fire within 1 second, invalidate queries
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
    }, 1000);
    toast.success('Task created');
  },
  onError: (err) => {
    showOperationError('create', 'Task', err);
  },
});
```

---

### Fix 2: Add Loading State to BoardGroup

**File**: `src/components/projects/monday-board/BoardGroup.tsx` (lines 78-84)

**Changes**:
Add a loading state to give visual feedback while task is being created.

```typescript
// Add new state
const [isCreating, setIsCreating] = useState(false);

// Update handleAddTask to be async
const handleAddTask = async () => {
  if (newTaskText.trim() && !isCreating) {
    setIsCreating(true);
    try {
      onCreateTask(newTaskText.trim());
      setNewTaskText('');
      setIsAddingTask(false);
    } finally {
      // Delay clearing to allow real-time to catch up
      setTimeout(() => setIsCreating(false), 500);
    }
  }
};

// Update the Add button to show loading state
<Button 
  size="sm" 
  className="h-7" 
  onClick={handleAddTask}
  disabled={isCreating || !newTaskText.trim()}
>
  {isCreating ? 'Adding...' : 'Add'}
</Button>
```

---

### Fix 3: Add Debug Logging (Temporary)

**File**: `src/components/projects/monday-board/MondayBoardView.tsx` (lines 40-79)

**Changes**:
Add temporary logging to verify task grouping is working correctly.

```typescript
// Add debug logging in tasksBySection useMemo
const tasksBySection = useMemo(() => {
  const grouped: Record<string, Task[]> = { unsectioned: [] };
  
  sections.forEach(section => {
    grouped[section.id] = [];
  });

  tasks.forEach(task => {
    // Apply search filter
    if (searchQuery && !task.task_text.toLowerCase().includes(searchQuery.toLowerCase())) {
      return;
    }

    // Apply other filters
    if (filters.status && task.status !== filters.status) return;
    if (filters.priority && task.priority !== filters.priority) return;

    // DEBUG: Log task grouping (remove after testing)
    if (task.project_id === projectId) {
      console.log('[TaskGrouping]', {
        id: task.task_id.slice(0, 8),
        text: task.task_text.slice(0, 30),
        section_id: task.section_id,
        has_section_bucket: task.section_id ? !!grouped[task.section_id] : false
      });
    }

    if (task.section_id && grouped[task.section_id]) {
      grouped[task.section_id].push(task);
    } else {
      grouped.unsectioned.push(task);
    }
  });

  // DEBUG: Log final grouping (remove after testing)
  console.log('[TaskGrouping] Result:', 
    Object.entries(grouped).map(([k, v]) => `${k.slice(0, 8)}: ${v.length}`).join(', ')
  );

  // Apply sorting...
  return grouped;
}, [tasks, sections, searchQuery, filters, sortConfig, projectId]);
```

---

### Fix 4: Improve Real-time Handler Logging

**File**: `src/hooks/useTasks.tsx` (lines 66-114)

**Changes**:
Add more detailed logging to the real-time handler.

```typescript
// In the real-time subscription callback
(payload) => {
  console.log('Task realtime update:', {
    event: payload.eventType,
    taskId: (payload.new as Task)?.task_id?.slice(0, 8) || (payload.old as Task)?.task_id?.slice(0, 8),
    section_id: (payload.new as Task)?.section_id,
    project_id: (payload.new as Task)?.project_id,
  });
  
  // ... rest of handler
}
```

---

## Summary of Changes

| File | Change | Priority |
|------|--------|----------|
| `src/hooks/useTasks.tsx` | Remove optimistic update from createTask, add backup invalidation | HIGH |
| `src/hooks/useTasks.tsx` | Add detailed logging to real-time handler | MEDIUM |
| `src/components/projects/monday-board/BoardGroup.tsx` | Add loading state and disable button while creating | MEDIUM |
| `src/components/projects/monday-board/MondayBoardView.tsx` | Add debug logging for task grouping | LOW (temporary) |

---

## Testing Checklist

After implementation:
- [ ] Create task in a group - appears in correct group within 1-2 seconds
- [ ] Check browser console for `[TaskGrouping]` logs showing correct section_id
- [ ] No duplicate tasks appearing
- [ ] "Add" button shows "Adding..." while creating
- [ ] Task doesn't flash to "Uncategorized" before moving to correct group
- [ ] Reload page - tasks remain in correct groups
- [ ] Check console for real-time logs confirming section_id is populated

---

## Verification SQL

Run this in the database to verify `section_id` is saved correctly:

```sql
SELECT task_id, task_text, project_id, section_id, created_at 
FROM tasks 
WHERE project_id = 'your-project-id'
ORDER BY created_at DESC 
LIMIT 10;
```

If `section_id` is NULL for tasks that should be in groups, there's a bug in the frontend passing the value. If `section_id` is correct but UI shows them in "Uncategorized", there's a grouping logic issue.
