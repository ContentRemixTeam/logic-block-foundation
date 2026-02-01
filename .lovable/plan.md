
# Pre-Implementation Clarifications

Thank you for approving the plan! Here are detailed clarifications on all 7 points before we begin Phase 1.

---

## 1. Database Cascade: ON DELETE CASCADE for tasks.launch_id

**Decision**: Use `ON DELETE CASCADE` for `tasks.launch_id`

**Rationale**: When a launch is deleted, all associated tasks should be removed automatically. This prevents orphaned tasks and maintains data integrity.

**SQL Migration**:
```sql
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS launch_id UUID REFERENCES public.launches(id) ON DELETE CASCADE;
```

**Contrast with daily_plans/weekly_plans**: These will use `ON DELETE SET NULL` because deleting a launch shouldn't remove daily/weekly planning records—they still have value as historical data.

---

## 2. THE GAP Warning: Explicit Prompt in StepGoalTimeline

**Current State**: StepGoalTimeline already shows a warning when GAP is detected (lines 171-188), but it's informational only.

**Enhancement**: Add an **acknowledgment prompt** with explicit action required:

```text
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ YOUR LAUNCH OVERLAPS WITH THE GAP                        │
│                                                              │
│ Your launch dates fall during weeks 3-4 of your 90-day      │
│ cycle. This is when motivation typically dips.              │
│                                                              │
│ {gapResult.message}                                          │
│                                                              │
│ What would you like to do?                                   │
│                                                              │
│ ○ I understand the risk - continue with these dates         │
│ ○ Adjust my timeline to avoid THE GAP [Auto-adjust dates]   │
│ ○ Add extra support tasks (daily mindset check-ins)         │
│                                                              │
│ [x] I acknowledge this may require extra effort              │
└─────────────────────────────────────────────────────────────┘
```

**Implementation**:
- Add `gapAcknowledged: boolean` validation check (already in data model)
- Block "Next" button until user selects an option
- If "Add extra support tasks" is selected, set `gapSupportType` and auto-generate tasks in Step 8
- If "Adjust timeline" is selected, auto-calculate safe dates and update fields

---

## 3. Daily Offer Goal: Add getDailyOfferGoal() to launchHelpers

**New function specification**:

```typescript
/**
 * Calculates daily offer goal based on launch data
 * Formula: Total offers needed / Cart open days
 * 
 * @param launch - Active launch data
 * @returns { daily: number, remaining: number, completed: number }
 */
function getDailyOfferGoal(launch: ActiveLaunch): {
  daily: number;        // Target offers per day
  remaining: number;    // Offers still needed today
  completed: number;    // Offers made today
  onTrack: boolean;     // Whether pace is sufficient
}
```

**Logic**:
1. Get `offer_goal` from launch (total offers planned for cart open period)
2. Calculate `cartOpenDays` = difference between cart_opens and cart_closes
3. `daily = Math.ceil(offer_goal / cartOpenDays)`
4. Query `daily_plans.made_offer` for today to get `completed`
5. `remaining = Math.max(0, daily - completed)`
6. `onTrack = completed >= daily` for the day

**Usage in Daily Plan**:
```text
🎯 Today's Offer Goal: 3 offers
   ○ ○ ○  (0 of 3 complete)
   
   [Log an Offer]
```

---

## 4. TimelineSummary: Capacity Check Card UI

**Component Structure**:

```text
┌─────────────────────────────────────────────────────────────┐
│ 📊 LAUNCH CAPACITY SUMMARY                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ TOTAL PROMOTION TIME: 22 days                               │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PHASE BREAKDOWN                                          │ │
│ │                                                          │ │
│ │ Runway ······· 9 days ·········· 30 min/day ···· LOW    │ │
│ │ Pre-Launch ··· 6 days ········ 1.5 hrs/day ··· MEDIUM   │ │
│ │ Cart Open ···· 7 days ·········· 2 hrs/day ···· HIGH    │ │
│ │ Post-Launch ·· 7 days ·········· 1 hr/day ···· MEDIUM   │ │
│ │                                                          │ │
│ │ TOTAL: ~45 hours over 22 days                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ INTENSITY PROGRESSION:                                       │
│ ▁▂▂▂▃▅▆▇▇▇▇▇▅▃▂▁                                            │
│ LOW → MEDIUM → HIGH → MEDIUM                                 │
│                                                              │
│ CAPACITY CHECK:                                              │
│ Based on your 90-day cycle data, you average 2.5 hrs/day     │
│ on business tasks.                                           │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ You have capacity for this launch                     │ │
│ │    Peak demand (2 hrs/day) fits within your average.    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ RECOMMENDATIONS:                                             │
│ • Consider blocking "deep work" time during Cart Open phase │
│ • Schedule lighter client work during launch week           │
│ • Your GAP overlap requires extra mindset support           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Data Sources**:
- `getPhaseTaskEstimate()` for task counts and time estimates
- User's `daily_plans` history for capacity baseline (optional enhancement)
- GAP detection result for recommendations

**Mobile Layout**: Stacks vertically with collapsible sections for phase breakdown and recommendations.

---

## 5. Weekly Metrics: Exact Fields

Based on the existing Weekly Plan structure (lines 73-114 in WeeklyPlan.tsx), here are the **launch-specific weekly metrics**:

**New Fields for weekly_plans table**:

| Field | Type | Description |
|-------|------|-------------|
| `launch_offers_made` | INTEGER | Total offers made this week |
| `launch_sales_count` | INTEGER | Number of sales closed this week |
| `launch_revenue_logged` | NUMERIC | Revenue from sales this week |
| `launch_conversion_percent` | NUMERIC | (sales / offers) * 100 |
| `launch_phase_this_week` | TEXT | 'runway' / 'pre-launch' / 'cart-open' / 'post-launch' |
| `launch_week_reflection` | TEXT (500 chars) | "What worked? What didn't?" |
| `launch_confidence_rating` | INTEGER (1-10) | Confidence in hitting launch goal |

**LaunchWeeklyMetrics Card UI**:

```text
┌─────────────────────────────────────────────────────────────┐
│ 🚀 LAUNCH WEEK METRICS                                       │
│    Phase: CART OPEN (Week 2 of 2)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌───────────┐  ┌───────────┐  ┌───────────┐                 │
│ │    12     │  │     3     │  │   25%     │                 │
│ │  Offers   │  │   Sales   │  │ Convert   │                 │
│ └───────────┘  └───────────┘  └───────────┘                 │
│                                                              │
│ Revenue This Week: $1,500 / $5,000 goal (30%)               │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                    │
│                                                              │
│ Confidence Rating:                                           │
│ [ 1 ○ ○ ○ ○ ○ ● ○ ○ ○ 10 ]  Currently: 7                    │
│                                                              │
│ Week Reflection:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ What worked? What didn't? (500 chars)                    │ │
│ │ _______________________________________________________  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Launch Zone: Widget Grouping & Customization UX

**Decision**: Widgets are **grouped within a "Launch Zone" container** but can be individually hidden.

**Layout Structure**:

```text
DASHBOARD LAYOUT

┌─────────────────────────────────────────────┬──────────────┐
│                MAIN COLUMN                  │   SIDEBAR    │
├─────────────────────────────────────────────┼──────────────┤
│                                             │              │
│  [Quarter Progress Widget]                  │ [Diagnostic] │
│                                             │              │
│  [Planning Next Steps]                      │ [Habits]     │
│                                             │              │
│  ┌─────────────────────────────────────────┐│              │
│  │ 🚀 ACTIVE LAUNCH ZONE                   ││ [Quick Wins] │
│  │                                         ││              │
│  │  ┌──────────────┐ ┌──────────────────┐  ││              │
│  │  │ Launch       │ │ Phase            │  ││              │
│  │  │ Countdown    │ │ Reminder         │  ││              │
│  │  └──────────────┘ └──────────────────┘  ││              │
│  │                                         ││              │
│  │  ┌─────────────────────────────────────┐││              │
│  │  │ Active Launch Widget (main card)    │││              │
│  │  │ - Revenue progress                  │││              │
│  │  │ - Task completion                   │││              │
│  │  │ - Quick actions                     │││              │
│  │  └─────────────────────────────────────┘││              │
│  └─────────────────────────────────────────┘│              │
│                                             │              │
│  [90-Day Goal Widget]                       │              │
│                                             │              │
│  [Sales Goal Tracker]                       │              │
│                                             │              │
└─────────────────────────────────────────────┴──────────────┘
```

