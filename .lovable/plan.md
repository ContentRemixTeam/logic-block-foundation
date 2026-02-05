

# Deep Audit & Fix: Project Task Manager Date Glitches

## Root Cause Identified

The error **"Rendered more hooks than during the previous render"** is caused by a **React Hooks violation** in `TaskDetailsDrawer.tsx`:

```typescript
// Line 120 - Early return BEFORE hooks
if (!task || !localTask) return null;

// Line 125 - useCallback is called AFTER the early return!
const handleChange = useCallback((field: keyof Task, value: any) => {
  // ...
}, [task?.task_id, onUpdate, localStorageKey]);
```

This violates React's Rules of Hooks: hooks must be called in the same order on every render. When `task` becomes `null` or changes, the early return causes `useCallback` to be skipped, breaking React's hook tracking.

---

## All Issues Found

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | **`useCallback` after early return** | `TaskDetailsDrawer.tsx:120-125` | CRITICAL |
| 2 | **STATUS_OPTIONS still exists** (should be removed per previous plan) | `TaskDetailsDrawer.tsx:30-36` | Medium |
| 3 | **STATUS_OPTIONS still exists** | `BoardToolbar.tsx:26-32` | Medium |
| 4 | **Status dropdown still renders** | `TaskDetailsDrawer.tsx:214-232` | Medium |
| 5 | **Status filter still active** | `BoardToolbar.tsx:92-102` | Medium |
| 6 | **Status filter badge** | `BoardToolbar.tsx:126-130` | Medium |

---

## Fix #1: Move `useCallback` Before Early Return (CRITICAL)

**File:** `src/components/projects/monday-board/TaskDetailsDrawer.tsx`

The `handleChange`, `handleTagToggle`, `handleChecklistToggle`, and `isChecklistItemCompleted` functions need to be refactored. Since they depend on `localTask`, we need to either:

**Option A (Recommended):** Move the early return to after all hooks are declared, and guard the function bodies instead

**Option B:** Convert functions to regular functions (not hooks) and handle null cases inside

### Implementation (Option A):

Move all hooks to the top, before any conditional returns:

```typescript
export function TaskDetailsDrawer({ task, onClose, onUpdate, onDelete }: TaskDetailsDrawerProps) {
  // ALL hooks MUST come first, before any returns
  const [localTask, setLocalTask] = useState<Task | null>(task);
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { data: sops = [] } = useSOPs();
  const isOnline = useOnlineStatus();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localStorageKey = `task_edit_draft_${task?.task_id}`;
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Effects must come before conditional returns
  useEffect(() => {
    setLocalTask(task);
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
  }, [task]);

  useEffect(() => {
    if (localTask && hasUnsavedChanges) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify({
          data: localTask,
          timestamp: new Date().toISOString(),
        }));
      } catch (e) {
        console.error('Failed to save task draft:', e);
      }
    }
  }, [localTask, hasUnsavedChanges, localStorageKey]);

  useEffect(() => {
    if (task) {
      try {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          const age = Date.now() - new Date(timestamp).getTime();
          if (age < 60 * 60 * 1000 && JSON.stringify(data) !== JSON.stringify(task)) {
            setLocalTask(data);
            setHasUnsavedChanges(true);
          } else {
            localStorage.removeItem(localStorageKey);
          }
        }
      } catch (e) {
        console.error('Failed to restore task draft:', e);
      }
    }
  }, [task?.task_id, localStorageKey]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // useCallback MUST come BEFORE early return
  const handleChange = useCallback((field: keyof Task, value: any) => {
    if (!task) return; // Guard inside the callback
    
    setLocalTask(prev => prev ? { ...prev, [field]: value } : null);
    setHasUnsavedChanges(true);
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        onUpdate(task.task_id, { [field]: value });
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        localStorage.removeItem(localStorageKey);
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Failed to save task:', error);
        setSaveStatus('error');
      }
    }, 1000);
  }, [task, onUpdate, localStorageKey]);

  // NOW the early return is safe
  if (!task || !localTask) return null;

  // Rest of component...
}
```

---

## Fix #2: Remove STATUS_OPTIONS from TaskDetailsDrawer

**File:** `src/components/projects/monday-board/TaskDetailsDrawer.tsx`

