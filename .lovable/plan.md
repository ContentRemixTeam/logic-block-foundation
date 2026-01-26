
# Dashboard Widgets Implementation Plan

## Overview
Add three new widgets to the Dashboard after the Content Counter widget: **Sales Goal Tracker**, **Habit Tracker**, and **Quick Wins**. This requires database schema changes and new widget components following existing patterns.

---

## Database Changes

### 1. Create `sales_log` Table
New table to track sales entries:
```text
sales_log
- id: UUID (primary key)
- user_id: UUID (references auth.users, NOT NULL)
- cycle_id: UUID (references cycles_90_day, nullable)
- date: DATE (NOT NULL)
- amount: DECIMAL (NOT NULL)
- client_name: TEXT (nullable)
- offer_name: TEXT (nullable)
- notes: TEXT (nullable)
- created_at: TIMESTAMP (default now())
```
- Add RLS policies for user access control
- Add index on (user_id, cycle_id, date)

### 2. Create `wins` Table
New table to track achievements:
```text
wins
- id: UUID (primary key)
- user_id: UUID (references auth.users, NOT NULL)
- cycle_id: UUID (references cycles_90_day, NOT NULL)
- week_number: INTEGER (NOT NULL)
- win_text: TEXT (NOT NULL)
- created_at: TIMESTAMP (default now())
```
- Add RLS policies for user access control
- Add index on (user_id, cycle_id)

---

## Widget Implementations

### Widget 1: Sales Goal Tracker (`SalesGoalTrackerWidget`)

**Data Sources:**
- `sales_log` table: Sum amounts for current cycle
- `cycle_revenue_plan` table: Get revenue_goal (existing table with revenue_goal column)

**Features:**
- Progress bar showing revenue vs. goal
- Calculate: total revenue, sales count, average sale, pace indicator
- Color-coded pace status (green/yellow/red)
- [Add Sale] dialog with date picker, amount input, client/offer/notes fields
- [Edit Goal] and [Details] links

**Empty States:**
- No cycle: "No active cycle" message
- No goal: "Set revenue goal" prompt
- No sales: Show 0% progress with encouragement

**Styling:** `WidgetSection` with `elevated={true}`

### Widget 2: Habit Tracker (`HabitTrackerWidget`)

**Data Sources:**
- `habits` table: Active habits (is_active=true, is_archived=false), limit 5
- `habit_logs` table: Completions for current week (Mon-Sun)

**Features:**
- Weekly grid: Habits (rows) x Days (columns)
- Cell states: Completed (green check), Not done (gray circle), Today highlighted
- Click to toggle via existing `toggle_habit` RPC
- Stats line: "X/Y habits completed today - Z% this week"
- [Manage Habits] link to /habits

**Mobile:** Show only top 3 habits

**Empty State:** "No active habits" with setup button

**Styling:** `WidgetSection` (no elevation)

### Widget 3: Quick Wins (`QuickWinsWidget`)

**Data Sources:**
- `wins` table: Last 3 wins for current cycle, ordered by created_at DESC

**Features:**
- Display last 3 wins as "Week X: [win text]"
- Auto-calculate week_number from cycle start date
- [Add Win] dialog with textarea
- [View All] button (links to future /wins page or shows all in dialog)

**Empty State:** Trophy icon + "No wins recorded yet" + add button

**Styling:** `WidgetSection` with `elevated={true}`

---

## Technical Details

### File Changes

**Database Migration:**
- Create `sales_log` table with RLS policies
- Create `wins` table with RLS policies
- Add performance indexes

**`src/pages/Dashboard.tsx`:**
1. Add new icon imports: `DollarSign`, `Trophy`, `Circle`
2. Add Textarea import from shadcn
3. Add three new widget components after `ContentCounterWidget`:
   - `SalesGoalTrackerWidget`
   - `HabitTrackerWidget`  
   - `QuickWinsWidget`
4. Insert widgets in render with dividers:
```text
<ContentCounterWidget cycleId={cycle?.cycle_id} />
<div className="border-t border-border" />
<SalesGoalTrackerWidget cycleId={cycle?.cycle_id} cycleStartDate={cycle?.start_date} />
<div className="border-t border-border" />
<HabitTrackerWidget />
<div className="border-t border-border" />
<QuickWinsWidget cycleId={cycle?.cycle_id} cycleStartDate={cycle?.start_date} />
```

### Component Patterns (matching existing code)
- Use `useQuery` for data fetching
- Use `useMutation` with `queryClient.invalidateQueries()` after saves
- Use `toast` from 'sonner' for notifications
- Use shadcn Dialog, Button, Input, Textarea, Progress, Select, DatePicker
- Use `useIsMobile` for responsive layouts
- Handle loading states with `Skeleton` components
- Handle empty states with helpful messages and action buttons

### Key Calculations

**Sales Tracker Pace:**
```text
daysElapsed = differenceInDays(today, cycleStart) + 1
currentPace = totalRevenue / daysElapsed * 90
paceNeeded = (goal - totalRevenue) / daysRemaining
status: 
  - Green if currentPace >= paceNeeded * 0.9
  - Yellow if currentPace >= paceNeeded * 0.7
  - Red if below
```

**Habit Tracker Weekly Grid:**
```text
weekStart = startOfWeek(today, { weekStartsOn: 1 })
weekEnd = endOfWeek(today, { weekStartsOn: 1 })
days = [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
For each habit and day: check if habit_logs has completed=true entry
```

**Quick Wins Week Number:**
```text
weekNumber = Math.ceil((differenceInDays(today, cycleStart) + 1) / 7)
```

---

## Final Widget Order

1. Quarter Progress (existing)
2. Planning Next Steps (existing)
3. 90-Day Goal (existing)
4. Launch Countdown (existing)
5. Business Diagnostic (existing)
6. Content Counter (existing)
7. **Sales Goal Tracker** (NEW)
8. **Habit Tracker** (NEW)
9. **Quick Wins** (NEW)

---

## Testing Checklist

- [ ] Database tables created with proper RLS
- [ ] Sales Goal Tracker displays revenue progress correctly
- [ ] Add Sale dialog saves to database and updates UI
- [ ] Habit Tracker shows weekly grid with 5 habits max
- [ ] Clicking habit cell toggles completion
- [ ] Quick Wins shows last 3 wins with week numbers
- [ ] Add Win dialog calculates week number automatically
- [ ] All widgets responsive on mobile
- [ ] Empty states display correctly
- [ ] No console errors
