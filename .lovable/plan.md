
# Week 2: Timeline Customization UI

## Overview

This week we build the multi-level timeline customization system for the Launch Planner V2. The system transforms **Step 2 (Goal & Timeline)** from a simple date picker into an intelligent, adaptive interface with:

- **Level 1 (Quick Setup)**: Suggested timeline with one-click acceptance
- **Level 2 (Detailed Customization)**: Full 4-phase editing with real-time feedback

## What Users Will Experience

### Quick Setup Flow (Default)
1. User selects cart opens date
2. User picks timeline duration (2wk / 3-4wk / 5-6wk)
3. User answers "Free event?" question
4. System shows **Suggested Timeline card** with all 4 phases calculated
5. User clicks **"Use These Dates"** → Done, moves to next question
6. Or clicks **"Customize Instead"** → Expands to Level 2

### Detailed Customization Flow
When "Customize Instead" is clicked:
- 4 phase cards appear (Runway, Pre-Launch, Cart Open, Post-Launch)
- Each card shows dates, duration, intensity, and what happens
- Real-time warnings for risky changes
- Visual timeline bar showing all phases
- Quick adjust buttons ("Add 1 week runway", etc.)
- GAP blocking prompt when overlap detected

---

## New Components to Create

### 1. Timeline Directory Structure
```text
src/components/wizards/launch-v2/timeline/
├── index.ts                    # Exports
├── TimelineQuickSetup.tsx      # Level 1 - suggested dates
├── TimelinePhaseCard.tsx       # Reusable phase editor card
├── TimelineCustomizer.tsx      # Level 2 - full editing
├── TimelineVisualBar.tsx       # Horizontal phase visualization
├── TimelineSummary.tsx         # Capacity & duration summary
├── TimelineQuickAdjust.tsx     # Quick adjustment buttons
├── FreeEventConfig.tsx         # Free event settings
└── GapAcknowledgmentPrompt.tsx # Blocking GAP acknowledgment
```

---

## Component Specifications

### TimelineQuickSetup.tsx
**Purpose**: Level 1 interface showing suggested timeline

**Layout**:
```text
┌─────────────────────────────────────────────────────────┐
│ SUGGESTED TIMELINE                                       │
│                                                          │
│ Based on your choices, here's what we suggest:           │
│                                                          │
│ ├─ Runway starts:    Feb 15                             │
│ ├─ Pre-launch:       Feb 24                             │
│ ├─ Cart opens:       Mar 1                              │
│ └─ Cart closes:      Mar 8                              │
│                                                          │
│ [TimelineVisualBar - color-coded phases]                │
│                                                          │
│ Total promotion time: 22 days                           │
│                                                          │
│ [Use These Dates]  [Customize Instead]                  │
└─────────────────────────────────────────────────────────┘
```

**Behavior**:
- Calls `calculateSuggestedTimeline()` from launchHelpers.ts
- "Use These Dates" populates all phase fields and marks `useCustomTimeline: false`
- "Customize Instead" sets `useCustomTimeline: true` and expands Level 2

---

### TimelinePhaseCard.tsx
**Purpose**: Reusable card for editing a single phase

**Props**:
```typescript
interface TimelinePhaseCardProps {
  phase: 'runway' | 'pre-launch' | 'cart-open' | 'post-launch';
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  minStartDate?: string;  // Constraint from previous phase
  maxEndDate?: string;    // Constraint from next phase
  isGapAffected?: boolean;
  warnings?: string[];
}
```

**Layout**:
```text
┌─────────────────────────────────────────────────────────┐
│ 🚀 RUNWAY                                     LOW       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Start: [Feb 15 ▾]    End: [Feb 23 ▾]                    │
│                                                          │
│ Duration: 9 days · ~30 min/day                          │
│                                                          │
│ What happens:                                            │
│ • Build buzz quietly                                    │
│ • Segment your list                                     │
│ • Prep your free event (if doing one)                   │
│                                                          │
│ ⚠️ Warning (if any)                                     │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Native HTML5 date pickers
- Auto-calculates duration
- Shows intensity badge (LOW/MEDIUM/HIGH)
- Highlights if GAP-affected (amber border)
- Shows phase-specific "what happens" bullets

---

### TimelineCustomizer.tsx
**Purpose**: Level 2 container orchestrating all phase cards

**Props**:
```typescript
interface TimelineCustomizerProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
  onCollapse: () => void;  // Return to Level 1
  gapResult: GapOverlapResult | null;
}
```

**Layout (Desktop)**:
- 4 TimelinePhaseCards stacked vertically
- TimelineVisualBar at top
- TimelineSummary at bottom
- TimelineQuickAdjust buttons between cards

**Layout (Mobile)**:
- Opens in Vaul Drawer
- Single scrollable column
- Fixed footer with [Cancel] [Apply Changes]
- 44px touch targets

---

### TimelineVisualBar.tsx
**Purpose**: Horizontal visual representation of all phases

**Layout**:
```text
FEB 15 ────────────────────────────────── MAR 15
 ╔═══════╗╔════════════╗╔═════════╗╔════════╗
 ║RUNWAY ║║ PRE-LAUNCH ║║CART OPEN║║ POST   ║
 ╚═══════╝╚════════════╝╚═════════╝╚════════╝
   9 days     6 days       7 days    7 days
