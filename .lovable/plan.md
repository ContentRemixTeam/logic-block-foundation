
# Enhanced Weekly Plan Page - Implementation Plan

## Executive Summary

This plan implements 5 major enhancements to the Weekly Plan page to provide users with richer context, execution tracking, and strategic alignment tools. These changes transform the weekly planning worksheet into a comprehensive weekly review and planning system.

---

## Current State Analysis

### Existing Page Structure (WeeklyPlan.tsx - 735 lines)
The page currently has two tabs:
1. **Planner Tab**: Visual week planner with task scheduling (WeekPlannerNew)
2. **Worksheet Tab**: Contains:
   - WeeklyScratchPad (left column)
   - WeeklyCycleCheckIn + WeeklyCycleAnalytics (right column)
   - This Week's Progress card (basic stats)
   - LastWeekPriorities carry-over
   - Top 3 Priorities form
   - Metric Targets input
   - Weekly Reflection (thought, feeling, challenges, adjustments)
   - AlignmentCheckSection (1-5 star rating + reflection)

### Available Database Tables
- `cycles_90_day`: Full cycle data including focus_area, diagnostic scores, metrics, bottleneck
- `weekly_plans`: Week data with priorities, metrics targets, alignment rating
- `daily_plans`: Daily alignment_score (1-10), made_offer flag
- `tasks`: Full task system with status, category, tags, completion
- `sales_log`: Revenue tracking (amount, date, client_name)
- `content_log`: Content pieces by platform
- `habit_logs`: Daily habit completion
- `ctfar`: Self-coaching entries with thought, feeling, action, result

### Existing Edge Functions
- `get-weekly-plan`: Already fetches cycle data, week data, metric trends
- `get-habit-progress`: Calculates streak and completion rates

---

## Implementation Overview

### Section Order (Top to Bottom on Worksheet)
1. **Context Pull Section** (NEW) - Shows commitments before review
2. **Execution Summary Section** (NEW) - Numbers from the week
3. **Enhanced Alignment Check** (REPLACE existing) - With CTFAR integration
4. **Focus Area Deep Dive** (NEW) - Is your focus working?
5. **Enhanced Metrics Section** (REPLACE existing) - With trends and pace

---

## Section 1: Context Pull Section

### Purpose
Reminds users what they committed to before they begin their weekly review.

### Component Location
`src/components/weekly-plan/ContextPullSection.tsx`

### Data Requirements
From existing `get-weekly-plan` edge function (extend it):
- Current cycle goal, focus_area, identity
- Quarterly revenue goal (from cycle_revenue_plan table)
- Quarterly sales/offer targets (derive from cycle setup)
- This week's execution stats (tasks completed, habit %, alignment avg)
- Biggest bottleneck (from cycles_90_day.biggest_bottleneck)
- Launch status (from upcoming launches)

### Props Interface
```typescript
interface ContextPullSectionProps {
  cycle: {
    goal: string;
    focus_area: string | null;
    identity: string | null;
    start_date: string;
    end_date: string;
  } | null;
  weekNumber: number;
  quarterStats: {
    revenueGoal: number | null;
    revenueActual: number;
    salesGoal: number | null;
    salesActual: number;
    offersGoal: number | null;
    offersActual: number;
  };
  executionStats: {
    tasksCompleted: number;
    tasksTotal: number;
    habitPercent: number;
    alignmentAverage: number | null;
  };
  bottleneck: string | null;
  launchStatus: 'none' | 'approaching' | 'this_week' | null;
}
```

### Layout
- Desktop: 2-column grid
- Mobile: Single column, stacked cards
- Collapsible on mobile

### Styling
- Status colors: Green (90%+), Orange (70-89%), Red (below 70%)
- Focus area badge with icon (Discover/Nurture/Convert)
- Compact card with muted background

---

## Section 2: Execution Summary Section

### Purpose
Shows "Here's what I actually did this week" in numbers.

