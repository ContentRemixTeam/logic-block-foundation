
# Editorial Calendar Simplification & High-Value Enhancement Plan

## Executive Summary
A comprehensive overhaul of the Editorial Calendar to make it simple and high-value through 5 major improvements:
1. Fix platform toggle saving (TikTok and all platforms)
2. Add custom platform support
3. Fix content addition with rich fields
4. Add recurring content capability
5. Implement customizable content types

---

## Part 1: Fix Platform Toggle Saving

### Current Issue
The `useUserPlatforms.ts` hook has a timing issue - the toggle mutation doesn't await properly and the optimistic update relies on query invalidation which may not reflect immediately.

### Solution

**File: `src/hooks/useUserPlatforms.ts`**

Add proper error handling and toast feedback:

```typescript
const togglePlatform = useMutation({
  mutationFn: async ({ platform, isActive }: { platform: string; isActive: boolean }) => {
    if (!user?.id) throw new Error('Not authenticated');
    
    const existing = query.data?.find(p => p.platform === platform);
    
    if (existing) {
      const { error } = await supabase
        .from('user_content_platforms')
        .update({ is_active: isActive })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_content_platforms')
        .insert({ ... });
      if (error) throw error;
    }
    
    return { platform, isActive }; // Return for toast
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['user-platforms', user?.id] });
    toast.success(`${data.platform} ${data.isActive ? 'enabled' : 'disabled'}`);
  },
  onError: (error) => {
    toast.error('Failed to update platform. Please try again.');
  },
});
```

**File: `src/components/editorial-calendar/PlatformConfigModal.tsx`**

Fix the async toggle handler to properly await:

```typescript
const handleToggle = async (platform: string, isActive: boolean) => {
  setPendingToggles(prev => new Set(prev).add(platform));
  try {
    await togglePlatformAsync({ platform, isActive }); // Use mutateAsync
  } catch (error) {
    // Error handled by mutation
  } finally {
    setPendingToggles(prev => {
      const next = new Set(prev);
      next.delete(platform);
      return next;
    });
  }
};
```

---

## Part 2: Add Custom Platform Support

### Database Changes

```sql
ALTER TABLE user_content_platforms
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_name TEXT,
  ADD COLUMN IF NOT EXISTS short_label TEXT;
```

### New Component: `CustomPlatformDialog.tsx`

**File: `src/components/editorial-calendar/CustomPlatformDialog.tsx`**

Dialog for adding/editing custom platforms:

