
# Launch Planner Integration Plan

## Overview

This plan restructures the existing 13-step Launch Planner into a streamlined, questionnaire-based wizard aligned with your 25-question document. The new wizard will be experience-adaptive, deeply integrated with the app's task, reminder, CTFAR, and GAP systems, and will auto-generate personalized execution plans.

---

## Questionnaire to Wizard Step Mapping

| Questionnaire Section | Questions | New Wizard Step | Integration Points |
|----------------------|-----------|-----------------|---------------------|
| Section 1: Launch Context | Q1-Q3 | Step 1: Launch Context | Branches UI complexity, determines task density |
| Section 2: Goal & Timeline | Q4-Q6 | Step 2: Goal & Timeline | Creates project dates, revenue tracking |
| Section 3: Offer Details | Q7-Q10 | Step 3: Offer Details | Sales page tasks, scarcity messaging |
| Section 4: Pre-Launch Strategy | Q11-Q13 | Step 4: Pre-Launch Strategy | Content creation tasks, visibility tasks |
| Section 5: Launch Week Strategy | Q14-Q16 | Step 5: Launch Week | Daily offer tasks, live event prep |
| Section 6: Post-Launch Strategy | Q17-Q18 | Step 6: Post-Launch | Follow-up tasks, debrief scheduling |
| Section 7: Contingency Planning | Q19-Q21 | Step 7: Contingency | CTFAR prompts, mindset reminders |
| Section 8: THE GAP | Q22-Q23 | Step 8: THE GAP Check | Cycle linkage, support tasks |
| Section 9: Final Check | Q24-Q25 | Step 9: Review & Complete | Personalized messaging, PDF export |

---

## New Wizard Structure (9 Steps)

### Step 1: Launch Context (Q1-Q3)

**Fields**:
```typescript
launchExperience: 'first-time' | 'launched-before' | 'launched-recently';
previousLaunchLearnings?: string; // For non-first-timers
whatWentWell?: string;
whatToImprove?: string;
offerType: 'course' | 'coaching' | 'product' | 'membership' | 'other';
otherOfferType?: string;
emailListStatus: 'comfortable' | 'small-nervous' | 'starting-zero' | 'building';
```

**UI Behavior**:
- First-timers see more teaching content throughout wizard
- Non-first-timers get quick reflection prompts about previous launch
- List status determines visibility tasks vs. conversion focus

**Teaching Content** (first-timers):
> "Your first launch is about LEARNING, not revenue. Success = you launched."

---

### Step 2: Goal & Timeline (Q4-Q6)

**Fields**:
```typescript
launchTimeline: '2-weeks' | '3-4-weeks' | '5-6-weeks';
cartOpensDate: string;
cartClosesDate: string; // Auto-calculated from timeline
revenueGoalTier: 'first-sale' | '500-1000' | '1000-2500' | '2500-plus' | 'testing';
customRevenueGoal?: number; // Derived from tier
```

**Auto-Calculations**:
- Cart close = Cart open + timeline duration
- GAP overlap detection against active 90-day cycle
- Sales needed = revenue goal / price (calculated in Step 3)

**Teaching** (based on tier):
- "First sale" → Focus on learning, reduce pressure
- "Testing" → Emphasis on collecting feedback, not sales
- "$2500+" → Requires strong email list or direct outreach strategy

---

### Step 3: Offer Details (Q7-Q10)

**Fields**:
```typescript
pricePoint: number;
hasPaymentPlan: boolean;
paymentPlanDetails?: string; // e.g., "3 payments of $197"
idealCustomer: string; // Max 200 chars
mainBonus: string; // Max 150 chars
hasLimitations: 'none' | 'existing-clients' | 'limited-spots';
limitationDetails?: string;
spotLimit?: number;
```

**Auto-Calculations**:
- `salesNeeded = revenueGoal / pricePoint`
- Scarcity messaging type based on limitations

**Generated Tasks**:
- "Finalize pricing" (if price seems uncertain)
- "Create bonus description" (if bonus provided)
- "Set up limited spots counter" (if limited spots)

---

### Step 4: Pre-Launch Strategy (Q11-Q13)

