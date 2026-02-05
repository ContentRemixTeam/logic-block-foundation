

# Add Project & Launch Filters to Task List

## Overview

Add the ability to filter tasks by **Project** and **Launch** in the Task List view on the Tasks page. Currently, the toolbar only supports filtering by Priority and Energy Level. This enhancement will let you quickly focus on tasks from specific projects or launches.

## What You'll Get

### New Filter Options
- **Project Filter** - Filter to show only tasks from one or more specific projects
- **Launch Filter** - Filter to show only tasks linked to active launches
- Both filters will appear in the existing Filters popover alongside Priority and Energy

### Filter Behavior
- Multi-select enabled (can filter by multiple projects/launches simultaneously)
- Badges show active filter count
- Filter chips/badges display when filters are active
- "Show All" / "Clear" option to reset each filter

## UI Design

The filters popover will be enhanced with new sections:

```text
┌─────────────────────────────────────────┐
│  Filters                    [Clear all] │
├─────────────────────────────────────────┤
│  PRIORITY                               │
│  [High] [Medium] [Low]                  │
├─────────────────────────────────────────┤
│  ENERGY LEVEL                           │
│  [High Focus] [Medium] [Low Energy]     │
├─────────────────────────────────────────┤
│  PROJECT                                │
│  [Project A] [Project B] [No Project]   │
├─────────────────────────────────────────┤
│  LAUNCH                                 │
│  [Spring Launch] [Q2 Promo]             │
└─────────────────────────────────────────┘
```

Active filters will show as dismissible badges below the search bar:

```text
[Search...] [Filters (3)]
Active: [Project: Website Redesign ✕] [Launch: Spring Sale ✕]
```

---

## Implementation Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/tasks/types.ts` | Add `projectIds` and `launchIds` to filter types |
| `src/components/tasks/TasksPageToolbar.tsx` | Add Project and Launch filter sections to popover |
| `src/pages/Tasks.tsx` | Extend filter state, pass data to toolbar, apply filters to tasks |

### Type Updates (`types.ts`)

No new types needed - we'll use string arrays for project and launch IDs in the existing filter object pattern.

### Filter State Changes (`Tasks.tsx`)

Extend the existing `filters` state object:

```typescript
const [filters, setFilters] = useState({
  priority: [] as string[],
  tags: [] as string[],
  cycle: 'all' as string,
  energy: [] as EnergyLevel[],
  projectIds: [] as string[],    // NEW
  launchIds: [] as string[],     // NEW
});
```

### Data Fetching

The Tasks page will need to fetch projects and launches to populate the filter dropdowns:

```typescript
// Import existing hooks
import { useProjects } from '@/hooks/useProjects';
import { useLaunches } from '@/hooks/useLaunches';

// In component
const { data: projects = [] } = useProjects();
const { launches } = useLaunches();
```

### TasksPageToolbar Changes

1. Accept new props for available projects and launches
2. Add new filter sections in the Filters popover
3. Add toggle functions for project/launch selection
4. Display project colors as visual indicators

```typescript
interface TasksPageToolbarProps {
  // ...existing props
  projects?: Array<{ id: string; name: string; color: string; is_launch?: boolean }>;
  launches?: Array<{ id: string; name: string }>;
}
```

### Filter Logic (`Tasks.tsx`)

Add project and launch filtering to the existing `filteredTasks` useMemo:

```typescript
// STEP 4: Project filter (new)
if (filters.projectIds.length > 0) {
  const hasNoProjectFilter = filters.projectIds.includes('no_project');
  if (!task.project_id && !hasNoProjectFilter) return;
  if (task.project_id && !filters.projectIds.includes(task.project_id)) return;
}

// STEP 5: Launch filter (new)
if (filters.launchIds.length > 0) {
  const taskLaunchId = task.project?.is_launch ? task.project_id : null;
  if (!taskLaunchId || !filters.launchIds.includes(taskLaunchId)) return;
}
```

### UI Components in Toolbar

Projects section with color dots:

```typescript
{/* Projects */}
<div className="space-y-2">
  <label className="text-xs font-medium text-muted-foreground uppercase">
    Project
  </label>
  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
    {projects.map(project => (
      <Badge
        key={project.id}
        variant="outline"
        className={cn(
          "cursor-pointer transition-colors gap-1.5",
          filters.projectIds.includes(project.id) && "bg-accent"
        )}
        onClick={() => toggleProject(project.id)}
      >
        <div 
          className="h-2.5 w-2.5 rounded-full" 
          style={{ backgroundColor: project.color }} 
        />
        {project.name}
      </Badge>
    ))}
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer",
        filters.projectIds.includes('no_project') && "bg-accent"
      )}
      onClick={() => toggleProject('no_project')}
    >
      No Project
    </Badge>
  </div>
</div>
```

---

## User Experience

1. **Consistency** - Filters work the same way as existing Priority/Energy filters
2. **Multi-select** - Can combine multiple filters (e.g., 2 projects + high priority)
3. **Visual clarity** - Project colors shown in filter badges
4. **Clear feedback** - Active filter count updates in toolbar button
5. **Easy reset** - "Clear all" removes all active filters at once

---

## Mobile Considerations

- Filter popover is already touch-friendly
- Scrollable project list for users with many projects
- Badge-style filters work well on smaller screens

