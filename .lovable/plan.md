
# Editorial Calendar Feature Enhancement Plan

## Executive Summary

After a thorough exploration of the codebase, I've identified both existing capabilities and critical missing features. The calendar already has drag-and-drop functionality, but it needs several enhancements to be truly comprehensive.

---

## Current State Analysis

### Features Already Implemented

| Feature | Status | Location |
|---------|--------|----------|
| Drag-and-drop between days | ✅ Working | `@dnd-kit` in `EditorialCalendarView.tsx` |
| Drag to unscheduled pool | ✅ Working | `handleDragEnd` function |
| Recurring content (publish date only) | ⚠️ Partial | `AddContentDialog.tsx` |
| From Vault tab | ✅ Working | Repurpose existing content |
| Dual lanes (Create/Publish) | ✅ Working | `CalendarDayColumn.tsx` |
| Platform filtering | ✅ Working | `PlatformFilterBar.tsx` |
| Campaign layers | ✅ Working | `CampaignBar.tsx` |

### Missing Features Identified

1. **Recurring creation dates** - Only publish date recurrence exists
2. **Single-date mode option** - Currently always shows both lanes
3. **Ideas integration** - No way to create content from Ideas database
4. **Bulk actions** - No multi-select or batch operations
5. **Quick add from calendar** - No click-to-add on empty day slots
6. **Content duplication** - No easy way to duplicate items
7. **Week/Month view toggle** - Only week view available
8. **Content search on calendar** - No search within scheduled items
9. **Export/Print schedule** - No way to export calendar view
10. **Recurring instance editing** - Limited options for editing single vs. all instances

---

## Detailed Implementation Plan

### Phase 1: Core UX Improvements

#### 1.1 Single-Date Mode Toggle

**Purpose**: Allow users to work with only creation OR publishing dates, simplifying the view.

**Changes**:
- Add a settings toggle in calendar preferences
- Modify `CalendarDayColumn.tsx` to conditionally render one lane
- Update `AddContentDialog.tsx` with "Single date mode" option
- Store preference in `user_settings` table

**Database**: Add column to `user_settings`:
```sql
ALTER TABLE user_settings ADD COLUMN calendar_date_mode TEXT DEFAULT 'dual';
-- Values: 'dual', 'create-only', 'publish-only'
```

**UI Changes**:
- Settings dropdown with radio options
- When in single-date mode, hide the unused lane
- Date picker in dialog shows only the relevant date

#### 1.2 Ideas Integration ("From Ideas" Tab)

**Purpose**: Create content directly from captured ideas in the Ideas database.

**Changes**:
- Add third tab to `AddContentDialog.tsx`: "From Ideas"
- Create `useIdeasForContent` hook to fetch ideas
- Link idea to content via existing `idea_id` column in `content_items`
- Prefill title from idea content

**New Hook** (`src/hooks/useIdeasForContent.ts`):
```typescript
export function useIdeasForContent(search: string, limit: number) {
  // Fetch from 'ideas' table
  // Return id, content (as title), category, priority, tags
}
```

**UI Flow**:
1. User clicks "Add Content" → "From Ideas" tab
2. Search/browse ideas with filters
3. Select idea → prefills title field
4. User completes platform, type, dates
5. On submit: create content_item with `idea_id` reference

#### 1.3 Quick Add from Day Click

**Purpose**: Click empty area of a lane to quickly add content for that day.

**Changes**:
- Add click handler to `DroppableLane` component
- Pass `onAddClick(date, lane)` callback to `CalendarDayColumn`
- Open `AddContentDialog` with date pre-filled

**Implementation**:
```typescript
// In DroppableLane
<div onClick={() => onAddClick?.(date, lane)}>
  {/* ... existing content ... */}
</div>
```

---

### Phase 2: Recurring Content Enhancements

#### 2.1 Dual Recurring Dates

**Current Limitation**: Recurrence only applies to publish date. Child items calculate creation date as offset from publish.

**Enhancement**: Allow separate recurrence patterns for creation vs. publish.

**Changes to `AddContentDialog.tsx`**:
```typescript
// New state
const [recurringDateType, setRecurringDateType] = useState<'publish' | 'creation' | 'both'>('publish');
const [creationRecurrencePattern, setCreationRecurrencePattern] = useState<RecurrencePattern | null>(null);
const [publishRecurrencePattern, setPublishRecurrencePattern] = useState<RecurrencePattern | null>(null);
```