**Fields**:
```typescript
mainReachMethod: 'email' | 'social' | 'direct-outreach' | 'combination' | 'unsure';
socialPlatform?: string; // If social selected
combinationDetails?: string;
contentCreationStatus: 'ready' | 'partial' | 'from-scratch';
contentVolume: 'light' | 'medium' | 'heavy'; // 3-5, 5-10, 10+ pieces
```

**Task Generation Logic**:
- `mainReachMethod === 'unsure'` → Add visibility assessment tasks
- `contentCreationStatus === 'from-scratch'` → Heavy content creation tasks
- `contentCreationStatus === 'ready'` → Promotion/scheduling tasks only
- `contentVolume` → Determines quantity of email/post tasks

**Generated Tasks Examples**:
| Status | Content Volume | Tasks Generated |
|--------|---------------|-----------------|
| From scratch | Light (3-5) | 5 content creation tasks |
| From scratch | Heavy (10+) | 12 content creation tasks |
| Partial | Medium | 3 creation + 5 scheduling tasks |
| Ready | Any | Scheduling/promotion only |

---

### Step 5: Launch Week Strategy (Q14-Q16)

**Fields**:
```typescript
launchMethod: 'email-only' | 'social-email' | 'outreach-email' | 'in-person' | 'combination';
offerFrequency: 'once' | 'daily' | 'multiple-daily' | 'every-other-day' | 'unsure';
liveComponent: 'none' | 'one' | 'multiple' | 'considering';
liveEventDetails?: LaunchLiveEvent[]; // Reuse existing type
```

**Task Density Calculation**:
```typescript
const dailyTasks = {
  'once': 1,
  'daily': 1,
  'multiple-daily': 3,
  'every-other-day': 0.5,
  'unsure': 1, // Default with guidance task
};
```

**Generated Tasks**:
- Daily offer reminder tasks based on frequency
- Live event prep tasks (2 days before each)
- Live event host tasks (day of)
- "Guidance needed" task if frequency = 'unsure'

---

### Step 6: Post-Launch Strategy (Q17-Q18)

**Fields**:
```typescript
promotionDuration: '1-week' | '2-weeks' | 'until-goal' | 'ongoing' | 'unsure';
followUpWillingness: 'one-email' | 'multiple-emails' | 'personal-outreach' | 'simple' | 'unsure';
```

**Generated Tasks**:
| Follow-up Type | Tasks |
|---------------|-------|
| one-email | 1 follow-up email task (cart close + 1 day) |
| multiple-emails | 3-5 follow-up email tasks spread over 5 days |
| personal-outreach | Daily outreach tasks + warm lead list review |
| simple | Single "Close out launch" task |
| unsure | "Review follow-up strategy" guidance task |

**Additional Tasks**:
- Debrief task (cart close + 3 days or custom)
- "What's next?" planning task (cart close + 7 days)

---

### Step 7: Contingency Planning (Q19-Q21)

**Fields**:
```typescript
biggestFears: string[]; // Multi-select from predefined list
zeroSalesMeaning: 'offer-problem' | 'not-enough-promotion' | 'nobody-wants' | 'unsure' | 'just-data';
zeroSalesPlan: 'figure-out-retry' | 'adjust-relaunch' | 'take-break' | 'no-plan' | 'unsure';
```

**Fear Options** (from Q19):
```typescript
const FEAR_OPTIONS = [
  { value: 'zero-sales', label: 'Nobody will buy / I\'ll get zero sales' },
  { value: 'waste-time', label: 'I\'ll lose money or waste time' },
  { value: 'judgment', label: 'People will judge my offer/pricing' },
  { value: 'not-ready', label: 'I\'m not ready / there\'s something I\'m missing' },
  { value: 'too-much-demand', label: 'I won\'t be able to keep up with demand' },
  { value: 'audience-small', label: 'My audience is too small' },
  { value: 'too-salesy', label: 'I\'ll seem too salesy/pushy' },
  { value: 'no-fear', label: 'I have no fear - bring it on!' },
];
```

**CTFAR Integration**:
For each selected fear, auto-generate a CTFAR prompt:

