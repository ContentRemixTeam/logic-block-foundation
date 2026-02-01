
# Phase 3: Dashboard Integration

## Overview

This phase adds launch visibility to the Dashboard with a new **LaunchZone** container that groups three widgets:
1. **LaunchCountdownWidget** - Days/hours until cart opens or closes
2. **LaunchPhaseReminderWidget** - Phase-specific tips and daily actions
3. **Enhanced ActiveLaunchWidget** - Already exists, needs phase integration

## Current State Analysis

### What Already Exists
- `useActiveLaunches()` hook fetches launches with computed fields (daysUntilOpen, daysUntilClose, phase)
- `ActiveLaunchWidget` component handles task progress, revenue tracking, offer logging
- Dashboard already imports `useActiveLaunches` and has a "Launch Countdown" WidgetCard (lines 690-875)
- `launchHelpers.ts` provides `getCurrentLaunchPhase()`, `getDailyOfferGoal()`, and related utilities

### What's Missing
- No phase-aware display using the new 4-phase system (runway, pre-launch, cart-open, post-launch)
- No grouped "Launch Zone" container
- No phase-specific reminder widget
- Current dashboard widget doesn't use `getCurrentLaunchPhase()` from launchHelpers

---

## Implementation Plan

### 1. Create LaunchZone.tsx Container

**Purpose**: Groups all launch widgets into a cohesive section that appears/disappears based on active launch status.

**File**: `src/components/dashboard/LaunchZone.tsx`

```text
Props:
- children: React.ReactNode
- launch: ActiveLaunch (from useActiveLaunches)

Layout:
┌─────────────────────────────────────────────────────────────┐
│ 🚀 ACTIVE LAUNCH ZONE                                       │
│                                                              │
│ ┌─────────────────────┐ ┌─────────────────────────────────┐ │
│ │ LaunchCountdownWidget│ │ LaunchPhaseReminderWidget       │ │
│ └─────────────────────┘ └─────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ActiveLaunchWidget (enhanced)                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Mobile: Stacks vertically with full-width cards
```

---

### 2. Create LaunchCountdownWidget.tsx

**Purpose**: Shows countdown to key launch milestones with urgency indicators.

**File**: `src/components/dashboard/LaunchCountdownWidget.tsx`

```typescript
interface LaunchCountdownWidgetProps {
  launch: ActiveLaunch;  // From useActiveLaunches hook
}
```

**Display States**:

| State | Condition | Display |
|-------|-----------|---------|
| Pre-Runway | `runwayStart > today` | "Runway starts in X days" |
| Runway | Phase = 'runway' | "X days until pre-launch" |
| Pre-Launch | Phase = 'pre-launch' | "X days until CART OPENS" |
| Cart Open | Phase = 'cart-open' | "X days/hours until CART CLOSES" |
| Last 48h | `hoursUntilClose <= 48` | Urgent pulsing "CART CLOSES IN X HOURS" |
| Post-Launch | Phase = 'post-launch' | "Post-launch: X days remaining" |

**Visual Design**:
```text
┌─────────────────────────────────┐
│ 🚀 LAUNCH COUNTDOWN             │
│ Spring Mastermind               │
│                                 │
│ ┌─────────────────────────────┐ │
│ │         4 DAYS              │ │
│ │   until cart closes         │ │
│ │   📅 Mar 8, 2025            │ │
│ └─────────────────────────────┘ │
│                                 │
│ [View Launch Dashboard]         │
└─────────────────────────────────┘
```

**Last 48h Urgency Mode**:
- Pulsing red border
- Large hour countdown
- Animated flame icon
- Urgent messaging

---

### 3. Create LaunchPhaseReminderWidget.tsx

**Purpose**: Phase-specific coaching and daily action prompts.

**File**: `src/components/dashboard/LaunchPhaseReminderWidget.tsx`

