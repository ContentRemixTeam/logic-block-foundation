

# Bulletproof Task Saving: Complete Data Protection Implementation

## Problem Statement

Currently, when a user adds a task to the app:

1. **Network failure = data loss** - If the API call fails, the task is gone
2. **Browser crash = data loss** - Input in Quick Capture is not persisted
3. **Tab close = data loss** - Unsaved changes aren't recovered
4. **No retry mechanism** - Failed saves require manual re-entry

The existing data protection system (emergency saves, offline queue, IndexedDB) exists but **is not connected to task creation**.

---

## Solution Overview

```text
+------------------+     +-------------------+     +------------------+
|   User Types     | --> | Multi-Layer Save  | --> | Task Saved!      |
|   Task Text      |     |                   |     |                  |
+------------------+     | 1. Try API        |     +------------------+
                         | 2. Queue Offline  |            |
                         | 3. Save to IDB    |            v
                         | 4. localStorage   |     (Recovery if needed)
                         +-------------------+
```

---

## Implementation Plan

### Phase 1: Resilient Task Mutation Hook

Create a new hook that wraps task creation with offline fallback.

**New File: `src/hooks/useResilientTaskMutation.tsx`**

```typescript
export function useResilientTaskMutation() {
  const { createTask } = useTaskMutations();
  const isOnline = useOnlineStatus();
  const { queueOfflineMutation } = useOfflineSync();
  
  const resilientCreate = async (taskData: CreateTaskParams) => {
    // Save to localStorage immediately as draft
    savePendingTaskDraft(taskData);
    
    if (!isOnline) {
      // Queue for later sync
      await queueOfflineMutation('create', 'tasks', taskData);
      toast.info('Task saved locally. Will sync when online.');
      clearPendingTaskDraft(taskData);
      return;
    }
    
    try {
      const result = await createTask.mutateAsync(taskData);
      clearPendingTaskDraft(taskData);
      return result;
    } catch (error) {
      // Network failed - queue for retry
      await queueOfflineMutation('create', 'tasks', taskData);
      toast.warning('Task saved locally. Will retry automatically.');
    }
  };
  
  return { resilientCreate, isOnline };
}
```

**Key features:**
- Save draft to localStorage immediately (sync, survives crash)
- Queue to IndexedDB if offline or on failure
- Auto-sync when online (existing infrastructure)

---

### Phase 2: Quick Capture Draft Persistence

Update Quick Capture Modal to persist input as user types.

**File: `src/components/quick-capture/QuickCaptureModal.tsx`**

Changes:
1. Add `useEffect` to save input to localStorage on change (debounced)
2. Restore draft on modal open
3. Clear draft on successful save
4. Add "Restore draft" prompt if draft exists

```typescript
// Draft persistence
const DRAFT_KEY = 'quick-capture-draft';

// Save draft on input change (debounced)
useEffect(() => {
  if (!input.trim()) {
    localStorage.removeItem(DRAFT_KEY);
    return;
  }
  
  const timer = setTimeout(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      input,
      captureType,
      parsedTask,
      timestamp: Date.now(),
    }));
  }, 500);
  
  return () => clearTimeout(timer);
}, [input, captureType, parsedTask]);

// Restore on mount
useEffect(() => {
  if (open) {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      const draft = JSON.parse(saved);
      // Only restore if less than 24 hours old
      if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
        setInput(draft.input);
        // Optionally show toast: "Restored your unsaved draft"
      }
    }
  }
}, [open]);
```

---

### Phase 3: Tasks Page Emergency Save Integration

Add emergency save protection to the Tasks page.

**File: `src/pages/Tasks.tsx`**

Add:
1. Track "pending" task creation (text user is typing in add dialog)
2. Use `useBeforeUnload` with emergency config
3. Use `useMobileProtection` for tab backgrounding

```typescript
const [pendingNewTask, setPendingNewTask] = useState<{
  text: string;
  date?: Date;
  priority?: string;
} | null>(null);

// Track pending task as user types in add dialog
const handleNewTaskChange = (text: string) => {
  setNewTaskText(text);
  if (text.trim()) {
    setPendingNewTask({ text, date: newTaskDate, priority: newTaskPriority });
  } else {
    setPendingNewTask(null);
  }
};

// Emergency save
useBeforeUnload({
  hasUnsavedChanges: !!pendingNewTask,
  onFinalSave: () => {
    if (pendingNewTask) {
      localStorage.setItem('task-emergency-draft', JSON.stringify({
        ...pendingNewTask,
        timestamp: Date.now(),
      }));
    }
  },
  enabled: true,
});

useMobileProtection({
  getData: () => pendingNewTask,
  onSave: (data) => {
    localStorage.setItem('task-emergency-draft', JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }));
  },
  enabled: !!pendingNewTask,
});
```

---

### Phase 4: Failed Task Recovery UI

Add a recovery banner when pending/failed tasks exist.

