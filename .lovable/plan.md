
# Lead Magnet Creator Wizard with AI Brainstorm Assistant

## Overview

Build a comprehensive 8-step Lead Magnet Creator wizard that guides users from initial idea through to a fully-planned freebie with landing page copy, email sequences, and promotional tasks. The wizard includes an AI-powered "Brainstorm Bot" to help users generate freebie ideas when they're stuck.

---

## Why This Wizard is High Value

- **Foundational for list building**: Every online business needs a lead magnet
- **Reduces overwhelm**: Breaking the process into guided steps prevents paralysis
- **AI-assisted ideation**: The Brainstorm Bot removes the "blank page" problem
- **End-to-end automation**: Creates project, tasks, and content items automatically
- **Integrates with 90-day plan**: Tasks surface in weekly/daily planning views
- **AI copywriting ready**: All copy needs are identified for batch generation

---

## Step-by-Step Wizard Flow

### Step 1: Brainstorm & Select Your Freebie Idea
**Purpose**: Help users identify or validate their lead magnet concept

**Fields**:
- "Do you have an idea already?" (Yes/No toggle)
- If Yes: Freebie name + description
- If No: Opens **Brainstorm Bot** inline component

**Brainstorm Bot Features**:
- Chat-style interface within the step
- User provides: Target audience, main problem they solve, what they're selling
- AI generates 5 freebie ideas with:
  - Title
  - Format (PDF, video, template, quiz, etc.)
  - Hook/promise
  - Why it works for their audience
- User can "Pick this one" or "Generate more ideas"
- Selected idea auto-populates wizard fields

**Teaching callout**: "Your freebie should give a quick win that leads naturally to your paid offer."

---

### Step 2: Define Your Ideal Subscriber
**Purpose**: Get clear on who this freebie attracts

**Fields**:
- Target audience description (with AI suggestions based on Step 1)
- Main problem they're experiencing
- What transformation do they want?
- Where do they hang out online? (multi-select: Instagram, Facebook, LinkedIn, Pinterest, YouTube, TikTok, Other)

**Cross-reference**: Can pull `ideal_customer` from brand profile if available

---

### Step 3: Freebie Format & Deliverables
**Purpose**: Define what exactly they're creating

**Fields**:
- Format type:
  - PDF Guide/eBook
  - Checklist
  - Template/Swipe File
  - Workbook
  - Video Training
  - Audio/Podcast
  - Quiz/Assessment
  - Resource List
  - Mini Course (email-based)
  - Toolkit/Bundle
  - Other
