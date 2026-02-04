

# Fix Editorial Calendar - Remove Outdated Type Constraint

## Problem Identified

The database has a CHECK constraint on `content_items.type` that only allows these legacy values:
- `'Email'`, `'IG Post'`, `'Reel'`, `'Carousel'`, `'Story'`, `'YouTube'`, `'Podcast'`, `'Blog'`, `'Live'`, `'Ad'`, `'Landing Page'`, `'Other'`

But the system now uses a flexible `user_content_types` table where users can create custom content types with keys like:
- `'email-single'`, `'post'`, `'reel'`, `'video'`, `'blog-post'`, `'newsletter'`, `'carousel'`, etc.

When users select "Email" from the dropdown, the code sends `type: 'email-single'` (the `type_key`), but the database rejects it because `'email-single'` is not in the old hardcoded list.

---

## The Fix

**Drop the outdated CHECK constraint** to allow any content type value.

### Database Migration

```sql
ALTER TABLE content_items DROP CONSTRAINT content_items_type_check;
```

This is safe because:
1. The `user_content_types` table now manages valid content types per user
2. The UI only allows selection from the user's configured types
3. The old hardcoded enum is incompatible with the custom types feature

---

## Why Previous Fixes Failed

| Attempt | What was fixed | Actual error |
|---------|---------------|--------------|
| 1st | `status: 'idea'` → `status: 'Draft'` | Was `content_items_type_check`, not status |
| 2nd | Same status fix | Error message says `type_check` not `status_check` |

The error message was misread - it says **`content_items_type_check`** not `content_items_status_check`.

---

## File Changes

| File/Location | Change |
|---------------|--------|
| Database migration | `ALTER TABLE content_items DROP CONSTRAINT content_items_type_check;` |

---

## After This Fix

- Adding content will work with any content type from the user's custom types
- Users can add new content types via the configuration modal
- Existing content items remain unaffected (no data migration needed)
- The flexible content types system will work as designed

---

## Quick Test After Fix

1. Go to Editorial Calendar
2. Click "Add Content"
3. Enter a title (e.g., "Test Post")
4. Select any platform (e.g., "Email")
5. Select any content type (e.g., "Email" which sends `email-single`)
6. Set at least one date
7. Click "Add Content"
8. Should see success toast and content appears on calendar

