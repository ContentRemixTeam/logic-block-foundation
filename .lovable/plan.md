

# Wizard App Integration Standard

## Overview
Establish a comprehensive integration pattern ensuring all wizards (existing and future) automatically connect with the rest of the application: Daily/Weekly/Monthly/90-Day planning pages, Editorial Calendar, Projects, Tasks, and other relevant surfaces.

---

## Current State Analysis

### Existing Wizards

| Wizard | Creates | Integrates With | Missing Integration |
|--------|---------|-----------------|---------------------|
| **90-Day Cycle** | `cycles_90_day` record | Dashboard, all planners, reviews | None - fully integrated |
| **Launch Planner V2** | Project, Tasks, content_items, launches record | Dashboard (LaunchZone), Daily/Weekly/Monthly (LaunchModeSection, check-ins), Editorial Calendar | Fully integrated |
| **Money Momentum Sprint** | `revenue_sprints`, recurring tasks | Daily Plan (DailySprintSection), Sprint Dashboard | Not in Weekly/Monthly reviews |
| **Summit Planner** | Project, Tasks, `summits` record | Project board only | Missing: Dashboard, Daily/Weekly views, no summit phase tracking |
| **Content Planner** | content_items, content_plan_items, tasks | Editorial Calendar, Task list | Needs content_items link verification |

### Integration Points Available

1. **Dashboard** - LaunchZone widget, sprint section, cycle progress
2. **Daily Plan** - LaunchModeSection, DailySprintSection, CycleProgressBanner
3. **Weekly Plan** - Context pull, alignment check, metrics
4. **Monthly Review** - Launch progress, cycle snapshot
5. **Editorial Calendar** - content_items, content_plan_items, tasks with content_type
6. **Task List** - All tasks with content indicators

---

## Integration Gaps to Fix

### 1. Summit Wizard - No Dashboard/Planner Integration

**Current:** Creates project and tasks only

**Missing:**
- No `useActiveSummits()` hook like `useActiveLaunches()`
- No SummitModeSection in Daily Plan
- No summit phase tracking or banners
- No summit check-in questions in reviews

### 2. Money Momentum Sprint - Limited Review Integration

**Current:** Appears in Daily Plan via DailySprintSection

**Missing:**
- No sprint section in Weekly Plan/Review
- No sprint progress in Monthly Review
- No sprint ROI summary after completion

### 3. Content Planner - Task Linking Incomplete

**Current:** Creates content_items and tasks separately

**Missing:**
- Verify content_item_id is set on all generated tasks
- Ensure tasks have proper content_type/content_channel fields

---

## Solution Architecture

### Part 1: Create Wizard Integration Registry

Central configuration defining what each wizard creates and where it integrates.

**New file:** `src/lib/wizardIntegration.ts`