- Estimated pages/length/duration
- Deliverables list (multi-input for what's included)
- Has bonus incentive? (optional additional item for urgency)

---

### Step 4: Your Opt-in Promise
**Purpose**: Craft the hook that makes people sign up

**Fields**:
- Headline options (AI can suggest 3 based on previous answers)
- Subheadline/supporting copy
- 3 bullet points of what they'll get/learn
- "After downloading, they'll be able to..." (result promise)

**AI hint**: "Let AI write your landing page copy" button appears here

---

### Step 5: Landing Page & Tech Setup
**Purpose**: Plan the tech side

**Fields**:
- Where will you host the landing page?
  - ConvertKit
  - Flodesk
  - Mailchimp
  - Leadpages
  - Squarespace
  - WordPress
  - Stan Store
  - Systeme.io
  - Other
- Landing page status: Existing / Need to create / Using platform default
- Email provider (same list)
- Delivery method: Email automation / Redirect to page / Both

---

### Step 6: Email Follow-Up Sequence
**Purpose**: Plan what happens after someone opts in

**Fields**:
- Delivery email: Immediate welcome + download link
- Nurture sequence length: 3 / 5 / 7 emails (or custom)
- Sequence purpose:
  - Pure value (build trust)
  - Soft sell at end
  - Lead to discovery call
  - Lead to paid offer
- Email sequence status: Existing / Need to create
- Sequence deadline (if creating)

**AI hint**: "Generate my entire email sequence" CTA appears here

---

### Step 7: Promotion Plan
**Purpose**: How will they get the freebie in front of people?

**Fields**:
- Primary promotion method:
  - Social media posts
  - Email to existing list
  - Collaborations/swaps
  - Paid ads
  - SEO/Blog
  - Podcast mentions
  - Direct outreach
  - Combination
- Which platforms? (multi-select)
- Promotion timeline: Start date + duration
- Weekly promotion commitment (posts/emails per week)

---

### Step 8: Review & Create
**Purpose**: Confirm everything and create project + tasks

**Displays**:
- Summary of all answers
- Task preview with toggle to include/exclude individual tasks
- Date picker to adjust task dates
- Content to Create hub showing what AI can generate:
  - Landing page headline + bullets
  - Welcome email
  - Nurture sequence (3-7 emails)
  - Social promo posts (3-5)
  - Bio link text

**Actions**:
- "Create Lead Magnet Project" button
- Creates:
  - Project in projects table
  - Lead magnet record (new table: `lead_magnets`)
  - Tasks with proper phases
  - Content items for Editorial Calendar

---

## Brainstorm Bot Technical Design

### UI Component: `BrainstormBot.tsx`

```text
┌─────────────────────────────────────────────────────────────┐
│ 🧠 Freebie Brainstorm Assistant                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Let me help you come up with the perfect lead magnet!       │
│ Tell me a bit about your business:                          │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Who is your ideal customer?                             │ │
│ │ [Textarea - pulls from brand profile if available]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ What main problem do you solve for them?                │ │
│ │ [Textarea]                                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ What do you sell? (paid offer)                          │ │
│ │ [Textarea - pulls from brand profile if available]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│         [✨ Generate 5 Freebie Ideas]                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 💡 IDEA 1: "The 5-Day Content Clarity Challenge"            │
│ Format: Email mini-course                                   │
│ Hook: "Get a month of content ideas in just 5 days"         │
│ Why it works: Delivers quick wins, builds email habit       │
│                                    [Use This Idea →]        │
├─────────────────────────────────────────────────────────────┤
│ 💡 IDEA 2: "Content Pillars Workbook"                       │
│ Format: PDF Workbook (10 pages)                             │
│ Hook: "Define your 4 content pillars in 30 minutes"         │
│ Why it works: Actionable, reference material they keep      │
│                                    [Use This Idea →]        │
├─────────────────────────────────────────────────────────────┤
│ ... (3 more ideas)                                          │
│                                                             │
│ [🔄 Generate More Ideas] [✍️ I'll write my own instead]     │
└─────────────────────────────────────────────────────────────┘
```

### AI Model Selection

Use **Lovable AI** (no API key required) via edge function:
- Model: `google/gemini-2.5-flash` (fast, cost-effective for brainstorming)
- Fallback: `openai/gpt-5-mini` if needed

### Edge Function: `brainstorm-freebie-ideas`

```typescript
// Inputs
{
  idealCustomer: string;
  mainProblem: string;
  paidOffer: string;
  industry?: string; // from brand profile
  previousIdeas?: string[]; // for "generate more" to avoid duplicates
}

// Output
{
  ideas: Array<{
    title: string;
    format: string;
    hook: string;
    whyItWorks: string;
  }>;
}
```

---

## Database Schema

### New Table: `lead_magnets`

```sql
CREATE TABLE public.lead_magnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Core info
  name TEXT NOT NULL,
  description TEXT,
  format TEXT, -- pdf, video, template, quiz, etc.
  
  -- Target audience
  ideal_subscriber TEXT,
  main_problem TEXT,
  transformation TEXT,
  platforms TEXT[], -- where they hang out
  
  -- Content
  deliverables JSONB DEFAULT '[]',
  has_bonus BOOLEAN DEFAULT false,
  bonus_description TEXT,
  
  -- Copy
  headline TEXT,
  subheadline TEXT,
  bullets JSONB DEFAULT '[]',
  result_promise TEXT,
  
  -- Tech
  landing_page_platform TEXT,
  landing_page_status TEXT, -- existing, need-to-create
  email_provider TEXT,
  landing_page_url TEXT,
  
  -- Email sequence
  email_sequence_length INTEGER DEFAULT 5,
  email_sequence_purpose TEXT,
  email_sequence_status TEXT,
  
  -- Promotion
  promotion_method TEXT,
  promotion_platforms TEXT[],
  promotion_start_date DATE,
  promotion_duration TEXT,
  weekly_commitment INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.lead_magnets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lead magnets"
  ON public.lead_magnets FOR ALL
  USING (auth.uid() = user_id);
```

---

## Task Generation

### Created Tasks (grouped by phase)

**Setup Phase** (Week 1):
- Define target audience and problem
- Outline freebie content
- Create freebie deliverable
- Design cover/thumbnail

**Tech Phase** (Week 1-2):
- Set up landing page
- Connect email automation
- Test opt-in flow
- Add tracking/analytics

**Copy Phase** (Week 2):
- Write landing page headline + bullets
- Create welcome email
- Write nurture email 1
- Write nurture email 2
- (etc. based on sequence length)

**Promotion Phase** (Ongoing):
- Create social promo graphics
- Write promo post 1
- Write promo post 2
- (recurring weekly based on commitment)

---

## Integration Points

### 1. 90-Day Cycle Integration
- Tasks automatically link to active cycle
- Freebie creation appears in weekly priorities

### 2. Weekly/Daily Plan Integration
- All tasks surface in normal planning views
- Content tasks show in Editorial Calendar

### 3. AI Copywriting Integration
- "Content to Create" hub on Review step
- Same pattern as Launch V2 wizard
- Generates:
  - Landing page copy
  - Welcome email
  - Nurture sequence
  - Promo posts

### 4. Editorial Calendar Integration
- Content items created for each email
- Promo posts scheduled on calendar

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/leadMagnet.ts` | Type definitions + defaults |
| `src/components/wizards/lead-magnet/` | Wizard component folder |
| `src/components/wizards/lead-magnet/LeadMagnetWizard.tsx` | Main wizard component |
| `src/components/wizards/lead-magnet/steps/` | Individual step components |
| `src/components/wizards/lead-magnet/BrainstormBot.tsx` | AI brainstorm component |
| `supabase/functions/brainstorm-freebie-ideas/index.ts` | AI brainstorm edge function |
| `supabase/functions/create-lead-magnet/index.ts` | Project/task creation |
| `supabase/migrations/XXXXX_create_lead_magnets.sql` | Database table |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/wizardIntegration.ts` | Add lead-magnet-wizard config |
| `src/components/wizards/WizardHub.tsx` | Add to IMPLEMENTED_WIZARDS |
| `src/pages/Wizards.tsx` | Already lazy-loads WizardHub |
| `src/App.tsx` | Add route `/wizards/lead-magnet` |

---

## Implementation Priority

1. **Database**: Create `lead_magnets` table with RLS
2. **Types**: Define `LeadMagnetWizardData` interface
3. **Brainstorm Edge Function**: Create `brainstorm-freebie-ideas` using Lovable AI
4. **Wizard Steps**: Build all 8 steps with proper validation
5. **Brainstorm Bot UI**: Interactive component for Step 1
6. **Create Edge Function**: Build `create-lead-magnet` for project/task generation
7. **Integration Config**: Add to `wizardIntegration.ts`
8. **Route + Hub**: Wire up navigation

---

## Estimated Scope

- **8 step components** (~200-300 lines each)
- **1 main wizard component** (~200 lines)
- **1 brainstorm bot component** (~300 lines)
- **2 edge functions** (~400 lines total)
- **1 types file** (~200 lines)
- **1 database migration** (~50 lines)

Total: ~2,500-3,000 lines of new code
