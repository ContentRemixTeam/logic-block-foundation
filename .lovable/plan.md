
# Editorial Calendar Implementation Plan

## Overview

A visual drag-and-drop editorial calendar for planning content creation and publishing schedules. Features dual-lane scheduling (Create vs. Publish), content type icons, platform color coding, and bidirectional sync with tasks and wizards.

---

## Architecture Summary

```text
Week View Layout:
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Editorial Calendar                              [< Week >]   [View: Publish ▾]  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Platforms: [IG] [LI] [YT] [Email] [Blog] [Podcast] [+ Configure]               │
├────────┬────────┬────────┬────────┬────────┬────────┬────────┬──────────────────┤
│  Mon   │  Tue   │  Wed   │  Thu   │  Fri   │  Sat   │  Sun   │   Unscheduled    │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤──────────────────┤
│ CREATE │ CREATE │ CREATE │ CREATE │ CREATE │ CREATE │ CREATE │  [📧 Newsletter] │
│ (teal) │ (teal) │ (teal) │ (teal) │ (teal) │ (teal) │ (teal) │  [📱 IG Reel]    │
│ ~~~~~~ │ ~~~~~~ │ ~~~~~~ │        │        │        │        │  [🎙️ Podcast]   │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤                  │
│PUBLISH │PUBLISH │PUBLISH │PUBLISH │PUBLISH │PUBLISH │PUBLISH │                  │
│(purple)│(purple)│(purple)│(purple)│(purple)│(purple)│(purple)│                  │
│ ~~~~~~ │        │ ~~~~~~ │        │ ~~~~~~ │        │        │                  │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┴──────────────────┘
```

---

## Key Requirements (from user feedback)

1. **Tasks → Calendar Integration**: Optional toggle when creating project tasks to add to Editorial Calendar with platform, content type, and dual dates
2. **Dual-Lane Visual System**: Two distinct schedule colors (Create: teal, Publish: purple) per day
3. **Content Type Icons**: Each content format uses its Lucide icon from existing `FORMAT_METADATA`
4. **Platform Color Badges**: Derive colors from user platform settings, not stored on content rows
5. **Schema Alignment**: Use existing columns (`planned_creation_date`, `planned_publish_date`, `channel`) instead of duplicating

---

## Database Changes

### 1. New Table: `user_content_platforms`
Stores user's active platforms with custom colors.

```sql
CREATE TABLE public.user_content_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.user_content_platforms ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users manage own platforms"
  ON public.user_content_platforms FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_content_platforms_user ON public.user_content_platforms(user_id);
```

### 2. Extend `tasks` Table
Add content calendar linkage columns.

```sql
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS content_channel TEXT,
ADD COLUMN IF NOT EXISTS content_creation_date DATE,
ADD COLUMN IF NOT EXISTS content_publish_date DATE;

-- Index for calendar queries
CREATE INDEX IF NOT EXISTS idx_tasks_content_calendar 
ON public.tasks(content_creation_date, content_publish_date) 
WHERE content_item_id IS NOT NULL OR content_type IS NOT NULL;
```

### 3. Indexes for `content_items` (already have needed columns)
```sql
CREATE INDEX IF NOT EXISTS idx_content_items_creation_date 
ON public.content_items(planned_creation_date) WHERE planned_creation_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_items_publish_date 
ON public.content_items(planned_publish_date) WHERE planned_publish_date IS NOT NULL;
```

---

## Visual System Constants

### Schedule Lane Colors (consistent throughout app)
| Lane | Color | Tailwind Class |
|------|-------|----------------|
| Create | Teal | `bg-teal-500/20`, `border-teal-500` |
| Publish | Purple | `bg-violet-500/20`, `border-violet-500` |

### Default Platform Colors
| Platform | Color | Hex |
|----------|-------|-----|
| Instagram | Pink | `#E4405F` |
| LinkedIn | Blue | `#0A66C2` |
| YouTube | Red | `#FF0000` |
| TikTok | Black | `#000000` |
| Facebook | Blue | `#1877F2` |
| Email | Orange | `#EA580C` |
| Blog | Green | `#10B981` |
| Podcast | Purple | `#8B5CF6` |
| Twitter/X | Blue | `#1DA1F2` |