### Component Location
`src/components/weekly-plan/ExecutionSummarySection.tsx`

### Data Requirements
Extend `get-weekly-plan` to fetch:
- Content created this week (from content_log grouped by platform)
- Offers made count (from tasks with offer tag or made_offer in daily_plans)
- Sales count and revenue (from sales_log for this week)
- Task completion by priority level
- Habit grid data (from habit_logs)

### Props Interface
```typescript
interface ExecutionSummarySectionProps {
  weekStart: string;
  weekEnd: string;
  contentCreated: {
    platform: string;
    count: number;
  }[];
  offersAndSales: {
    offersCount: number;
    salesCount: number;
    revenue: number;
    streak: number;
  };
  taskExecution: {
    priorityCompleted: number;
    priorityTotal: number;
    strategicCompleted: number;
    strategicTotal: number;
  };
  habitGrid: {
    habitName: string;
    days: boolean[]; // 7 days, Mon-Sun
  }[];
}
```

### Layout
- Desktop: 4-column grid (Content | Offers/Sales | Tasks | Habits)
- Mobile: Vertical stack with compact rows
- Habit grid shows checkmarks for each day

---

## Section 3: Enhanced Alignment Check (Replace Existing)

### Purpose
Improves the existing 1-5 star rating with CTFAR integration for low alignment.

### Component Location
Replace `src/components/weekly-plan/AlignmentCheckSection.tsx`

### Changes from Current
1. Change from 1-5 stars to 1-10 slider (matches daily alignment_score)
2. Add conditional CTFAR integration:
   - If previous CTFAR session exists this week, ask "Did it help?"
   - If alignment 1-6, offer CTFAR self-coaching
   - If alignment 7-10, capture "What made this week work?"

### Data Requirements
Extend `get-weekly-plan` to fetch:
- Previous CTFAR session from this week (from ctfar table)
- Daily alignment average for the week

### Props Interface (Updated)
```typescript
interface EnhancedAlignmentCheckProps {
  cycleGoal: string;
  focusArea: string | null;
  alignmentReflection: string;
  alignmentRating: number | null; // Now 1-10
  onReflectionChange: (value: string) => void;
  onRatingChange: (value: number | null) => void;
  previousCTFARSession: {
    thought: string;
    date: string;
  } | null;
  weeklyAlignmentAverage: number | null;
  onOpenCTFAR: () => void;
}
```

### Conditional Logic
```text
IF alignmentRating = 1-6:
  Show: "Low alignment. What's getting in the way?"
  Show: [Self-Coach Now] button -> Opens CTFAR modal
  
IF alignmentRating = 7-10:
  Show: "Strong alignment! What made this week work?"
  Show: Text field for celebration capture
  
IF previousCTFARSession exists:
  Show: "You worked through: [thought]"
  Ask: "Did working through it help?" (Yes/Somewhat/No)
```

---

## Section 4: Focus Area Deep Dive

### Purpose
Shows whether the user's quarterly focus (Discover/Nurture/Convert) is actually working, using both data and user reflection.

### Component Location
`src/components/weekly-plan/FocusAreaDeepDiveSection.tsx`

### Data Requirements
From existing data plus new queries:
- Focus area from cycle (already available)
- Focus-related tasks completed this week (filter by tags)
- Focus-related metrics trends (map metrics to focus areas)
- Diagnostic scores from cycle

### Focus Area Mapping
```text
DISCOVER: Traffic, followers, reach, content published
NURTURE: Email open rate, list growth, engagement, response time
CONVERT: Offers made, sales, conversion rate, revenue
```