**New File: `src/components/tasks/TaskRecoveryBanner.tsx`**

```typescript
export function TaskRecoveryBanner() {
  const { pendingCount, failedCount, triggerSync, isOnline } = useOfflineSync();
  const [localDrafts, setLocalDrafts] = useState<any[]>([]);
  
  // Check for emergency drafts
  useEffect(() => {
    const drafts = [];
    
    // Quick capture draft
    const quickDraft = localStorage.getItem('quick-capture-draft');
    if (quickDraft) drafts.push({ type: 'quick', data: JSON.parse(quickDraft) });
    
    // Task page draft
    const taskDraft = localStorage.getItem('task-emergency-draft');
    if (taskDraft) drafts.push({ type: 'task', data: JSON.parse(taskDraft) });
    
    setLocalDrafts(drafts);
  }, []);
  
  if (pendingCount === 0 && failedCount === 0 && localDrafts.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <span className="text-sm">
          {pendingCount > 0 && `${pendingCount} tasks pending sync. `}
          {failedCount > 0 && `${failedCount} tasks failed to sync. `}
          {localDrafts.length > 0 && `${localDrafts.length} unsaved drafts found.`}
        </span>
        {isOnline && (pendingCount > 0 || failedCount > 0) && (
          <Button size="sm" variant="outline" onClick={triggerSync}>
            Sync Now
          </Button>
        )}
      </div>
    </div>
  );
}
```

Add this banner to:
- Tasks page (top of content)
- Quick Capture Modal (if drafts exist)
- Dashboard (optional)

---

### Phase 5: Enhance Offline Sync for Tasks

Update the offline sync system to handle task mutations properly.

**File: `src/lib/offlineSync.ts`**

The existing `processMutation` function already handles tasks:
```typescript
case 'tasks':
  endpoint = 'manage-task';
  body = { action: mutation.type, ...mutation.data };
  break;
```

We just need to ensure the task data format is correct when queuing.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useResilientTaskMutation.tsx` | **CREATE** | Wrap task creation with offline fallback |
| `src/components/tasks/TaskRecoveryBanner.tsx` | **CREATE** | Show pending/failed tasks UI |
| `src/components/quick-capture/QuickCaptureModal.tsx` | **MODIFY** | Add draft persistence |
| `src/pages/Tasks.tsx` | **MODIFY** | Add emergency save hooks |
| `src/hooks/useTasks.tsx` | **MODIFY** | Add resilience option to createTask |
| `src/App.tsx` | **MODIFY** | Add global recovery check on mount |

---

## How It Works: Save Flow

```text
User clicks "Add Task"
         |
         v
    +--------------------+
    | Save to localStorage|  <-- Immediate (sync)
    +--------------------+
              |
              v
    +--------------------+
    | Try API call       |
    +--------------------+
         |         \
     Success      Failure
         |            \
    Clear draft    Queue to IndexedDB
         |                \
      Done!          Wait for online
                          |
                   Auto-retry on reconnect
                          |
                       Sync to API
                          |
                       Done!
```

---

## How It Works: Recovery Flow

```text
Page Load / App Start
         |
         v
    +------------------------+
    | Check localStorage for |
    | emergency drafts       |
    +------------------------+
              |
              v
    +------------------------+
    | Check IndexedDB for    |
    | pending mutations      |
    +------------------------+
              |
              v
    +------------------------+
    | Show recovery UI if    |
    | any exist              |
    +------------------------+
              |
         User action
              |
    +--------+--------+
    |                 |
  Restore         Discard
  (Re-add task)   (Clear data)
```

---

## Testing Scenarios

After implementation, verify:

1. **Offline Task Creation**
   - Turn off network
   - Add a task
   - Task appears in local UI
   - Turn network back on
   - Task syncs automatically

2. **Network Failure Recovery**
   - Add a task while online
   - Simulate network failure mid-request
   - Error shows but task is queued
   - Task syncs when retry occurs

3. **Browser Crash Recovery**
   - Start typing in Quick Capture
   - Force close browser
   - Reopen - draft is restored

4. **Tab Close Recovery**
   - Start typing in Add Task dialog
   - Close tab
   - Reopen - draft is restored

5. **Mobile Background**
   - Start typing task on mobile
   - Switch to another app
   - Return - input is preserved

---

## User Experience

**Before:**
- Network fails → "Error creating task" → Task lost forever

**After:**
- Network fails → "Task saved locally. Will sync when online." → Task queues
- Browser crash → Reopen → "We found an unsaved draft. Restore?"
- Offline mode → Tasks save to IndexedDB → Auto-sync later

---

## Technical Notes

- Uses existing infrastructure (`offlineDb`, `offlineSync`, `emergencySave`)
- No new database tables required
- Minimal bundle size impact (reuses existing code)
- Backwards compatible with current behavior
- Progressive enhancement (works if IndexedDB unavailable)