```

**Features**:
- Color-coded: Runway (blue), Pre-Launch (purple), Cart (green), Post (gray)
- Shows GAP period in amber if overlapping
- Hover/tap shows exact dates
- Mobile: Collapses to vertical list

---

### TimelineSummary.tsx
**Purpose**: Capacity check and time commitment summary

**Layout**:
```text
┌─────────────────────────────────────────────────────────┐
│ 📊 LAUNCH CAPACITY SUMMARY                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ TOTAL: 22 days · ~45 hours                              │
│                                                          │
│ Phase breakdown:                                         │
│ Runway ······· 9 days ········ 30 min/day ···· LOW      │
│ Pre-Launch ··· 6 days ······ 1.5 hrs/day ··· MEDIUM     │
│ Cart Open ···· 7 days ········ 2 hrs/day ···· HIGH      │
│ Post-Launch ·· 7 days ········ 1 hr/day ···· MEDIUM     │
│                                                          │
│ INTENSITY:                                               │
│ ▁▂▂▃▅▆▇▇▇▅▃▂▁                                           │
│ LOW → HIGH → MEDIUM                                      │
│                                                          │
│ ✅ This timeline looks manageable                        │
└─────────────────────────────────────────────────────────┘
```

**Data Source**: Uses `calculateTotalLaunchTime()` from launchHelpers.ts

---

### TimelineQuickAdjust.tsx
**Purpose**: Quick adjustment buttons for common changes

**Buttons**:
- "Add 1 week runway" - Extends runway start by 7 days
- "Extend pre-launch by 3 days" - Gives more promotion time
- "Shorten cart to 5 days" - Creates urgency

**Behavior**: Each button recalculates and shows preview before applying

---

### FreeEventConfig.tsx
**Purpose**: Configure optional free event (webinar, workshop, etc.)

**Layout**:
```text
┌─────────────────────────────────────────────────────────┐
│ 🎯 FREE EVENT (Optional)                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Are you doing a free event?  ○ No  ● Yes                │
│                                                          │
│ If yes:                                                  │
│ Event type: [Webinar ▾]                                 │
│ Date: [Mar 1 ▾]                                         │
│ Time: [2:00 PM ▾]                                       │
│                                                          │
│ Which phase?                                             │
│ ○ During Runway                                          │
│ ● During Pre-Launch (recommended)                        │
│ ○ During Cart Open                                       │
│                                                          │
│ 💡 Pre-launch is best. You've built buzz and now        │
│    they attend the free event right before cart opens.  │
└─────────────────────────────────────────────────────────┘
```

---

### GapAcknowledgmentPrompt.tsx
**Purpose**: Blocking prompt when GAP overlap is detected

**Layout**:
```text
┌─────────────────────────────────────────────────────────┐
│ ⚠️ YOUR LAUNCH OVERLAPS WITH THE GAP                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Your launch dates fall during weeks 3-4 of your 90-day  │
│ cycle. This is when motivation typically dips.           │
│                                                          │
│ What would you like to do?                               │
│                                                          │
│ ○ I understand the risk - continue with these dates     │
│ ○ Adjust my timeline to avoid THE GAP                   │
│   → Suggested: Move cart open to [Mar 15] (7 days later)│
│ ○ Add extra support tasks (daily mindset check-ins)     │
│                                                          │
│ [x] I acknowledge this may require extra effort          │
│                                                          │
│ [Continue]                                               │
└─────────────────────────────────────────────────────────┘
```

**Behavior**:
- Blocks "Next" until user selects option + checks acknowledgment
- "Adjust timeline" auto-calculates safe dates using `calculateGapAdjustment()`
- "Add support" sets `gapSupportType` for task generation

---

## Modified Files

### StepGoalTimeline.tsx (Major Refactor)

**Current State**: Simple date pickers + revenue goal

**New Structure**:
1. 90-Day Cycle Context card (existing)
2. Timeline duration question (existing)
3. Cart opens date picker (existing)
4. **NEW**: Free event toggle + config
5. **NEW**: TimelineQuickSetup (Level 1)
6. **NEW**: TimelineCustomizer (Level 2, conditional)
7. **NEW**: GapAcknowledgmentPrompt (conditional)
8. Revenue goal tier (existing)

**Validation Update**: Step 2 validation must check phase dates are set

---

### launchV2Validation.ts (Update)

Add validation for new phase fields:
- If `useCustomTimeline: true`, require all 4 phase dates
- Validate phase sequence using `validatePhaseSequence()`
- Check free event date is within selected phase

---

## Mobile Experience

### Detection
Uses existing `useIsMobile()` hook (768px breakpoint)

### Mobile-Specific Behavior

**TimelineCustomizer on Mobile**:
```typescript
// Opens in Drawer instead of inline
if (isMobile) {
  return (
    <Drawer open={isCustomizing} onOpenChange={onToggle}>
      <DrawerContent className="max-h-[85vh] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Customize Timeline</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          {/* Phase cards stack vertically */}
          {/* Fixed footer with buttons */}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

**Date Pickers**:
- Use native `<input type="date">` (already in codebase)
- Mobile OS provides native date picker UI

**Touch Targets**:
- All buttons minimum 44px height
- Phase cards have adequate spacing
- Footer buttons are full-width

---

## Implementation Order

### Day 1: Core Components
1. Create `timeline/index.ts` with exports
2. Create `TimelinePhaseCard.tsx` - reusable phase editor
3. Create `TimelineVisualBar.tsx` - horizontal visualization

### Day 2: Level 1 & Level 2 Containers
4. Create `TimelineQuickSetup.tsx` - suggested timeline UI
5. Create `TimelineCustomizer.tsx` - full editing container
6. Create `TimelineSummary.tsx` - capacity display

### Day 3: Supporting Components
7. Create `TimelineQuickAdjust.tsx` - quick adjustment buttons
8. Create `FreeEventConfig.tsx` - free event settings
9. Create `GapAcknowledgmentPrompt.tsx` - blocking GAP UI

### Day 4: Integration & Polish
10. Refactor `StepGoalTimeline.tsx` to integrate new components
11. Update `launchV2Validation.ts` with phase validation
12. Mobile testing and responsive adjustments

---

## Files Summary

### New Files (9)
```text
src/components/wizards/launch-v2/timeline/index.ts
src/components/wizards/launch-v2/timeline/TimelineQuickSetup.tsx
src/components/wizards/launch-v2/timeline/TimelinePhaseCard.tsx
src/components/wizards/launch-v2/timeline/TimelineCustomizer.tsx
src/components/wizards/launch-v2/timeline/TimelineVisualBar.tsx
src/components/wizards/launch-v2/timeline/TimelineSummary.tsx
src/components/wizards/launch-v2/timeline/TimelineQuickAdjust.tsx
src/components/wizards/launch-v2/timeline/FreeEventConfig.tsx
src/components/wizards/launch-v2/timeline/GapAcknowledgmentPrompt.tsx
```

### Modified Files (2)
```text
src/components/wizards/launch-v2/steps/StepGoalTimeline.tsx
src/lib/launchV2Validation.ts
```

---

## Dependencies

All dependencies are already installed:
- `date-fns` - Date calculations
- `vaul` - Mobile drawer
- `@radix-ui/react-radio-group` - Option selection
- Existing UI components (Card, Badge, Input, etc.)

---

## Verification Checklist

- [ ] Level 1 shows suggested dates based on timeline selection
- [ ] "Use These Dates" populates all phase fields correctly
- [ ] "Customize Instead" expands to Level 2
- [ ] Phase cards show correct intensity and duration
- [ ] Date constraints prevent invalid sequences
- [ ] GAP overlap triggers blocking acknowledgment prompt
- [ ] Free event can be configured and placed in correct phase
- [ ] TimelineVisualBar shows all phases at glance
- [ ] Mobile opens in Drawer with proper touch targets
- [ ] Validation prevents proceeding without required dates