**UI Addition**:
- Radio group: "Apply recurrence to: [ ] Creation [ ] Publish [ ] Both (synced)"
- If "Both (synced)" - maintains current offset behavior
- If "Creation" only - recurs creation dates, publish can be set independently
- If "Publish" only - current behavior

**Database**: No schema changes needed - `recurrence_pattern` JSONB can store:
```json
{
  "type": "publish",
  "pattern": { ... },
  "creation_offset_days": 3
}
// or
{
  "type": "dual",
  "creation_pattern": { ... },
  "publish_pattern": { ... }
}
```

#### 2.2 Recurring Instance Management

**Purpose**: Better UX for editing/deleting recurring items.

**Changes**:
- Add visual indicator (repeat icon) on recurring items in `CalendarContentCard`
- On click, show option: "Edit this occurrence" vs "Edit all future"
- On delete, show option: "Delete this" vs "Delete all future"

**New Component**: `RecurringEditConfirmation.tsx`
```typescript
interface Props {
  mode: 'edit' | 'delete';
  onThisOnly: () => void;
  onAllFuture: () => void;
  onCancel: () => void;
}
```

---

### Phase 3: Advanced Features

#### 3.1 Content Duplication

**Purpose**: Quickly copy a content item to create a similar one.

**Changes**:
- Add "Duplicate" option to quick actions (more menu) on `CalendarContentCard`
- Create mutation in `useEditorialCalendar` for duplication
- Opens `AddContentDialog` prefilled with duplicated data

#### 3.2 Bulk Selection & Actions

**Purpose**: Select multiple items and apply batch operations.

**Changes**:
- Add checkbox mode toggle in header
- Multi-select state management
- Bulk actions bar: "Move to...", "Delete", "Change status"

**New State in `EditorialCalendarView`**:
```typescript
const [selectionMode, setSelectionMode] = useState(false);
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
```

#### 3.3 Calendar Search

**Purpose**: Find specific content within the calendar view.

**Changes**:
- Add search input to header
- Filter `allItems` in `useEditorialCalendar` based on search
- Highlight matching items

#### 3.4 Month View Option

**Purpose**: See content at a higher level for long-term planning.

**New Component**: `CalendarMonthView.tsx`
- Grid of 5 weeks
- Condensed card display (title only, count badge)
- Click day to expand or switch to week view

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/hooks/useEditorialCalendar.ts` | Modify | Add duplication mutation, search filter |
| `src/hooks/useIdeasForContent.ts` | New | Fetch ideas for content creation |
| `src/hooks/useCalendarSettings.ts` | Modify | Add date mode setting |
| `src/components/editorial-calendar/AddContentDialog.tsx` | Major Modify | Add "From Ideas" tab, single-date mode, dual recurrence |
| `src/components/editorial-calendar/CalendarDayColumn.tsx` | Modify | Add click-to-add, conditional lane rendering |
| `src/components/editorial-calendar/CalendarContentCard.tsx` | Modify | Add recurring indicator, duplicate action |
| `src/components/editorial-calendar/EditorialCalendarView.tsx` | Modify | Add search, selection mode, month view toggle |
| `src/components/editorial-calendar/CalendarMonthView.tsx` | New | Month view component |
| `src/components/editorial-calendar/RecurringEditConfirmation.tsx` | New | Confirmation dialog for recurring items |
| `src/components/editorial-calendar/BulkActionsBar.tsx` | New | Batch operations UI |
| `supabase/migrations/*` | New | Add `calendar_date_mode` to user_settings |

---

## Implementation Priority

### Must Have (Phase 1)
1. Single-date mode toggle
2. Ideas integration tab
3. Quick add from day click

### Should Have (Phase 2)
4. Dual recurring dates
5. Recurring instance management
6. Content duplication

### Nice to Have (Phase 3)
7. Bulk selection
8. Calendar search
9. Month view

---

## Technical Notes

- The existing `idea_id` column on `content_items` already supports Ideas integration
- Drag-and-drop IS working - uses `@dnd-kit/core` with `useDraggable` and `useDroppable`
- The calendar already supports all three date modes conceptually (both dates optional)
- Recurring patterns stored as JSONB, easily extendable

---

## Testing Checklist

After implementation:
- [ ] Verify drag-and-drop works between all lanes
- [ ] Test recurring content with different patterns
- [ ] Confirm Ideas link properly to content items
- [ ] Test single-date mode switches correctly
- [ ] Validate mobile responsiveness preserved
- [ ] Check RLS policies work for new queries