### Props Interface
```typescript
interface FocusAreaDeepDiveProps {
  focusArea: 'discover' | 'nurture' | 'convert' | null;
  weekNumber: number;
  focusActions: {
    title: string;
    completed: boolean;
  }[];
  focusMetrics: {
    name: string;
    current: number | null;
    previous: number | null;
    trend: 'up' | 'down' | 'stable';
  }[];
  progressRating: number | null; // 1-10
  confidenceRating: number | null; // 1-10
  onProgressRatingChange: (value: number | null) => void;
  onConfidenceRatingChange: (value: number | null) => void;
  onProgressWhyChange: (value: string) => void;
}
```

### The Gap Messaging (Weeks 3-4)
```text
IF weekNumber >= 3 AND weekNumber <= 4 AND confidenceRating < 6:
  Show: "You're in week 3-4. This is when doubt peaks."
  Show: "This is expected. It's THE GAP."
  Recommend: Keep focus until week 6 before switching
```

---

## Section 5: Enhanced Metrics Section

### Purpose
Replace the simple metric input fields with a comprehensive metrics dashboard showing targets, trends, sparklines, and quarterly pace.

### Component Location
`src/components/weekly-plan/EnhancedMetricsSection.tsx`

### Data Requirements
From existing `get-weekly-plan` (already has metric_trends):
- Metric names, start values, goal values
- Current week values (user enters)
- Previous weeks' actuals for sparkline
- Calculate weekly target = (goal - start) / 13

### Props Interface
```typescript
interface EnhancedMetricsSectionProps {
  metrics: {
    name: string | null;
    start: number | null;
    goal: number | null;
    target: number | null; // Weekly target
    actual: number | ''; // User input
    previousWeek: number | null;
    trend: 'up' | 'down' | 'stable';
    percentChange: number | null;
    sparklineData: (number | null)[]; // Last 6 weeks
    weeklyHistory: (number | null)[]; // All 13 weeks
  }[];
  weekNumber: number;
  onMetricChange: (index: number, value: number | '') => void;
}
```

### Layout
For each metric:
- Header: Metric name + trend icon
- Left column: Target / Actual input / Last week
- Right column: Progress bar to goal + pace prediction
- Bottom: Mini sparkline chart (last 6 weeks)

### Quarterly Summary
At bottom, show:
- Overall trajectory percentage
- Recommendation for which metric needs attention

---

## Database Schema Changes

### No new tables required

All data is already available in existing tables. We need to extend the `get-weekly-plan` edge function to fetch additional data.

---

## Edge Function Updates

### Modify: `get-weekly-plan/index.ts`

Add these additional queries:

```typescript
// 1. Get content created this week
const { data: contentData } = await supabaseClient
  .from('content_log')
  .select('platform')
  .eq('user_id', userId)
  .gte('date', weekStart)
  .lte('date', weekEnd);

// 2. Get offers/sales this week
const { data: salesData } = await supabaseClient
  .from('sales_log')
  .select('amount')
  .eq('user_id', userId)
  .gte('date', weekStart)
  .lte('date', weekEnd);

// 3. Get task execution stats
const { data: taskStats } = await supabaseClient
  .from('tasks')
  .select('priority, status, is_completed')
  .eq('user_id', userId)
  .gte('scheduled_date', weekStart)
  .lte('scheduled_date', weekEnd);

// 4. Get daily alignment scores
const { data: alignmentData } = await supabaseClient
  .from('daily_plans')
  .select('alignment_score')
  .eq('user_id', userId)
  .gte('date', weekStart)
  .lte('date', weekEnd);

// 5. Get CTFAR sessions this week
const { data: ctfarData } = await supabaseClient
  .from('ctfar')
  .select('thought, date')
  .eq('user_id', userId)
  .gte('date', weekStart)
  .lte('date', weekEnd)
  .order('date', { ascending: false })
  .limit(1);

// 6. Get habit grid data
const { data: habitGridData } = await supabaseClient
  .from('habit_logs')
  .select('habit_id, date, completed')
  .eq('user_id', userId)
  .gte('date', weekStart)
  .lte('date', weekEnd);
```

