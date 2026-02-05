
# Add Sort and Group Controls to Task List View

## Overview

Add the ability to **sort** and **group** tasks in the List view on the Tasks page. Currently, the List view only groups tasks by date (hardcoded). This change will let you organize your tasks by different categories like Project, Priority, or Energy Level.

## What You'll Get

### Group By Options
- **Due Date** (current default) - Overdue, Today, Tomorrow, This Week, Later, No Date
- **Priority** - High, Medium, Low, No Priority
- **Project** - Tasks grouped by their associated project
- **Energy Level** - High Focus, Medium, Low Energy

### Sort Options
- **Due Date** - Earliest first or latest first
- **Priority** - High to Low or Low to High
- **Created Date** - Newest first or oldest first
- **Name** - A-Z or Z-A

## UI Design

A small control bar will appear above the task list (only in List view):

```text
+--------------------------------------------------+
|  Group by: [Due Date ▼]   Sort by: [Priority ▼]  |
+--------------------------------------------------+
|  ▼ Overdue (2)                                   |
|     [ ] Task 1                                   |
|     [ ] Task 2                                   |
|  ▼ Today (3)                                     |
|     [ ] Task 3                                   |
|     ...                                          |
+--------------------------------------------------+
```

- **Group By dropdown** - Select how tasks are organized into sections
- **Sort By dropdown** - Select the order within each group
- Controls only visible in List view (not Board or Calendar)

---

## Implementation Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/tasks/TasksPageToolbar.tsx` | Add `groupBy` and `sortBy` to filters state |
| `src/components/tasks/views/TaskListView.tsx` | Add grouping/sorting dropdowns and logic |
| `src/pages/Tasks.tsx` | Pass new filter state to TaskListView |
| `src/components/tasks/types.ts` | Add type definitions for options |

### New Types

```typescript
// In types.ts
export type GroupByOption = 'date' | 'priority' | 'project' | 'energy';
export type SortByOption = 'scheduled_date' | 'priority' | 'created_at' | 'task_text';
export type SortDirection = 'asc' | 'desc';
```

### TaskListView Changes

1. Add local state for `groupBy` and `sortBy` options
2. Add a mini-toolbar with two Select dropdowns above the task list
3. Update `groupedTasks` useMemo to support dynamic grouping:
   - `date` → Current logic (Overdue, Today, Tomorrow, etc.)
   - `priority` → High, Medium, Low, No Priority groups
   - `project` → Group by project name, plus "No Project"
   - `energy` → High Focus, Medium, Low Energy groups

4. Add sorting within each group based on `sortBy` selection

### Grouping Logic Pattern

```typescript
// Simplified example of dynamic grouping
const groupedTasks = useMemo(() => {
  const groups: Map<string, Task[]> = new Map();
  
  sortedTasks.forEach(task => {
    let groupId: string;
    
    switch (groupBy) {
      case 'date':
        groupId = getDateGroup(task); // existing logic
        break;
      case 'priority':
        groupId = task.priority || 'none';
        break;
      case 'project':
        groupId = task.project_id || 'no_project';
        break;
      case 'energy':
        groupId = task.energy_level || 'none';
        break;
    }
    
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(task);
  });
  
  return groups;
}, [sortedTasks, groupBy]);
```

### Group Configurations

```typescript
const DATE_GROUPS = [
  { id: 'overdue', name: 'Overdue', icon: AlertTriangle, color: 'text-destructive' },
  { id: 'today', name: 'Today', icon: Sun, color: 'text-amber-500' },
  { id: 'tomorrow', name: 'Tomorrow', icon: Sunrise, color: 'text-blue-500' },
  { id: 'thisWeek', name: 'This Week', icon: Calendar },
  { id: 'later', name: 'Later', icon: Calendar },
  { id: 'unscheduled', name: 'No Date', icon: Inbox },
];

const PRIORITY_GROUPS = [
  { id: 'high', name: 'High Priority', color: 'text-destructive' },
  { id: 'medium', name: 'Medium Priority', color: 'text-warning' },
  { id: 'low', name: 'Low Priority', color: 'text-muted-foreground' },
  { id: 'none', name: 'No Priority' },
];

const ENERGY_GROUPS = [
  { id: 'high_focus', name: 'High Focus', color: 'text-destructive' },
  { id: 'medium', name: 'Medium Energy', color: 'text-warning' },
  { id: 'low_energy', name: 'Low Energy', color: 'text-success' },
  { id: 'none', name: 'No Energy Level' },
];
```

### Dynamic Project Groups

Projects are fetched from existing task data:

```typescript
const projectGroups = useMemo(() => {
  const projectMap = new Map<string, { id: string; name: string; color: string }>();
  
  tasks.forEach(task => {
    if (task.project_id && task.project) {
      projectMap.set(task.project_id, {
        id: task.project_id,
        name: task.project.name,
        color: task.project.color,
      });
    }
  });
  
  return [
    ...Array.from(projectMap.values()),
    { id: 'no_project', name: 'No Project', color: '#9CA3AF' },
  ];
}, [tasks]);
```

---

## User Experience

1. **Default**: Group by Date, Sort by Priority (current behavior maintained)
2. **Persistence**: Selection remembered during session (resets on page reload)
3. **Empty groups hidden**: Groups with no tasks are not shown
4. **Collapsible**: Each group can be expanded/collapsed (existing functionality)

---

## Mobile Considerations

On mobile, the dropdowns will be compact:
- Shorter labels ("Group" / "Sort" instead of "Group by" / "Sort by")
- Full-width dropdowns when opened
- Touch-friendly 44px tap targets
