
# Launch Planner V2 - Full Integration Plan

## Executive Summary

This plan addresses five major requirements:
1. **Remove THE GAP UI components** from the launch planner (blocking prompts, warnings, etc.)
2. **Integrate launch dates** into Dashboard, Daily, Weekly, and Monthly planners  
3. **Create launch projects** with Gantt-style timeline and organized task sections
4. **Enable launch reuse** - save launches as templates for future use with autofill
5. **Launch debrief wizard** - already exists, needs enhancement for lessons learned integration

---

## Current State Analysis

### What Already Exists

| Feature | Status | Location |
|---------|--------|----------|
| GAP detection system | Exists - to be removed from UI | `src/components/wizards/launch-v2/utils/gapDetection.ts` |
| Launch creation edge function | Exists | `supabase/functions/create-launch-v2/` |
| Launch project creation | Exists | Creates project with `is_launch: true` |
| Launch debrief page | Exists | `src/pages/LaunchDebrief.tsx` |
| Launch debrief hook | Exists | `src/hooks/useLaunchDebrief.ts` |
| Active launches hook | Exists | `src/hooks/useActiveLaunches.ts` |
| Dashboard launch widgets | Exists | `LaunchZone`, `LaunchCountdownWidget`, etc. |
| `active_launch_id` on plans | Exists in schema | `daily_plans` and `weekly_plans` tables |

### What Needs to Be Built

1. Remove GAP UI components while keeping detection logic (for those who want it later)
2. Launch timeline Gantt component for project detail page
3. Organized task sections by phase
4. Launch template/reuse system
5. Enhanced debrief wizard with lessons learned autofill

---

## Phase 1: Remove THE GAP UI Components

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/wizards/launch-v2/steps/StepGoalTimeline.tsx` | Remove `GapAcknowledgmentPrompt` import and rendering |
| `src/components/wizards/launch-v2/timeline/index.ts` | Keep export but component won't be used |
| `src/pages/Dashboard.tsx` | Remove GAP alert messages (lines 70-84) or make them optional |

### Implementation Details

**StepGoalTimeline.tsx changes:**
- Remove `showGapPrompt` state variable
- Remove `gapResult` calculation (or make it purely data, not UI blocking)
- Remove `handleGapContinue` function
- Remove `<GapAcknowledgmentPrompt>` component rendering
- Keep the `gapDetection.ts` utilities - they're useful for optional future features

**Dashboard.tsx changes:**
- The `getDynamicAlert` function (lines 70-100) shows GAP warnings
- Make this configurable via user settings or remove entirely

---

## Phase 2: Launch Timeline Integration in Planners

### 2A: Dashboard Integration

**Current state:** `LaunchZone` component exists but is basic

**Enhancements needed:**
- Show active launch phase prominently
- Display phase timeline bar (visual progress)
- Quick access to launch project and tasks

**Files to create/modify:**
- `src/components/dashboard/LaunchTimelineBar.tsx` (New)
- `src/components/dashboard/LaunchZone.tsx` (Enhance)

### 2B: Daily Planner Integration

**Current state:** `daily_plans.active_launch_id` exists but not fully utilized

**Enhancements needed:**
- Auto-detect and display current launch phase
- Show phase-specific tasks for today
- Display "Launch Mode" banner with phase context

**Files to modify:**
- `src/pages/DailyPlan.tsx`
- Create `src/components/daily-plan/LaunchModeSection.tsx`

### 2C: Weekly Planner Integration  

**Current state:** `weekly_plans.active_launch_id` exists with launch metrics columns

**Enhancements needed:**
- Show launch timeline for the week
- Display phase transitions within the week
- Weekly launch metrics summary

**Files to modify:**
- `src/pages/WeeklyPlan.tsx`
- Create `src/components/weekly-plan/WeeklyLaunchOverview.tsx`

### 2D: Monthly Planner Integration

**Enhancements needed:**
- Calendar view showing launch phases
- Monthly launch overview
- Links to launch project

---

## Phase 3: Launch Project with Gantt Timeline

### 3A: Gantt-Style Timeline Component

**Create:** `src/components/launch/LaunchGanttTimeline.tsx`

Features:
- Visual horizontal timeline showing 4 phases:
  - Runway (gray/blue)
  - Pre-Launch (yellow/amber)  
  - Cart Open (green/primary)
  - Post-Launch (purple/secondary)
- Current day indicator
- Phase date labels
- Clickable phases to filter tasks

### 3B: Task Organization by Phase

**Create:** `src/components/launch/LaunchTaskBoard.tsx`

Organization:
- **Pre-Launch Prep** section
  - Sales Page
  - Email Sequences  
  - Content Creation
  - Tech Setup
- **Launch Week** section
  - Daily offers
  - Live events
  - Outreach tasks
- **Post-Launch** section
  - Follow-up tasks
  - Debrief task
- **Mindset** section (if user selected mindset support)

### 3C: Enhance Project Detail Page for Launch Projects

**Modify:** `src/pages/ProjectDetail.tsx`

Add conditional rendering for launch projects:
- Show Gantt timeline at top
- Organize tasks by launch phase
- Add "Launch Metrics" card (revenue goal, sales needed, days remaining)
- Add "Launch Debrief" quick access button (post-cart-close)

---

## Phase 4: Launch Reuse / Template System

### 4A: Database Changes

**New table:** `launch_templates`

```sql
CREATE TABLE launch_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_launch_id UUID REFERENCES launches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  offer_type TEXT,
  timeline_duration TEXT,
  revenue_goal_tier TEXT,
  pricing_config JSONB,
  pre_launch_config JSONB,
  launch_week_config JSONB,
  post_launch_config JSONB,
  -- Lessons learned from debrief
  lessons_what_worked TEXT,
  lessons_what_to_improve TEXT,
  lessons_would_do_differently TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);