Add new fields to the response:
```typescript
// Context Pull data
context_pull: {
  quarter_stats: { revenue, sales, offers },
  execution_stats: { tasks, habits, alignment },
  bottleneck: string | null,
  launch_status: 'none' | 'approaching' | 'this_week',
},
// Execution Summary data
execution_summary: {
  content_by_platform: [{ platform, count }],
  offers_sales: { offers, sales, revenue, streak },
  task_execution: { priority, strategic },
  habit_grid: [{ name, days }],
},
// CTFAR data
previous_ctfar: { thought, date } | null,
weekly_alignment_average: number | null,
```

---

## Component Files to Create

| File | Purpose |
|------|---------|
| `src/components/weekly-plan/ContextPullSection.tsx` | Commitments reminder card |
| `src/components/weekly-plan/ExecutionSummarySection.tsx` | By-the-numbers execution |
| `src/components/weekly-plan/FocusAreaDeepDiveSection.tsx` | Focus area analysis |
| `src/components/weekly-plan/EnhancedMetricsSection.tsx` | Metrics with sparklines |

## Component Files to Modify

| File | Changes |
|------|---------|
| `src/components/weekly-plan/AlignmentCheckSection.tsx` | Upgrade to 1-10 slider + CTFAR integration |
| `src/pages/WeeklyPlan.tsx` | Add new sections to worksheet tab |
| `supabase/functions/get-weekly-plan/index.ts` | Add additional data queries |

---

## Implementation Order

### Phase 1: Data Layer
1. Extend `get-weekly-plan` edge function with additional queries
2. Update types in WeeklyPlan.tsx to handle new response fields

### Phase 2: Context Pull Section
3. Create ContextPullSection component
4. Add to WeeklyPlan worksheet tab (top of section)

### Phase 3: Execution Summary
5. Create ExecutionSummarySection component
6. Add below Context Pull

### Phase 4: Enhanced Alignment
7. Upgrade AlignmentCheckSection (1-10 slider + CTFAR modal)
8. Add CTFAR modal integration

### Phase 5: Focus Area Deep Dive
9. Create FocusAreaDeepDiveSection component
10. Add after Alignment Check

### Phase 6: Enhanced Metrics
11. Create EnhancedMetricsSection component
12. Replace existing simple metric inputs

---

## Mobile Optimizations

All new components follow existing mobile standards:
- 768px breakpoint with useIsMobile hook
- 44px minimum touch targets for sliders and buttons
- Single-column stacked layout on mobile
- Collapsible sections to reduce scroll
- Compact number displays (hide % change, show only arrows)

---

## Testing Checklist

For each section:
- [ ] Data loads correctly from edge function
- [ ] Desktop layout renders (2+ columns)
- [ ] Mobile layout stacks (single column)
- [ ] Status colors display correctly (green/orange/red)
- [ ] Icons and trends display
- [ ] Input fields save via existing auto-save
- [ ] Empty states handle gracefully
- [ ] Week 1 edge case (minimal data)
- [ ] No console errors

---

## Risk Considerations

1. **Edge function size**: Adding multiple queries may slow response. Consider lazy loading sections.
2. **Data availability**: Some users may not have content_log, sales_log data. Use graceful empty states.
3. **Backward compatibility**: Existing saved data (alignment_rating 1-5) needs migration to 1-10 scale.

### Migration for Alignment Rating
Add to edge function:
```typescript
// Convert legacy 1-5 to 1-10 scale
const normalizedRating = alignmentRating <= 5 ? alignmentRating * 2 : alignmentRating;
```

---

## Success Criteria

1. Users see their commitments before starting weekly review
2. Execution data displays automatically (no manual entry)
3. Low alignment triggers CTFAR self-coaching offer
4. Focus area progress is visible with data-backed trends
5. Metric tracking shows pace to quarterly goals
6. All sections mobile-responsive
7. No performance degradation (page loads in under 2 seconds)
