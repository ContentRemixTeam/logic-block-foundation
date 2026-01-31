
# Launch Planner V2 - Next Phases Implementation

## Overview

This plan implements three key integration phases to complete the Launch Planner V2 wizard:

1. **Route Integration & WizardHub Linking** - Connect the new V2 wizard to the app's routing system
2. **Enhanced Edge Function for V2 Task Generation** - Create a new edge function that generates tasks based on the V2 questionnaire responses
3. **Dashboard/Daily Plan Integration Widgets** - Add launch-specific widgets to surface launch context throughout the app

---

## Phase 1: Route Integration & WizardHub Linking

### 1.1 Create New LaunchWizardV2 Page

**New File**: `src/pages/LaunchWizardV2Page.tsx`

This page wrapper will host the V2 wizard with proper auth protection and error boundaries:

```typescript
// Similar structure to LaunchWizardPage.tsx
// Import LaunchWizardV2 from '@/components/wizards/launch-v2/LaunchWizardV2'
// Wrap with auth check and ErrorBoundary
```

### 1.2 Add Route to App.tsx

**File**: `src/App.tsx`

Add new route at line ~211 (after existing launch wizard route):

```typescript
// Add lazy import
const LaunchWizardV2Page = lazyWithRetry(() => import('./pages/LaunchWizardV2Page'));

// Add route
<Route path="/wizards/launch-v2" element={<ProtectedRoute><PageSuspense><LaunchWizardV2Page /></PageSuspense></ProtectedRoute>} />
```

### 1.3 Update WizardHub Navigation

**File**: `src/components/wizards/WizardHub.tsx`

Update the `handleStart` function to route to V2:

```typescript
// Line 72-74: Change from
} else if (templateName === 'launch-planner') {
  navigate('/wizards/launch');
// To
} else if (templateName === 'launch-planner') {
  navigate('/wizards/launch-v2');
```

### 1.4 Add Database Template (if needed)

Ensure `wizard_templates` table has entry for `launch-planner` with updated description referencing the new streamlined flow.

---

## Phase 2: Enhanced Edge Function for V2 Task Generation

### 2.1 Create New Edge Function

**New File**: `supabase/functions/create-launch-v2/index.ts`

This new edge function will:

1. Accept the full `LaunchWizardV2Data` payload
2. Create project with V2-specific metadata
3. Create launch record with all new columns
4. Generate tasks based on questionnaire answers (using the task generation matrix)
5. Generate CTFAR entries for selected fears
6. Create reminders for key dates
7. Handle GAP overlap support tasks

**Key Task Generation Logic**:

```typescript
interface V2TaskGenerator {
  // Pre-Launch Tasks
  generatePreLaunchTasks(data: LaunchWizardV2Data): TaskToCreate[];
  
  // Launch Week Tasks
  generateLaunchWeekTasks(data: LaunchWizardV2Data): TaskToCreate[];
  
  // Post-Launch Tasks
  generatePostLaunchTasks(data: LaunchWizardV2Data): TaskToCreate[];
  
  // Mindset/Support Tasks
  generateMindsetTasks(data: LaunchWizardV2Data): TaskToCreate[];
  
  // GAP Support Tasks (conditional)
  generateGapSupportTasks(data: LaunchWizardV2Data): TaskToCreate[];
}
```

**Task Generation Rules** (from approved plan):

| Condition | Tasks Generated |
|-----------|-----------------|
| `contentCreationStatus = 'from-scratch'` | Content creation tasks (quantity based on `contentVolume`) |
| `mainReachMethod = 'unsure'` | "Define your visibility strategy" task |
| `emailListStatus = 'starting-zero'` | "Build initial email list" task series |
| `offerFrequency = 'daily'` | Daily "Make an offer" task for each launch day |
| `liveComponent = 'one'/'multiple'` | Prep task (day-2), Host task (day of) |
| `followUpWillingness = 'multiple-emails'` | 3-5 follow-up email tasks |
| `biggestFears.length > 0` | CTFAR entries for each fear (max 3) |
| `readinessScore <= 5` | Daily mindset affirmation tasks |
| `whatYouNeed = 'accountability'` | Mid-launch check-in reminders |
| `gapOverlapDetected = true` | GAP-specific support tasks |