**Remove lines 30-36:**
```typescript
// DELETE THIS:
const STATUS_OPTIONS = [
  { value: 'focus', label: 'Focus' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'someday', label: 'Someday' },
];
```

**Remove lines 214-232 (Status dropdown):**
```typescript
// DELETE THIS ENTIRE BLOCK:
<div className="space-y-2">
  <Label>Status</Label>
  <Select
    value={localTask.status || ''}
    onValueChange={(value) => handleChange('status', value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select status" />
    </SelectTrigger>
    <SelectContent>
      {STATUS_OPTIONS.map(option => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

The Priority dropdown on the same row should expand to full width.

---

## Fix #3: Remove STATUS_OPTIONS from BoardToolbar

**File:** `src/components/projects/monday-board/BoardToolbar.tsx`

**Remove lines 26-32:**
```typescript
// DELETE THIS:
const STATUS_OPTIONS = [
  { value: 'focus', label: 'Focus' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'someday', label: 'Someday' },
];
```

**Remove lines 92-102 (Status filter in dropdown):**
```typescript
// DELETE THIS:
<DropdownMenuLabel>Status</DropdownMenuLabel>
{STATUS_OPTIONS.map(option => (
  <DropdownMenuItem
    key={option.value}
    onClick={() => onFiltersChange({ ...filters, status: option.value })}
    className={filters.status === option.value ? 'bg-accent' : ''}
  >
    {option.label}
  </DropdownMenuItem>
))}
<DropdownMenuSeparator />
```

**Remove lines 126-130 (Status filter badge):**
```typescript
// DELETE THIS:
{filters.status && (
  <Badge variant="secondary" className="gap-1">
    Status: {filters.status}
    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('status')} />
  </Badge>
)}
```

---

## Fix #4: Update MondayBoardView Filter Logic

**File:** `src/components/projects/monday-board/MondayBoardView.tsx`

**Remove line 54 (status filter check):**
```typescript
// DELETE THIS LINE:
if (filters.status && task.status !== filters.status) return;
```

The priority filter on line 55 should remain.

---

## Fix #5: Remove Debug Logging (Cleanup)

**File:** `src/components/projects/monday-board/MondayBoardView.tsx`

**Remove lines 57-65 and 88-91 (debug console.log statements):**
```typescript
// DELETE THESE DEBUG BLOCKS:
// DEBUG: Log task grouping (remove after testing)
if (task.project_id === projectId) {
  console.log('[TaskGrouping]', {
    id: task.task_id.slice(0, 8),
    text: task.task_text.slice(0, 30),
    section_id: task.section_id,
    has_section_bucket: task.section_id ? !!grouped[task.section_id] : false
  });
}

// DEBUG: Log final grouping (remove after testing)
console.log('[TaskGrouping] Result:', 
  Object.entries(grouped).map(([k, v]) => `${k.slice(0, 8)}: ${v.length}`).join(', ')
);
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `TaskDetailsDrawer.tsx` | Move `useCallback` before early return, remove STATUS_OPTIONS and status dropdown |
| `BoardToolbar.tsx` | Remove STATUS_OPTIONS, status filter dropdown, and status badge |
| `MondayBoardView.tsx` | Remove status filter logic and debug console.log statements |

---

## Integration Points Verified

After these fixes, the project board will:

1. **Use date-based organization** - Consistent with TaskKanbanView changes
2. **Use priority and tags for filtering** - No redundant status field
3. **Properly handle null tasks** - No more hooks violation
4. **Calendar date selection works** - Fixed in previous changes, preserved here

---

## Testing Checklist

After implementation:

**Critical - No Crashes:**
- [ ] Open project detail page - no error
- [ ] Click on a task to open drawer - no error
- [ ] Close drawer - no error
- [ ] Open drawer again - no error

**Date Selection:**
- [ ] Click date field in task row - calendar opens
- [ ] Select a date - calendar closes, date updates
- [ ] Click "Clear date" - date removed
- [ ] Open task drawer - date shows correctly
- [ ] Change date in drawer - updates and saves

**Filtering:**
- [ ] Filter by priority - works
- [ ] Status filter option - REMOVED (expected)
- [ ] Clear filters - works

**Task Operations:**
- [ ] Create new task - works
- [ ] Toggle completion - works
- [ ] Delete task - works
- [ ] Move between sections - works

