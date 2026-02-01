
# Bonus & Asset Creation Status with Deadlines

## Overview

This plan adds "already created vs. need to create" status tracking with deadlines for items that require preparation before launch. This ensures users get appropriately scheduled tasks and don't overlook creation work.

---

## Items Requiring Status Tracking

After reviewing the entire Launch Wizard, here are items that need "already have" vs. "need to create" tracking:

| Item | Current State | Location |
|------|---------------|----------|
| **Bonus Stack** | No status tracking, just list | V1: LaunchSalesAssets, V2: StepOfferDetails |
| **Sales Page** | Has deadline, no status | V1: LaunchSalesAssets |
| **Testimonials** | Toggle + goal, no status | V1: LaunchSalesAssets |
| **Email Sequences** | Selected, no status | V2: StepPreLaunchStrategy |
| **Lead Magnet** | Referenced in preLaunchTasks | V1: preLaunchTasks |
| **Live Event Content** | Referenced in preLaunchTasks | V1: preLaunchTasks |

---

## Changes

### 1. Enhanced Bonus Item Structure

Replace simple string bonus list with a structured bonus object:

```typescript
export interface BonusItem {
  id: string;
  name: string;
  status: 'existing' | 'needs-creation';
  deadline?: string;  // Required only if needs-creation
}
```

**V2 Offer Details Step UI:**

```text
┌─────────────────────────────────────────────────────────┐
│ 🎁 Bonus Stack                                          │
│                                                         │
│ + Add bonus: [________________] [+]                     │
│                                                         │
│ ┌─ Your bonuses ────────────────────────────────────┐  │
│ │ 🎁 Private Q&A Calls                              │  │
│ │    ○ Already created  ● Need to create            │  │
│ │    [📅 Deadline: Feb 15, 2026]              [X]   │  │
│ ├───────────────────────────────────────────────────│  │
│ │ 🎁 Templates Bundle                               │  │
│ │    ● Already created  ○ Need to create            │  │
│ │    ✓ Ready to use                           [X]   │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ ⚠️ 1 bonus needs creation before Feb 20 (cart opens)   │
└─────────────────────────────────────────────────────────┘
```

### 2. Sales Page Status

Add status tracking to sales page:

```typescript
salesPageStatus: 'existing' | 'needs-creation' | 'in-progress';
salesPageDeadline: string;  // Already exists
```

### 3. Testimonials Status

```typescript
testimonialStatus: 'have-enough' | 'need-more' | 'none';
testimonialGoal: number;
testimonialDeadline?: string;  // If need-more or none
```

### 4. Email Sequence Status

Each selected sequence gets a status:

```typescript
export interface EmailSequenceItem {
  type: 'warmUp' | 'launch' | 'cartClose' | 'postPurchase' | 'custom';
  customName?: string;
  status: 'existing' | 'needs-creation';
  deadline?: string;
}
```

### 5. Lead Magnet Status (V1 only, referenced in preLaunchTasks)

```typescript
leadMagnetStatus: 'existing' | 'needs-creation' | 'not-needed';
leadMagnetDeadline?: string;
```

---

## Technical Changes

### File: `src/types/launchV2.ts`

**Add new interfaces:**

```typescript
export interface BonusItem {
  id: string;
  name: string;
  status: 'existing' | 'needs-creation';
  deadline?: string;
}

export interface EmailSequenceItem {
  type: 'warmUp' | 'launch' | 'cartClose' | 'postPurchase' | 'custom';
  customName?: string;
  status: 'existing' | 'needs-creation';
  deadline?: string;
}

export type SalesPageStatus = 'existing' | 'needs-creation' | 'in-progress';
export type TestimonialStatus = 'have-enough' | 'need-more' | 'none';
```

**Update `LaunchWizardV2Data`:**

```typescript
// Step 3: Offer Details - Replace mainBonus with bonusStack
bonusStack: BonusItem[];

// Step 4: Pre-Launch Strategy - Replace emailSequenceTypes
emailSequences: EmailSequenceItem[];
customEmailSequences: EmailSequenceItem[];  // With full structure

// Sales Page (could add to Step 4)
salesPageStatus: SalesPageStatus;
salesPageDeadline: string;

// Testimonials (could add to Step 4)
testimonialStatus: TestimonialStatus;
testimonialGoal: number;
testimonialDeadline: string;
```

**Update defaults:**

```typescript
bonusStack: [],
emailSequences: [],
salesPageStatus: 'needs-creation',
salesPageDeadline: '',
testimonialStatus: 'none',
testimonialGoal: 5,
testimonialDeadline: '',
```

### File: `src/components/wizards/launch-v2/steps/StepOfferDetails.tsx`

**Replace simple bonus input with structured bonus builder:**

1. Add local state for new bonus name
2. Add bonus with initial status dialog
3. For each bonus, show:
   - Name with icon
   - Status toggle (existing/needs-creation)
   - Deadline picker (conditional on status)
   - Remove button
4. Add validation warning if any bonus deadline is after cart opens

### File: `src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx`

**Add Sales Page section:**
- Status selector (existing/in-progress/needs-creation)
- Deadline picker (if not existing)
- Suggested deadline calculation (3 days before cart opens)

**Add Testimonials section:**
- Status selector
- Goal number (if need-more or none)
- Deadline picker (if need-more or none)

