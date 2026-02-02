

# Launch Planner Enhancement: Adaptive vs. Separate Wizards

## My Recommendation: Hybrid Approach

After analyzing the comprehensive Launch Strategy Encyclopedia and your current codebase, I recommend a **"Smart Adaptive" approach** rather than creating 5-10 separate wizards.

### Why NOT Separate Wizards for Each Launch Style

| Separate Wizards | Problems |
|-----------------|----------|
| Webinar Wizard, Challenge Wizard, Flash Sale Wizard, Beta Launch Wizard, etc. | **Maintenance nightmare** - 8+ wizards to maintain, update, and keep consistent |
| | **User confusion** - "Which wizard do I use?" becomes a barrier |
| | **Code duplication** - 70% of launch logic is shared (pricing, timeline, emails, contingency) |
| | **Diminishing returns** - Most users do 1-2 launch types; separate wizards over-engineer |

### Why an Adaptive Single Wizard Works Better

| Adaptive Wizard | Benefits |
|-----------------|----------|
| One Launch Planner with style-specific branches | **Shared foundation** - Core 8 steps remain consistent |
| | **Style-specific sections** appear only when relevant |
| | **Progressive disclosure** - Complexity reveals only when needed |
| | **Easier onboarding** - Users always start at same place |
| | **Single codebase** - Easier to maintain and improve |

---

## The Proposed Architecture

### Step 1: Add "Launch Style" Selection (Early in Wizard)

Add a new question to **Step 1 (Launch Context)** or create a **new Step 1.5**:

```
What type of launch is this?
├── Standard Launch (Cart open → Cart close)
├── Challenge Launch (5-7 day challenge → Offer)
├── Webinar Launch (Free training → Pitch)
├── Masterclass (Multi-day deep training → Offer)
├── Flash Sale (24-72 hour promotion)
├── Beta Launch (Test product, gather feedback)
├── Evergreen (Always available funnel)
└── Other (I'll configure manually)
```

Based on selection, the wizard **adapts subsequent steps** to show relevant questions.

---

## What Changes Per Launch Style

### Core Steps (Always Present, ~70% Shared)
These steps appear for ALL launch styles with minor adaptations:

| Step | Shared Content | Style Variations |
|------|---------------|------------------|
| 1. Launch Context | Experience, offer type, list status | + Launch style selection |
| 2. Goal & Timeline | Revenue goal, cart dates | Timeline adapts (Flash = 3 days, Challenge = 2-3 weeks) |
| 3. Offer Details | Pricing, bonuses, payment plans | Same for all |
| 4. Pre-Launch Strategy | Email sequences, content, sales page | Style-specific additions (see below) |
| 5. Launch Week | How you'll sell, live events | Adapts heavily by style |
| 6. Post-Launch | Follow-up, debrief | Same for all |
| 7. Contingency | Fears, zero-sales plan | Same for all |
| 8. Review & Complete | Summary, create | Task generation adapts by style |

### Style-Specific Sections (Conditional)

**Challenge Launch** adds to Step 4 & 5:
- Challenge duration (3, 5, 7, 10 days)
- Daily topics (Day 1: X, Day 2: Y...)
- Group strategy (Pop-up group / Existing group / No group)
- Group platform (Facebook, Slack, Discord, Circle)
- Completion incentive (Giveaway, bonus, certificate)
- Homework structure (Type, submission method)
- Daily email strategy

**Webinar Launch** adds to Step 4 & 5:
- Webinar platform (Zoom, StreamYard, etc.)
- Replay availability (24h, 48h, 72h)
- Pitch timing (End, throughout, after Q&A)
- Live-only bonus
- Registration goal
- Show-up strategy

**Flash Sale** adds to Step 2 & 5:
- Sale duration (12h, 24h, 48h, 72h)
- Discount type (% off, $ off, bonus stack)
- Countdown timer strategy
- Email count (typically 3-5 rapid fire)

**Beta Launch** adds to Step 4 & 5:
- Beta pricing (typically 30-50% off)
- Feedback agreement
- Beta size (limit to 20-50)
- Testimonial collection plan

**Masterclass** adds to Step 4 & 5:
- Number of days (2-5)
- Daily themes
- Replay period
- Replay-only offer

---

## Implementation Plan

### Phase 1: Launch Style Foundation
**Files to modify:**

1. **`src/types/launchV2.ts`**
   - Add `LaunchStyle` type and options
   - Add `ChallengeConfig`, `WebinarConfig`, `FlashSaleConfig` interfaces
   - Add default values for each style

2. **`src/components/wizards/launch-v2/steps/StepLaunchContext.tsx`**
   - Add Launch Style selector card grid
   - Style selection sets `launchStyle` in wizard data

### Phase 2: Style-Specific Configuration Components
**New files to create:**