**CTFAR Auto-Generation**:

```typescript
// For selected fears, create ctfar entries
if (data.biggestFears.length > 0) {
  const topFears = data.biggestFears.slice(0, 3); // Max 3
  for (const fear of topFears) {
    await supabase.from('ctfar').insert({
      user_id: userId,
      cycle_id: activeCycleId,
      circumstance: `Launching ${data.name}`,
      thought: FEAR_THOUGHT_MAP[fear],
      feeling: FEAR_FEELING_MAP[fear],
      action: '',
      result: '',
      tags: ['launch', 'auto-generated', data.name],
    });
  }
}
```

### 2.2 Update config.toml

**File**: `supabase/config.toml`

Add configuration for new edge function:

```toml
[functions.create-launch-v2]
verify_jwt = false
```

### 2.3 Update LaunchWizardV2.tsx to Call New Edge Function

**File**: `src/components/wizards/launch-v2/LaunchWizardV2.tsx`

Update `handleCreateLaunch` function (lines 93-122) to call the new V2 edge function directly:

```typescript
const { data: result, error } = await supabase.functions.invoke('create-launch-v2', { 
  body: data  // Send full V2 data directly, no field mapping needed
});
```

---

## Phase 3: Dashboard/Daily Plan Integration Widgets

### 3.1 Create Enhanced Launch Widget for Dashboard

**New File**: `src/components/dashboard/ActiveLaunchWidget.tsx`

A comprehensive launch widget that shows:

- Launch name and phase (pre-launch/live/closed)
- Days until cart opens/closes with visual countdown
- Revenue progress bar (if tracking sales)
- Task completion percentage
- "Offer made today?" quick checkbox (for live launches)
- Mindset tip based on selected fears
- Quick action buttons (View Tasks, Log Sale, Make Offer)

```typescript
interface ActiveLaunchWidgetProps {
  launch: ActiveLaunch;
  onOfferMade?: () => void;
  className?: string;
}
```

**UI States**:

| Launch Phase | Widget Display |
|--------------|----------------|
| Pre-launch (7+ days) | Countdown + task progress |
| Pre-launch (< 7 days) | Urgent styling + final prep checklist |
| Live | Revenue tracker + daily offer prompt |
| Last 48 hours | High-urgency styling + "Cart closes in X hours" |

### 3.2 Update Dashboard.tsx

**File**: `src/pages/Dashboard.tsx`

Add the new `ActiveLaunchWidget` to the main content area:

```typescript
// Import
import { ActiveLaunchWidget } from '@/components/dashboard/ActiveLaunchWidget';

// In the grid layout (after 90-Day Goal widget)
{launchDisplay && (
  <ActiveLaunchWidget 
    launch={launchDisplay} 
    gradientClass="from-orange-500/5"
  />
)}
```

### 3.3 Create Enhanced Launch Card for Daily Plan

**New File**: `src/components/daily/LaunchContextCard.tsx`

A daily-focused launch card that shows:

- Today's launch status (phase indicator)
- Today's specific launch tasks (filtered from task list)
- "Did you make an offer today?" checkbox with quick log
- Mindset prompt if in GAP overlap
- Revenue logged today (if live)
- Quick links: View all tasks, Log sale, CTFAR

```typescript
interface LaunchContextCardProps {
  launch: ActiveLaunch;
  todaysTasks: Task[];
  onOfferMade: (count: number) => void;
  isInGap?: boolean;
}
```

### 3.4 Update InfoCards.tsx with Enhanced Launch Display

**File**: `src/components/daily/InfoCards.tsx`

Enhance the existing Launch Countdown card (lines 227-260):

1. Add "Offer made today?" checkbox for live launches
2. Show mindset tip from selected fears
3. Display revenue progress if goal is set
4. Add GAP warning if launch overlaps with weeks 3-4

