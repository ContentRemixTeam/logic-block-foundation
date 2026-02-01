
# Add Deadlines to Pre-Launch Tasks & Generate Actual Tasks

## The Problem

The V1 Launch Planner has a pre-launch checklist where users can select tasks like "Set Up Checkout," "Create Case Studies," "Design Ad Creatives," etc. However:

1. **Most checklist items have no deadline input** - only 3 of 15 items have deadline fields
2. **These tasks are never actually created** - the edge function doesn't process the `preLaunchTasks` data at all

This means users are planning tasks that never get added to their task board.

---

## Solution

### Part 1: Add Deadline Fields to All Pre-Launch Tasks

Each task in the checklist should have an optional deadline date picker that appears when the task is selected.

**Tasks needing deadline fields added:**

| Tab | Task | New Field |
|-----|------|-----------|
| Sales Assets | Checkout Flow | `checkoutFlowDeadline` |
| Sales Assets | Order Bump/Upsell | `orderBumpDeadline` |
| Sales Assets | Bonuses | `bonusesDeadline` |
| Social Proof | Case Studies | `caseStudiesDeadline` |
| Social Proof | Video Testimonials | `videoTestimonialsDeadline` |
| Social Proof | Results Screenshots | `resultsScreenshotsDeadline` |
| Tech Setup | Email Sequences | `emailSequencesDeadline` |
| Tech Setup | Automations | `automationsDeadline` |
| Tech Setup | Tracking Pixels | `trackingPixelsDeadline` |
| Content Prep | Live Event Content | `liveEventContentDeadline` |
| Content Prep | Social Content | `socialContentDeadline` |
| Content Prep | Ad Creatives | `adCreativesDeadline` |
| Content Prep | Lead Magnet | `leadMagnetDeadline` |

### Part 2: Update Edge Function to Generate These Tasks

The `create-launch-from-wizard` edge function needs a new section to process `preLaunchTasks` and create tasks for each selected item.

**Task generation logic:**
- If user provided a deadline → use that date
- If no deadline → auto-calculate based on runway (e.g., 2 weeks before cart opens for most items, 1 week for tech setup)

---

## Implementation Details

### File: `src/types/launch.ts`

Add 13 new deadline fields to `PreLaunchTaskConfig`:

```typescript
interface PreLaunchTaskConfig {
  // Sales Assets
  salesPage: boolean;
  salesPageDeadline: string;
  checkoutFlow: boolean;
  checkoutFlowDeadline: string;  // NEW
  waitlistPage: boolean;
  waitlistDeadline: string;
  orderBumpUpsell: boolean;
  orderBumpDeadline: string;     // NEW
  bonuses: boolean;
  bonusesDeadline: string;       // NEW
  
  // Social Proof
  testimonials: boolean;
  testimonialGoal: number;
  testimonialDeadline: string;
  caseStudies: boolean;
  caseStudiesDeadline: string;   // NEW
  videoTestimonials: boolean;
  videoTestimonialsDeadline: string; // NEW
  resultsScreenshots: boolean;
  resultsScreenshotsDeadline: string; // NEW
  
  // Tech Setup
  emailSequences: boolean;
  emailSequencesDeadline: string;    // NEW
  // ... emailTypes stays the same
  automations: boolean;
  automationsDeadline: string;       // NEW
  trackingPixels: boolean;
  trackingPixelsDeadline: string;    // NEW
  
  // Content Prep
  liveEventContent: boolean;
  liveEventType: '...' | '';
  liveEventContentDeadline: string;  // NEW
  socialContent: boolean;
  socialContentDeadline: string;     // NEW
  adCreatives: boolean;
  adCreativesDeadline: string;       // NEW
  leadMagnet: boolean;
  leadMagnetDeadline: string;        // NEW
}
```

### File: `src/components/wizards/launch/LaunchPreLaunchTasks.tsx`

Add deadline inputs to each TaskItem that currently lacks one:

```text
Example for Checkout Flow:
┌─────────────────────────────────────────────────────┐
│ [✓] Set Up Checkout & Payment Processing            │
│     Test purchase flow, payment gateway, etc.       │
│                                                     │
│     Deadline: [__________] (date picker)            │
└─────────────────────────────────────────────────────┘
```

### File: `supabase/functions/create-launch-from-wizard/index.ts`

Add new section after existing task generation (~line 463):

```typescript
// --- Pre-Launch Checklist Tasks ---
const preLaunchTasks = wizardData.preLaunchTasks;
if (preLaunchTasks) {
  const preLaunchTaskDefinitions = [
    { 
      key: 'salesPage', 
      deadlineKey: 'salesPageDeadline',
      emoji: '📄',
      text: 'Build Sales Page',
      defaultDays: -14,
      priority: 'high',
      minutes: 240
    },
    { 
      key: 'checkoutFlow', 
      deadlineKey: 'checkoutFlowDeadline',
      emoji: '💳',
      text: 'Set Up Checkout & Payment',
      defaultDays: -7,
      priority: 'high',
      minutes: 90
    },
    // ... all 15 tasks with their configs
  ];

  for (const taskDef of preLaunchTaskDefinitions) {
    if (preLaunchTasks[taskDef.key]) {
      const deadline = preLaunchTasks[taskDef.deadlineKey] 
        || addDays(wizardData.cartOpens, taskDef.defaultDays);
      
      tasksToCreate.push({
        user_id: userId,
        project_id: projectId,
        task_text: `${taskDef.emoji} ${taskDef.text}`,
        scheduled_date: deadline,
        priority: taskDef.priority,
        category: 'Pre-Launch',
        // ... other fields
      });
    }
  }
}
```

---

## Default Deadline Logic (when user doesn't specify)

| Priority | Tasks | Default Deadline |
|----------|-------|------------------|
| **High (-14 days)** | Sales Page, Checkout Flow | Must be ready 2 weeks early |
| **Medium (-10 days)** | Testimonials, Case Studies, Bonuses | Social proof ready early |
| **Medium (-7 days)** | Email Sequences, Automations, Live Event Content | Tech & content week before |
| **Low (-5 days)** | Tracking, Ad Creatives, Social Content | Final polish items |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/launch.ts` | Add 13 deadline fields to `PreLaunchTaskConfig` |
| `src/components/wizards/launch/LaunchPreLaunchTasks.tsx` | Add deadline date pickers to all task items |
| `supabase/functions/create-launch-from-wizard/index.ts` | Add pre-launch task generation section |

---

## Summary

This fix ensures:
1. Users can set specific deadlines for every pre-launch task
2. All selected pre-launch tasks actually get created in the project
3. Smart defaults are used when users don't specify deadlines
4. Tasks are properly categorized and prioritized