```typescript
// When completing wizard, create ctfar entries
const ctfarPrompts = selectedFears.map(fear => ({
  user_id: userId,
  cycle_id: activeCycleId,
  circumstance: `I'm launching ${launchName}`,
  thought: FEAR_THOUGHTS[fear], // Pre-written thought for each fear
  feeling: FEAR_FEELINGS[fear],
  action: '', // User fills in
  result: '', // User fills in
  tags: ['launch', 'mindset', launchName],
}));
```

**Pre-written Fear Prompts**:
```typescript
const FEAR_THOUGHTS = {
  'zero-sales': 'Nobody is going to buy and I\'ll embarrass myself',
  'waste-time': 'I\'ll spend all this time and have nothing to show for it',
  'judgment': 'People will think my price is too high or my offer is bad',
  'not-ready': 'I\'m missing something important and I\'ll fail because of it',
  'audience-small': 'My audience is too small to make any meaningful sales',
  'too-salesy': 'I\'ll annoy people and they\'ll unsubscribe or unfollow me',
};
```

**Teaching Content** (zeroSalesMeaning):
- `offer-problem` → "Your offer can be improved. That's learnable."
- `not-enough-promotion` → "Most launches under-promote. You can fix that."
- `nobody-wants` → "This belief is almost never true. Let's reframe it."
- `just-data` → "Great mindset! You're ready."

---

### Step 8: THE GAP Check (Q22-Q23)

**Conditional Display**: Only shown if:
1. User has an active 90-day cycle
2. Launch dates overlap with days 15-30 of cycle

**Auto-Detection Logic**:
```typescript
function detectGapOverlap(
  launchStart: Date, 
  launchEnd: Date, 
  cycleStart: Date
): { overlaps: boolean; overlapWeeks: number[] } {
  const gapStart = addDays(cycleStart, 14); // Day 15
  const gapEnd = addDays(cycleStart, 30);   // Day 30
  
  const overlaps = (launchStart <= gapEnd && launchEnd >= gapStart);
  const overlapWeeks = overlaps ? [3, 4] : [];
  
  return { overlaps, overlapWeeks };
}
```

**Fields** (if GAP detected):
```typescript
gapAcknowledged: boolean;
gapSupportType: 'daily-motivation' | 'mid-week-check' | 'thought-work' | 'keep-tasks' | 'decide-later';
```

**Generated Support**:
| Support Type | Generated Items |
|-------------|-----------------|
| daily-motivation | Daily mindset reminder tasks during weeks 3-4 |
| mid-week-check | Accountability call/check-in task mid-launch |
| thought-work | Link to CTFAR + pre-populated limiting belief |
| keep-tasks | Standard tasks, no extra support |
| decide-later | "Check in about GAP support" task at week 3 start |

**Cycle Linkage**:
- Pull existing GAP strategy from Cycle Wizard if available
- Display: "You previously said you'd handle THE GAP by: [strategy]"
- Option to use same strategy or set launch-specific one

---

### Step 9: Review & Complete (Q24-Q25)

**Fields**:
```typescript
readinessScore: number; // 1-10 slider
whatYouNeed: 'task-list' | 'offer-help' | 'confidence' | 'accountability' | 'nothing';
```

**Readiness-Based Messaging**:
```typescript
const READINESS_MESSAGES = {
  low: "You don't have to feel ready. You're going to do this anyway. Let's make a plan.",
  medium: "You're in the zone. Let's do this.",
  high: "Let's go. You've got this.",
};
```

**Personalization Based on "What You Need"**:
| Selection | Extra Output |
|-----------|-------------|
| task-list | Emphasize task view, daily checklist |
| offer-help | Add "Review offer positioning" task, flag for coaching |
| confidence | Add daily mindset/affirmation tasks |
| accountability | Add mid-launch check-in reminders |
| nothing | Standard output |

**Final Output Summary**:
- Task count by category
- Timeline visualization
- Revenue goal tracker
- Key milestone dates
- PDF export button

---

## Database Schema Changes

### New Columns for `launches` Table

```sql
ALTER TABLE public.launches ADD COLUMN IF NOT EXISTS
  -- Context
  launch_experience TEXT CHECK (launch_experience IN ('first-time', 'launched-before', 'launched-recently')),
  previous_launch_learnings TEXT,
  what_went_well TEXT,
  what_to_improve TEXT,
  email_list_status TEXT,
  
  -- Offer Details (expanded)
  ideal_customer TEXT,
  main_bonus TEXT,
  has_limitations TEXT,
  limitation_details TEXT,
  spot_limit INTEGER,
  has_payment_plan BOOLEAN DEFAULT false,
  payment_plan_details TEXT,
  
  -- Strategy
  main_reach_method TEXT,
  content_creation_status TEXT,
  content_volume TEXT,
  launch_method TEXT,
  offer_frequency TEXT,
  live_component TEXT,
  promotion_duration TEXT,
  follow_up_willingness TEXT,
  
  -- Contingency
  biggest_fears TEXT[],
  zero_sales_meaning TEXT,
  zero_sales_plan TEXT,
  
  -- GAP
  gap_overlap_detected BOOLEAN DEFAULT false,
  gap_acknowledged BOOLEAN DEFAULT false,
  gap_support_type TEXT,
  
  -- Final
  readiness_score INTEGER CHECK (readiness_score >= 1 AND readiness_score <= 10),
  what_they_need TEXT;
