
# 90-Day Planner Wizard - Phase 1 Implementation Plan

## Executive Summary

This plan implements a new, streamlined 90-Day Planner Wizard with teaching-aligned structure, "THE GAP" mindset preparation, and modern wizard UX patterns. The wizard takes approximately 10 minutes to complete and creates the `cycles_90_day` record that unlocks the full app.

---

## User Choices (Confirmed)

| Feature | Selected Option |
|---------|-----------------|
| Auto-save | Yes - Auto-save each step (3-second debounce) |
| Edit from dashboard | Yes - Add 'Edit Plan' button on dashboard |
| Metric templates | Both combined (Focus-based + Platform-specific) |
| Mobile-first design | Yes - 375px first, scale up |
| PDF export | Yes - Download button on final screen |
| Progress resume | Yes - "Continue where you left off" dialog |

---

## Wizard Structure (9 Steps - ~10 minutes)

### Step 1: The Big Goal (1 min)
**Purpose**: Capture the ONE clear goal for the next 90 days

**Fields**:
- `goal` (text, required, max 200 chars) - "What is your ONE big goal?"
- `whyItMatters` (text, optional, max 500 chars) - "Why does this goal matter to you?"

**Teaching**: Brief explanation that successful quarters have ONE clear priority

---

### Step 2: Business Diagnostic (2 min)
**Purpose**: Identify where in the business funnel the user should focus

**Fields**:
- `discoverScore` (1-10 slider) - "How easily do people find you?"
- `nurtureScore` (1-10 slider) - "How well do you convert followers to fans?"
- `convertScore` (1-10 slider) - "How confidently do you make offers?"
- `focusArea` (auto-calculated) - Lowest score becomes focus

**Teaching**: Explain Discover → Nurture → Convert funnel briefly
**Component**: Use existing `BusinessDiagnostic.tsx` pattern

---

### Step 3: Your Identity (1 min)
**Purpose**: Anchoring to the person they're becoming

**Fields**:
- `identity` (text, optional) - "Who do you need to become to achieve this goal?"
- `feeling` (text, optional) - "How do you want to feel at the end of 90 days?"

**Teaching**: Identity-based goal achievement (Atomic Habits concept)

---

### Step 4: Success Metrics (2 min)
**Purpose**: Define measurable progress indicators

**Fields**:
- `metric1_name`, `metric1_start`, `metric1_goal` (required)
- `metric2_name`, `metric2_start`, `metric2_goal` (optional)
- `metric3_name`, `metric3_start`, `metric3_goal` (optional)

**UI Features**:
- Focus-based suggestions from `SUGGESTED_METRICS`
- Platform-specific suggestions (Instagram followers, Email list size, etc.)
- Quick-add buttons for common metrics

**Platform Suggestions**:
```typescript
const PLATFORM_METRICS = {
  instagram: ['Followers', 'Engagement rate', 'Story views', 'DMs received'],
  email: ['List size', 'Open rate', 'Click rate', 'Unsubscribe rate'],
  podcast: ['Downloads', 'Reviews', 'Subscribers'],
  youtube: ['Subscribers', 'Watch time', 'Views'],
  linkedin: ['Connections', 'Post impressions', 'Profile views'],
};
```

---

### Step 5: Weekly Rhythm (1 min)
**Purpose**: Establish when they'll plan and review

**Fields**:
- `weeklyPlanningDay` (dropdown, Mon-Sun, required)
- `weeklyDebriefDay` (dropdown, Mon-Sun, required)
- `officeHoursStart` (time picker)
- `officeHoursEnd` (time picker)
- `officeHoursDays` (multi-select)

**Teaching**: Consistency > intensity

---

### Step 6: Bottleneck & Fear (1 min)
**Purpose**: Name what might stop them

**Fields**:
- `biggestBottleneck` (text) - "What's the main thing that could hold you back?"
- `biggestFear` (text) - "What are you most afraid of?"
- `fearResponse` (text) - "How will you handle it when it comes up?"

**Teaching**: Naming fears reduces their power

---

### Step 7: THE GAP Preparation (1 min)
**Purpose**: Critical mindset training for weeks 3-4

**Content Display** (not captured, just shown):
- Explain what THE GAP is (18-28 days)
- Why energy dips are normal
- How to push through without quitting

**Fields**:
- `gapStrategy` (text) - "What will you do when you feel like quitting in weeks 3-4?"
- `accountabilityPerson` (text) - "Who will you text when things get hard?"

**UI**: Distinctive styling - warning colors, emphasis on importance

---

### Step 8: Mindset Anchors (1 min)
**Purpose**: Useful beliefs and thoughts

**Fields**:
- `usefulBelief` (text) - "What belief will serve you this quarter?"
- `limitingThought` (text) - "What unhelpful thought might come up?"
- `usefulThought` (text) - "What will you think instead?"
- `thingsToRemember` (array) - "What do you want to be reminded of?"

