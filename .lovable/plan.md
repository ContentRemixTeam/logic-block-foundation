

# Complete Project Task Manager Fix - All Issues

## Overview

After auditing the codebase and database, I've identified **4 remaining issues** to fix. Some fixes from the plan have already been partially implemented:

**Already Done:**
- createTask mutation has optimistic updates removed (lines 170-183)
- Loading state `isCreating` added to BoardGroup (lines 55, 80-88)
- Debug logging added to MondayBoardView (lines 57-65, 88-91)
- Real-time logging enhanced in useTasks (lines 81-86)

**Still Needed:**
1. Section deletion doesn't update tasks (no foreign key constraint)
2. No validation that section belongs to project
3. deleteSection doesn't refresh tasks query
4. Missing confirmation with task count on delete

---

## Issue Analysis

### Database Finding
The `tasks` table has **NO foreign key constraints** on `section_id` or `project_id`. This means:
- Deleting a section leaves tasks with orphan `section_id` values
- Tasks with orphan `section_id` won't appear in any group OR in "Uncategorized"
- Must manually clear `section_id` before deleting section

### Current deleteSection Behavior
```
1. User clicks "Delete group"
2. Section is deleted from project_sections
3. Tasks still have old section_id (now orphaned)
4. Tasks disappear from UI (not in any valid group)
5. Tasks only invalidated: ['project-sections', projectId]
6. Task cache NOT refreshed - orphaned tasks invisible
```

---

## Fixes to Implement

### Fix 1: Update deleteSection to Handle Orphaned Tasks

**File:** `src/hooks/useProjectSections.tsx`

Update the `deleteSection` mutation to:
1. Count tasks in the section before deletion
2. Set those tasks' `section_id` to NULL (move to uncategorized)
3. Then delete the section
4. Invalidate both section AND task queries

```typescript
const deleteSection = useMutation({
  mutationFn: async (sectionId: string) => {
    // Count tasks that will be affected
    const { count, error: countError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', sectionId);

    if (countError) throw countError;

    // Move tasks to uncategorized BEFORE deleting section
    if (count && count > 0) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ section_id: null })
        .eq('section_id', sectionId);

      if (updateError) throw updateError;
    }

    // Now delete the section
    const { error } = await supabase
      .from('project_sections')
      .delete()
      .eq('id', sectionId);

    if (error) throw error;
    
    return { deletedSectionId: sectionId, taskCount: count || 0 };
  },
  onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey: sectionQueryKeys.byProject(projectId) });
    // CRITICAL: Also invalidate tasks so they refresh from server
    queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
    
    if (result.taskCount > 0) {
      toast.success(`Group deleted. ${result.taskCount} task(s) moved to Uncategorized.`);
    } else {
      toast.success('Group deleted');
    }
  },
  onError: () => {
    toast.error('Failed to delete group');
  },
});
```

---

### Fix 2: Improve Section Delete Confirmation in BoardGroup

**File:** `src/components/projects/monday-board/BoardGroup.tsx`

Update `handleDelete` to show task count and add loading state:

```typescript
const [isDeleting, setIsDeleting] = useState(false);

const handleDelete = async () => {
  const taskCount = tasks.length;
  const message = taskCount > 0 
    ? `Delete "${section.name}" group? ${taskCount} task(s) will be moved to Uncategorized.`
    : `Delete "${section.name}" group?`;
    
  if (confirm(message)) {
    setIsDeleting(true);
    try {
      await deleteSection.mutateAsync(section.id);
    } finally {
      setIsDeleting(false);
    }
  }
};
```

Update the delete menu item to show loading state:

```typescript
<DropdownMenuItem 
  onClick={handleDelete} 
  className="text-destructive"
  disabled={isDeleting}
>
  <Trash2 className="h-4 w-4 mr-2" />
  {isDeleting ? 'Deleting...' : 'Delete group'}
</DropdownMenuItem>
```

---

### Fix 3: Add Section/Project Validation to createTask

**File:** `src/hooks/useTasks.tsx`

Add validation in the mutation function to prevent section/project mismatch:

```typescript
const createTask = useMutation({
  mutationFn: async (params: Partial<Task> & { task_text: string }) => {
    const session = await getSession();
    
    // Validate section belongs to project if both provided
    if (params.section_id && params.project_id) {
      const { data: section } = await supabase
        .from('project_sections')
        .select('project_id')
        .eq('id', params.section_id)
        .maybeSingle();
      
      if (section && section.project_id !== params.project_id) {
        throw new Error('Section does not belong to this project');
      }
    }
    
    // ... rest of mutation function (unchanged)
  },
  // ... rest unchanged
});
```

---

### Fix 4: Add Database Foreign Key Constraint (Optional but Recommended)

**Migration SQL:**

Add a proper foreign key constraint with ON DELETE SET NULL to prevent future orphan issues:

```sql
-- Add foreign key constraint for section_id with ON DELETE SET NULL
-- This ensures if a section is deleted, tasks automatically get section_id = NULL
ALTER TABLE tasks 
ADD CONSTRAINT tasks_section_id_fkey 
FOREIGN KEY (section_id) 
REFERENCES project_sections(id) 
ON DELETE SET NULL;
```

This is optional since Fix 1 handles it at the application level, but provides defense-in-depth.

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/hooks/useProjectSections.tsx` | Update `deleteSection` to move tasks before deleting, invalidate task queries |
| `src/components/projects/monday-board/BoardGroup.tsx` | Add `isDeleting` state, improve confirmation message with task count |
| `src/hooks/useTasks.tsx` | Add section/project validation to `createTask` |
| Database migration (optional) | Add foreign key constraint with ON DELETE SET NULL |

---

## Testing Checklist

After implementation:

**Task Creation:**
- [ ] Create task in a group - appears in that group within 1-2 seconds
- [ ] No duplicate tasks appearing
- [ ] Check console for `[TaskGrouping]` logs showing correct `section_id`
- [ ] Reload page - tasks remain in correct groups

**Section Deletion:**
- [ ] Delete a group with tasks - confirmation shows task count
- [ ] After delete - tasks appear in "Uncategorized"
- [ ] Delete empty group - deletes cleanly with no task message
- [ ] Tasks don't disappear after section delete

**Validation:**
- [ ] Create task with mismatched section/project - should show error (edge case)

---

## Cleanup (After Testing)

Remove debug logging from these files once verified working:

1. `src/components/projects/monday-board/MondayBoardView.tsx` - Remove lines 57-65 and 88-91 (console.log statements)
2. `src/hooks/useTasks.tsx` - Remove lines 81-86 (realtime detail logging)