```typescript
interface LaunchPhaseReminderWidgetProps {
  launch: ActiveLaunch;
  phaseInfo: PhaseInfo | null;  // From getCurrentLaunchPhase()
}
```

**Phase Content**:

| Phase | Icon | Title | Focus | Actions |
|-------|------|-------|-------|---------|
| Runway | 🎯 | BUILD BUZZ QUIETLY | Segment list, prep content | "View Tasks" |
| Pre-Launch | 📣 | ANNOUNCE & PROMOTE | Heavy promo, free event | "View Tasks" |
| Cart-Open | 💰 | YOU'RE LIVE - MAKE OFFERS | Daily offers, personal outreach | "Log Offer", "Go to Daily Plan" |
| Post-Launch | 📩 | FOLLOW UP & DEBRIEF | Final emails, nurture, debrief | "Complete Debrief" |

**Layout**:
```text
┌─────────────────────────────────┐
│ 💰 YOU'RE LIVE - MAKE OFFERS   │
│ Cart Open Phase (Day 3 of 7)    │
├─────────────────────────────────┤
│                                 │
│ Focus: Daily offers, handle     │
│ objections, personal outreach   │
│                                 │
│ Time commitment: ~2 hrs/day     │
│                                 │
│ Today's offers: ○○○ (0 of 3)   │
│                                 │
│ [Log Offer] [Go to Daily Plan] │
└─────────────────────────────────┘
```

**Cart-Open Special Features**:
- Shows daily offer goal from `getDailyOfferGoal()`
- Visual progress dots for offers
- Quick "Log Offer" action button

---

### 4. Enhance ActiveLaunchWidget.tsx

**File**: `src/components/dashboard/ActiveLaunchWidget.tsx`

**Current Features** (keep):
- Task progress bar
- Revenue progress (when live)
- "Made offer today?" checkbox
- Log Sale button

**New Enhancements**:
1. Add phase name badge: "RUNWAY (Day 3 of 9)"
2. Use `getCurrentLaunchPhase()` for accurate phase detection
3. Phase-specific color theming
4. Show offers progress bar (not just revenue)

**Updated Header**:
```text
Before:
│ Spring Mastermind                               [LIVE NOW]│

After:
│ Spring Mastermind                 [CART OPEN - Day 3 of 7]│
│ Phase intensity: HIGH                                     │
```

**New Offers Section**:
```text
│ Offers: 23 / 35 (66%)                                    │
│ ████████████████░░░░░░░░                                 │
```

---

### 5. Update Dashboard.tsx Integration

**File**: `src/pages/Dashboard.tsx`

**Changes**:
1. Import new components: `LaunchZone`, `LaunchCountdownWidget`, `LaunchPhaseReminderWidget`
2. Import `getCurrentLaunchPhase` from launchHelpers
3. Add LaunchZone between "Planning Next Steps" and "90-Day Goal" widgets
4. Remove existing "Launch Countdown" WidgetCard (lines 690-875) - replaced by LaunchZone

**New Code Block** (after Planning Next Steps):
```tsx
{/* Active Launch Zone - shows when user has active launch */}
{nextLaunch && (
  <LaunchZone launch={nextLaunch}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LaunchCountdownWidget launch={nextLaunch} />
      <LaunchPhaseReminderWidget 
        launch={nextLaunch} 
        phaseInfo={getCurrentLaunchPhase(nextLaunch)}
      />
    </div>
    <ActiveLaunchWidget 
      launch={launchDisplay!}
      gradientClass="from-orange-500/5"
    />
  </LaunchZone>
)}
```

---

### 6. Update useActiveLaunches Hook

**File**: `src/hooks/useActiveLaunches.ts`

**Current**: Returns launches with basic computed fields (daysUntilOpen, daysUntilClose, phase)

