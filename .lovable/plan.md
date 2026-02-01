
# Content Planner System - Comprehensive Implementation Plan

## Executive Summary

This plan introduces a **Content Planner Wizard** that integrates with the existing Launch Planner and 90-Day Cycle. The system provides:

1. **Dual-mode operation**: Regular content planning OR launch-specific content planning
2. **Messaging Framework**: Define core messages, selling points, and angles before creating content
3. **Content Vault Enhancement**: Smart repurposing suggestions from existing content
4. **Content Batching**: Turn 1 core piece into multiple formats
5. **Selling Points Mapping**: Track which messages drive conversions

The wizard follows the established patterns from LaunchWizardV2 and the useWizard hook.

---

## User Journey

### Entry Point 1: Post-Launch Wizard
When user completes Launch Planner:
```text
✅ Launch Created Successfully!

Your launch "Spring Mastermind" is ready with 45 tasks.

Would you like to plan your content now?
[Plan Launch Content] [Skip for Now]
```

### Entry Point 2: Wizard Hub
New card in `/wizards`:
```text
📝 Content Planner
Plan and batch your content with smart repurposing

[Start] [Create Another]
```

### Entry Point 3: Content Vault
From existing ContentVault page:
```text
[+ Create Content] [📋 Plan Content Sprint]
```

---

## Wizard Flow Overview

```text
CONTENT PLANNER WIZARD (7 Steps)

Step 1: Mode Selection
├─ "Regular content" vs "Launch content"
├─ If launch: Select which launch
└─ Time period (this week/month/custom)

Step 2: Messaging Framework
├─ Core problem you solve
├─ Your unique solution
├─ Top 3 selling points
└─ Messaging angles to test

Step 3: Format Selection
├─ Which formats will you create?
├─ Email, social, video, podcast, events, etc.
└─ Recommended based on past performance

Step 4: Content Vault Review
├─ Smart suggestions for repurposing
├─ Performance-ranked recommendations
├─ Time savings estimates
└─ Select what to reuse

Step 5: Content Batching
├─ Pick 1 core piece to batch
├─ Select repurposing formats
├─ Preview generated outlines
└─ Accept or skip batching

Step 6: Calendar & Scheduling
├─ Timeline of creation + publishing
├─ Mapped to launch phases (if applicable)
├─ Drag/drop reordering
└─ Link to task generation

Step 7: Review & Create
├─ Summary of content plan
├─ Selling points coverage check
├─ Task generation estimate
└─ [Create Content Plan]
```

---

## Database Schema Updates

### New Tables

#### 1. messaging_frameworks
Stores user's messaging strategy per launch or cycle.

```sql
CREATE TABLE public.messaging_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Optional associations
  launch_id UUID REFERENCES public.launches(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  
  -- Core messaging
  name TEXT NOT NULL,
  core_problem TEXT,
  unique_solution TEXT,
  target_customer TEXT,
  core_narrative TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messaging_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own frameworks"
ON public.messaging_frameworks FOR ALL
USING (auth.uid() = user_id);
```

#### 2. selling_points
Individual selling points linked to messaging framework.

```sql
CREATE TABLE public.selling_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  framework_id UUID NOT NULL REFERENCES public.messaging_frameworks(id) ON DELETE CASCADE,
  
  label TEXT NOT NULL,
  description TEXT,
  is_core BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Performance tracking
  total_uses INTEGER DEFAULT 0,
  conversion_rate DECIMAL,
  best_format TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.selling_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own selling points"
ON public.selling_points FOR ALL
USING (auth.uid() = user_id);
```

#### 3. content_plans
Main content plan record created by wizard.

```sql
CREATE TABLE public.content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Optional associations
  launch_id UUID REFERENCES public.launches(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  framework_id UUID REFERENCES public.messaging_frameworks(id) ON DELETE SET NULL,
  
  -- Plan details
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('regular', 'launch')),
  start_date DATE,
  end_date DATE,
  
  -- Selected formats
  selected_formats TEXT[] DEFAULT '{}',
  
  -- Batching
  core_content_id UUID REFERENCES public.content_items(id),
  batching_enabled BOOLEAN DEFAULT false,
  
  -- Meta
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own plans"
ON public.content_plans FOR ALL
USING (auth.uid() = user_id);
```

