
# Comprehensive Mobile Optimization Plan

## Overview

This plan addresses a complete mobile-first redesign covering 5 major areas:
1. **Mobile Layout Structure** - Full-width content, safe areas, responsive foundation
2. **Mobile Page Optimizations** - DailyPlan, WeeklyPlan, Tasks specific improvements
3. **Daily Plan Mobile** - Single-column vertical flow, simplified sections
4. **Agenda View Polish** - any.do-style schedule interface
5. **Task Scheduling UX** - One-tap mobile scheduling

---

## Current State Analysis

### What Already Works Well
- **Bottom Navigation**: MobileBottomNav.tsx with 5 tabs (Home, Plan, Tasks, Projects, More)
- **Safe Area CSS**: index.css has `.safe-bottom`, `.safe-top`, etc. utilities
- **Viewport**: index.html configured with `viewport-fit=cover` and `user-scalable=no`
- **useIsMobile hook**: 768px breakpoint, used in 12+ components
- **Layout.tsx**: Adds `pb-24` padding on mobile, hides sidebar trigger
- **WeekPlannerMobile**: Swipeable day selector strip already exists
- **InlineCalendarAgenda**: DnD kit with TouchSensor configured

### What Needs Improvement
- DailyPlan.tsx renders desktop-oriented multi-column layouts on mobile
- Time slots in agenda have small touch targets (48px min-h, needs 60-80px)
- No mobile-specific section simplification or hiding
- Task scheduling requires precise drag (hard on touch)
- Typography sizes not optimized for mobile readability
- Missing current time indicator auto-scroll

---

## Implementation Details

### Phase 1: Foundation & Responsive Layout

**File: `src/index.css`** (ADD mobile utility classes)

Add new mobile-specific utility classes:
```css
/* Mobile touch targets */
.touch-target-min {
  min-height: 44px;
  min-width: 44px;
}

/* Mobile typography scale */
@media (max-width: 767px) {
  .mobile-h1 { font-size: 24px; line-height: 1.2; }
  .mobile-h2 { font-size: 20px; line-height: 1.3; }
  .mobile-body { font-size: 16px; }
  .mobile-label { font-size: 14px; }
}

/* Prevent horizontal scroll on mobile */
.mobile-container {
  max-width: 100vw;
  overflow-x: hidden;
}

/* Mobile card spacing */
@media (max-width: 767px) {
  .mobile-card {
    padding: 12px;
  }
  .mobile-section-gap {
    gap: 16px;
  }
}
```

---

### Phase 2: Daily Plan Mobile Optimization

**File: `src/pages/DailyPlan.tsx`** (MODIFY)

1. Add mobile detection at top:
```typescript
const isMobile = useIsMobile();
```

2. Create mobile-specific section order:
```typescript
const MOBILE_PRIORITY_SECTIONS = [
  'habits_tracker',
  'one_thing', 
  'top_3_priorities',
  'calendar_agenda',
  'info_cards', // simplified as badge
  'end_of_day_reflection'
];

const MOBILE_HIDDEN_SECTIONS = [
  'posting_slot',
  'nurture_checkin', 
  'deep_mode',
  'goal_rewrite' // collapse instead
];
```

3. Update main container for mobile:
```tsx
<div className={cn(
  "mx-auto space-y-8",
  isMobile ? "max-w-full px-4 space-y-4" : "max-w-3xl"
)}>
```

4. Adjust header for mobile:
```tsx
<h1 className={cn(
  "font-bold",
  isMobile ? "text-2xl" : "text-3xl"
)}>Daily Plan</h1>
```

5. Simplify info cards on mobile - show as compact badges:
```tsx
{isSectionVisible('info_cards') && (
  isMobile ? (
    <div className="flex gap-2 flex-wrap">
      <Badge>Day {cycleData?.current_day || 0}/90</Badge>
      <Badge variant="outline">{cycleData?.goal?.substring(0, 30)}...</Badge>
    </div>
  ) : (
    <InfoCards ... />
  )
)}
```

6. Collapse cycle snapshot on mobile by default:
```tsx
{isSectionVisible('cycle_snapshot') && (
  <Collapsible defaultOpen={!isMobile}>
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="w-full justify-between">
        <span className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Cycle Snapshot
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <CycleSnapshotCard ... />
    </CollapsibleContent>
  </Collapsible>
)}
```

---

### Phase 3: InlineCalendarAgenda Mobile Optimization

**File: `src/components/daily-plan/InlineCalendarAgenda.tsx`** (MODIFY)

1. Add mobile detection:
```typescript
const isMobile = useIsMobile();
```

2. Increase time slot height on mobile:
```tsx
const TIME_SLOT_HEIGHT = isMobile ? 80 : 60; // Larger touch targets
```

3. Add tap-to-schedule as alternative to drag:
```tsx
const [selectedTaskForSchedule, setSelectedTaskForSchedule] = useState<Task | null>(null);
const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

// In pool task render:
<Button
  variant="ghost"
  size="sm"
  className="h-10 px-3 touch-manipulation"
  onClick={() => {
    setSelectedTaskForSchedule(task);
    setScheduleModalOpen(true);
  }}
>
  <Clock className="h-4 w-4 mr-1" />
  Schedule
</Button>
```

