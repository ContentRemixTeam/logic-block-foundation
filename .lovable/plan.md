

# Launch Planner Pre-Launch Step Enhancements

## Overview

This plan adds three enhancements to **Step 4: Pre-Launch Strategy** in the Launch Wizard V2:

1. **Email Sequences with "Other" option** - Add customizable email types beyond the standard set
2. **Automation Selector** - Let users pick which specific automations they need to set up
3. **Content Prep Integration Note** - Clarify that detailed content planning happens in the separate Content Planner

---

## Current State

The V2 Launch Wizard's Pre-Launch step (Step 4) currently asks about:
- Main reach method (email, social, etc.)
- Content creation status (ready, partial, from scratch)
- Content volume (light, medium, heavy)
- Custom checklist items (just added)

The **V1 wizard** had more detail: specific email sequence types (warm-up, launch, cart close, post-purchase) and automation checkboxes. V2 simplified this too much.

---

## Changes

### 1. Email Sequence Types with "Other" Option

Add a section where users can select which email sequences they need and add their own.

```text
┌─────────────────────────────────────────────────────────┐
│ 📧 Which email sequences do you need to write?          │
│                                                         │
│ ☑ Warm-up sequence (3-7 emails to build anticipation)  │
│ ☑ Launch week (5-7 emails announcing your offer)       │
│ ☑ Cart close urgency (3 emails for final push)         │
│ ☐ Post-purchase onboarding                              │
│                                                         │
│ + Add custom sequence: [________________] [+]           │
│                                                         │
│ ┌─ Custom sequences ────────────────────────────────┐  │
│ │ "VIP early access series"                    [X]  │  │
│ │ "FAQ response emails"                        [X]  │  │
│ └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2. Automation Selector

Replace the simple "set up automations" checkbox with a multi-select for specific automations.

```text
┌─────────────────────────────────────────────────────────┐
│ ⚡ Which automations do you need to set up?             │
│                                                         │
│ ☑ Tagging/segmentation (tag buyers, non-buyers)        │
│ ☐ Abandoned cart sequence                               │
│ ☑ Purchase confirmation sequence                        │
│ ☐ Waitlist to sales sequence                            │
│ ☐ Deadline/urgency automations                          │
│ ☐ Lead magnet delivery                                  │
│                                                         │
│ + Add custom: [________________] [+]                    │
│                                                         │
│ ┌─ Custom automations ──────────────────────────────┐  │
│ │ "Webinar replay sequence"                    [X]  │  │
│ └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3. Content Prep Integration Note

Add a note explaining that detailed content planning is done in the Content Planner:

```text
┌─────────────────────────────────────────────────────────┐
│ 📝 Content Prep                                         │
│                                                         │
│ Based on your choices above, we'll generate content     │
│ creation tasks. After completing this wizard, you can   │
│ use the Content Planner to:                             │
│                                                         │
│ • Define your messaging framework                       │
│ • Plan specific content pieces                          │
│ • Repurpose existing content                            │
│ • Schedule creation tasks by launch phase               │
│                                                         │
│ [Go to Content Planner] ← (shown after wizard complete) │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Changes

### 1. Types Update (`src/types/launchV2.ts`)

Add new fields to `LaunchWizardV2Data`:

```typescript
// Step 4: Pre-Launch Strategy additions
emailSequenceTypes: {
  warmUp: boolean;
  launch: boolean;
  cartClose: boolean;
  postPurchase: boolean;
};
customEmailSequences: string[];  // User-added sequences

automationTypes: {
  tagging: boolean;
  abandonedCart: boolean;
  purchaseConfirmation: boolean;
  waitlistToSales: boolean;
  deadlineUrgency: boolean;
  leadMagnetDelivery: boolean;
};
customAutomations: string[];  // User-added automations
```

Add option arrays:

```typescript
export const EMAIL_SEQUENCE_TYPE_OPTIONS = [
  { key: 'warmUp', label: 'Warm-up sequence', description: '3-7 emails to build anticipation' },
  { key: 'launch', label: 'Launch week', description: '5-7 emails announcing your offer' },
  { key: 'cartClose', label: 'Cart close urgency', description: '3 emails for final push' },
  { key: 'postPurchase', label: 'Post-purchase onboarding', description: 'Welcome new buyers' },
] as const;

export const AUTOMATION_TYPE_OPTIONS = [
  { key: 'tagging', label: 'Tagging/segmentation', description: 'Tag buyers, non-buyers, engaged leads' },
  { key: 'abandonedCart', label: 'Abandoned cart sequence', description: 'Follow up on incomplete purchases' },
  { key: 'purchaseConfirmation', label: 'Purchase confirmation sequence', description: 'Order + onboarding emails' },
  { key: 'waitlistToSales', label: 'Waitlist to sales sequence', description: 'Move waitlist to cart open' },
  { key: 'deadlineUrgency', label: 'Deadline/urgency automations', description: 'Cart closing countdown' },
  { key: 'leadMagnetDelivery', label: 'Lead magnet delivery', description: 'Auto-deliver free resources' },
] as const;
```

Update default data:

```typescript
export const DEFAULT_LAUNCH_V2_DATA: LaunchWizardV2Data = {
  // ... existing fields ...
  
  // New Step 4 fields
  emailSequenceTypes: {
    warmUp: false,
    launch: false,
    cartClose: false,
    postPurchase: false,
  },
  customEmailSequences: [],
  
  automationTypes: {
    tagging: false,
    abandonedCart: false,
    purchaseConfirmation: false,
    waitlistToSales: false,
    deadlineUrgency: false,
    leadMagnetDelivery: false,
  },
  customAutomations: [],
};
```

### 2. Step Component Update (`StepPreLaunchStrategy.tsx`)

Add three new sections to the step:

**Section 1: Email Sequences**
- Checkbox list of standard email sequence types
- Input field to add custom sequences
- List of custom sequences with delete buttons

**Section 2: Automations**
- Checkbox list of standard automation types
- Input field to add custom automations
- List of custom automations with delete buttons

**Section 3: Content Prep Note**
- Informational card explaining the Content Planner integration
- Link to Content Planner (shown only in review step or after completion)

### 3. Component Structure

New helper functions in StepPreLaunchStrategy:

```typescript
// Email sequence handlers
const toggleEmailSequenceType = (key: keyof EmailSequenceTypes) => {
  onChange({
    emailSequenceTypes: {
      ...data.emailSequenceTypes,
      [key]: !data.emailSequenceTypes[key],
    },
  });
};

const addCustomEmailSequence = () => { /* ... */ };
const removeCustomEmailSequence = (index: number) => { /* ... */ };

// Automation handlers
const toggleAutomationType = (key: keyof AutomationTypes) => { /* ... */ };
const addCustomAutomation = () => { /* ... */ };
const removeCustomAutomation = (index: number) => { /* ... */ };
```

---

## UI Layout

The step will now have these sections in order:

1. **Main Reach Method** (existing)
2. **Email Sequences** (new)
3. **Automations** (new)
4. **Content Creation Status** (existing)
5. **Content Volume** (existing)
6. **Content Prep Integration** (new info card)
7. **Custom Checklist Items** (existing)
8. **Strategy Summary** (existing)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/launchV2.ts` | Add email sequence types, automation types, custom arrays, and option arrays |
| `src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx` | Add email sequence section, automation section, content prep info card |

---

## Task Estimate

- Types update: ~15 minutes
- Step component update: ~30 minutes
- Testing: ~15 minutes

**Total: ~1 hour**

