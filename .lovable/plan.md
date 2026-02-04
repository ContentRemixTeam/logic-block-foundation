
# Fix Editorial Calendar "Failed to add content" Error

## Problem Identified

When adding content to the Editorial Calendar, the database rejects the insert with this error:

```
"new row for relation \"content_items\" violates check constraint \"content_items_status_check\""
```

**The code is sending:** `status: 'idea'`
**The database only accepts:** `'Draft'`, `'Ready'`, or `'Published'`

This is a simple value mismatch - the code uses a status value that doesn't exist in the database.

---

## The Fix

Update `AddContentDialog.tsx` to use `'Draft'` instead of `'idea'` in two locations:

### Location 1: Line 353 (base item for new content)
```typescript
// FROM:
status: 'idea',

// TO:
status: 'Draft',
```

### Location 2: Line 409 (child items for recurring content)
```typescript
// FROM:
status: 'idea',

// TO:
status: 'Draft',
```

---

## File Changes

| File | Change |
|------|--------|
| `src/components/editorial-calendar/AddContentDialog.tsx` | Change `status: 'idea'` to `status: 'Draft'` in 2 locations |

---

## Why This Happened

The code was written with an assumed status value (`idea`) that was never added to the database constraint. The database was created with only three valid statuses:

```sql
CHECK (status IN ('Draft', 'Ready', 'Published'))
```

These match the existing `ContentStatus` type in the codebase:
```typescript
export type ContentStatus = 'Draft' | 'Ready' | 'Published';
```

---

## After This Fix

- Adding new content will work immediately
- New content will have status `'Draft'` (appropriate for newly created items)
- Users can later change status to `'Ready'` or `'Published'` as they progress
- Recurring content items will also be created successfully
- All the draft protection and task creation features will work as intended

---

## Quick Test After Fix

1. Go to Editorial Calendar
2. Click "Add Content"
3. Enter a title (e.g., "Test Post")
4. Select a platform and content type
5. Set at least one date
6. Click "Add Content"
7. Should see success toast and content appears on calendar