4. Add ScheduleTimeModal for mobile:
```tsx
<Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Schedule: {selectedTaskForSchedule?.task_text}</DialogTitle>
    </DialogHeader>
    <div className="grid grid-cols-4 gap-2 py-4">
      {timeSlots.map(slot => (
        <Button
          key={slot.time}
          variant={getTasksForSlot(slot.time).length > 0 ? "secondary" : "outline"}
          className="h-12 text-sm"
          onClick={() => handleQuickSchedule(selectedTaskForSchedule?.task_id, slot.time)}
        >
          {formatTime(slot.time)}
        </Button>
      ))}
    </div>
  </DialogContent>
</Dialog>
```

5. Add current time auto-scroll on mount:
```tsx
useEffect(() => {
  if (isMobile && scheduleRef.current) {
    const currentHour = new Date().getHours();
    if (currentHour >= officeHoursStart && currentHour <= officeHoursEnd) {
      const scrollPosition = (currentHour - officeHoursStart) * TIME_SLOT_HEIGHT;
      scheduleRef.current.scrollTo({ top: scrollPosition - 50, behavior: 'smooth' });
    }
  }
}, [isMobile]);
```

6. Improve time slot styling for mobile:
```tsx
<div
  ref={setNodeRef}
  className={cn(
    "p-2 rounded-lg border transition-all flex",
    isMobile ? "min-h-[80px]" : "min-h-[48px]",
    // ... rest of styling
  )}
>
```

---

### Phase 4: Task Pool with Schedule Button

**File: `src/components/daily-plan/TasksPool.tsx`** (NEW or MODIFY existing)

Create mobile-optimized task pool component:

```tsx
interface TasksPoolMobileProps {
  tasks: Task[];
  onSchedule: (taskId: string, time: string) => void;
  onToggle: (taskId: string, completed: boolean) => void;
}

export function TasksPoolMobile({ tasks, onSchedule, onToggle }: TasksPoolMobileProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Unscheduled ({tasks.length})
      </h3>
      
      {tasks.map(task => (
        <div
          key={task.task_id}
          className="flex items-center gap-3 p-3 bg-card border rounded-lg min-h-[56px]"
        >
          <Checkbox
            checked={task.is_completed}
            onCheckedChange={(checked) => onToggle(task.task_id, !!checked)}
            className="h-5 w-5"
          />
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{task.task_text}</p>
            {task.estimated_minutes && (
              <p className="text-xs text-muted-foreground">{task.estimated_minutes}m</p>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 shrink-0 touch-manipulation"
            onClick={() => setSelectedTask(task)}
          >
            <Clock className="h-4 w-4 mr-1" />
            Schedule
          </Button>
        </div>
      ))}
      
      {/* Quick Schedule Modal */}
      <ScheduleTimeModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onSchedule={onSchedule}
      />
    </div>
  );
}
```

---

### Phase 5: Schedule Time Modal Component

**File: `src/components/mobile/ScheduleTimeModal.tsx`** (NEW)

```tsx
interface ScheduleTimeModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (taskId: string, time: string) => void;
  availableSlots?: string[];
}

export function ScheduleTimeModal({ 
  task, 
  open, 
  onOpenChange,
  onSchedule,
  availableSlots = generateDefaultSlots()
}: ScheduleTimeModalProps) {
  const isMobile = useIsMobile();
  
  const handleSelect = (time: string) => {
    if (task) {
      onSchedule(task.task_id, time);
      onOpenChange(false);
      toast.success(`Scheduled for ${formatTime12(time)}`);
    }
  };
  
  const content = (
    <div className="space-y-4">
      {task && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium text-sm">{task.task_text}</p>
          {task.estimated_minutes && (
            <p className="text-xs text-muted-foreground mt-1">
              Duration: {task.estimated_minutes} min
            </p>
          )}
        </div>
      )}
      
      <div>
        <p className="text-sm font-medium mb-2">Pick a time:</p>
        <div className="grid grid-cols-4 gap-2">
          {availableSlots.map(time => (
            <Button
              key={time}
              variant="outline"
              className="h-12 text-sm touch-manipulation"
              onClick={() => handleSelect(time)}
            >
              {formatTime12(time)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
  
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader>
            <DrawerTitle>Schedule Task</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Task</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
```

---

### Phase 6: Current Time Indicator Enhancement

**File: `src/components/tasks/views/CurrentTimeIndicator.tsx`** (MODIFY)

Already exists with good implementation. Add pulse animation:

```tsx
<div className="absolute -left-1.5 -top-1.5 w-4 h-4 bg-destructive rounded-full shadow-lg animate-pulse" />
```

---

### Phase 7: Empty States for Mobile

**File: `src/components/daily-plan/EmptyAgendaState.tsx`** (NEW)