**Teaching**: Thought work connection

---

### Step 9: Review & Complete
**Purpose**: See the complete plan, confirm, export

**UI Features**:
- Read-only summary of all answers
- "Edit" buttons to jump back to any section
- PDF Export button (prominent)
- "Create My 90-Day Cycle" button

**Actions on Complete**:
1. Save to `cycles_90_day` table
2. Mark wizard as completed
3. Clear draft
4. Navigate to Dashboard with celebration toast
5. Show "Edit Plan" button on dashboard

---

## Technical Architecture

### New Files to Create

```text
src/pages/CycleWizard.tsx                          # Main wizard page
src/components/cycle-wizard/                        # Component folder
  ├── CycleWizardTypes.ts                          # TypeScript types
  ├── CycleWizardData.ts                           # Default data & constants
  ├── steps/
  │   ├── StepBigGoal.tsx                          # Step 1
  │   ├── StepDiagnostic.tsx                       # Step 2
  │   ├── StepIdentity.tsx                         # Step 3
  │   ├── StepMetrics.tsx                          # Step 4
  │   ├── StepWeeklyRhythm.tsx                     # Step 5
  │   ├── StepBottleneck.tsx                       # Step 6
  │   ├── StepTheGap.tsx                           # Step 7
  │   ├── StepMindset.tsx                          # Step 8
  │   └── StepReview.tsx                           # Step 9
  ├── CycleWizardReviewCard.tsx                    # Reusable review section
  └── CycleWizardPDFExport.ts                      # PDF generation
```

### Existing Components to Reuse

| Component | Usage |
|-----------|-------|
| `useWizard.ts` | Draft persistence, auto-save, progress resume |
| `WizardLayout.tsx` | Header, progress bar, navigation buttons |
| `WizardSaveStatus.tsx` | Cloud sync indicator |
| `ResumeDraftDialog.tsx` | Draft recovery prompt |
| `BusinessDiagnostic.tsx` | Reference for Step 2 sliders |
| `pdfGenerator.ts` | Extend for new wizard PDF format |

### Database Integration

**Table**: `cycles_90_day` (existing)

**Fields Used by Wizard**:
```sql
-- Step 1
goal, why

-- Step 2 (Diagnostic)
discover_score, nurture_score, convert_score, focus_area

-- Step 3 (Identity)
identity, target_feeling

-- Step 4 (Metrics)
metric_1_name, metric_1_start, metric_1_goal,
metric_2_name, metric_2_start, metric_2_goal,
metric_3_name, metric_3_start, metric_3_goal

-- Step 5 (Rhythm)
weekly_planning_day, weekly_debrief_day,
office_hours_start, office_hours_end, office_hours_days

-- Step 6 (Bottleneck)
biggest_bottleneck, biggest_fear, fear_response

-- Step 7 (Gap Strategy) - NEW COLUMN NEEDED
gap_strategy

-- Step 8 (Mindset)
useful_belief, limiting_thought, useful_thought,
accountability_person, things_to_remember

-- Dates (auto-calculated)
start_date (today), end_date (today + 90)
```

### New Database Column

```sql
ALTER TABLE cycles_90_day 
ADD COLUMN gap_strategy text;
```

---

## Dashboard Edit Integration

**File**: `src/pages/Dashboard.tsx`

Add "Edit Plan" button to the cycle summary card:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => navigate(`/cycle-wizard?edit=${cycleId}`)}
>
  <Pencil className="h-4 w-4 mr-1" />
  Edit Plan
</Button>
```

The wizard page will detect `?edit=cycleId` and load existing data for editing.

---

## Routing

**New Route**: `/cycle-wizard`

```tsx
// In App.tsx routes
{ path: '/cycle-wizard', element: <CycleWizard /> }
```

**Update WizardHub.tsx** to route to new wizard:
```tsx
if (templateName === 'cycle-90-day') {
  navigate('/cycle-wizard');  // Changed from /cycle-setup
}
```

---

## PDF Export Implementation

Extend `src/lib/pdfGenerator.ts` with a lighter format for the new wizard:

```typescript
export async function generateCycleWizardPDF(data: CycleWizardFormData): Promise<PDFGenerationResult> {
  // Simplified PDF with:
  // - One-page summary
  // - Goal + Identity + Metrics
  // - Weekly rhythm
  // - GAP strategy
  // - Mindset anchors
}
```

---

## Mobile-First Design Patterns

All step components will follow:

```tsx
// Single column layout, stacked cards
<div className="space-y-4">
  {/* Full-width inputs on mobile */}
  <div className="space-y-2">
    <Label className="text-base">Your Goal</Label>
    <Textarea 
      className="min-h-[120px] text-base" 
      placeholder="..."
    />
  </div>
</div>

// Slider touch targets
<Slider 
  className="touch-action-manipulation"
  thumbClassName="h-6 w-6" // 24px minimum