**Customization Rules**:
- Launch Zone **auto-appears** when user has active launch (`launches` table with `cart_closes >= today`)
- Launch Zone **auto-hides** when no active launches
- Within the zone, each widget can be toggled via the existing "Customize" button (using `user_settings.dashboard_widgets` JSONB)
- On mobile: Launch Zone stacks at top with horizontal scroll for sub-widgets

**Implementation**:
- Wrap 3 widgets in a single `LaunchZone` container component
- LaunchZone conditionally renders based on `useActiveLaunches().data.length > 0`

---

## 7. Mobile-Specific Implementation Notes

**Date Pickers**:
- Use **native HTML5 date inputs** (`<input type="date">`) on mobile
- Already used in StepGoalTimeline (lines 146-167) - no change needed
- Native inputs provide best UX with device date pickers

**Timeline Editing**:
- **Desktop**: Inline phase cards with date pickers
- **Mobile**: Use **Bottom Drawer** (Vaul) for timeline customization
- When user taps "Customize Instead", open drawer with stacked phase cards

**Mobile Timeline UI**:

```text
┌─────────────────────────────────────────┐
│             CUSTOMIZE TIMELINE          │  ← Drawer Header
├─────────────────────────────────────────┤
│                                         │
│  RUNWAY                                 │
│  ┌─────────────────────────────────────┐│
│  │ Start: [Feb 15 ▾]                   ││
│  │ End:   [Feb 23 ▾]                   ││
│  │ Duration: 9 days · LOW intensity    ││
│  └─────────────────────────────────────┘│
│                                         │
│  PRE-LAUNCH                             │
│  ┌─────────────────────────────────────┐│
│  │ Start: [Feb 24 ▾]                   ││
│  │ End:   [Mar 1 ▾]                    ││
│  │ Duration: 6 days · MEDIUM intensity ││
│  └─────────────────────────────────────┘│
│                                         │
│  ... (scrollable)                       │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ [Cancel]  [Apply Changes]           ││  ← 44px touch targets
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Other Mobile Considerations**:
- TimelineVisualBar: Becomes vertical list on mobile (phase cards)
- TimelineSummary: Collapsible sections to reduce scrolling
- All buttons: 44px minimum touch targets (existing standard)
- Dashboard widgets: Single column stack with Launch Zone at top

---

## Summary: Ready to Start Phase 1

All clarifications are addressed. Here's the Phase 1 scope confirmation:

**Week 1 Deliverables**:

| Day | Task |
|-----|------|
| 1-2 | Database migration: `launch_id` FK (CASCADE), phase columns, `active_launch_id` on daily/weekly plans |
| 2-3 | Create `src/lib/launchHelpers.ts` with all helper functions including `getDailyOfferGoal()` |
| 3 | Extend `gapDetection.ts` with phase recommendations and acknowledgment flow |
| 3 | Update `src/types/launchV2.ts` with new fields |

**Phase 1 Verification Checklist**:
- [ ] Database columns added and accessible via Supabase client
- [ ] `getCurrentLaunchPhase()` returns correct phase for test dates
- [ ] `getDailyOfferGoal()` calculates correctly
- [ ] GAP detection returns actionable recommendations
- [ ] Types compile without errors

Ready to begin Phase 1 implementation.
