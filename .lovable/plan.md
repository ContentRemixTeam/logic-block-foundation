
# Feature Enhancement Plan: Dashboard Improvements & Coaching Tools

## Overview

This plan addresses gaps in the current implementation to add missing features for data persistence, error handling, and several new coaching/planning tools.

---

## Features to Implement

### 1. Widget Order Persistence (Data Persistence Gap)

**Current State**: Widgets can be toggled on/off but cannot be reordered by dragging.

**Implementation**:
- Add `widget_order` JSONB column to `user_settings` table
- Extend `useDashboardWidgets` hook with ordering state
- Add drag-and-drop reordering using existing `@dnd-kit` library
- Save order to localStorage + server on drop

**Files to Create/Modify**:
- `src/hooks/useDashboardWidgets.tsx` - Add order state and persistence
- `src/pages/Dashboard.tsx` - Add DnD context to widget areas
- `supabase/migrations/` - Add `dashboard_widget_order` column

---

### 2. Widget-Level Error Boundaries (Error Handling Gap)

**Current State**: App has global error boundary, but individual widget failures could break the whole dashboard.

**Implementation**:
- Create `WidgetErrorBoundary` component with friendly fallback UI
- Wrap each dashboard widget individually
- Include "Retry" button in fallback

**Files to Create**:
- `src/components/dashboard/WidgetErrorBoundary.tsx`

**Files to Modify**:
- `src/pages/Dashboard.tsx` - Wrap widgets with error boundaries

---

### 3. Simplification Assistant

**Purpose**: Alert users when their plan is over-committed and suggest simplified alternatives.

**Triggers**:
- Capacity calculator shows > 100% usage
- User selects 3+ content platforms
- Weekly time commitment exceeds available hours

**Implementation**:
- Create modal component with capacity analysis
- Integrate with cycle setup wizard and content planner
- Show pre-calculated simplified options (Option A, Option B)
- Log user's choice for analytics

**Database Changes**:
- Add `simplification_suggestions` table to log when shown and choice made

**Files to Create**:
- `src/components/coaching/SimplificationAssistant.tsx` - Modal with options
- `src/hooks/useCapacityCheck.ts` - Calculate over-commitment
- `supabase/migrations/` - Add logging table

**Files to Modify**:
- `src/pages/CycleSetup.tsx` - Integrate capacity check
- `src/components/wizards/content-planner/` - Add platform limit check

---

### 4. Anti-Comparison Mode

**Purpose**: Settings toggle to hide all benchmark data and focus on personal progress only.

**Implementation**:
- Add toggle in Settings under Display Preferences
- Add `anti_comparison_mode` column to `user_settings`
- Create context/hook to check mode throughout app
- Hide benchmark data, "average user" references when enabled

**Files to Create**:
- `src/hooks/useAntiComparisonMode.ts`

**Files to Modify**:
- `src/pages/Settings.tsx` - Add toggle
- `supabase/migrations/` - Add column
- Dashboard/Progress widgets - Conditionally hide comparisons

---

### 5. Coach Prep Tool

**Purpose**: Structured worksheet to prepare for coaching calls with key metrics and questions.

**Implementation**:
- New page at `/coach-prep`
- Form fields for: date, current metrics, question, what you've tried, thought creating problem, what you need coaching on
- Auto-populate metrics from database
- PDF download, shareable link, print options

**Database Changes**:
- Add `coaching_call_prep` table

**Files to Create**:
- `src/pages/CoachPrep.tsx`
- `src/components/coaching/CoachPrepForm.tsx`
- `src/hooks/useCoachingPrep.ts`
- `supabase/migrations/` - Add table

**Files to Modify**:
- `src/App.tsx` - Add route
- `src/components/AppSidebar.tsx` - Add navigation

---

### 6. Strategy Change Friction

**Purpose**: Prevent impulsive strategy changes before Day 45 by requiring reflection.

**Triggers**:
- User attempts to edit core strategy (platform, focus area, main offer) before Day 45 of cycle

**Implementation**:
- Create friction modal component
- Required reflection questions before allowing change
- Log decision (changed anyway vs. gave it more time)

**Database Changes**:
- Add `strategy_change_attempts` table for logging

**Files to Create**:
- `src/components/coaching/StrategyChangeFriction.tsx`
- `supabase/migrations/` - Add logging table

**Files to Modify**:
- `src/pages/CycleSetup.tsx` - Check cycle day before allowing edits
- Any strategy edit forms - Wrap with friction check

---

### 7. Quarter Comparison Tool

**Purpose**: Compare previous quarter results with new quarter plan.

**Implementation**:
- Show during new cycle setup (Q2, Q3, Q4+)
- Display side-by-side: previous goal vs actual, scores, learnings
- Prompt for new quarter planning

**Files to Create**:
- `src/components/wizards/cycle-planner/QuarterComparison.tsx`

