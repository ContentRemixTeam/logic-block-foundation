
# Extend get-weekly-plan Edge Function - Implementation Plan

## Overview

The edge function already has most enhanced data implemented. This update fills the remaining gaps and improves existing calculations to fully support the 5 new weekly sections.

---

## Current State Analysis

### Already Implemented (Lines 211-472)
- Context Pull: quarter_stats, execution_stats, bottleneck
- Execution Summary: content_by_platform, offers_sales, task_execution, habit_grid
- CTFAR data: previous_ctfar, weekly_alignment_average

### Missing/Incomplete
| Feature | Current State | Required |
|---------|--------------|----------|
| Launch status | Hardcoded `'none'` | Query launches table |
| Focus area actions | Not implemented | Tasks by focus tag |
| Metric history | 7 weeks | Full 13 weeks |
| Percent change | Not calculated | Week-over-week % |
| Offers goal | Hardcoded `90` | From cycle setup or revenue plan |

---

## Implementation Details

### 1. Add Launch Status Query

Query the `launches` table to determine if user has launches this quarter:

```typescript
// Query launches for this cycle
const { data: launchesData } = await supabaseClient
  .from('launches')
  .select('id, name, cart_opens, cart_closes, status')
  .eq('user_id', userId)
  .eq('cycle_id', currentCycle.cycle_id)
  .gte('cart_closes', weekStartStr)
  .order('cart_opens', { ascending: true });

// Determine launch status
let launchStatus: 'none' | 'approaching' | 'this_week' = 'none';
if (launchesData && launchesData.length > 0) {
  const today = new Date();
  const weekEnd = new Date(weekEndStr);
  
  for (const launch of launchesData) {
    const cartOpens = new Date(launch.cart_opens);
    const cartCloses = new Date(launch.cart_closes);
    
    // Check if cart opens or is open this week
    if (cartOpens >= weekStart && cartOpens <= weekEnd) {
      launchStatus = 'this_week';
      break;
    } else if (cartOpens > weekEnd && cartOpens <= new Date(weekEnd.getTime() + 14 * 24 * 60 * 60 * 1000)) {
      // Within 2 weeks
      launchStatus = 'approaching';
    }
  }
}
```

### 2. Add Focus Area Actions Query

Query tasks that match the user's focus area:

```typescript
// Get focus area for filtering
const focusArea = fullCycleData?.focus_area?.toLowerCase();

// Query tasks tagged with focus area this week
const { data: focusAreaTasks } = await supabaseClient
  .from('tasks')
  .select('id, task_text, status, tags, category')
  .eq('user_id', userId)
  .gte('scheduled_date', weekStartStr)
  .lte('scheduled_date', weekEndStr);

// Filter tasks by focus area (check tags or category)
const focusActions = focusAreaTasks
  ?.filter(task => {
    const taskTags = (task.tags || []).map((t: string) => t.toLowerCase());
    const taskCategory = (task.category || '').toLowerCase();
    return taskTags.includes(focusArea) || 
           taskTags.includes('discover') || 
           taskTags.includes('nurture') || 
           taskTags.includes('convert') ||
           taskCategory.includes(focusArea);
  })
  .map(task => ({
    title: task.task_text,
    completed: task.status === 'done',
  })) || [];
```

### 3. Expand Metric History to 13 Weeks

Change the limit from 7 to 13 for full cycle sparklines:

```typescript
// Fetch metric actuals from ALL weekly reviews for full history
const { data: allReviews } = await supabaseClient
  .from('weekly_reviews')
  .select('week_id, metric_1_actual, metric_2_actual, metric_3_actual, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(13); // Full 13-week cycle
```

### 4. Calculate Percent Change

Add percent change calculation for each metric:

```typescript
const calculatePercentChange = (current: number | null, previous: number | null): number | null => {
  if (current === null || previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
};

// In metric_trends object:
metric_1: {
  current: latestReview?.metric_1_actual ?? fullCycleData?.metric_1_start ?? null,
  previous: previousReview?.metric_1_actual ?? null,
  start: fullCycleData?.metric_1_start ?? null,
  goal: fullCycleData?.metric_1_goal ?? null,
  history: allReviews?.map(r => r.metric_1_actual).reverse() ?? [],
  percentChange: calculatePercentChange(
    latestReview?.metric_1_actual,
    previousReview?.metric_1_actual
  ),
},
```