- Platform Name (required, max 50 chars)
- Display Color (color picker, default #6B7280)
- Short Label (max 3 chars, auto-generated from first 2 letters)
- [Cancel] [Save Platform]

Creates entry with:
- `platform`: slugified name (e.g., "my-platform")
- `is_custom`: true
- `custom_name`: original display name
- `short_label`: user-defined or auto-generated
- `color`: selected color
- `is_active`: true

### Update `PlatformConfigModal.tsx`

Add two sections:

**Section 1: Default Platforms** (existing list with toggles)

**Section 2: Custom Platforms**
- [+ Add Custom Platform] button
- List of user's custom platforms with [Edit] [Delete] icons
- Delete confirmation dialog

### Update `useUserPlatforms.ts`

Add mutations:
- `addCustomPlatform(name, color, shortLabel)`
- `updateCustomPlatform(id, updates)`
- `deleteCustomPlatform(id)`

Update `getPlatformColor()` and `getPlatformLabel()` to check custom platforms first.

### Update Platform Filter Bar

Show both default and custom platforms:
- Custom platforms appear with same styling
- Custom platforms show delete (X) button on hover

---

## Part 3: Enhanced Content Addition Dialog

### Database Changes

```sql
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS promoting TEXT,
  ADD COLUMN IF NOT EXISTS launch_id UUID REFERENCES launches(id),
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS idea_id UUID REFERENCES ideas(id),
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES content_items(id),
  ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_items_launch_id ON content_items(launch_id);
CREATE INDEX IF NOT EXISTS idx_content_items_idea_id ON content_items(idea_id);
CREATE INDEX IF NOT EXISTS idx_content_items_recurring_parent ON content_items(recurring_parent_id);
```

### Rewrite `CalendarQuickAdd.tsx` as `AddContentDialog.tsx`

**File: `src/components/editorial-calendar/AddContentDialog.tsx`**

Full-featured content creation dialog:

**Basic Info Section:**
- Title* (text, max 200, required)
- Platform (dropdown: user's active + custom platforms)
- Content Type (dropdown: user's content types - see Part 5)

**Schedule Section:**
- Creation Date (date picker, optional)
- Publish Date (date picker, optional)
- Time to Post (time picker, optional, format HH:MM AM/PM)

**Details Section:**
- Promoting (text, max 200)
  - Placeholder: "Product launch, affiliate offer, free resource..."
- Related to Launch (dropdown)
  - Query: `SELECT id, name, cart_opens FROM launches WHERE user_id = ? AND status NOT IN ('completed', 'cancelled') ORDER BY cart_opens DESC`
  - Display: "[Launch Name] (Opens: MMM DD)"
  - Empty state: "No active launches"
- Link to Idea (searchable dropdown)
  - Query: `SELECT id, content FROM ideas WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
  - When selected, auto-populates title field

**Content Section:**
- Copy/Notes (textarea, max 2000)
  - Placeholder: "Draft your copy, add notes, brainstorm hooks..."

**Recurring Toggle (at top):**
- [ ] Make this recurring

When checked, shows additional fields (see Part 4).

### Validation

- Title is required
- All other fields optional
- `type` defaults to 'post' if not selected
- `status` defaults to 'draft'

---

## Part 4: Recurring Content Support

### UI in AddContentDialog

When "Make this recurring" is checked, show:

**Recurrence Pattern:**
- Frequency (dropdown):
  - Daily
  - Weekly
  - Bi-weekly
  - Monthly

- Repeat on (if Weekly/Bi-weekly):
  - Checkboxes: Mon Tue Wed Thu Fri Sat Sun

- Repeat on (if Monthly):
  - Dropdown: 1st, 2nd, ..., 31st, Last day of month

- Ends (radio):
  - Never
  - On date: [date picker]
  - After X occurrences: [number input, default 12]

### Behavior When Saved

1. Create parent content_item with:
   - `is_recurring`: true
   - `recurrence_pattern`: JSON storing pattern config

2. Generate child content_items:
   - Calculate dates based on pattern
   - Create up to 52 occurrences (1 year) or until end date
   - Each child has:
     - `recurring_parent_id`: parent's ID
     - All same details (title, platform, type, etc.)
     - Adjusted creation/publish dates

### Create Utility: `src/lib/recurrenceUtils.ts`

Functions:
- `generateRecurrenceDates(pattern, startDate, endDate?)`: Returns array of dates
- `createRecurringItems(parentItem, dates)`: Creates child items
- `updateRecurringChildren(parentId, updates, scope: 'this' | 'all_future')`: Batch update

### Edit Behavior

When editing a recurring item, show:
- "This is part of a recurring series" indicator
- Options:
  - Edit this occurrence only
  - Edit all future occurrences

When deleting:
- "Delete this occurrence only" or "Delete entire series"

---

## Part 5: Customizable Content Types

### Database Changes

```sql
CREATE TABLE IF NOT EXISTS user_content_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_key TEXT NOT NULL,
  type_label TEXT NOT NULL,
  platform TEXT,
  icon TEXT DEFAULT 'FileText',
  color TEXT DEFAULT '#6B7280',
  is_custom BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type_key)
);

CREATE INDEX idx_user_content_types_user ON user_content_types(user_id);

ALTER TABLE user_content_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content types"
  ON user_content_types FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### New Hook: `useUserContentTypes.ts`

**File: `src/hooks/useUserContentTypes.ts`**

```typescript
export function useUserContentTypes() {
  // Fetch user's content types
  // If empty, seed with defaults based on active platforms
  
  return {
    contentTypes,
    activeContentTypes,
    toggleContentType,
    addCustomContentType,
    updateContentType,
    deleteContentType,
    getContentTypeIcon,
    getContentTypeLabel,
  };
}
```

### Seed Defaults

On first load (when table is empty for user), auto-create entries for standard types:
- post, reel, video, blog-post, newsletter, podcast-episode, email-single, carousel, live-stream, story

### New Component: `ContentTypeConfigSection.tsx`

Add to Settings page or create `/settings/content-types`:

**Section 1: Default Content Types**
- List with checkboxes showing all defaults from CONTENT_TYPE_ICONS
- User can toggle on/off

**Section 2: Custom Content Types**
- [+ Add Custom Type] button
- Dialog:
  - Type Name (required, max 50)
  - Platform (optional dropdown)
  - Icon (dropdown of Lucide icons)
- Custom types show [Edit] [Delete] options

### Update Content Dropdowns

In AddContentDialog and CalendarQuickAdd:
- Query `user_content_types WHERE user_id = ? AND is_active = true`
- Group by platform if platform is set
- Show icon + label

### Fallback Behavior

If user's type is deleted:
- Content items with that type still display (with default icon)
- Type dropdown shows as "Unknown Type" or falls back

---

## Part 6: Enhanced Quick Edit Drawer

### Update `ContentQuickEditDrawer.tsx`

Expand to show ALL editable fields:

**Scheduling Section:**
- Creation Date (date picker)
- Publish Date (date picker)
- Time to Post (time picker)

**Details Section:**
- Title (editable text input)
- Platform (dropdown)
- Content Type (dropdown)
- What's this promoting? (text input)
- Launch (dropdown from launches)
- Link to Idea (searchable dropdown)

**Content Section:**
- Copy/Notes (expandable textarea)

**Status Section:**
- Status (dropdown: draft, scheduled, in-progress, published, cancelled)

### Update Calendar Cards

Show additional badges when data is present:
- Time badge: "3:00 PM" (if scheduled_time set)
- Launch badge: rocket icon + launch name (if launch_id set)
- Idea badge: lightbulb icon (if idea_id set)
- Recurring badge: repeat icon (if is_recurring)

---

## Part 7: Launch Integration

### Auto-populate Launch Dropdown

Query active launches:
```sql
SELECT id, name, cart_opens, cart_closes, status
FROM launches
WHERE user_id = ?
  AND status IN ('planning', 'active', 'scheduled')
ORDER BY cart_opens DESC
```

Display format: "[Launch Name] (Opens: Mon DD)"

Empty state: "No active launches - [Create one in Launch Wizard]" with link

### Smart Suggestion

When creating content:
- If current date is within 30 days of a launch's cart_opens
- Show subtle prompt: "This might be for [Launch Name]. [Assign] [Skip]"

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useUserPlatforms.ts` | Modify | Fix toggle saving, add custom platform support, add toast feedback |
| `src/components/editorial-calendar/PlatformConfigModal.tsx` | Modify | Split sections, add custom platforms UI |
| `src/components/editorial-calendar/CustomPlatformDialog.tsx` | Create | Dialog for adding/editing custom platforms |
| `src/components/editorial-calendar/AddContentDialog.tsx` | Create | Full-featured replacement for CalendarQuickAdd |
| `src/components/editorial-calendar/CalendarQuickAdd.tsx` | Delete | Replaced by AddContentDialog |
| `src/lib/recurrenceUtils.ts` | Create | Utilities for recurring content |
| `src/hooks/useUserContentTypes.ts` | Create | Hook for managing user content types |
| `src/components/settings/ContentTypeConfigSection.tsx` | Create | UI for managing content types |
| `src/components/editorial-calendar/ContentQuickEditDrawer.tsx` | Modify | Expand with all editable fields |
| `src/components/editorial-calendar/CalendarContentCard.tsx` | Modify | Add time/launch/idea/recurring badges |
| `src/lib/calendarConstants.ts` | Modify | Add helper for custom platform lookups |
| `src/hooks/useLaunches.ts` | Create | Hook for querying active launches |

### Database Migrations

**Migration 1: Custom Platforms**
```sql
ALTER TABLE user_content_platforms
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_name TEXT,
  ADD COLUMN IF NOT EXISTS short_label TEXT;
```

**Migration 2: Enhanced Content Items**
```sql
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS promoting TEXT,
  ADD COLUMN IF NOT EXISTS launch_id UUID REFERENCES launches(id),
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS idea_id UUID REFERENCES ideas(id),
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES content_items(id),
  ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB;

CREATE INDEX IF NOT EXISTS idx_content_items_launch_id ON content_items(launch_id);
CREATE INDEX IF NOT EXISTS idx_content_items_idea_id ON content_items(idea_id);
CREATE INDEX IF NOT EXISTS idx_content_items_recurring_parent ON content_items(recurring_parent_id);
```

**Migration 3: User Content Types**
```sql
CREATE TABLE IF NOT EXISTS user_content_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_key TEXT NOT NULL,
  type_label TEXT NOT NULL,
  platform TEXT,
  icon TEXT DEFAULT 'FileText',
  color TEXT DEFAULT '#6B7280',
  is_custom BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type_key)
);