#### 4. content_plan_items
Individual content pieces within a plan.

```sql
CREATE TABLE public.content_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  
  -- Content reference (existing or new)
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  
  -- Plan-specific fields
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  channel TEXT,
  
  -- Scheduling
  planned_date DATE,
  phase TEXT,  -- 'runway', 'pre-launch', 'cart-open', 'post-launch'
  
  -- Messaging
  selling_point_ids UUID[],
  messaging_angle TEXT,
  
  -- Repurposing
  is_repurposed BOOLEAN DEFAULT false,
  repurposed_from_id UUID REFERENCES public.content_items(id),
  
  -- Status
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'created', 'published')),
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.content_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own plan items"
ON public.content_plan_items FOR ALL
USING (auth.uid() = user_id);
```

### content_items Table Updates

Add columns to existing content_items for vault enhancement:

```sql
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS 
  messaging_angle TEXT,
  selling_point_ids UUID[],
  performance_score DECIMAL,
  is_template BOOLEAN DEFAULT false,
  repurposed_from_id UUID REFERENCES public.content_items(id);
```

---

## New Type Definitions

### src/types/contentPlanner.ts

```typescript
// Content Planner Wizard Types

// Step 1: Mode Selection
export type ContentPlanMode = 'regular' | 'launch';
export type PlanningPeriod = 'this-week' | 'next-week' | 'this-month' | 'custom';

// Step 2: Messaging Framework
export type MessagingAngle = 'fear' | 'aspiration' | 'logic' | 'social-proof';

export interface SellingPoint {
  id: string;
  label: string;
  description: string;
  isCore: boolean;
}

// Step 3: Format Selection (comprehensive list)
export type ContentFormat = 
  // Email & Text
  | 'email-sequence' | 'email-single' | 'blog-post' | 'linkedin-post' 
  | 'twitter-thread' | 'newsletter'
  // Video
  | 'youtube-video' | 'youtube-short' | 'instagram-reel' | 'tiktok'
  | 'live-stream' | 'sales-video' | 'testimonial-video' | 'tutorial-video'
  // Audio
  | 'podcast-episode' | 'podcast-guest' | 'audio-course'
  // Events
  | 'webinar' | 'workshop' | 'challenge' | 'masterclass' | 'group-call'
  // Documents
  | 'case-study' | 'pdf-guide' | 'workbook' | 'checklist'
  // Visual
  | 'infographic' | 'carousel' | 'quote-graphic'
  // Social
  | 'instagram-post' | 'facebook-post' | 'community-post';

// Main Wizard Data
export interface ContentPlannerData {
  // Step 1: Mode
  mode: ContentPlanMode | '';
  launchId: string | null;
  planningPeriod: PlanningPeriod | '';
  customStartDate: string;
  customEndDate: string;
  
  // Step 2: Messaging
  coreProblem: string;
  uniqueSolution: string;
  targetCustomer: string;
  sellingPoints: SellingPoint[];
  messagingAngles: MessagingAngle[];
  coreNarrative: string;
  
  // Step 3: Formats
  selectedFormats: ContentFormat[];
  
  // Step 4: Vault
  selectedRepurposeIds: string[];
  repurposeTargetFormats: Record<string, ContentFormat[]>;
  
  // Step 5: Batching
  batchingEnabled: boolean;
  coreContentTitle: string;
  coreContentType: ContentFormat | '';
  batchTargetFormats: ContentFormat[];
  
  // Step 6: Calendar
  plannedItems: PlannedContentItem[];
  
  // Step 7: Review
  generateTasks: boolean;
  
  // Index signature
  [key: string]: unknown;
}

export interface PlannedContentItem {
  id: string;
  title: string;
  type: ContentFormat;
  date: string;
  phase?: string;
  sellingPointIds: string[];
  messagingAngle: MessagingAngle | '';
  isRepurposed: boolean;
  sourceId?: string;
}
```

---

## Component Architecture

### New Directory Structure