```typescript
interface WizardIntegrationConfig {
  templateName: string;
  creates: {
    table: string;
    type: 'record' | 'project' | 'tasks' | 'content_items';
  }[];
  integratesWith: {
    dashboard?: boolean;
    dailyPlan?: boolean;
    weeklyPlan?: boolean;
    monthlyReview?: boolean;
    editorialCalendar?: boolean;
    taskList?: boolean;
  };
  activeHook?: string; // Name of the React Query hook
  phaseTracking?: boolean;
}

const WIZARD_INTEGRATIONS: WizardIntegrationConfig[] = [
  {
    templateName: 'cycle-90-day-wizard',
    creates: [{ table: 'cycles_90_day', type: 'record' }],
    integratesWith: {
      dashboard: true,
      dailyPlan: true,
      weeklyPlan: true,
      monthlyReview: true,
    },
    activeHook: 'useActiveCycle',
    phaseTracking: true, // Tracks weeks 1-13
  },
  {
    templateName: 'launch-planner-v2',
    creates: [
      { table: 'projects', type: 'project' },
      { table: 'launches', type: 'record' },
      { table: 'tasks', type: 'tasks' },
      { table: 'content_items', type: 'content_items' },
    ],
    integratesWith: {
      dashboard: true,
      dailyPlan: true,
      weeklyPlan: true,
      monthlyReview: true,
      editorialCalendar: true,
      taskList: true,
    },
    activeHook: 'useActiveLaunches',
    phaseTracking: true, // Runway, Pre-Launch, Cart Open, Post-Launch
  },
  {
    templateName: 'summit-planner',
    creates: [
      { table: 'projects', type: 'project' },
      { table: 'summits', type: 'record' },
      { table: 'tasks', type: 'tasks' },
    ],
    integratesWith: {
      dashboard: true,
      dailyPlan: true,
      weeklyPlan: true,
      monthlyReview: true,
      taskList: true,
    },
    activeHook: 'useActiveSummits', // TO CREATE
    phaseTracking: true, // Speaker Recruitment, Content, Promo, Live, Post
  },
  {
    templateName: 'money_momentum',
    creates: [
      { table: 'revenue_sprints', type: 'record' },
      { table: 'tasks', type: 'tasks' },
    ],
    integratesWith: {
      dashboard: true,
      dailyPlan: true,
      weeklyPlan: true, // TO ADD
      monthlyReview: true, // TO ADD
    },
    activeHook: 'useActiveSprint',
    phaseTracking: false,
  },
  {
    templateName: 'content-planner',
    creates: [
      { table: 'content_items', type: 'content_items' },
      { table: 'content_plan_items', type: 'content_items' },
      { table: 'tasks', type: 'tasks' },
    ],
    integratesWith: {
      editorialCalendar: true,
      taskList: true,
    },
    phaseTracking: false,
  },
];
```

---

### Part 2: Create Missing Hooks

#### 2a. Create `useActiveSummits` Hook

**New file:** `src/hooks/useActiveSummits.ts`

Pattern mirrors `useActiveLaunches`:
- Fetch summits where today falls within planning period (registration_opens to post-summit)
- Calculate phase: Speaker Recruitment, Content Creation, Promotion, Live, Post-Summit
- Include task progress from linked project
- Generate check-in questions per phase

#### 2b. Extend `useActiveSprint` Return Data

Add fields needed for weekly/monthly display:
- `weeklyProgress`: aggregated revenue for current week
- `weekToDateTarget`: calculated weekly target
- `isOnTrack`: boolean based on pace

---

### Part 3: Create Missing UI Components

#### 3a. SummitModeSection Component

**New file:** `src/components/daily-plan/SummitModeSection.tsx`

Similar to LaunchModeSection:
- Show current phase (Speaker Recruitment, Content, Promo, Live, Post-Summit)
- Display task progress
- Quick reflection for summit-specific metrics
- Link to summit project

#### 3b. WeeklySprintSection Component

**New file:** `src/components/weekly-plan/WeeklySprintSection.tsx`

Shows in Weekly Plan/Review:
- Sprint progress bar
- Week-to-date revenue vs target
- Sprint actions completion rate
- Link to full Sprint Dashboard

#### 3c. SummitCheckInCard Component

**New file:** `src/components/reviews/SummitCheckInCard.tsx`

Add summit-specific check-in questions to reviews:
- Speaker confirmations count
- Registration numbers (during promo)
- AAP sales (during live)

---

### Part 4: Update Existing Pages

#### 4a. Daily Plan Updates

Add to conditional sections:

```typescript
// In DailyPlan.tsx section components
summit_mode: () => activeSummit && <SummitModeSection summit={activeSummit} />,
```

Requires:
- Import and call `useActiveSummits()`
- Add 'summit_mode' to section order options

#### 4b. Weekly Plan Updates

Add new sections:

```typescript
// Sprint section (when active sprint exists)
{activeSprint && <WeeklySprintSection sprint={activeSprint} />}

// Summit section (when active summit exists)  
{activeSummit && <SummitProgressCard summit={activeSummit} />}
```

#### 4c. Monthly Review Updates

Add summit check-ins to review:

```typescript
// Alongside LaunchProgressCard
<SummitCheckInCard />
<SprintSummaryCard />
```

---

### Part 5: Standardize Wizard Output Helpers

Create shared utilities all wizards use when generating output.