**Enhance Email Sequences section:**
- When user selects a sequence type, also ask status
- Show deadline picker for sequences that need creation
- Same for custom sequences

### File: `src/types/launch.ts` (V1)

**Same pattern for V1 wizard:**

```typescript
// In LaunchWizardData
bonuses: BonusItem[];  // Replace string[]
salesPageStatus: 'existing' | 'needs-creation' | 'in-progress';
testimonialStatus: 'have-enough' | 'need-more' | 'none';
testimonialDeadline: string;
leadMagnetStatus: 'existing' | 'needs-creation' | 'not-needed';
leadMagnetDeadline: string;
```

### File: `src/components/wizards/launch/LaunchSalesAssets.tsx` (V1)

**Update to use new bonus structure with status and deadlines.**

---

## UI Component: BonusItemCard

Create a reusable component for bonus items:

```typescript
interface BonusItemCardProps {
  bonus: BonusItem;
  onUpdate: (updates: Partial<BonusItem>) => void;
  onRemove: () => void;
  maxDeadline?: string;  // Cart opens date for validation
}

function BonusItemCard({ bonus, onUpdate, onRemove, maxDeadline }: BonusItemCardProps) {
  return (
    <div className="p-4 rounded-lg border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <span className="font-medium">{bonus.name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <RadioGroup
        value={bonus.status}
        onValueChange={(v) => onUpdate({ status: v as 'existing' | 'needs-creation' })}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="existing" />
          <Label>Already created</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="needs-creation" />
          <Label>Need to create</Label>
        </div>
      </RadioGroup>
      
      {bonus.status === 'needs-creation' && (
        <div className="space-y-2">
          <Label className="text-sm">When will it be ready?</Label>
          <Input
            type="date"
            value={bonus.deadline || ''}
            onChange={(e) => onUpdate({ deadline: e.target.value })}
            max={maxDeadline}
          />
        </div>
      )}
    </div>
  );
}
```

---

## Validation Updates

### File: `src/lib/launchV2Validation.ts`

Add validation for deadlines:

```typescript
// Check that all creation deadlines are before cart opens
function validateCreationDeadlines(data: LaunchWizardV2Data): string[] {
  const warnings: string[] = [];
  const cartOpens = data.cartOpensDate ? parseISO(data.cartOpensDate) : null;
  
  if (!cartOpens) return warnings;
  
  // Check bonuses
  data.bonusStack?.forEach(bonus => {
    if (bonus.status === 'needs-creation' && bonus.deadline) {
      if (isAfter(parseISO(bonus.deadline), cartOpens)) {
        warnings.push(`Bonus "${bonus.name}" deadline is after cart opens`);
      }
    }
  });
  
  // Check sales page
  if (data.salesPageStatus !== 'existing' && data.salesPageDeadline) {
    if (isAfter(parseISO(data.salesPageDeadline), cartOpens)) {
      warnings.push('Sales page deadline is after cart opens');
    }
  }
  
  return warnings;
}
```

---

## Step Placement

The new sections fit into existing steps:

| Section | Step | Rationale |
|---------|------|-----------|
| Bonus Stack (enhanced) | Step 3: Offer Details | Already asks about bonuses |
| Sales Page Status | Step 4: Pre-Launch Strategy | Part of prep work |
| Testimonials | Step 4: Pre-Launch Strategy | Part of social proof prep |
| Email Sequences (enhanced) | Step 4: Pre-Launch Strategy | Already there |

---

## Summary Card Enhancement

The existing summary cards should show creation workload:

```text
┌─────────────────────────────────────────────────────────┐
│ 📋 Creation To-Do Summary                               │
│                                                         │
│ Needs Creation:                                         │
│ • 2 bonuses (deadlines: Feb 10, Feb 12)                 │
│ • Sales page (deadline: Feb 15)                         │
│ • 3 email sequences (deadlines: Feb 8, Feb 10, Feb 12)  │
│                                                         │
│ Already Ready:                                          │
│ • 1 bonus                                               │
│ • 5 testimonials collected                              │
│                                                         │
│ ⚡ Total creation tasks: ~8                              │
└─────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/launchV2.ts` | Add BonusItem, EmailSequenceItem interfaces; update LaunchWizardV2Data |
| `src/types/launch.ts` | Same updates for V1 wizard |
| `src/components/wizards/launch-v2/steps/StepOfferDetails.tsx` | Replace mainBonus with bonusStack builder |
| `src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx` | Add sales page status, testimonials, enhance email sequences |
| `src/components/wizards/launch/LaunchSalesAssets.tsx` | Update bonus section for V1 |
| `src/lib/launchV2Validation.ts` | Add deadline validation |

---

## Migration Consideration

Since `mainBonus` (string) is being replaced with `bonusStack` (array), the default data handles new launches. Existing drafts with `mainBonus` would need migration logic:

```typescript
// In useWizard or data loading
if (data.mainBonus && !data.bonusStack?.length) {
  data.bonusStack = [{
    id: crypto.randomUUID(),
    name: data.mainBonus,
    status: 'existing',  // Assume existing if from old format
  }];
}
```

---

## Task Estimate

- Types update: ~20 minutes
- StepOfferDetails bonus builder: ~45 minutes
- StepPreLaunchStrategy additions: ~45 minutes
- V1 LaunchSalesAssets update: ~30 minutes
- Validation updates: ~15 minutes
- Testing: ~30 minutes

**Total: ~3 hours**
