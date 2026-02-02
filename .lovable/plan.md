
# Editorial Calendar Fixes

## Overview
This plan addresses 5 must-fix issues identified in the Editorial Calendar implementation: DnD ID collisions, week filtering query bugs, content type icon mapping, lane overflow styling, and content_plan_items duplicate prevention.

---

## Issues & Fixes

### 1. DnD ID Collisions (Critical)

**Problem**: The same item can render in multiple lanes (create + publish, or pool + lane) with the same draggable `id`, causing `@dnd-kit` to break.

**Current Code** (CalendarContentCard.tsx line 37-40):
```tsx
const { ... } = useDraggable({
  id: item.id,  // Same ID everywhere!
  data: { item },
});
```

**Solution**: Make draggable IDs lane-specific by adding a `laneContext` prop:

```tsx
// CalendarContentCard.tsx
interface CalendarContentCardProps {
  item: CalendarItem;
  laneContext: 'create' | 'publish' | 'pool'; // NEW
  // ...
}

const { ... } = useDraggable({
  id: `${item.id}:${laneContext}`, // e.g., "content-abc:create"
  data: { item }, // Keep base item in data for drop handler
});
```

**Files to modify**:
- `src/components/editorial-calendar/CalendarContentCard.tsx` - Add `laneContext` prop
- `src/components/editorial-calendar/CalendarDayColumn.tsx` - Pass lane type to cards
- `src/components/editorial-calendar/UnscheduledPool.tsx` - Pass `laneContext="pool"`
- `src/components/editorial-calendar/EditorialCalendarView.tsx` - Parse base item ID from drag event

---

### 2. Week Filtering Query Bug (Critical)

**Problem**: The current `.or(...).or(...)` chain doesn't properly filter items to the week range. It creates an incorrect logical grouping.

**Current Code** (useEditorialCalendar.ts lines 27-32):
```tsx
.or(`planned_creation_date.gte.${weekStartStr},planned_publish_date.gte.${weekStartStr}`)
.or(`planned_creation_date.lte.${weekEndStr},planned_publish_date.lte.${weekEndStr}`)
```

This creates: `(creation >= start OR publish >= start) AND (creation <= end OR publish <= end)` which is NOT a proper "between" filter.

**Solution**: Use a single grouped OR with proper AND conditions:

```tsx
.or(
  `and(planned_creation_date.gte.${weekStartStr},planned_creation_date.lte.${weekEndStr}),` +
  `and(planned_publish_date.gte.${weekStartStr},planned_publish_date.lte.${weekEndStr})`
)
```

This creates: `(creation BETWEEN start AND end) OR (publish BETWEEN start AND end)` - items appear if either date falls in the week.

**Files to modify**:
- `src/hooks/useEditorialCalendar.ts` - Fix content_items and tasks queries

---

### 3. Content Type Icon Mapping (Important)

**Problem**: `CONTENT_TYPE_ICONS` uses keys like `instagram-reel`, but actual database values use the `ContentFormat` type which already matches these keys. The issue is the `getContentTypeIcon` function does no normalization.

**Current Code** (calendarConstants.ts line 123-126):
```tsx
export function getContentTypeIcon(type: string | null | undefined): string {
  if (!type) return DEFAULT_CONTENT_ICON;
  return CONTENT_TYPE_ICONS[type] || DEFAULT_CONTENT_ICON;
}
```

**Solution**: Add normalization to handle case variations and label-to-id mapping:

```tsx
// Add label-to-id mapping for backwards compatibility
const TYPE_LABEL_TO_ID: Record<string, string> = {
  'newsletter': 'newsletter',
  'post': 'instagram-post',
  'reel': 'instagram-reel',
  'reel/short': 'instagram-reel',
  'short': 'youtube-short',
  'video': 'youtube-video',
  'linkedin post': 'linkedin-post',
  'blog post': 'blog-post',
  'email': 'email-single',
  // ... etc
};

export function getContentTypeIcon(type: string | null | undefined): string {
  if (!type) return DEFAULT_CONTENT_ICON;
  
  // Try direct match first
  if (CONTENT_TYPE_ICONS[type]) return CONTENT_TYPE_ICONS[type];
  
  // Normalize: lowercase, trim
  const normalized = type.toLowerCase().trim();
  
  // Try normalized direct match
  if (CONTENT_TYPE_ICONS[normalized]) return CONTENT_TYPE_ICONS[normalized];
  
  // Try label-to-id mapping
  const mappedId = TYPE_LABEL_TO_ID[normalized];
  if (mappedId && CONTENT_TYPE_ICONS[mappedId]) return CONTENT_TYPE_ICONS[mappedId];
  
  return DEFAULT_CONTENT_ICON;
}
```

**Files to modify**:
- `src/lib/calendarConstants.ts` - Add label mapping and normalize function

---

### 4. Lane Overflow Scrolling (Usability)

**Problem**: Days with lots of content clip items because lanes lack proper overflow styling.

**Current Code** (CalendarDayColumn.tsx line 88-92):
```tsx
<div
  ref={setNodeRef}
  className={cn(
    "flex-1 p-1.5 min-h-[80px] transition-colors",
    // No overflow handling!
  )}
>
```

**Solution**: Add `min-h-0 overflow-y-auto` to each lane container:

```tsx
<div
  ref={setNodeRef}
  className={cn(
    "flex-1 p-1.5 min-h-0 overflow-y-auto transition-colors",
    // ...
  )}
>
```

**Files to modify**:
- `src/components/editorial-calendar/CalendarDayColumn.tsx` - Add overflow classes to DroppableLane

---

### 5. Content Plan Items Duplicate Prevention (Polish)

**Problem**: `content_plan_items` that have been promoted to `content_items` (via `content_item_id`) appear twice on the calendar.

**Current Code** (useEditorialCalendar.ts lines 46-54):
```tsx
const { data, error } = await supabase
  .from('content_plan_items')
  .select('id, title, content_type, channel, planned_date, status')
  // No content_item_id filter!
```

**Solution**: Add filter to exclude linked plan items:

```tsx
const { data, error } = await supabase
  .from('content_plan_items')
  .select('id, title, content_type, channel, planned_date, status')
  .eq('user_id', user.id)
  .is('content_item_id', null) // Only unlinked plan items
  .gte('planned_date', weekStartStr)
  .lte('planned_date', weekEndStr);
```

**Files to modify**:
- `src/hooks/useEditorialCalendar.ts` - Add `.is('content_item_id', null)` filter

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/editorial-calendar/CalendarContentCard.tsx` | Add `laneContext` prop, update draggable ID |
| `src/components/editorial-calendar/CalendarDayColumn.tsx` | Pass `laneContext` to cards, add overflow classes |
| `src/components/editorial-calendar/UnscheduledPool.tsx` | Pass `laneContext="pool"` to cards |
| `src/components/editorial-calendar/EditorialCalendarView.tsx` | Parse base item ID from composite drag ID |
| `src/hooks/useEditorialCalendar.ts` | Fix OR query, add content_item_id filter |
| `src/lib/calendarConstants.ts` | Add type normalization and label mapping |

---

## Technical Details

### DnD ID Format
- **Create lane**: `content-abc:create`
- **Publish lane**: `content-abc:publish`
- **Unscheduled pool**: `content-abc:pool`

The drop handler extracts the base item from `active.data.current.item`, so no ID parsing is needed on drop.

### Query Logic Explanation
The corrected Supabase query uses nested `and()` within `or()`:
```
or(
  and(planned_creation_date.gte.2024-01-01,planned_creation_date.lte.2024-01-07),
  and(planned_publish_date.gte.2024-01-01,planned_publish_date.lte.2024-01-07)
)
```
This correctly matches items where **either** date falls within the week range.

### Type Normalization Priority
1. Direct match (e.g., `instagram-reel`)
2. Lowercase normalized match
3. Label-to-ID mapping (e.g., `Reel/Short` → `instagram-reel`)
4. Fallback to `FileText` icon