| File | Purpose |
|------|---------|
| `src/components/wizards/launch-v2/styles/ChallengeConfig.tsx` | Challenge-specific questions (group, homework, incentive) |
| `src/components/wizards/launch-v2/styles/WebinarConfig.tsx` | Webinar-specific questions (platform, replay, pitch) |
| `src/components/wizards/launch-v2/styles/FlashSaleConfig.tsx` | Flash sale questions (duration, discount) |
| `src/components/wizards/launch-v2/styles/BetaLaunchConfig.tsx` | Beta questions (pricing, feedback) |
| `src/components/wizards/launch-v2/styles/MasterclassConfig.tsx` | Masterclass questions (days, themes) |
| `src/components/wizards/launch-v2/styles/index.ts` | Export all style configs |

### Phase 3: Integrate Style Configs into Existing Steps
**Files to modify:**

1. **`src/components/wizards/launch-v2/steps/StepGoalTimeline.tsx`**
   - Suggest timeline based on launch style
   - Flash sale shows shorter timeline options

2. **`src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx`**
   - Conditionally render style-specific config component
   - Challenge → show `ChallengeConfig`
   - Webinar → show `WebinarConfig`

3. **`src/components/wizards/launch-v2/steps/StepLaunchWeek.tsx`**
   - Adapt "live component" options based on style
   - Challenge → daily live sessions
   - Webinar → single event focus

4. **`src/components/wizards/launch-v2/timeline/FreeEventConfig.tsx`**
   - Already exists - enhance with style-aware defaults
   - Pre-fill based on launch style selection

### Phase 4: Style-Specific Task Generation
**Files to modify:**

1. **`supabase/functions/create-launch-v2/index.ts`**
   - Add launch style to task generation logic
   - Generate style-specific tasks

**Challenge Launch Tasks:**
```
- Create pop-up group (if selected)
- Write challenge welcome post
- Create Day 1-5 content
- Design daily homework templates
- Set up completion tracking
- Create giveaway/incentive rules
- Write challenge → offer bridge email
```

**Webinar Launch Tasks:**
```
- Create webinar registration page
- Write webinar script/slides
- Set up replay automation
- Create webinar reminder sequence
- Design live-only bonus
- Write post-webinar follow-up sequence
```

**Flash Sale Tasks:**
```
- Set up countdown timer
- Create urgency graphics
- Write 3-5 rapid email sequence
- Schedule social media countdown
- Prepare cart abandon recovery
```

---

## Type Definitions Preview

```typescript
// Add to src/types/launchV2.ts

export type LaunchStyle = 
  | 'standard'
  | 'challenge'
  | 'webinar'
  | 'masterclass'
  | 'flash-sale'
  | 'beta'
  | 'evergreen'
  | 'other';

export const LAUNCH_STYLE_OPTIONS = [
  { 
    value: 'standard', 
    label: 'Standard Launch', 
    description: 'Cart open → Cart close with email sequence',
    icon: '🚀',
    suggestedTimeline: '3-4-weeks',
  },
  { 
    value: 'challenge', 
    label: 'Challenge Launch', 
    description: 'Multi-day challenge leading to your offer',
    icon: '🎯',
    suggestedTimeline: '3-4-weeks',
  },
  { 
    value: 'webinar', 
    label: 'Webinar Launch', 
    description: 'Free training with pitch at the end',
    icon: '🎥',
    suggestedTimeline: '3-4-weeks',
  },
  { 
    value: 'masterclass', 
    label: 'Masterclass', 
    description: 'Multi-day deep training event',
    icon: '🎓',
    suggestedTimeline: '5-6-weeks',
  },
  { 
    value: 'flash-sale', 
    label: 'Flash Sale', 
    description: 'Quick 24-72 hour promotional sale',
    icon: '⚡',
    suggestedTimeline: '2-weeks',
  },
  { 
    value: 'beta', 
    label: 'Beta Launch', 
    description: 'Test product at discount, gather feedback',
    icon: '🧪',
    suggestedTimeline: '3-4-weeks',
  },
  { 
    value: 'evergreen', 
    label: 'Evergreen Funnel', 
    description: 'Always available, automated sequence',
    icon: '🌲',
    suggestedTimeline: 'other',
  },
  { 
    value: 'other', 
    label: 'Other', 
    description: "I'll configure this manually",
    icon: '✨',
    suggestedTimeline: '3-4-weeks',
  },
] as const;

// Challenge-specific config
export interface ChallengeConfig {
  challengeDuration: 3 | 5 | 7 | 10 | number;
  dailyTopics: string[];
  groupStrategy: 'pop-up' | 'existing' | 'none';
  groupPlatform: 'facebook' | 'slack' | 'discord' | 'circle' | 'mighty-networks' | 'other';
  groupPlatformOther: string;
  popUpGroupName: string;
  existingGroupLink: string;
  hasCompletionIncentive: boolean;
  incentiveType: 'giveaway' | 'bonus' | 'certificate' | 'discount' | 'other';
  incentiveDescription: string;
  incentiveQualification: 'complete-all-days' | 'submit-homework' | 'attend-live' | 'other';
  hasHomework: boolean;
  homeworkType: 'worksheet' | 'video-response' | 'group-post' | 'action-item' | 'mixed';
  homeworkSubmissionMethod: 'group' | 'email' | 'form' | 'dm';
}

// Webinar-specific config
export interface WebinarConfig {
  platform: 'zoom' | 'webinarjam' | 'streamyard' | 'crowdcast' | 'other';
  platformOther: string;
  hasReplay: boolean;
  replayDuration: '24-hours' | '48-hours' | '72-hours' | 'until-cart-close';
  pitchTiming: 'at-end' | 'throughout' | 'after-qa';
  hasLiveBonus: boolean;
  liveBonusDescription: string;
  registrationGoal: number | null;
  showUpStrategy: 'email-reminders' | 'sms' | 'both';
}

// Flash sale config
export interface FlashSaleConfig {
  saleDuration: '12-hours' | '24-hours' | '48-hours' | '72-hours';
  discountType: 'percent-off' | 'dollar-off' | 'bonus-stack';
  discountAmount: string;
  hasCountdownTimer: boolean;
  emailCount: number;
  socialPostsPlanned: number;
}
```