```tsx
interface EmptyAgendaStateProps {
  type: 'no-tasks' | 'no-office-hours';
  onAddTask?: () => void;
  onConfigureHours?: () => void;
}

export function EmptyAgendaState({ type, onAddTask, onConfigureHours }: EmptyAgendaStateProps) {
  if (type === 'no-tasks') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg mb-2">No tasks today</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add a task or drag from your inbox
        </p>
        <Button onClick={onAddTask} className="touch-manipulation">
          <Plus className="h-4 w-4 mr-2" />
          Add a task
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Settings className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="font-medium text-lg mb-2">Set office hours</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Configure your working hours to see your schedule
      </p>
      <Button onClick={onConfigureHours} variant="outline" className="touch-manipulation">
        <Settings className="h-4 w-4 mr-2" />
        Configure Hours
      </Button>
    </div>
  );
}
```

---

### Phase 8: Tasks Page Mobile Optimization

**File: `src/pages/Tasks.tsx`** (MODIFY)

1. Add mobile detection and responsive adjustments:
```typescript
const isMobile = useIsMobile();
```

2. Adjust task card heights for touch:
```tsx
<div className={cn(
  "flex items-start gap-3 rounded-lg border bg-card transition-colors",
  isMobile ? "p-4 min-h-[64px]" : "p-3"
)}>
```

3. Increase checkbox sizes on mobile:
```tsx
<Checkbox className={isMobile ? "h-6 w-6" : "h-5 w-5"} />
```

4. Simplify toolbar on mobile:
```tsx
{isMobile ? (
  <div className="flex gap-2 items-center overflow-x-auto pb-2">
    <Select value={viewMode} onValueChange={setViewMode}>
      <SelectTrigger className="w-32 h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="database">List</SelectItem>
        <SelectItem value="timeline">Timeline</SelectItem>
      </SelectContent>
    </Select>
    <Button variant="outline" size="icon" className="h-10 w-10">
      <Filter className="h-4 w-4" />
    </Button>
  </div>
) : (
  <TaskViewsToolbar ... />
)}
```

---

### Phase 9: WeekPlannerMobile Enhancement

**File: `src/components/weekly-plan/WeekPlannerMobile.tsx`** (MODIFY)

Already well-structured. Minor enhancements:

1. Increase touch target for day buttons:
```tsx
<button
  key={i}
  onClick={() => setSelectedDayIndex(i)}
  className={cn(
    'flex flex-col items-center px-3 py-2 rounded-lg min-w-[48px] min-h-[56px] touch-manipulation transition-colors',
    // ... styling
  )}
>
```

2. Add haptic feedback hint for better UX (comment for future):
```tsx
// TODO: Add navigator.vibrate(10) on day change for tactile feedback
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/index.css` | MODIFY | Add mobile utility classes, typography scale |
| `src/pages/DailyPlan.tsx` | MODIFY | Mobile section ordering, simplified info cards, collapsible sections |
| `src/components/daily-plan/InlineCalendarAgenda.tsx` | MODIFY | Tap-to-schedule, larger touch targets, auto-scroll |
| `src/components/mobile/ScheduleTimeModal.tsx` | CREATE | Time picker modal for mobile scheduling |
| `src/components/daily-plan/EmptyAgendaState.tsx` | CREATE | Empty state designs |
| `src/pages/Tasks.tsx` | MODIFY | Touch-friendly cards, simplified toolbar |
| `src/components/weekly-plan/WeekPlannerMobile.tsx` | MODIFY | Larger touch targets for day selector |

---

## Testing Checklist

**Device Testing:**
- [ ] iPhone SE (375px): All elements visible, readable, tappable
- [ ] iPhone 12 (390px): All elements visible, readable, tappable
- [ ] iPad (768px): Sidebar shows on landscape
- [ ] Landscape (667px): Handles correctly

**Interaction Testing:**
- [ ] All buttons minimum 44x44px touch targets
- [ ] Checkboxes minimum 20px
- [ ] Spacing between targets minimum 8px
- [ ] No horizontal scroll on any page
- [ ] Tap-to-schedule works smoothly
- [ ] Drag-to-schedule still works on touch

**Visual Testing:**
- [ ] Titles minimum 24px on mobile
- [ ] Body text minimum 16px
- [ ] Labels minimum 14px
- [ ] All text readable without zoom

**Safe Area Testing:**
- [ ] Bottom nav not overlapped by home indicator
- [ ] Content not hidden under notch
- [ ] Proper padding on all sides

**Performance:**
- [ ] Fast response time on interactions
- [ ] Smooth scrolling through sections
- [ ] No layout shift on load

---

## Implementation Order

1. **Foundation** (Phase 1): CSS utilities and base responsive styles
2. **Mobile Components** (Phases 5-7): ScheduleTimeModal, EmptyAgendaState
3. **Agenda Optimization** (Phases 3-4): InlineCalendarAgenda + TasksPool
4. **Page Updates** (Phases 2, 8, 9): DailyPlan, Tasks, WeekPlanner

This order ensures the foundation is in place before updating page components, and new reusable components are created before they're needed.