**Enhancement**: Add phase-related fields from database:
```typescript
interface ActiveLaunch {
  // Existing fields...
  
  // NEW: Phase dates from database
  runway_start_date?: string | null;
  runway_end_date?: string | null;
  pre_launch_start_date?: string | null;
  pre_launch_end_date?: string | null;
  post_launch_end_date?: string | null;
  offer_goal?: number | null;
  
  // NEW: Computed phase info
  phaseInfo?: PhaseInfo | null;
  hoursUntilClose: number;
}
```

**Updated Query**:
```typescript
const { data: launches, error } = await supabase
  .from('launches')
  .select(`
    *,
    runway_start_date,
    runway_end_date,
    pre_launch_start_date,
    pre_launch_end_date,
    post_launch_end_date,
    offer_goal
  `)
  .eq('user_id', user.id)
  .gte('cart_closes', today)
  .order('cart_opens');
```

---

## File Changes Summary

### New Files (3)
| File | Description |
|------|-------------|
| `src/components/dashboard/LaunchZone.tsx` | Container grouping launch widgets |
| `src/components/dashboard/LaunchCountdownWidget.tsx` | Countdown timer with urgency |
| `src/components/dashboard/LaunchPhaseReminderWidget.tsx` | Phase-specific reminders |

### Modified Files (3)
| File | Changes |
|------|---------|
| `src/components/dashboard/ActiveLaunchWidget.tsx` | Add phase badge, offers progress, use launchHelpers |
| `src/hooks/useActiveLaunches.ts` | Add phase date fields, hoursUntilClose, compute phaseInfo |
| `src/pages/Dashboard.tsx` | Replace Launch Countdown widget with LaunchZone |

### Exports Update (1)
| File | Changes |
|------|---------|
| `src/components/dashboard/index.ts` | Export new LaunchZone, LaunchCountdownWidget, LaunchPhaseReminderWidget |

---

## Implementation Order

### Day 1: Core Widgets
1. Create `LaunchCountdownWidget.tsx` with all display states
2. Create `LaunchPhaseReminderWidget.tsx` with phase content
3. Test both widgets in isolation

### Day 2: Container & Integration
4. Create `LaunchZone.tsx` container
5. Update `useActiveLaunches.ts` to include phase fields
6. Enhance `ActiveLaunchWidget.tsx` with phase badge

### Day 3: Dashboard Integration & Polish
7. Update `Dashboard.tsx` to use new components
8. Remove old Launch Countdown code (lines 690-875)
9. Update `dashboard/index.ts` exports
10. Mobile testing and responsive adjustments

---

## Mobile Responsiveness

**LaunchZone**:
- Full width on mobile
- Countdown and Reminder stack vertically (grid-cols-1)
- Desktop: side-by-side (grid-cols-2)

**LaunchCountdownWidget**:
- Centered countdown number
- Compact date display
- Full-width button

**LaunchPhaseReminderWidget**:
- Phase title on single line
- Collapsible focus description
- Offer dots wrap if needed
- Buttons stack on small screens

**Touch Targets**:
- All buttons 44px minimum height
- Adequate spacing between interactive elements

---

## Verification Checklist

- [ ] LaunchZone appears when user has active launch
- [ ] LaunchZone hidden when no active launches
- [ ] LaunchCountdownWidget shows correct countdown for each phase
- [ ] Last 48 hours shows urgency animation
- [ ] LaunchPhaseReminderWidget shows phase-specific content
- [ ] Cart-open phase shows daily offer goal
- [ ] ActiveLaunchWidget shows phase badge (e.g., "CART OPEN - Day 3 of 7")
- [ ] Offers progress bar displays correctly
- [ ] Mobile layout stacks properly
- [ ] All buttons have 44px touch targets
- [ ] "View Launch Dashboard" navigates to `/projects/:id`
- [ ] "Log Offer" functionality works

---

## Technical Dependencies

All dependencies already installed:
- `date-fns` - Date calculations
- `lucide-react` - Icons
- Existing UI components (Card, Badge, Progress, Button)
- `launchHelpers.ts` utilities already in place

No database migrations needed - Phase 1 already added required columns.
