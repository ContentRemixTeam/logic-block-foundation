
# Fix Editorial Calendar - Core Functionality and Stability

## Problem Summary

The Editorial Calendar has critical bugs preventing it from functioning properly:

1. **Content Task Creation Fails**: The `createContentTasks` function uses incorrect column names (`title` instead of `task_text`, `status: 'pending'` instead of valid status values)
2. **RLS Violations in related features**: The `arcade_wallet` table is causing RLS errors (unrelated but appearing in console)
3. **Need for data protection**: Emergency save and offline resilience need to be integrated

---

## Root Cause Analysis

### Issue 1: Wrong Column Names in Task Creation

**File**: `src/components/editorial-calendar/AddContentDialog.tsx` (lines 163-205)

The `createContentTasks` function inserts tasks with incorrect column names:

```typescript
// CURRENT (BROKEN)
tasksToCreate.push({
  user_id: user.id,
  title: `Create: ${contentTitle}`,        // WRONG - column doesn't exist
  due_date: createDateStr,                  // CORRECT - column exists
  status: 'pending',                         // WRONG - invalid value
  // ...
});
```

**Database Reality** (verified via schema query):
- Task text column is `task_text` (NOT `title`)
- Valid status values are: `'backlog'`, `'scheduled'`, `'todo'`, `'waiting'`

### Issue 2: Missing Error Handling

When the task insert fails silently, users don't see clear feedback about what went wrong with their content creation.

---

## Implementation Plan

### Part 1: Fix Task Creation Column Names

**File**: `src/components/editorial-calendar/AddContentDialog.tsx`

Update the `createContentTasks` function:

```typescript
// FROM
tasksToCreate.push({
  user_id: user.id,
  title: `Create: ${contentTitle}`,
  due_date: createDateStr,
  // ...
  status: 'pending',
});

// TO
tasksToCreate.push({
  user_id: user.id,
  task_text: `Create: ${contentTitle}`,      // Fixed column name
  scheduled_date: createDateStr,              // Use scheduled_date for calendar tasks
  due_date: createDateStr,                    // Keep due_date as well
  // ...
  status: 'scheduled',                        // Valid status value
});
```

### Part 2: Add Proper Error Handling and Validation

Update the submit handlers to provide better feedback:

1. Validate user authentication before operations
2. Show specific error messages when operations fail
3. Ensure RLS-compliant data structure (user_id always set correctly)

### Part 3: Add Data Protection Integration

Integrate the existing emergency save system with the AddContentDialog:

1. Use `useFormDraftProtection` hook to auto-save form drafts
2. Add `beforeunload` listener via `useBeforeUnload` hook
3. Ensure form data is recoverable after browser crashes

### Part 4: Improve Form Stability

1. Add loading states during async operations
2. Disable submit button while operations are in progress
3. Add optimistic updates for better UX

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/editorial-calendar/AddContentDialog.tsx` | **Fix** | Correct column names (`task_text`, `scheduled_date`), valid status values, add draft protection |
| `src/hooks/useEditorialCalendar.ts` | **Enhancement** | Add error recovery and better error messages |

---

## Technical Details

### Fixed createContentTasks Function

```typescript
const createContentTasks = async (
  contentId: string, 
  contentTitle: string, 
  createDateStr: string | null, 
  publishDateStr: string | null
) => {
  if (!user?.id) return;
  
  const tasksToCreate = [];
  
  if (createDateStr) {
    tasksToCreate.push({
      user_id: user.id,
      task_text: `Create: ${contentTitle}`,
      scheduled_date: createDateStr,
      due_date: createDateStr,
      content_item_id: contentId,
      content_type: contentType || 'post',
      content_channel: platform || null,
      content_creation_date: createDateStr,
      content_publish_date: publishDateStr,
      priority: 'medium',
      status: 'scheduled',
    });
  }
  
  if (publishDateStr) {
    tasksToCreate.push({
      user_id: user.id,
      task_text: `Publish: ${contentTitle}`,
      scheduled_date: publishDateStr,
      due_date: publishDateStr,
      content_item_id: contentId,
      content_type: contentType || 'post',
      content_channel: platform || null,
      content_creation_date: createDateStr,
      content_publish_date: publishDateStr,
      priority: 'medium',
      status: 'scheduled',
    });
  }
  
  if (tasksToCreate.length > 0) {
    const { error } = await supabase.from('tasks').insert(tasksToCreate);
    if (error) {
      console.error('Failed to create content tasks:', error);
      toast.warning('Content saved, but task creation failed. You can add tasks manually.');
    }
  }
};
```

### Draft Protection Integration

```typescript
// Add to AddContentDialog
import { useFormDraftProtection } from '@/hooks/useFormDraftProtection';

// Inside component
const formData = useMemo(() => ({
  title, platform, contentType, createDate, publishDate, 
  scheduledTime, promoting, launchId, copyNotes, isRecurring
}), [title, platform, contentType, createDate, publishDate, 
     scheduledTime, promoting, launchId, copyNotes, isRecurring]);

const { hasDraft, clearDraft } = useFormDraftProtection({
  key: 'add-content-dialog',
  data: formData,
  enabled: open && mode === 'new',
});

// On successful save
clearDraft();
```

---

## Testing Checklist

After implementation:
- [ ] Open Editorial Calendar page - should load without errors
- [ ] Click "Add Content" button - dialog should open
- [ ] Fill in title and at least one date
- [ ] Submit - should create content item successfully
- [ ] Verify tasks are created (check Tasks page)
- [ ] Test browser refresh during form fill - draft should recover
- [ ] Verify drag-and-drop still works for rescheduling
- [ ] Test on mobile view

---

## Related RLS Issue (Separate Fix)

The console shows an RLS error for `arcade_wallet`:
```
new row violates row-level security policy for table "arcade_wallet"
```

This is unrelated to the Editorial Calendar but should be fixed separately. The arcade wallet initialization likely needs a database trigger or the insert needs to happen through a service-role function.