/>
```

Desktop expands to 2-column layouts where appropriate.

---

## Data Flow

```text
1. User opens /cycle-wizard
2. useWizard hook checks for draft
   - If draft exists: Show ResumeDraftDialog
   - If no draft: Start fresh with defaults
3. Each step change triggers auto-save (3s debounce)
4. On final "Create" click:
   a. Call edge function or direct insert to cycles_90_day
   b. Mark wizard_completions as completed_at = now()
   c. Clear local draft
   d. Navigate to dashboard
   e. Show success toast
```

---

## Implementation Sequence

### Phase 1A: Core Structure (First)
1. Create `CycleWizardTypes.ts` with form data interface
2. Create `CycleWizardData.ts` with defaults and constants
3. Create `CycleWizard.tsx` main page with useWizard hook
4. Add route to App.tsx

### Phase 1B: Step Components
5. Build Step 1: StepBigGoal
6. Build Step 2: StepDiagnostic (with sliders)
7. Build Step 3: StepIdentity
8. Build Step 4: StepMetrics (with suggestions)
9. Build Step 5: StepWeeklyRhythm
10. Build Step 6: StepBottleneck
11. Build Step 7: StepTheGap (distinctive styling)
12. Build Step 8: StepMindset
13. Build Step 9: StepReview

### Phase 1C: Integration
14. Database migration for `gap_strategy` column
15. Save logic to `cycles_90_day`
16. PDF export function
17. Dashboard edit button
18. Update WizardHub routing

### Phase 1D: Polish
19. Mobile responsive testing
20. Draft resume flow testing
21. Edit mode (loading existing cycle)
22. Edge cases (missing data, validation)

---

## Validation Rules

| Step | Validation |
|------|------------|
| 1 | Goal required, max 200 chars |
| 2 | All 3 scores required (1-10) |
| 3 | Optional |
| 4 | At least metric 1 required |
| 5 | Planning day + Debrief day required |
| 6 | Optional |
| 7 | Optional (but encouraged) |
| 8 | Optional |
| 9 | N/A (review) |

```typescript
function validateStep(step: number, data: CycleWizardFormData): boolean {
  switch (step) {
    case 1: return data.goal.trim().length > 0 && data.goal.length <= 200;
    case 2: return data.discoverScore >= 1 && data.nurtureScore >= 1 && data.convertScore >= 1;
    case 4: return !!data.metric1_name && data.metric1_start !== null;
    case 5: return !!data.weeklyPlanningDay && !!data.weeklyDebriefDay;
    default: return true;
  }
}
```

---

## Success Criteria

1. User can complete wizard in ~10 minutes
2. Draft auto-saves and can be resumed
3. Creates valid `cycles_90_day` record
4. PDF exports cleanly on mobile and desktop
5. Edit button on dashboard works
6. THE GAP step is visually distinctive
7. Metric suggestions appear based on focus area + platforms
8. Mobile experience is smooth (single column, large touch targets)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Existing CycleSetup users | Keep old route working, redirect to new wizard |
| Data migration | New column only, no breaking changes |
| PDF on mobile Safari | Use jsPDF (already working) |
| Large form state | useWizard already handles efficiently |

---

## Files Summary

### New Files (15)
- `src/pages/CycleWizard.tsx`
- `src/components/cycle-wizard/CycleWizardTypes.ts`
- `src/components/cycle-wizard/CycleWizardData.ts`
- `src/components/cycle-wizard/CycleWizardPDFExport.ts`
- `src/components/cycle-wizard/CycleWizardReviewCard.tsx`
- `src/components/cycle-wizard/steps/StepBigGoal.tsx`
- `src/components/cycle-wizard/steps/StepDiagnostic.tsx`
- `src/components/cycle-wizard/steps/StepIdentity.tsx`
- `src/components/cycle-wizard/steps/StepMetrics.tsx`
- `src/components/cycle-wizard/steps/StepWeeklyRhythm.tsx`
- `src/components/cycle-wizard/steps/StepBottleneck.tsx`
- `src/components/cycle-wizard/steps/StepTheGap.tsx`
- `src/components/cycle-wizard/steps/StepMindset.tsx`
- `src/components/cycle-wizard/steps/StepReview.tsx`
- `src/components/cycle-wizard/steps/index.ts`

### Modified Files (5)
- `src/App.tsx` - Add route
- `src/pages/Dashboard.tsx` - Add edit button
- `src/components/wizards/WizardHub.tsx` - Update routing
- `src/lib/pdfGenerator.ts` - Add new export function
- Database migration for `gap_strategy` column

---

## Next Steps After Approval

1. Create database migration for `gap_strategy` column
2. Build core wizard structure with Steps 1-3
3. Build Steps 4-6
4. Build Steps 7-9 (including THE GAP)
5. Add save logic and PDF export
6. Dashboard integration
7. Mobile testing
