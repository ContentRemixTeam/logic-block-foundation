
# Fix Editorial Calendar - Query Cache Invalidation Bug

## Problem Found

Content IS being saved to the database (verified: item exists with dates Feb 4-5, 2026), but it doesn't appear on the calendar because **the query cache is not being invalidated correctly**.

### Root Cause

In `AddContentDialog.tsx`, after successfully creating content:

```typescript
// Current (BROKEN):
queryClient.invalidateQueries({ queryKey: ['editorial-calendar'] });
```

But in `useEditorialCalendar.ts`, the actual query keys are:
- `['editorial-calendar-content', user?.id, weekStartStr, campaignFilter]`
- `['editorial-calendar-campaigns', user?.id, weekStartStr]`
- `['editorial-calendar-plans', user?.id, weekStartStr, campaignFilter]`
- `['editorial-calendar-tasks', user?.id, weekStartStr]`
- `['editorial-calendar-unscheduled', user?.id, campaignFilter]`

The `invalidateQueries({ queryKey: ['editorial-calendar'] })` does NOT match any of these keys, so the queries never refetch after content is added.

---

## The Fix

Update both locations in `AddContentDialog.tsx` to invalidate the correct query keys:

### Location 1: handleReuseSubmit (around line 321)
```typescript
// FROM:
queryClient.invalidateQueries({ queryKey: ['editorial-calendar'] });

// TO:
queryClient.invalidateQueries({ queryKey: ['editorial-calendar-content'] });
queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
```

### Location 2: handleSubmit (around line 468)
```typescript
// FROM:
queryClient.invalidateQueries({ queryKey: ['editorial-calendar'] });

// TO:
queryClient.invalidateQueries({ queryKey: ['editorial-calendar-content'] });
queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
```

---

## Why This Works

React Query's `invalidateQueries` uses **prefix matching** by default. When you invalidate `['editorial-calendar-content']`, it will invalidate ALL queries that start with that key, including:

- `['editorial-calendar-content', 'user-123', '2026-02-03', null]`
- `['editorial-calendar-content', 'user-123', '2026-02-10', 'campaign-abc']`

This ensures the calendar refetches content data regardless of which week is being viewed or what filters are active.

---

## File Changes

| File | Lines | Change |
|------|-------|--------|
| `src/components/editorial-calendar/AddContentDialog.tsx` | ~321 | Fix query key to `'editorial-calendar-content'` |
| `src/components/editorial-calendar/AddContentDialog.tsx` | ~468 | Fix query key to `'editorial-calendar-content'` |

---

## After This Fix

1. User adds content in the dialog
2. Content is saved to database (already working)
3. Query cache is invalidated with correct keys
4. Calendar automatically refetches and displays the new content
5. No page refresh needed

---

## Verification

The database already has content for today's date:
- Title: "test"
- Creation date: 2026-02-04 (today)
- Publish date: 2026-02-05 (tomorrow)

After this fix, this content will immediately appear on the calendar.