### Content Type Icons (from existing FORMAT_METADATA)
All content types already have Lucide icon mappings in `src/components/wizards/content-planner/utils/formatHelpers.ts`.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/EditorialCalendar.tsx` | Main page wrapper |
| `src/components/editorial-calendar/EditorialCalendarView.tsx` | Main calendar layout with DnD context |
| `src/components/editorial-calendar/CalendarWeekView.tsx` | Week grid with day columns |
| `src/components/editorial-calendar/CalendarDayColumn.tsx` | Single day with Create/Publish lanes |
| `src/components/editorial-calendar/CalendarContentCard.tsx` | Draggable content card with icon + platform badge |
| `src/components/editorial-calendar/UnscheduledPool.tsx` | Right sidebar for unscheduled items |
| `src/components/editorial-calendar/PlatformFilterBar.tsx` | Platform toggle chips |
| `src/components/editorial-calendar/ContentQuickEditDrawer.tsx` | Edit drawer for scheduling |
| `src/components/editorial-calendar/ViewToggle.tsx` | Publish/Creation view toggle |
| `src/components/editorial-calendar/index.ts` | Barrel exports |
| `src/hooks/useEditorialCalendar.ts` | Data fetching hook (content_items + content_plan_items + tasks) |
| `src/hooks/useUserPlatforms.ts` | Platform preferences hook |
| `src/lib/calendarConstants.ts` | Schedule colors, default platforms, type mappings |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add route `/editorial-calendar` |
| `src/components/AppSidebar.tsx` | Add nav link under ORGANIZE_NAV |
| `src/components/sidebar/MobileSidebarContent.tsx` | Add mobile nav link |
| `src/components/tasks/TaskQuickAdd.tsx` | Add optional "Add to Calendar" toggle + content fields |
| `src/components/tasks/types.ts` | Add content calendar fields to Task interface |
| Database migration | Add `user_content_platforms` table + extend `tasks` |

---

## Component Details

### CalendarDayColumn (Dual-Lane Design)
```tsx
// Visual structure per day
<div className="flex flex-col h-full">
  {/* Create Lane */}
  <DroppableZone id={`create-${date}`} className="bg-teal-500/10 border-l-4 border-teal-500">
    <div className="text-xs text-teal-600 font-medium">Create</div>
    {createItems.map(item => <CalendarContentCard key={item.id} item={item} />)}
  </DroppableZone>
  
  {/* Publish Lane */}
  <DroppableZone id={`publish-${date}`} className="bg-violet-500/10 border-l-4 border-violet-500">
    <div className="text-xs text-violet-600 font-medium">Publish</div>
    {publishItems.map(item => <CalendarContentCard key={item.id} item={item} />)}
  </DroppableZone>
</div>
```

### CalendarContentCard
```tsx
// Card with icon + platform badge
<div className="flex items-center gap-2 p-2 bg-card rounded border">
  <ContentTypeIcon type={item.type} className="h-4 w-4" />
  <span className="text-sm truncate flex-1">{item.title}</span>
  <Badge style={{ backgroundColor: platformColor }} className="text-xs">
    {item.channel}
  </Badge>
</div>
```

### Task Creation Integration
When user creates a task with "Add to Calendar" enabled:
1. Show additional fields: Platform, Content Type, Create Date, Publish Date
2. On save, store in tasks table with content_ prefixed columns
3. Item appears in Editorial Calendar automatically
4. Can be promoted to full `content_items` entry later

---

## Data Flow

```text
Sources feeding Editorial Calendar:
├── content_items (planned_creation_date, planned_publish_date, channel)
├── content_plan_items (planned_date, channel, content_type)
└── tasks (where content_type IS NOT NULL)

User Actions:
├── Drag to Create lane → updates creation date
├── Drag to Publish lane → updates publish date
├── Drag to Unscheduled → clears both dates
└── Quick Edit → modify all fields
```

---

## Mobile Experience

Following existing mobile UX standards from `InlineCalendarAgenda`:
- Single-column day list with swipe navigation
- 44px+ touch targets
- Tap-to-schedule drawer (not drag-only)
- Bottom sheet for quick edit
- Auto-scroll to today

---

## Implementation Phases

### Phase 1: Foundation + Visual System (This Implementation)
1. Database migration (platforms table, tasks extension)
2. Create `calendarConstants.ts` with colors and icon mappings
3. Create `EditorialCalendarView.tsx` with week grid
4. Implement dual-lane `CalendarDayColumn` with Create/Publish zones
5. Create `CalendarContentCard` with icons and platform badges
6. Implement `UnscheduledPool` sidebar
7. Add DnD context with drop handlers
8. Create `PlatformFilterBar` with toggle chips
9. Implement `ContentQuickEditDrawer`
10. Add route and navigation

### Phase 2: Task Integration
11. Extend `TaskQuickAdd` with calendar toggle
12. Create task creation flow with content fields
13. Sync tasks with calendar display

### Phase 3: Wizard Sync
14. Connect Content Planner wizard output to calendar
15. Handle `content_plan_items` display
16. Implement "Convert to Content" action

---

## Technical Notes

- Reuse `@dnd-kit` patterns from `InlineCalendarAgenda.tsx`
- Leverage existing `FORMAT_METADATA` for icon resolution
- Apply optimistic updates pattern from tasks system
- Use `date-fns` for all date manipulation
- Follow data normalization patterns for API responses
- Platform colors derived at render time, not stored on items
