
# Task Timer (Stopwatch) Feature - Implementation Plan

## Overview

Transform time tracking from a post-completion entry system into a live stopwatch that users toggle while working on tasks. Users will:
1. Click a "Start" button on any task to begin timing
2. See elapsed time counting up in real-time
3. Click "Stop" when done - time is automatically logged
4. Optional: Complete the task immediately or continue working

This mirrors how tools like Toggl, Clockify, and Harvest work.

---

## How It Works

### Starting a Timer
- Click the play button on any task card
- Timer starts counting up from 00:00
- A floating indicator appears (similar to the existing PiP toolbar)
- Only one task can be timed at once

### While Timing
- Elapsed time displays on the task card
- Floating mini-bar shows current task + time (stays visible across pages)
- Can pause/resume the timer
- Can switch to a different task (current timer stops, new one starts)

### Stopping the Timer
- Click stop to end timing
- Elapsed minutes automatically saved to `actual_minutes`
- Option to complete the task immediately or just log time
- Time entry recorded for analytics

---

## User Interface Changes

### Task Cards
Add a timer toggle button to each task card:

```text
┌─────────────────────────────────────────────────────┐
│ ☐ Write blog post about productivity tips          │
│   📁 Content  ⏱ Est: 45min  ▶️ Start Timer         │
└─────────────────────────────────────────────────────┘

When timing:
┌─────────────────────────────────────────────────────┐
│ ☐ Write blog post about productivity tips          │
│   📁 Content  ⏱ Est: 45min  ⏱ 12:34 ⏸ ⏹           │
└─────────────────────────────────────────────────────┘
```

### Floating Timer Bar
A persistent bar that shows on all pages when a timer is running:

```text
┌──────────────────────────────────────────────────────────┐
│  ⏱ 12:34  │  Write blog post...  │  ⏸ Pause  │  ✓ Done  │
└──────────────────────────────────────────────────────────┘
```

Position: Fixed at bottom of viewport, above mobile nav
Behavior: Visible on all pages while timer is active

---

## Technical Implementation

### New Hook: `useTaskTimer`

Central state management for the stopwatch:

```typescript
interface TaskTimerState {
  activeTaskId: string | null;
  activeTaskText: string;
  startTime: Date | null;
  pausedAt: Date | null;
  accumulatedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
}

interface UseTaskTimerReturn {
  timerState: TaskTimerState;
  elapsedSeconds: number;
  startTimer: (task: Task) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => Promise<number>; // Returns total minutes
  completeAndStop: () => Promise<void>;
  formatElapsed: (seconds: number) => string;
  isTimingTask: (taskId: string) => boolean;
}
```

Features:
- Persists timer state to localStorage (survives page refresh)
- Calculates elapsed time in real-time
- Handles pause/resume with accumulated time
- Auto-saves time entry when stopping

### New Component: `FloatingTimerBar`

Persistent UI element showing active timer:

```typescript
interface FloatingTimerBarProps {
  // Uses useTaskTimer hook internally
}
```

Renders:
- Current elapsed time (updating every second)
- Task name (truncated)
- Pause/Resume button
- Stop button (logs time only)
- Done button (logs time + completes task)

Positioned:
- Fixed at bottom of screen
- Above mobile navigation (with safe-area padding)
- Z-index above other content
- Dismissable (stop timer)

### New Component: `TaskTimerButton`

Inline button for task cards:

```typescript
interface TaskTimerButtonProps {
  task: Task;
  compact?: boolean;
}
```

States:
- **Idle**: Shows play icon, "Start Timer" tooltip
- **Active (this task)**: Shows elapsed time + pause/stop buttons
- **Active (other task)**: Shows play icon, tooltip "Switch timer here"

### Updated TaskCard Component

Add timer button to task cards:
- Place next to estimated time display
- Show elapsed time when this task is being timed
- Visual indicator (subtle glow/border) when active

---

## Database Changes

### Update `time_entries` table

Add columns to support timer-based entries:

| Column | Type | Purpose |
|--------|------|---------|
| started_at | TIMESTAMPTZ | When timer was started |
| ended_at | TIMESTAMPTZ | When timer was stopped |
| entry_type | TEXT | 'manual' or 'timer' |

This distinguishes between:
- Manual entries (user typed in minutes after completion)
- Timer entries (user ran the stopwatch)

---

## Integration Points

### Layout Component
Add FloatingTimerBar to the main Layout so it appears on all pages:

```typescript
// In Layout.tsx
<FloatingTimerBar />
```

### Task Card
Add TaskTimerButton to each task card display.

### Focus Mode Integration
The existing BlitzTimer (countdown) can coexist with this stopwatch:
- Countdown timer: For timeboxing ("I'll work on this for 25 minutes")
- Stopwatch timer: For tracking ("Let me see how long this takes")

Option: Add a toggle in Focus Mode to switch between modes.

### Time Analytics
The Progress page analytics already support time entries - no changes needed there.

---

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useTaskTimer.ts` | Central stopwatch state management |
| `src/components/timer/FloatingTimerBar.tsx` | Persistent timer UI |
| `src/components/timer/TaskTimerButton.tsx` | Inline timer control for tasks |
| `src/components/timer/index.ts` | Exports |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/Layout.tsx` | Add FloatingTimerBar |
| `src/components/tasks/TaskCard.tsx` | Add TaskTimerButton |
| `src/components/daily-plan/DailyAgendaCard.tsx` | Add timer button |
| Database migration | Add timer columns to time_entries |

---

## User Flow Example

1. **Start**: User clicks ▶️ on "Write blog post" task
2. **Work**: Timer counts up: 00:00 → 00:01 → 00:02...
3. **Navigate**: User goes to different page - floating bar stays visible showing "⏱ 12:34 | Write blog post..."
4. **Pause**: User takes a break, clicks pause - timer freezes at 12:34
5. **Resume**: User clicks resume - timer continues from 12:34
6. **Complete**: User clicks "Done" - timer stops, task marked complete, 13 minutes logged

---

## Mobile Considerations

- Timer button: 44px touch target
- Floating bar: Full width, above bottom nav
- Safe area padding for notched devices
- Swipe to dismiss floating bar (stops timer)

---

## Settings Integration

Add to task settings:
- **Default timer mode**: Stopwatch vs Countdown
- **Auto-start timer**: When opening task detail
- **Show floating bar**: Always / Only when timing / Never

---

## Implementation Phases

### Phase 1: Core Timer Logic
1. Create `useTaskTimer` hook with localStorage persistence
2. Create basic FloatingTimerBar component
3. Add to Layout

### Phase 2: Task Integration
1. Create TaskTimerButton component
2. Add to TaskCard
3. Add database columns for timer entries

### Phase 3: Polish
1. Add to DailyAgendaCard and other task displays
2. Add settings options
3. PiP support for floating timer
4. Mobile optimizations