**Files to Modify**:
- `src/pages/CycleSetup.tsx` - Show comparison for returning users
- `src/pages/CycleSummary.tsx` - Link to comparison view

---

### 8. Example Answers Library

**Purpose**: Provide example inputs from other students on wizard text fields.

**Implementation**:
- Create curated examples for each wizard question
- Add "show examples" button next to text inputs
- Display in popover/tooltip format
- Store examples in constants file (not database)

**Files to Create**:
- `src/lib/wizardExamples.ts` - Curated example data
- `src/components/ui/ExampleAnswersPopover.tsx`

**Files to Modify**:
- Various wizard step components to include example buttons

---

### 9. Mobile Quick Actions Enhancement

**Purpose**: Quick-tap buttons for common daily actions on mobile.

**Current State**: QuickActionsPanel exists but not mobile-optimized with quick-tap features.

**Implementation**:
- Add floating action buttons for mobile:
  - "Made an offer today" (one-tap tracking)
  - "Completed top 3 tasks" (quick completion)
  - "Updated metrics" (quick metric entry)
  - "View today's focus" (navigate)
  - "Self-coach (CTFAR)" (open modal)
- Integrate with existing offer tracking and task completion systems

**Files to Create**:
- `src/components/mobile/MobileQuickActions.tsx` - FAB with quick action drawer

**Files to Modify**:
- `src/components/Layout.tsx` - Add mobile quick actions component

---

## Database Schema Changes

```sql
-- 1. Widget ordering
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS dashboard_widget_order JSONB DEFAULT '{}';

-- 2. Anti-comparison mode
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS anti_comparison_mode BOOLEAN DEFAULT false;

-- 3. Simplification logging
CREATE TABLE public.simplification_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  suggested_options JSONB NOT NULL,
  choice_made TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.simplification_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own suggestions" ON public.simplification_suggestions
  FOR ALL USING (auth.uid() = user_id);

-- 4. Coaching call prep
CREATE TABLE public.coaching_call_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_date DATE NOT NULL,
  metrics JSONB,
  main_question TEXT,
  what_tried TEXT,
  blocking_thought TEXT,
  coaching_need TEXT,
  share_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.coaching_call_prep ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prep" ON public.coaching_call_prep
  FOR ALL USING (auth.uid() = user_id);

-- 5. Strategy change logging
CREATE TABLE public.strategy_change_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  cycle_day INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  data_showing_issue TEXT,
  days_executed INTEGER,
  blocking_thought TEXT,
  decision TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.strategy_change_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own attempts" ON public.strategy_change_attempts
  FOR ALL USING (auth.uid() = user_id);
```

---

## Implementation Priority

### Phase 1: Foundation (High Priority)
1. Widget-level error boundaries
2. Widget order persistence
3. Mobile Quick Actions enhancement

### Phase 2: Coaching Tools (High Priority)
4. Coach Prep Tool
5. Simplification Assistant
6. Strategy Change Friction

### Phase 3: Settings & Comparison (Medium Priority)
7. Anti-Comparison Mode
8. Quarter Comparison Tool

### Phase 4: Polish (Lower Priority)
9. Example Answers Library

---

## Files Summary

### New Files to Create (15 files)
| File | Purpose |
|------|---------|
| `src/components/dashboard/WidgetErrorBoundary.tsx` | Widget isolation |
| `src/components/coaching/SimplificationAssistant.tsx` | Over-commitment modal |
| `src/components/coaching/StrategyChangeFriction.tsx` | Change friction modal |
| `src/components/coaching/CoachPrepForm.tsx` | Call prep form |
| `src/components/wizards/cycle-planner/QuarterComparison.tsx` | Q-over-Q view |
| `src/components/ui/ExampleAnswersPopover.tsx` | Example hints |
| `src/components/mobile/MobileQuickActions.tsx` | Mobile FAB |
| `src/pages/CoachPrep.tsx` | Coach prep page |
| `src/hooks/useCapacityCheck.ts` | Capacity analysis |
| `src/hooks/useAntiComparisonMode.ts` | Comparison mode hook |
| `src/hooks/useCoachingPrep.ts` | Coach prep data |
| `src/lib/wizardExamples.ts` | Example answers data |
| `supabase/migrations/xxx_feature_enhancements.sql` | Schema changes |

### Files to Modify (10+ files)
- `src/hooks/useDashboardWidgets.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Settings.tsx`
- `src/pages/CycleSetup.tsx`
- `src/components/Layout.tsx`
- `src/components/AppSidebar.tsx`
- `src/App.tsx`
- Various wizard components

---

## Technical Notes

- Reuse existing `@dnd-kit` patterns from Editorial Calendar for widget ordering
- Reuse `CoachYourselfModal` patterns for friction and simplification modals
- Use existing PDF generation (`jspdf`) for Coach Prep export
- Follow existing Settings toggle patterns for Anti-Comparison Mode
- Apply existing mobile quick capture patterns from `MobileQuickCapture.tsx`