```

### 4B: Save Launch as Template

**When:** After creating a launch OR after completing a debrief

**UI:** 
- "Save as Template" button on launch project page
- Dialog to name the template
- Auto-includes debrief lessons if available

**Create:** `src/hooks/useLaunchTemplates.ts`

### 4C: Reuse Template in Wizard

**Modify:** `src/components/wizards/launch-v2/LaunchWizardV2.tsx`

Add Step 0 or pre-step:
- "Start Fresh" or "Reuse Previous Launch"
- If reusing: show list of past launches/templates
- Auto-fill wizard data from selected template
- Show reminder card with lessons learned from that launch

**Create:** `src/components/wizards/launch-v2/steps/StepSelectTemplate.tsx`

Features:
- List of completed launches with debriefs
- List of saved templates
- Preview of what will be auto-filled
- "Lessons from last time" card showing:
  - What worked
  - What to improve
  - What you'd do differently

---

## Phase 5: Enhanced Launch Debrief Wizard

### 5A: Current Debrief Page Enhancement

**Current state:** Basic form at `/launch-debrief/:launchId`

**Enhancements needed:**
- Add "Save as Template" action
- Add structured prompts for lessons
- Add option to create follow-up launch

### 5B: Debrief Lessons Integration

When reusing a launch, display:
- Previous revenue achieved vs goal
- What worked (highlighted for attention)
- What to improve (with action items)
- Energy rating (warn if previous launch was exhausting)

---

## Technical Implementation Details

### Database Migrations Required

1. **`launch_templates` table** (new)
2. **Add `template_id` to `launches` table** (optional - tracks source template)
3. **Add `is_template` to `launches` table** (alternative approach)

### Edge Function Updates

**Modify:** `supabase/functions/create-launch-v2/index.ts`

- Accept optional `template_id` parameter
- If template provided, merge template data with wizard data
- Log template usage for analytics

### New Components Summary

| Component | Purpose |
|-----------|---------|
| `LaunchGanttTimeline.tsx` | Visual phase timeline for project page |
| `LaunchTaskBoard.tsx` | Organized task sections by phase |
| `LaunchModeSection.tsx` | Daily plan launch context |
| `WeeklyLaunchOverview.tsx` | Weekly plan launch summary |
| `StepSelectTemplate.tsx` | Template selection in wizard |
| `LaunchTemplateCard.tsx` | Display template with lessons |
| `SaveAsTemplateDialog.tsx` | Modal to save launch as template |

### New Hooks Summary

| Hook | Purpose |
|------|---------|
| `useLaunchTemplates.ts` | CRUD for launch templates |
| `useLaunchPhaseTasks.ts` | Get tasks organized by phase |

---

## Implementation Order

### Sprint 1: Remove GAP + Basic Integration
1. Remove GAP UI from wizard (keep utilities)
2. Remove GAP alerts from Dashboard
3. Enhance LaunchZone with timeline bar

### Sprint 2: Project Page Enhancement
1. Create LaunchGanttTimeline component
2. Create task organization by phase
3. Update ProjectDetail for launch projects

### Sprint 3: Planner Integration
1. Daily plan launch mode section
2. Weekly plan launch overview
3. Monthly calendar launch view

### Sprint 4: Template/Reuse System
1. Create launch_templates table
2. Build template selection step
3. Build save-as-template flow
4. Integrate lessons learned display

### Sprint 5: Debrief Enhancement
1. Add template save to debrief
2. Add follow-up launch creation
3. Test full reuse loop

---

## File Changes Summary

### Files to Modify

| File | Type of Change |
|------|----------------|
| `src/components/wizards/launch-v2/steps/StepGoalTimeline.tsx` | Remove GAP prompt |
| `src/components/wizards/launch-v2/LaunchWizardV2.tsx` | Add template step option |
| `src/pages/Dashboard.tsx` | Remove/configure GAP alerts |
| `src/pages/ProjectDetail.tsx` | Add launch-specific UI |
| `src/pages/DailyPlan.tsx` | Add launch mode section |
| `src/pages/WeeklyPlan.tsx` | Add launch overview |
| `src/components/dashboard/LaunchZone.tsx` | Enhance with timeline |
| `src/pages/LaunchDebrief.tsx` | Add template save option |
| `supabase/functions/create-launch-v2/index.ts` | Add template support |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/launch/LaunchGanttTimeline.tsx` | Gantt timeline visualization |
| `src/components/launch/LaunchTaskBoard.tsx` | Phase-organized tasks |
| `src/components/launch/LaunchPhaseCard.tsx` | Phase display card |
| `src/components/daily-plan/LaunchModeSection.tsx` | Daily launch context |
| `src/components/weekly-plan/WeeklyLaunchOverview.tsx` | Weekly launch summary |
| `src/components/wizards/launch-v2/steps/StepSelectTemplate.tsx` | Template selection |
| `src/components/launch/SaveAsTemplateDialog.tsx` | Template save dialog |
| `src/components/launch/LaunchLessonsCard.tsx` | Display previous lessons |
| `src/hooks/useLaunchTemplates.ts` | Template CRUD hook |
| `src/hooks/useLaunchPhaseTasks.ts` | Phase-organized tasks hook |

---

## User Experience Goals

1. **Simple by default** - New users don't see templates or complex options
2. **Progressive depth** - Experienced users can reuse and customize
3. **Always know where you are** - Phase indicators across all views
4. **Learn from past launches** - Lessons surfaced at right moments
5. **Not overwhelming** - Task sections collapse, timeline is visual not text-heavy