**Extend:** `src/lib/wizardContentHelpers.ts`

Add functions:
- `generateLinkedTask()` - Creates task with proper content_item_id, content_type, etc.
- `generateContentItem()` - Creates content_item with all required fields
- `calculateRelativeDate()` - Standard date calculation from reference date
- `linkTaskToContent()` - Ensures bidirectional linking

---

### Part 6: Edge Function Updates

#### 6a. Update `create-summit` Edge Function

Add:
- Create content_items for email sequences
- Set content_type, content_channel on tasks
- Link tasks to content_items where applicable

#### 6b. Verify `create-launch-v2` Edge Function

Confirm:
- All email sequence tasks have content_item_id set
- content_creation_date and content_publish_date populated
- Tasks appear in Editorial Calendar queries

---

## Implementation Order

### Phase 1: Hooks & Types (Foundation)
1. Create `src/lib/wizardIntegration.ts` registry
2. Create `src/hooks/useActiveSummits.ts`
3. Extend `useActiveSprint` with weekly aggregates

### Phase 2: Daily Plan Integration
4. Create `SummitModeSection.tsx`
5. Update DailyPlan.tsx to include summit mode
6. Add 'summit_mode' to layout customization options

### Phase 3: Weekly/Monthly Integration
7. Create `WeeklySprintSection.tsx`
8. Create `SummitCheckInCard.tsx`
9. Update WeeklyPlan.tsx to include sprint and summit sections
10. Update MonthlyReview.tsx with sprint summary

### Phase 4: Edge Function Fixes
11. Update `create-summit` to generate content_items
12. Verify `create-launch-v2` content linking
13. Test Editorial Calendar displays all wizard content

### Phase 5: Future-Proofing
14. Document wizard integration pattern in code comments
15. Create wizard integration checklist for new wizards

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/wizardIntegration.ts` | Create | Central wizard config registry |
| `src/hooks/useActiveSummits.ts` | Create | Hook for active summit data |
| `src/hooks/useActiveSprint.ts` | Modify | Add weekly aggregates |
| `src/components/daily-plan/SummitModeSection.tsx` | Create | Summit banner for daily plan |
| `src/components/weekly-plan/WeeklySprintSection.tsx` | Create | Sprint progress for weekly view |
| `src/components/reviews/SummitCheckInCard.tsx` | Create | Summit check-in for reviews |
| `src/pages/DailyPlan.tsx` | Modify | Add summit mode section |
| `src/pages/WeeklyPlan.tsx` | Modify | Add sprint and summit sections |
| `src/pages/MonthlyReview.tsx` | Modify | Add sprint summary |
| `supabase/functions/create-summit/index.ts` | Modify | Add content_items creation |
| `src/lib/wizardContentHelpers.ts` | Extend | Add shared helper functions |

---

## Future Wizard Checklist

When creating new wizards, ensure:

1. **Database Records**: Create records in appropriate tables
2. **Project Creation**: If applicable, create project with proper flags
3. **Task Generation**: Use `generateLinkedTask()` helper with:
   - `content_item_id` when content-related
   - `content_type` and `content_channel` fields
   - `content_creation_date` and `content_publish_date` for calendar
4. **Content Items**: For content-related wizards, create content_items
5. **Active Hook**: Create `useActiveX()` hook if wizard creates time-bounded records
6. **Dashboard Widget**: Add to Dashboard if user needs visibility
7. **Daily/Weekly Integration**: Add mode section if wizard is "active" during a period
8. **Review Integration**: Add check-in questions for reviews
9. **Editorial Calendar**: Ensure content appears in calendar queries
10. **Registry Entry**: Add to `WIZARD_INTEGRATIONS` config

---

## Testing Verification

After implementation, verify:

1. Summit wizard → Items appear in Daily Plan, Weekly Plan, Monthly Review
2. Money Momentum Sprint → Week summary appears in Weekly Plan
3. Launch wizard → Content items show in Editorial Calendar Create/Publish lanes
4. Content Planner → All items have linked tasks with proper dates
5. All wizards → Tasks appear in task list with content badges where applicable