---

## User Experience Flow

### User Selects "Challenge Launch"

```
Step 1: Launch Context
├── "Is this your first launch?" → Launched before
├── "What type of offer?" → Course
├── "Email list status?" → Small but engaged
└── "What type of launch is this?" → 🎯 Challenge Launch
    ↓ (wizard now adapts)

Step 2: Goal & Timeline
├── [Pre-filled suggestion: 3-4 weeks for challenge]
├── Cart opens: [date picker]
└── Cart closes: [date picker]

Step 3: Offer Details
└── [Standard pricing, bonuses, payment plans]

Step 4: Pre-Launch Strategy
├── [Standard: reach method, email sequences, sales page]
└── 🎯 CHALLENGE CONFIGURATION
    ├── Challenge Duration: [5 days ▼]
    ├── Daily Topics:
    │   ├── Day 1: [_____________]
    │   ├── Day 2: [_____________]
    │   └── + Add Day
    ├── Community:
    │   ├── ( ) Pop-up group → [Name: ____] [Platform: Facebook ▼]
    │   ├── (●) Use existing group → [Link: ____]
    │   └── ( ) No group
    ├── Completion Incentive:
    │   └── [Toggle] Yes → [Type: Giveaway ▼] [Description: ____]
    └── Daily Homework:
        └── [Toggle] Yes → [Type: Action item ▼] [Submit via: Group ▼]

Step 5-8: [Adapted but similar flow]
```

---

## Why This Approach Handles Your Document

The Encyclopedia covers:

1. **6 Price Point Strategies** → Already captured in offer pricing
2. **3 Audience Temperatures** → Can add as question or infer from list status
3. **10+ Launch Mechanisms** → Captured via Launch Style + Free Event Config
4. **6 Product Types** → Already captured in Offer Type
5. **Timeline Variations** → Already adaptive
6. **Resource Constraints** → Can add "Solo founder vs. team" question

The adaptive wizard can handle ALL of these by:
- Asking the right selector questions upfront
- Showing relevant configuration sections
- Generating appropriate tasks at the end

---

## The Summit Exception

Summits remain separate because they have **fundamentally different core entities**:
- Speaker management (not just tasks)
- Affiliate tracking (commission structures)
- Multi-session scheduling (not just one event)
- All-access pass (separate product)

This is NOT just "different questions" - it's a **different data model**.

---

## Implementation Priority

**Sprint 1: Launch Style Foundation (This PR)**
1. Add `LaunchStyle` type and `LAUNCH_STYLE_OPTIONS`
2. Add Launch Style selector to Step 1
3. Add `ChallengeConfig` interface and defaults
4. Create `ChallengeConfig.tsx` component
5. Integrate into Step 4 (Pre-Launch Strategy)

**Sprint 2: Challenge Deep Dive**
1. Add group strategy section
2. Add completion incentive section
3. Add homework section
4. Update task generation for challenge-specific tasks

**Sprint 3: Other Launch Styles**
1. Add `WebinarConfig` + component
2. Add `FlashSaleConfig` + component
3. Add `BetaLaunchConfig` + component
4. Update task generation for each style

**Sprint 4: Polish**
1. Add smart defaults based on style selection
2. Add style-aware teaching tips
3. Add success metrics based on style

---

## Summary

| Approach | Verdict |
|----------|---------|
| **One adaptive wizard** | ✅ Recommended - clean, maintainable, user-friendly |
| **Separate wizard per style** | ❌ Over-engineering - too much duplication |
| **Exception: Summit Wizard** | ✅ Keep separate - fundamentally different data model |

The Launch Planner V2 becomes a **style-aware adaptive wizard** that asks "What type of launch?" early, then reveals only the relevant configuration sections for that style while keeping the core flow consistent.

