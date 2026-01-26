

## Quarter Progress Bar Widget Implementation

### Overview
Build a fully-featured Quarter Progress Bar widget within `src/pages/Dashboard.tsx` that displays cycle progress with dynamic alerts based on the current day number.

---

### Data Flow

```text
useActiveCycle hook
       ↓
   cycle data
(start_date, end_date)
       ↓
  useMemo calculations
       ↓
┌─────────────────────────────────────────┐
│  QUARTER PROGRESS WIDGET                │
│  ─────────────────────────────────────  │
│  📅 JANUARY 25 - APRIL 25, 2026         │
│  ━━━━━━━━━━━━━━━━━━━━━━━● 67%           │
│  Day 60 of 90                           │
│  Week 9 of 13 • 30 days remaining • 67% │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🔥 Final stretch!               │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

### Implementation Details

#### 1. Imports to Add

```typescript
// Add to existing imports
import { useMemo } from 'react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { AlertTriangle, PartyPopper, Target, Flame, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
```

#### 2. Cycle Stats Calculation

Add inside the Dashboard component:

```typescript
const { data: cycle, isLoading } = useActiveCycle();

const cycleStats = useMemo(() => {
  if (!cycle?.start_date || !cycle?.end_date) return null;

  const start = parseISO(cycle.start_date);
  const end = parseISO(cycle.end_date);
  const today = new Date();

  const totalDays = 90; // Fixed 90-day cycle
  const daysElapsed = Math.max(0, differenceInDays(today, start));
  const currentDay = Math.min(daysElapsed + 1, totalDays);
  const daysRemaining = Math.max(0, totalDays - currentDay + 1);
  const progress = Math.min(100, Math.max(0, (currentDay / totalDays) * 100));
  const currentWeek = Math.ceil(currentDay / 7);
  const totalWeeks = 13;

  return {
    progress: Math.round(progress),
    currentDay,
    daysRemaining,
    currentWeek,
    totalWeeks,
    startFormatted: format(start, 'MMMM d').toUpperCase(),
    endFormatted: format(end, 'MMMM d, yyyy').toUpperCase(),
    startYear: format(start, 'yyyy'),
  };
}, [cycle]);
```

#### 3. Dynamic Alert Logic

Function to determine which alert to show based on current day:

```typescript
const getDynamicAlert = (currentDay: number) => {
  if (currentDay >= 15 && currentDay <= 17) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      message: '"THE GAP" approaching',
      variant: 'warning' as const,
      className: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    };
  }
  if (currentDay >= 18 && currentDay <= 28) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      message: "YOU'RE IN THE GAP",
      variant: 'warning' as const,
      className: 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    };
  }
  if (currentDay === 30) {
    return {
      icon: <Target className="h-4 w-4" />,
      message: '30-day check-in today',
      variant: 'info' as const,
      className: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    };
  }
  if (currentDay === 45) {
    return {
      icon: <PartyPopper className="h-4 w-4" />,
      message: "You're halfway there!",
      variant: 'success' as const,
      className: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
    };
  }
  if (currentDay >= 75) {
    return {
      icon: <Flame className="h-4 w-4" />,
      message: 'Final stretch!',
      variant: 'fire' as const,
      className: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
    };
  }
  return null;
};
```

#### 4. Widget Section Content

Replace the Quarter Progress placeholder content:

**Loading State:**
```tsx
{isLoading && (
  <div className="space-y-3">
    <Skeleton className="h-4 w-48" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-4 w-32" />
  </div>
)}
```

**No Active Cycle State:**
```tsx
{!isLoading && !cycleStats && (
  <div className="text-center py-4">
    <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
      <Calendar className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="text-muted-foreground text-sm mb-2">No active cycle</p>
    <Link to="/cycle-setup" className="text-primary text-sm hover:underline">
      Start your 90-day cycle →
    </Link>
  </div>
)}
```

**Active Cycle Display:**
```tsx
{!isLoading && cycleStats && (
  <div className="space-y-3">
    {/* Date Range */}
    <p className="text-xs font-medium tracking-wide text-muted-foreground">
      {cycleStats.startFormatted} - {cycleStats.endFormatted}
    </p>
    
    {/* Progress Bar */}
    <Progress value={cycleStats.progress} className="h-3" />
    
    {/* Day Counter */}
    <p className="text-sm font-medium">
      Day {cycleStats.currentDay} of 90
    </p>
    
    {/* Stats Line */}
    <p className="text-sm text-muted-foreground">
      Week {cycleStats.currentWeek} of {cycleStats.totalWeeks} • 
      {cycleStats.daysRemaining} days remaining • 
      {cycleStats.progress}% complete
    </p>
    
    {/* Dynamic Alert */}
    {getDynamicAlert(cycleStats.currentDay) && (
      <Alert className={getDynamicAlert(cycleStats.currentDay)!.className}>
        <div className="flex items-center gap-2">
          {getDynamicAlert(cycleStats.currentDay)!.icon}
          <AlertDescription className="font-medium">
            {getDynamicAlert(cycleStats.currentDay)!.message}
          </AlertDescription>
        </div>
      </Alert>
    )}
  </div>
)}
```

---

### File Changes

| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | Modify - Add imports, useActiveCycle hook, useMemo calculations, and update Quarter Progress widget content |

---

### Technical Notes

1. **Date handling**: Use `parseISO` from date-fns for database date strings to avoid timezone issues
2. **Format**: Use `MMMM d` format then `.toUpperCase()` to get "JANUARY 25" style
3. **Progress clamping**: Ensure values stay within 0-100 range with `Math.min/Math.max`
4. **Week calculation**: `Math.ceil(currentDay / 7)` gives correct week number (day 1-7 = week 1, etc.)
5. **Existing hook**: Reuse `useActiveCycle` which already fetches cycle data via edge function
6. **Loading skeleton**: Provide visual feedback while data loads
7. **Empty state**: Clear CTA to start a cycle if none exists

---

### Alert Trigger Map

| Day Range | Icon | Message | Color Theme |
|-----------|------|---------|-------------|
| 15-17 | ⚠️ AlertTriangle | "THE GAP" approaching | Yellow |
| 18-28 | ⚠️ AlertTriangle | YOU'RE IN THE GAP | Orange |
| 30 | 🎯 Target | 30-day check-in today | Blue |
| 45 | 🎉 PartyPopper | You're halfway there! | Green |
| 75+ | 🔥 Flame | Final stretch! | Red |

