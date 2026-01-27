
# Daily Planning Page Enhancement - Implementation Plan

## Overview
This plan enhances the existing Daily Planning page (`src/pages/DailyPlan.tsx`) with new sections for weekly alignment, brain dump, and end-of-day reflection, while preserving all existing functionality.

## Current State Analysis

### What Already Exists
- **Database fields**: `alignment_score`, `brain_dump`, `end_of_day_reflection` columns already exist in `daily_plans` table
- **Gap Detection**: `src/utils/gapDetection.ts` and reconnection UI already implemented  
- **Activity Tracking**: `last_activity_date` and trigger already in place
- **Core Sections**: ONE Thing, Top 3 Priorities, Daily Mindset (thought/feeling), Scratch Pad, Habits, Deep Mode
- **Data Protection**: 4-hook system (localStorage, server sync, beforeUnload, mobile protection) already implemented
- **Existing Components**: `DailyAgendaCard`, `HabitTrackerCard`, `CycleSnapshotCard`, `SmartScratchPad`, etc.

### What Needs to Be Added
1. **Weekly Focus Section** (Monday only) with alignment slider
2. **Brain Dump Section** with large textarea
3. **End of Day Reflection Section** (after 5pm only)
4. **Update Edge Functions** to save new fields
5. **Info Cards Row** (optional - can be Phase 2)

---

## Implementation Steps

### Step 1: Update Edge Function Schema

**File: `supabase/functions/save-daily-plan/index.ts`**

Add new fields to the Zod validation schema and database update:

```text
Changes needed:
- Add alignment_score to schema: z.number().int().min(1).max(10).nullable().optional()
- Add brain_dump to schema: z.string().max(10000).optional()
- Add end_of_day_reflection to schema: z.string().max(1000).optional()
- Include these fields in the database update query
```

### Step 2: Update get-daily-plan Edge Function

**File: `supabase/functions/get-daily-plan/index.ts`**

Include new fields in the response:
- `alignment_score`
- `brain_dump`
- `end_of_day_reflection`

### Step 3: Add State & Load New Fields in DailyPlan.tsx

**File: `src/pages/DailyPlan.tsx`**

Add new state variables:
```typescript
const [alignmentScore, setAlignmentScore] = useState<number | null>(null);
const [brainDump, setBrainDump] = useState('');
const [endOfDayReflection, setEndOfDayReflection] = useState('');
```

Update the `dailyPlanData` memo to include new fields:
```typescript
const dailyPlanData = useMemo(() => ({
  // ...existing fields
  alignment_score: alignmentScore,
  brain_dump: brainDump,
  end_of_day_reflection: endOfDayReflection,
}), [/* ...deps */]);
```

Update `loadDailyPlan` to set new fields from API response.

### Step 4: Add Weekly Focus Section (Monday Only)

**Location in file**: After the Reconnection Message section, before the Planning Quick Links

```text
Section Structure:
┌─────────────────────────────────────────────────────────────┐
│ 📅 Weekly Focus Check (only visible on Mondays)            │
├─────────────────────────────────────────────────────────────┤
│ This week's priorities: (from weeklyPriorities array)      │
│ 1. Priority 1                                               │
│ 2. Priority 2                                               │
│ 3. Priority 3                                               │
├─────────────────────────────────────────────────────────────┤
│ Alignment Check:                                            │
│ How aligned do you feel with these priorities?              │
│ 1 ━━━━━━━━━●━━━━ 10                                        │
│                                                             │
│ [If score ≤ 6: Show Self-Coach and Use Model buttons]      │
└─────────────────────────────────────────────────────────────┘
```

Uses existing `Slider` component with min=1, max=10, step=1.

### Step 5: Add Brain Dump Section

**Location**: After the ONE Thing section, before Top 3 Priorities

```text
Section Structure:
┌─────────────────────────────────────────────────────────────┐
│ 🧠 Daily Brain Dump                                         │
│ Quick thoughts, ideas, what's on your mind...               │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Large textarea (min-h-[200px])                          ││
│ │ maxLength: 10000                                        ││
│ └─────────────────────────────────────────────────────────┘│
│ 0 / 10,000 characters                     ✓ Auto-saved     │
└─────────────────────────────────────────────────────────────┘
```

### Step 6: Add End of Day Reflection (After 5pm)

**Location**: After Habits section, before Deep Mode toggle

```text
Conditional render: Only show if currentHour >= 17 (5pm)

Section Structure:
┌─────────────────────────────────────────────────────────────┐
│ 🌙 End of Day Reflection                                    │
│ Take a moment to reflect on your day                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Textarea (min-h-[150px])                                ││
│ │ Placeholder: "How did today go? What are you grateful   ││
│ │ for? What will you do differently tomorrow?"            ││
│ │ maxLength: 1000                                         ││
│ └─────────────────────────────────────────────────────────┘│
│ 0 / 1,000 characters                      ✓ Auto-saved     │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Details

### Import Additions
```typescript
import { Slider } from '@/components/ui/slider';
import { Moon } from 'lucide-react';  // For end of day icon
```

### Monday Detection Logic
```typescript
const isMonday = new Date().getDay() === 1;
```

### Evening Detection Logic
```typescript
const currentHour = new Date().getHours();
const showReflection = currentHour >= 17;
```

### Character Counter Pattern
Uses existing `<CharacterCounter>` component pattern already in the file.

### Auto-save Integration
All new fields automatically save via the existing `dailyPlanData` memo and `useServerSync` hook - no changes needed to save logic.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/save-daily-plan/index.ts` | Edit | Add alignment_score, brain_dump, end_of_day_reflection to schema and update |
| `supabase/functions/get-daily-plan/index.ts` | Edit | Return new fields in response |
| `src/pages/DailyPlan.tsx` | Edit | Add state, load logic, and 3 new UI sections |

---

## Section Order After Implementation

1. Header with date and view toggle
2. CycleProgressBanner
3. CalendarReconnectBanner  
4. **Gap Alert** (conditional - if user has been away)
5. **Weekly Focus + Alignment** (conditional - Monday only) ← NEW
6. Planning Quick Links
7. SaveStatusBanner
8. Schedule View / Planning View toggle
9. CycleSnapshotCard + GoalRewritePrompt
10. Monthly Focus Reminder
11. PostingSlotCard, NurtureCheckinCard, QuickLogCard
12. DailyAgendaCard
13. Focus Area Reminder
14. Weekly Priorities Display
15. ArcadeIntroCard, PetGrowthCard
16. **ONE Thing** (existing)
17. **Brain Dump** ← NEW (after ONE Thing)
18. **Top 3 Priorities** (existing)
19. Completed Today
20. Daily Scratch Pad
21. Daily Mindset (thought/feeling)
22. Identity Anchor
23. HabitTrackerCard
24. **End of Day Reflection** (conditional - after 5pm) ← NEW
25. Deep Mode Toggle + Content
26. Save Button
27. Quick Actions Card

---

## Testing Checklist

- [ ] Alignment slider saves correctly (1-10)
- [ ] Alignment slider only shows on Mondays
- [ ] Self-Coach buttons appear when alignment ≤ 6
- [ ] Brain dump saves with character limit (10,000)
- [ ] End of day reflection only shows after 5pm
- [ ] End of day reflection saves with limit (1,000)
- [ ] Auto-save works for all new fields
- [ ] localStorage backup includes new fields
- [ ] Restore from backup includes new fields
- [ ] Mobile responsive layout maintained
- [ ] No console errors