```text
src/components/wizards/content-planner/
├── ContentPlannerWizard.tsx       # Main wizard component
├── steps/
│   ├── index.ts
│   ├── StepModeSelection.tsx      # Regular vs Launch mode
│   ├── StepMessagingFramework.tsx # Core messaging
│   ├── StepFormatSelection.tsx    # Which formats
│   ├── StepVaultReview.tsx        # Smart repurposing
│   ├── StepBatching.tsx           # Content batching
│   ├── StepCalendar.tsx           # Scheduling
│   └── StepReviewCreate.tsx       # Summary & create
├── components/
│   ├── FormatCard.tsx             # Selectable format card
│   ├── SellingPointEditor.tsx     # Add/edit selling points
│   ├── RepurposeSuggestion.tsx    # Vault suggestion card
│   ├── BatchingPreview.tsx        # Show batching output
│   ├── ContentCalendar.tsx        # Drag/drop calendar
│   └── SellingPointCoverage.tsx   # Coverage visualization
└── utils/
    ├── formatHelpers.ts           # Format metadata
    └── repurposeEngine.ts         # Smart suggestions
```

### src/hooks/useContentPlanner.ts

New hook for content planning utilities:

```typescript
export function useContentPlanner() {
  // Get smart repurposing suggestions
  const getRepurposeSuggestions = async (
    formats: ContentFormat[],
    launchId?: string
  ): Promise<RepurposeSuggestion[]>;
  
  // Calculate time savings
  const calculateTimeSavings = (
    newCount: number,
    repurposedCount: number
  ): { hours: number; percentSaved: number };
  
  // Get format performance
  const getFormatPerformance = async (): Promise<FormatPerformance[]>;
  
  // Generate batched content outlines
  const generateBatchOutlines = (
    coreTitle: string,
    coreType: ContentFormat,
    targetFormats: ContentFormat[]
  ): BatchedOutline[];
}
```

---

## Step-by-Step Implementation

### Step 1: Mode Selection UI