```

---

## Task Generation Matrix

The edge function will generate tasks based on questionnaire answers:

### Pre-Launch Tasks

| Condition | Tasks Generated |
|-----------|-----------------|
| `contentCreationStatus = 'from-scratch'` | Content creation tasks (quantity = contentVolume mapping) |
| `mainReachMethod = 'unsure'` | "Define your visibility strategy" task |
| `emailListStatus = 'starting-zero'` | "Build initial email list" task series |
| `hasPaymentPlan = true` | "Set up payment plan in checkout" task |

### Launch Week Tasks

| Condition | Tasks Generated |
|-----------|-----------------|
| `offerFrequency = 'daily'` | Daily "Make an offer" task for each launch day |
| `offerFrequency = 'multiple-daily'` | 3x daily offer reminder tasks |
| `liveComponent = 'one' or 'multiple'` | Prep task (day-2), Host task (day of) |
| `launchMethod = 'outreach-email'` | Daily "Personal outreach" task |

### Post-Launch Tasks

| Condition | Tasks Generated |
|-----------|-----------------|
| `followUpWillingness = 'multiple-emails'` | 3-5 follow-up email tasks |
| `followUpWillingness = 'personal-outreach'` | Daily outreach tasks for 5 days |
| Always | Launch debrief task |

### Mindset Tasks

| Condition | Tasks Generated |
|-----------|-----------------|
| `biggestFears.length > 0` | CTFAR entries for each fear |
| `readinessScore <= 5` | Daily mindset affirmation tasks |
| `whatYouNeed = 'accountability'` | Mid-launch check-in reminders |
| `gapOverlapDetected = true` | GAP-specific support tasks |

---

## App Integration Points

### 1. Daily Plan Integration

**Launch Countdown Card** (already exists in InfoCards.tsx):
- Shows days until cart opens/closes
- Progress toward sales goal
- Today's launch tasks highlighted

**New Additions**:
- "Offer made today?" quick checkbox
- Mindset prompt for GAP days
- Fear reframe tip based on biggest_fears

### 2. Weekly Plan Integration

**Launch Week Detection**:
```typescript
// In WeeklyPlan.tsx
const isLaunchWeek = activeLaunch && 
  isWithinInterval(currentWeekStart, {
    start: parseISO(activeLaunch.cart_opens),
    end: parseISO(activeLaunch.cart_closes),
  });
