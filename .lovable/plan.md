

# Enhance Editorial Calendar Error Handling and Debugging

## Overview

Replace the current `updateItemDate` mutation with a comprehensive version that includes detailed logging, existence verification, permission checks, and user-friendly error messages.

---

## Current State

The existing mutation (lines 222-266) has minimal error handling:
- No console logging for debugging
- No verification that items exist before updating
- No user-visible success/error feedback
- Errors just get thrown without context

---

## Changes

### File: `src/hooks/useEditorialCalendar.ts`

**Add import for toast** (line 1-5):
```typescript
import { toast } from 'sonner';
```

**Replace updateItemDate mutation** (lines 222-266):

The new mutation will include:

1. **Debug Logging** - Console logs showing exactly what's being updated
2. **Existence Check** - For content_items, verify the item exists before updating
3. **Permission Check** - Verify the user owns the item
4. **User ID Filters** - Add `.eq('user_id', user.id)` to all updates for security
5. **Error Messages** - User-friendly toast notifications for different error types
6. **Success Feedback** - Toast showing what was updated

### Key Improvements

| Feature | Before | After |
|---------|--------|-------|
| Console logging | None | Detailed logs with `[Editorial Calendar]` prefix |
| Item existence check | No | Yes (for content_items) |
| User permission check | Implicit (RLS) | Explicit user_id comparison |
| Success notification | None | Toast showing "Creation/Publish date updated" |
| Error notification | None | Specific error messages based on error type |
| Plan item lane check | Silent ignore | Throws helpful error |
| Unknown source handling | Silent fail | Throws helpful error |

---

## Error Message Mapping

| Error Type | User Message |
|------------|--------------|
| Item not found | "Content not found. It may have been deleted." |
| Permission denied | "You don't have permission to update this content." |
| Not authenticated | "Please log in again to continue." |
| Other errors | Shows actual error message |

---

## Debugging Instructions

After this fix, when dragging content:

1. Open browser console (F12)
2. Look for `[Editorial Calendar]` prefixed logs
3. Logs will show: itemId, sourceId, source type, lane, newDate
4. If update fails, check:
   - "Item not found" → sourceId mismatch
   - "permission" → RLS policy issue
   - Specific Supabase error → database problem

---

## Technical Details

- **File**: `src/hooks/useEditorialCalendar.ts`
- **Lines affected**: 1-5 (add import), 222-266 (replace mutation)
- **Dependencies**: Uses existing `sonner` toast library