CREATE INDEX idx_user_content_types_user ON user_content_types(user_id);

ALTER TABLE user_content_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content types"
  ON user_content_types FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Implementation Order

### Phase 1: Fix Existing Issues (Quick Wins)
1. Fix platform toggle saving with toast feedback
2. Fix PlatformConfigModal async handling

### Phase 2: Custom Platforms
3. Run database migration for custom platform columns
4. Create CustomPlatformDialog component
5. Update PlatformConfigModal with custom section
6. Update useUserPlatforms hook

### Phase 3: Enhanced Content Creation
7. Run database migration for content_items
8. Create AddContentDialog component
9. Create useLaunches hook
10. Update EditorialCalendarView to use new dialog

### Phase 4: Recurring Content
11. Create recurrenceUtils.ts
12. Add recurring UI to AddContentDialog
13. Update ContentQuickEditDrawer for recurring edit options

### Phase 5: Custom Content Types
14. Run database migration for user_content_types
15. Create useUserContentTypes hook
16. Create ContentTypeConfigSection for settings
17. Update content type dropdowns everywhere

### Phase 6: Polish
18. Update CalendarContentCard with new badges
19. Expand ContentQuickEditDrawer with all fields
20. Add launch smart suggestion

---

## Testing Checklist

**Platform Toggles:**
- [ ] Toggle TikTok on → saves immediately, shows toast
- [ ] Toggle TikTok off → saves immediately, disappears from filter bar
- [ ] Refresh page → toggle state persists

**Custom Platforms:**
- [ ] Add custom "Threads" platform → appears in filter bar
- [ ] Custom platform works in calendar filtering
- [ ] Edit custom platform color → updates everywhere
- [ ] Delete custom platform → removed from filter bar, existing content still shows

**Content Addition:**
- [ ] Add content with just title → saves without error
- [ ] Add content with all fields → all data saves correctly
- [ ] Launch dropdown shows active launches
- [ ] Idea selection auto-populates title

**Recurring Content:**
- [ ] Create weekly recurring "Email Newsletter" → creates 13 instances
- [ ] Edit parent → option to update all future
- [ ] Delete child → only that one removed
- [ ] Delete parent → option to delete all

**Content Types:**
- [ ] Toggle off "TikTok Video" → doesn't show in Add Content dialog
- [ ] Add custom "Pinterest Pin" → shows in dialog
- [ ] Delete custom type → content with that type still displays