```

**Launch Week Mode**:
- Automatic focus on launch tasks
- Daily offer tracking summary
- Mid-week mindset check

### 3. CTFAR Integration

**Auto-Generated Entries**:
When wizard completes, create CTFAR entries for each selected fear:

```typescript
// In edge function
if (wizardData.biggestFears?.length > 0) {
  const ctfarEntries = wizardData.biggestFears.map(fear => ({
    user_id: userId,
    cycle_id: activeCycleId,
    circumstance: `Launching ${wizardData.name}`,
    thought: FEAR_THOUGHT_MAP[fear],
    feeling: '',
    action: '',
    result: '',
    tags: ['launch', 'auto-generated'],
  }));
  
  await supabase.from('ctfar').insert(ctfarEntries);
}
```

### 4. Reminders Integration

**Launch-Specific Reminders**:
```typescript
// Create reminders for key dates
const remindersToCreate = [
  {
    user_id: userId,
    type: 'launch_cart_opens',
    delivery_method: 'in_app',
    active: true,
  },
  {
    user_id: userId,
    type: 'launch_daily_offer',
    delivery_method: 'in_app',
    active: wizardData.offerFrequency !== 'once',
  },
];
```

### 5. Dashboard Integration

**Active Launch Widget**:
- Revenue progress bar
- Days remaining
- Quick "Make an offer" button
- Mindset tip of the day

**Post-Launch**:
- Launch summary card
- "View Debrief" button
- Next launch suggestion

---

## Files to Create/Modify

### New Files (9 Step Components)

```text
src/components/wizards/launch-v2/
  ├── LaunchWizardV2.tsx           # Main wizard component
  ├── LaunchWizardTypes.ts         # New types
  ├── LaunchWizardValidation.ts    # Validation rules
  ├── steps/
  │   ├── StepLaunchContext.tsx    # Q1-Q3
  │   ├── StepGoalTimeline.tsx     # Q4-Q6
  │   ├── StepOfferDetails.tsx     # Q7-Q10
  │   ├── StepPreLaunchStrategy.tsx # Q11-Q13
  │   ├── StepLaunchWeek.tsx       # Q14-Q16
  │   ├── StepPostLaunch.tsx       # Q17-Q18
  │   ├── StepContingency.tsx      # Q19-Q21
  │   ├── StepTheGap.tsx           # Q22-Q23
  │   └── StepReviewComplete.tsx   # Q24-Q25
  └── utils/
      ├── fearPrompts.ts           # CTFAR templates
      ├── taskGenerator.ts         # Task generation logic
      └── gapDetection.ts          # GAP overlap detection
```

### Modified Files

| File | Changes |
|------|---------|
| `src/types/launch.ts` | Add new field types |
| `supabase/functions/create-launch-from-wizard/index.ts` | Update task generation |
| `src/components/daily/InfoCards.tsx` | Enhanced launch card |
| `src/pages/WeeklyPlan.tsx` | Launch week mode |
| `src/components/wizards/WizardHub.tsx` | Route to new wizard |
| `src/App.tsx` | Add new route |

---

## Implementation Phases

### Phase 1: New Wizard Structure (Week 1)
1. Database migration for new columns
2. Create new wizard types and validation
3. Build Steps 1-3 (Context, Timeline, Offer)
4. Test wizard flow with mock data

### Phase 2: Strategy Steps (Week 2)
5. Build Steps 4-6 (Pre-launch, Launch Week, Post-launch)
6. Implement task generation logic
7. Test task creation with various answer combinations

### Phase 3: Mindset Integration (Week 3)
8. Build Steps 7-8 (Contingency, GAP)
9. Implement CTFAR auto-generation
10. GAP detection and cycle linkage
11. Update edge function with new task types

### Phase 4: Polish & Integration (Week 4)
12. Build Step 9 (Review & Complete)
13. Dashboard launch widget
14. Weekly plan launch mode
15. PDF export
16. Mobile testing
17. Migrate existing wizard route

---

## Success Criteria

1. Wizard completes in ~10 minutes
2. Experience-based branching reduces overwhelm for first-timers
3. Tasks auto-generate based on answers (not one-size-fits-all)
4. CTFAR entries created for selected fears
5. GAP detection and support for launches in weeks 3-4
6. Clear visibility into what's being generated before completion
7. Works on mobile (375px first)
8. Integrates with existing Daily/Weekly plan views

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Wizard too long (9 steps) | Most steps are 3-4 questions; quick multi-select |
| Task overload | Show task count preview; allow bulk defer |
| GAP detection edge cases | Manual override option; "I'm not sure" choice |
| Existing launch wizard users | Keep old wizard at `/launch-wizard-old`, migrate gradually |
| CTFAR overwhelm | Generate max 3 CTFAR entries; prioritize top fears |