```text
┌─────────────────────────────────────────────────────────┐
│ WHAT ARE YOU PLANNING?                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────┐ ┌─────────────────────────────┐│
│ │ 📝 REGULAR CONTENT  │ │ 🚀 LAUNCH CONTENT          ││
│ │                     │ │                             ││
│ │ Weekly/monthly      │ │ Content for an upcoming    ││
│ │ content for         │ │ or active launch           ││
│ │ audience nurturing  │ │                             ││
│ │                     │ │ [Select Launch ▾]           ││
│ │ [Selected ✓]        │ │ Spring Mastermind (Active) ││
│ └─────────────────────┘ └─────────────────────────────┘│
│                                                         │
│ TIME PERIOD:                                            │
│ ○ This week  ○ Next week  ○ This month  ○ Custom       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Messaging Framework UI

```text
┌─────────────────────────────────────────────────────────┐
│ YOUR MESSAGING FRAMEWORK                                │
│ Define what you're going to say before creating content │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ CORE PROBLEM YOU SOLVE:                                 │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Entrepreneurs hit THE GAP (week 3-4 belief drop)... ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ YOUR UNIQUE SOLUTION:                                   │
│ ┌─────────────────────────────────────────────────────┐│
│ │ The 90-Day Planner with daily mindset check-ins... ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ TOP 3 SELLING POINTS: (drag to reorder)                │
│ ┌───┐ ┌─────────────────────────────────────────────┐ │
│ │ 1 │ │ Gets you across THE GAP       [Edit] [X]   │ │
│ └───┘ └─────────────────────────────────────────────┘ │
│ ┌───┐ ┌─────────────────────────────────────────────┐ │
│ │ 2 │ │ Proven 90-day methodology     [Edit] [X]   │ │
│ └───┘ └─────────────────────────────────────────────┘ │
│ ┌───┐ ┌─────────────────────────────────────────────┐ │
│ │ 3 │ │ Daily accountability          [Edit] [X]   │ │
│ └───┘ └─────────────────────────────────────────────┘ │
│ [+ Add Selling Point]                                  │
│                                                         │
│ MESSAGING ANGLES TO TEST:                               │
│ ☑ Fear-based (avoid the gap, avoid failure)            │
│ ☐ Aspiration (reach your goal, celebrate)              │
│ ☑ Logic-based (here's how it works)                    │
│ ☑ Social proof (50 entrepreneurs succeeded)            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Format Selection UI

```text
┌─────────────────────────────────────────────────────────┐
│ WHICH CONTENT FORMATS WILL YOU USE?                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📧 EMAIL & TEXT                                         │
│ ☑ Email sequences    ☑ Single sends    ☐ Blog posts    │
│ ☐ LinkedIn posts     ☐ Newsletter                      │
│                                                         │
│ 🎬 VIDEO                                                │
│ ☐ YouTube videos     ☑ YouTube shorts  ☑ Reels/TikTok │
│ ☐ Live stream        ☐ Sales video     ☐ Testimonials  │
│                                                         │
│ 🎙️ AUDIO                                                │
│ ☐ Podcast episodes   ☐ Guest appearances               │
│                                                         │
│ 🎯 EVENTS                                               │
│ ☑ Webinar           ☐ Workshop        ☐ Challenge      │
│                                                         │
│ 📄 DOCUMENTS                                            │
│ ☐ Case studies       ☐ PDF guides     ☐ Checklists    │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 💡 RECOMMENDED FOR YOU:                              ││
│ │ Based on your past launches, these work best:       ││
│ │ • Email sequences (2.3% conversion)                  ││
│ │ • Webinars (18% attendee conversion)                ││
│ │ • LinkedIn posts (0.8% click rate)                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [Use Recommended]                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 4: Vault Review UI

```text
┌─────────────────────────────────────────────────────────┐
│ SMART REPURPOSING SUGGESTIONS                           │
│ We found 12 pieces from your vault to reuse            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ✨ TOP RECOMMENDATIONS                                  │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 📧 "THE GAP Framework Email" (Spring Launch)        ││
│ │ 40% open rate, 2.3% conversion - Your best email   ││
│ │                                                     ││
│ │ Can repurpose as:                                   ││
│ │ ☑ LinkedIn posts (3-post series)                   ││
│ │ ☐ Blog post (expand with examples)                 ││
│ │ ☐ YouTube script                                   ││
│ │                                                     ││
│ │ Time saved: 2 hours                                ││
│ │ [Select] [View Content] [Skip]                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🎥 "Student Success Story" - Testimonial Video      ││
│ │ 12% engagement - Your best video                   ││
│ │                                                     ││
│ │ Can repurpose as:                                   ││
│ │ ☑ Email intro (story email)                        ││
│ │ ☑ Instagram reel                                   ││
│ │ ☐ LinkedIn video post                              ││
│ │                                                     ││
│ │ [Select] [View Content] [Skip]                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ VAULT STATS:                                            │
│ • 47 total items | 12 recommended | 62% time savings   │
│                                                         │
│ [Skip Repurposing] [Browse Full Vault]                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 5: Batching UI

```text
┌─────────────────────────────────────────────────────────┐
│ CONTENT BATCHING                                        │
│ Turn 1 core piece into 10 formats                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Do you want to batch content?                           │
│ ○ Yes - create 1 piece, repurpose into many            │
│ ● No - I'll create each piece separately               │
│                                                         │
│ ─────────────────────────────────────────────────────   │
│ (When "Yes" is selected):                               │
│                                                         │
│ CORE CONTENT:                                           │
│ Title: [How to Survive THE GAP____________]            │
│ Type:  [Blog Post ▾]                                   │
│                                                         │
│ BATCH INTO THESE FORMATS:                               │
│ ☑ Email sequence (5 emails from sections)              │
│ ☑ LinkedIn posts (10 key points, 1 each)               │
│ ☐ YouTube script                                        │
│ ☐ Podcast episode                                       │
│ ☑ Infographic (5 key points)                           │
│                                                         │
│ PREVIEW:                                                │
│ ┌─────────────────────────────────────────────────────┐│
│ │ From "How to Survive THE GAP" you'll get:           ││
│ │ • 5 emails (est. 15 min each to edit)               ││
│ │ • 10 LinkedIn posts (est. 5 min each)               ││
│ │ • 1 infographic (est. 30 min to design)             ││
│ │                                                     ││
│ │ Total: 16 pieces | ~4 hours vs 20+ hours            ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 6: Calendar UI

```text
┌─────────────────────────────────────────────────────────┐
│ CONTENT CALENDAR                                        │
│ Schedule your content by phase                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ RUNWAY (Feb 15-23)          9 days | LOW intensity     │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Feb 15: LinkedIn post - "Week 3 belief drop..."     ││
│ │ Feb 17: Email #1 - "Are you ready for this?"        ││
│ │ Feb 20: LinkedIn post - "1,000 entrepreneurs..."    ││
│ │ [+ Add Content]                                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ PRE-LAUNCH (Feb 24 - Mar 1)  6 days | MEDIUM intensity │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Feb 24: Email #2 - "Here's what's coming..."        ││
│ │ Feb 26: Webinar - "The Gap Framework"               ││
│ │ Feb 28: Email #3 - "Last chance to join webinar"    ││
│ │ Mar 1:  Email #4 - "Cart opens tomorrow..."         ││
│ │ [+ Add Content]                                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ CART OPEN (Mar 2-8)          7 days | HIGH intensity   │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Mar 2: Email #5 - "Cart is OPEN"                    ││
│ │ Mar 3: Instagram reel - Testimonial video           ││
│ │ Mar 5: Email #6 - "48 hours left..."                ││
│ │ Mar 8: Email #7 - "Final hours" + closing           ││
│ │ [+ Add Content]                                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ SELLING POINTS COVERAGE:                                │
│ ████████████ SP #1: 8 pieces (covered)                 │
│ ██████░░░░░░ SP #2: 4 pieces (needs more)              │
│ ████████████ SP #3: 7 pieces (covered)                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 7: Review UI

```text
┌─────────────────────────────────────────────────────────┐
│ CONTENT PLAN SUMMARY                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📋 PLAN: Spring Mastermind Launch Content               │
│ 📅 Period: Feb 15 - Mar 8 (22 days)                    │
│                                                         │
│ CONTENT BREAKDOWN:                                      │
│ • 7 emails (sequence)                                   │
│ • 10 LinkedIn posts                                     │
│ • 1 webinar                                             │
│ • 2 Instagram reels                                     │
│ • 1 infographic                                         │
│ Total: 21 pieces                                        │
│                                                         │
│ REPURPOSING:                                            │
│ • 5 pieces from vault (24%)                            │
│ • Time saved: ~6 hours                                 │
│                                                         │
│ MESSAGING COVERAGE:                                     │
│ ✓ All 3 selling points covered                         │
│ ✓ Fear + Logic + Social proof angles used              │
│                                                         │
│ TASK GENERATION:                                        │
│ ☑ Generate tasks for each content piece                │
│ • Est. 21 creation tasks                               │
│ • Est. 21 publish tasks                                │
│                                                         │
│ [Create Content Plan]                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Post-Launch Wizard Integration

### Modify LaunchWizardV2.tsx

After successful launch creation, show content planning prompt:

```typescript
// In handleCreateLaunch success handler:
if (result?.success) {
  await clearDraft();
  toast.success(result.message);
  
  // Show content planning prompt
  setShowContentPlanPrompt(true);
  setCreatedLaunchId(result.launch_id);
}

// New dialog component:
<ContentPlanPromptDialog
  isOpen={showContentPlanPrompt}
  launchId={createdLaunchId}
  launchName={data.name}
  onPlanContent={() => navigate(`/wizards/content?launchId=${createdLaunchId}`)}
  onSkip={() => navigate(`/projects/${result.project_id}`)}
/>
```

---

## Files to Create/Modify

### New Files (21)

**Types:**
- `src/types/contentPlanner.ts` - Type definitions

**Wizard Components:**
- `src/components/wizards/content-planner/ContentPlannerWizard.tsx`
- `src/components/wizards/content-planner/steps/index.ts`
- `src/components/wizards/content-planner/steps/StepModeSelection.tsx`
- `src/components/wizards/content-planner/steps/StepMessagingFramework.tsx`
- `src/components/wizards/content-planner/steps/StepFormatSelection.tsx`
- `src/components/wizards/content-planner/steps/StepVaultReview.tsx`
- `src/components/wizards/content-planner/steps/StepBatching.tsx`
- `src/components/wizards/content-planner/steps/StepCalendar.tsx`
- `src/components/wizards/content-planner/steps/StepReviewCreate.tsx`

**Supporting Components:**
- `src/components/wizards/content-planner/components/FormatCard.tsx`
- `src/components/wizards/content-planner/components/SellingPointEditor.tsx`
- `src/components/wizards/content-planner/components/RepurposeSuggestion.tsx`
- `src/components/wizards/content-planner/components/BatchingPreview.tsx`
- `src/components/wizards/content-planner/components/ContentCalendar.tsx`
- `src/components/wizards/content-planner/components/SellingPointCoverage.tsx`
- `src/components/wizards/content-planner/components/ContentPlanPromptDialog.tsx`

**Utilities:**
- `src/components/wizards/content-planner/utils/formatHelpers.ts`
- `src/components/wizards/content-planner/utils/repurposeEngine.ts`

**Hooks:**
- `src/hooks/useContentPlanner.ts`

**Page:**
- `src/pages/ContentPlannerPage.tsx`

### Modified Files (5)

- `src/components/wizards/launch-v2/LaunchWizardV2.tsx` - Add content plan prompt
- `src/components/wizards/WizardHub.tsx` - Add content planner card
- `src/App.tsx` - Add route
- `src/lib/contentService.ts` - Add performance scoring
- Database migration for new tables

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. Database migration - Create new tables
2. Type definitions - `contentPlanner.ts`
3. Basic wizard structure - `ContentPlannerWizard.tsx`
4. Mode selection step - `StepModeSelection.tsx`
5. Route and page setup

### Phase 2: Messaging Framework (Week 1-2)
6. Selling point editor component
7. Messaging framework step
8. Persist to `messaging_frameworks` table
9. Link to launch/cycle

### Phase 3: Format Selection & Vault (Week 2)
10. Format card component
11. Format selection step
12. Repurpose suggestion component
13. Vault review step with smart suggestions
14. `repurposeEngine.ts` utility

### Phase 4: Batching & Calendar (Week 2-3)
15. Batching preview component
16. Batching step
17. Content calendar component (drag/drop)
18. Calendar step
19. Selling point coverage visualization

### Phase 5: Review & Integration (Week 3)
20. Review step with summary
21. Edge function for plan creation
22. Task generation integration
23. Launch wizard integration (prompt)
24. Wizard Hub card

### Phase 6: Analytics (Week 3-4)
25. Add `useContentPlanner` hook
26. Performance scoring in content service
27. Format performance recommendations
28. Selling point conversion tracking

---

## Technical Considerations

### Existing Patterns to Follow

1. **Wizard Hook**: Use existing `useWizard<T>` hook pattern
2. **Draft Persistence**: 3-second debounced server sync + localStorage
3. **Validation**: Step-by-step validation like `launchV2Validation.ts`
4. **Mobile UX**: Vaul drawers for complex editing, 44px touch targets
5. **Component Structure**: Match LaunchWizardV2 directory structure

### Performance Optimizations

1. **Vault Suggestions**: Lazy load, limit to 20 suggestions
2. **Calendar Rendering**: Use `@tanstack/react-virtual` for long lists
3. **Batching Preview**: Generate outlines client-side, not AI
4. **Format Icons**: Lazy load Lucide icons

### Mobile Considerations

1. Format selection: 2-column grid on mobile
2. Calendar: Vertical list view on mobile
3. Selling point editor: Bottom drawer on mobile
4. Vault review: Swipeable cards on mobile

---

## Verification Checklist

### Phase 1
- [ ] Database tables created with RLS
- [ ] Types compile without errors
- [ ] Wizard navigates between steps
- [ ] Mode selection saves correctly

### Phase 2
- [ ] Selling points can be added/edited/deleted
- [ ] Messaging framework persists to database
- [ ] Framework links to launch correctly

### Phase 3
- [ ] Format cards display all 25+ formats
- [ ] Vault suggestions rank by performance
- [ ] Repurposing selections save correctly

### Phase 4
- [ ] Batching generates preview correctly
- [ ] Calendar displays by phase (launch mode)
- [ ] Selling point coverage calculates correctly

### Phase 5
- [ ] Plan creates successfully
- [ ] Tasks generate if enabled
- [ ] Launch wizard shows prompt after creation

### Phase 6
- [ ] Format recommendations appear
- [ ] Performance scoring updates
- [ ] Analytics display correctly