### 5. Dynamic Offers Goal

Replace hardcoded `90` with value from revenue plan or cycle:

```typescript
// In quarter_stats:
offers_goal: revenuePlan?.offer_goal ?? fullCycleData?.offer_goal ?? 90,
```

---

## Updated Response Structure

```typescript
context_pull: {
  quarter_stats: {
    revenue_goal: number | null,
    revenue_actual: number,
    sales_goal: number | null,
    sales_actual: number,
    offers_goal: number | null,  // Now dynamic
    offers_actual: number,
  },
  execution_stats: {
    tasks_completed: number,
    tasks_total: number,
    habit_percent: number,
    alignment_average: number | null,
  },
  bottleneck: string | null,
  launch_status: 'none' | 'approaching' | 'this_week',  // Now dynamic
},
execution_summary: {
  content_by_platform: Array<{ platform: string; count: number }>,
  offers_sales: {
    offers_count: number,
    sales_count: number,
    revenue: number,
    streak: number,
  },
  task_execution: {
    priority_completed: number,
    priority_total: number,
    strategic_completed: number,
    strategic_total: number,
  },
  habit_grid: Array<{ habitName: string; habitId: string; days: boolean[] }>,
},
focus_area_data: {  // NEW
  focus_actions: Array<{ title: string; completed: boolean }>,
},
previous_ctfar: { thought: string; date: string; circumstance: string } | null,
weekly_alignment_average: number | null,
metric_trends: {
  metric_1: {
    current: number | null,
    previous: number | null,
    start: number | null,
    goal: number | null,
    history: (number | null)[],  // Now 13 weeks
    percentChange: number | null,  // NEW
  },
  // ... same for metric_2, metric_3
},
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/get-weekly-plan/index.ts` | Add launch query, focus actions, expand history, add percent change |
| `src/pages/WeeklyPlan.tsx` | Add state for focus_area_data, pass to FocusAreaDeepDiveSection |

---

## Implementation Sequence

1. Add launch status query and calculation
2. Add focus area actions query
3. Expand metric history to 13 weeks
4. Add percent change calculations
5. Add new `focus_area_data` to response
6. Update WeeklyPlan.tsx to consume new data

---

## Graceful Handling for Missing Data

All queries use optional chaining and provide sensible defaults:

```typescript
// Tables that might not have data for all users
const contentByPlatform = contentData?.length ? [...] : [];
const focusActions = focusAreaTasks?.length ? [...] : [];
const launchStatus = launchesData?.length ? calculateStatus(...) : 'none';
const cycleRevenue = cycleSalesData?.length ? sum(...) : 0;
```

---

## Testing Approach

1. **Users with no content_log data**: Should show empty content section
2. **Users with no sales_log data**: Should show 0 revenue, 0 sales
3. **Users with no launches**: Should show `launch_status: 'none'`
4. **Users with launch this week**: Should show `launch_status: 'this_week'`
5. **Users with no habits**: Should show empty habit grid
6. **Week 1 users**: Should handle minimal data gracefully
7. **Users with all data**: Should show complete sections

---

## Risk Mitigation

1. **Performance**: Additional queries may slow response
   - Mitigation: Run new queries in parallel with existing ones
   
2. **Missing tables**: Some users may not have all tables populated
   - Mitigation: Use `.maybeSingle()` and null checks throughout

3. **Backwards compatibility**: Frontend expects existing structure
   - Mitigation: Only add new fields, don't change existing ones

---

## Success Criteria

- Launch status dynamically calculated from launches table
- Focus area actions populated in FocusAreaDeepDiveSection
- Sparklines show up to 13 weeks of data
- Percent change displayed next to each metric
- All sections handle missing data gracefully
- No console errors or failures for any user scenario