```typescript
// Enhanced launch card content
{upcomingLaunch && launchPhase === 'live' && (
  <div className="mt-2 space-y-2">
    <div className="flex items-center gap-2">
      <Checkbox 
        checked={offerMadeToday}
        onCheckedChange={handleOfferMade}
      />
      <span className="text-xs">Made an offer today?</span>
    </div>
    {revenueGoal && (
      <div className="text-xs text-muted-foreground">
        ${revenueTracked.toLocaleString()} / ${revenueGoal.toLocaleString()}
      </div>
    )}
  </div>
)}
```

### 3.5 Create Offer Tracking Hook

**New File**: `src/hooks/useOfferTracking.ts`

Hook to track daily offers made during launch:

```typescript
export function useOfferTracking(launchId: string) {
  // Query for today's offer log
  // Mutation to log offer
  // Returns: { offersToday, logOffer, isLogging }
}
```

This will require a new table or use existing `sales_log` with offer-specific fields.

### 3.6 Add Launch Phase Banner Component

**New File**: `src/components/daily-plan/LaunchPhaseBanner.tsx`

A prominent banner shown at the top of Daily Plan when a launch is active:

```typescript
// Pre-launch: "Your launch opens in X days. Focus on prep tasks."
// Live: "LAUNCH IS LIVE! Make offers. Track sales. You've got this."
// Last 48h: "CART CLOSES IN X HOURS. Final push time!"
// GAP overlap: Additional warning with support prompt
```

### 3.7 Integrate into Daily Plan

**File**: `src/pages/DailyPlan.tsx`

Add launch context components:

1. Import new components
2. Query for active launches using `useActiveLaunches`
3. Render `LaunchPhaseBanner` in the Banners zone (line ~49)
4. Pass launch context to `InfoCards`

---

## File Summary

### New Files (7)

| File | Purpose |
|------|---------|
| `src/pages/LaunchWizardV2Page.tsx` | Page wrapper for V2 wizard |
| `supabase/functions/create-launch-v2/index.ts` | V2 task generation edge function |
| `src/components/dashboard/ActiveLaunchWidget.tsx` | Dashboard launch widget |
| `src/components/daily/LaunchContextCard.tsx` | Daily plan launch card |
| `src/components/daily-plan/LaunchPhaseBanner.tsx` | Launch phase banner |
| `src/hooks/useOfferTracking.ts` | Offer tracking hook |
| `src/components/wizards/launch-v2/utils/taskGenerator.ts` | V2 task generation utilities |

### Modified Files (5)

| File | Changes |
|------|---------|
| `src/App.tsx` | Add LaunchWizardV2Page route |
| `src/components/wizards/WizardHub.tsx` | Route to V2 wizard |
| `src/pages/Dashboard.tsx` | Add ActiveLaunchWidget |
| `src/pages/DailyPlan.tsx` | Add launch banner and context |
| `src/components/daily/InfoCards.tsx` | Enhance launch card with offer tracking |

---

## Implementation Order

### Step 1: Route Integration (Quick Win)
1. Create `LaunchWizardV2Page.tsx`
2. Add route to `App.tsx`
3. Update `WizardHub.tsx` navigation

### Step 2: Edge Function (Core Logic)
4. Create `create-launch-v2/index.ts` with full task generation
5. Add to `config.toml`
6. Update `LaunchWizardV2.tsx` to call new function
7. Test end-to-end wizard flow

### Step 3: Dashboard Widget
8. Create `ActiveLaunchWidget.tsx`
9. Integrate into `Dashboard.tsx`
10. Test launch display states

### Step 4: Daily Plan Integration
11. Create `LaunchPhaseBanner.tsx`
12. Create `LaunchContextCard.tsx`
13. Update `InfoCards.tsx`
14. Integrate into `DailyPlan.tsx`

### Step 5: Offer Tracking
15. Create `useOfferTracking.ts` hook
16. Add offer logging to launch widgets
17. Test offer tracking flow

---

## Testing Checklist

- [ ] V2 wizard loads and saves draft correctly
- [ ] New edge function creates project, launch, and tasks
- [ ] Tasks are generated based on questionnaire answers
- [ ] CTFAR entries created for selected fears
- [ ] Dashboard shows active launch with correct phase
- [ ] Daily Plan shows launch context when active
- [ ] Offer tracking works during live phase
- [ ] GAP overlap detection and warnings display correctly
- [ ] Mobile responsive on all new components
