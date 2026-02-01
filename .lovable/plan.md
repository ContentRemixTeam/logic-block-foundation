

# Summit Wizard - Dedicated Virtual Summit Planning System

## Why a Separate Wizard

Summits are uniquely complex compared to standard launches:
- **Speaker Management**: Recruiting, coordinating, and tracking 5-50+ speakers
- **Affiliate System**: Commission structures, swipe copy, promotional schedules
- **Multi-Session Scheduling**: Organizing sessions across multiple days
- **All-Access Pass**: A separate product with its own sales strategy
- **Tech Stack**: Different platforms (HeySummit, SamCart, Kajabi, etc.)

Trying to fit this into the Launch Planner would create an overwhelming experience. A dedicated Summit Wizard keeps both tools focused and simple.

---

## Summit Wizard Overview

| Attribute | Value |
|-----------|-------|
| Template Name | `summit-planner` |
| Display Name | Summit Planner |
| Total Steps | 9 |
| Icon | `Users` (represents speakers/community) |
| Creates | Project with `is_summit: true` flag |

---

## Step-by-Step Flow

### Step 1: Summit Basics
**Questions:**
- What's the name of your summit?
- Have you hosted a summit before?
  - First time ever
  - Hosted 1-2 before
  - Experienced summit host
- What's the primary goal?
  - Grow my email list
  - Make sales (all-access pass + offers)
  - Build authority in my space
  - Launch a new offer
  - Combination

### Step 2: Summit Structure
**Questions:**
- How many days will your summit run?
  - 3 days (compact)
  - 5 days (standard)
  - 7+ days (extended)
  - Custom
- How many sessions per day?
  - 3-4 sessions/day
  - 5-6 sessions/day
  - 7+ sessions/day
- Session format:
  - Pre-recorded interviews
  - Live sessions
  - Mix of both
- Session length:
  - 20-30 minutes
  - 45 minutes
  - 60 minutes

### Step 3: Speaker Strategy
**Questions:**
- How many speakers are you recruiting?
  - 10-15 speakers (intimate)
  - 16-25 speakers (standard)
  - 26-40 speakers (large)
  - 40+ speakers (mega)
- Speaker recruitment deadline (date picker)
- Are speakers affiliates for your all-access pass?
  - Yes, all speakers are affiliates
  - Some speakers, not all
  - No affiliate program
- If affiliates: What commission % will you offer?
  - 30%
  - 40%
  - 50%
  - Custom

**Dynamic Section - Per Speaker (or bulk upload):**
- Speaker name
- Email
- Topic/Session title
- Recording deadline
- Bio received? Y/N
- Headshot received? Y/N
- Swipe copy sent? Y/N
- Recording received? Y/N

### Step 4: All-Access Pass
**Questions:**
- Do you have an all-access pass?
  - Yes
  - No (free summit only)
  - Considering it
- If yes:
  - Price point (number input)
  - Has payment plan?
  - What's included?
    - Lifetime replay access
    - Downloadable resources
    - Bonus trainings
    - Private community access
    - Live Q&A sessions
    - Other
  - VIP tier available?
    - VIP price
    - VIP extras

### Step 5: Summit Timeline
**Questions:**
- Registration opens (date)
- Summit start date
- Summit end date
- All-access pass cart closes (date)
- Post-summit replay period?
  - 24 hours
  - 48 hours
  - 7 days
  - Permanent (all-access only)

**Visual Timeline Generated:**
```
[Prep Phase]----[Registration Open]----[Summit Live]----[Replay Period]----[Cart Close]
```

### Step 6: Tech & Delivery
**Questions:**
- Summit hosting platform:
  - HeySummit
  - Kajabi
  - Thinkific
  - Custom website
  - Facebook Group
  - Other
- Email platform:
  - Kit (ConvertKit)
  - ActiveCampaign
  - Mailchimp
  - Flodesk
  - Other
- Checkout platform:
  - ThriveCart
  - SamCart
  - Stripe
  - Kajabi
  - Other
- Are you doing live sessions?
  - If yes: Streaming platform (Zoom, StreamYard, Crowdcast)

### Step 7: Marketing Strategy
**Questions:**
- How will you promote registrations?
  - Email list
  - Social media
  - Speaker promotions (affiliates)
  - Paid ads
  - Podcast guesting
  - Other
- Registration goal (number)
- Will speakers send promotional emails?
  - Yes, required
  - Yes, optional
  - No
- Number of swipe copy emails you'll provide to speakers:
  - 3 emails
  - 5 emails
  - 7+ emails
- Social promo assets for speakers?
  - Yes, full kit
  - Basic graphics only
  - No

### Step 8: Engagement & Experience
**Questions:**
- Will you have a community for attendees?
  - Pop-up Facebook Group
  - Existing community
  - Slack/Discord
  - No community
- Daily engagement activities?
  - Giveaways
  - Q&A sessions
  - Networking events
  - Homework/challenges
  - None
- Special launch offer after summit?
  - Yes (describe)
  - No
- Post-summit nurture plan?
  - Email sequence to all registrants
  - Personal outreach to engaged attendees
  - Both
  - None planned

### Step 9: Review & Create
**Summary Display:**
- Summit name and dates
- # of speakers, # of sessions
- All-access pass price
- Registration goal
- Generated task count preview
- "Create Summit" button

---

## Database Changes

### New Table: `summits`

```sql
CREATE TABLE summits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Basics
  name TEXT NOT NULL,
  experience_level TEXT, -- first-time, some-experience, experienced
  primary_goal TEXT, -- list-growth, sales, authority, launch-offer, combination
  
  -- Structure
  num_days INTEGER DEFAULT 5,
  sessions_per_day INTEGER DEFAULT 5,
  session_format TEXT, -- pre-recorded, live, mixed
  session_length TEXT, -- 20-30, 45, 60
  
  -- Speakers
  target_speaker_count INTEGER DEFAULT 20,
  speaker_recruitment_deadline DATE,
  speakers_are_affiliates TEXT, -- all, some, none
  affiliate_commission INTEGER,
  
  -- All-Access Pass
  has_all_access_pass BOOLEAN DEFAULT true,
  all_access_price NUMERIC(10,2),
  all_access_has_payment_plan BOOLEAN DEFAULT false,
  all_access_payment_plan_details TEXT,
  all_access_includes JSONB DEFAULT '[]',
  has_vip_tier BOOLEAN DEFAULT false,
  vip_price NUMERIC(10,2),
  vip_includes TEXT,
  
  -- Timeline
  registration_opens DATE,
  summit_start_date DATE NOT NULL,
  summit_end_date DATE NOT NULL,
  cart_closes DATE,
  replay_period TEXT, -- 24-hours, 48-hours, 7-days, permanent
  
  -- Tech
  hosting_platform TEXT,
  email_platform TEXT,
  checkout_platform TEXT,
  streaming_platform TEXT,
  
  -- Marketing
  promotion_methods JSONB DEFAULT '[]',
  registration_goal INTEGER,
  speaker_email_requirement TEXT, -- required, optional, none
  swipe_emails_count INTEGER DEFAULT 5,
  has_social_kit BOOLEAN DEFAULT true,
  
  -- Engagement
  community_type TEXT, -- popup-fb, existing, slack-discord, none
  engagement_activities JSONB DEFAULT '[]',
  has_post_summit_offer BOOLEAN DEFAULT false,
  post_summit_offer_details TEXT,
  post_summit_nurture TEXT, -- email-sequence, personal-outreach, both, none
  
  -- Status
  status TEXT DEFAULT 'planning', -- planning, active, completed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE summits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own summits"
  ON summits FOR ALL
  USING (auth.uid() = user_id);
```

### New Table: `summit_speakers`

```sql
CREATE TABLE summit_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summit_id UUID NOT NULL REFERENCES summits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Speaker Info
  name TEXT NOT NULL,
  email TEXT,
  topic TEXT,
  session_title TEXT,
  session_order INTEGER,
  
  -- Assets Status
  bio_received BOOLEAN DEFAULT false,
  headshot_received BOOLEAN DEFAULT false,
  swipe_copy_sent BOOLEAN DEFAULT false,
  recording_received BOOLEAN DEFAULT false,
  affiliate_link_sent BOOLEAN DEFAULT false,
  
  -- Deadlines
  recording_deadline DATE,
  
  -- Affiliate Tracking
  is_affiliate BOOLEAN DEFAULT false,
  affiliate_commission INTEGER,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE summit_speakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own summit speakers"
  ON summit_speakers FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_summit_speakers_summit ON summit_speakers(summit_id);
```

### Add wizard_templates entry

```sql
INSERT INTO wizard_templates (template_name, display_name, description, icon)
VALUES (
  'summit-planner',
  'Summit Planner',
  'Plan your virtual summit from speaker recruitment to all-access pass sales. The complete summit blueprint.',
  'Users'
);
```

### Modify projects table

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_summit BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS summit_id UUID REFERENCES summits(id) ON DELETE SET NULL;
```

---

## New Files to Create

### Types
| File | Purpose |
|------|---------|
| `src/types/summit.ts` | Summit wizard types and defaults |

### Wizard Components
| File | Purpose |
|------|---------|
| `src/components/wizards/summit/SummitWizard.tsx` | Main wizard component |
| `src/components/wizards/summit/steps/StepSummitBasics.tsx` | Step 1 |
| `src/components/wizards/summit/steps/StepSummitStructure.tsx` | Step 2 |
| `src/components/wizards/summit/steps/StepSpeakerStrategy.tsx` | Step 3 |
| `src/components/wizards/summit/steps/StepAllAccessPass.tsx` | Step 4 |
| `src/components/wizards/summit/steps/StepSummitTimeline.tsx` | Step 5 |
| `src/components/wizards/summit/steps/StepTechDelivery.tsx` | Step 6 |
| `src/components/wizards/summit/steps/StepMarketingStrategy.tsx` | Step 7 |
| `src/components/wizards/summit/steps/StepEngagement.tsx` | Step 8 |
| `src/components/wizards/summit/steps/StepReviewCreate.tsx` | Step 9 |
| `src/components/wizards/summit/steps/index.ts` | Step exports |
| `src/components/wizards/summit/components/SpeakerTracker.tsx` | Speaker management UI |
| `src/components/wizards/summit/components/SummitTimelineVisual.tsx` | Visual timeline |

### Pages
| File | Purpose |
|------|---------|
| `src/pages/SummitWizardPage.tsx` | Wizard page wrapper |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useSummitSpeakers.ts` | Speaker CRUD operations |

### Edge Functions
| File | Purpose |
|------|---------|
| `supabase/functions/create-summit/index.ts` | Summit + project + task generation |

### Validation
| File | Purpose |
|------|---------|
| `src/lib/summitValidation.ts` | Step validation logic |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/wizards/WizardHub.tsx` | Add summit-planner route handling |
| `src/App.tsx` | Add /wizards/summit route |

---

## Task Generation Logic

The edge function will generate tasks organized by phase:

**Phase 1: Speaker Recruitment** (8-12 weeks before)
- Create speaker pitch email
- Research potential speakers (batched by day)
- Send speaker invitations (staggered)
- Follow up with pending speakers
- Collect speaker bios and headshots
- Create affiliate tracking links

**Phase 2: Content Creation** (4-8 weeks before)
- Record speaker interviews (if pre-recorded)
- Create speaker swipe copy
- Design promotional graphics
- Build summit registration page
- Set up email sequences
- Create all-access pass sales page

**Phase 3: Pre-Summit Promotion** (2-4 weeks before)
- Launch registration
- Daily email promotion
- Social media campaign
- Remind speakers to promote
- Track registration milestones

**Phase 4: Summit Live** (summit days)
- Daily session hosting
- Community engagement
- Attendee Q&A
- All-access pass pitch
- Daily recap emails

**Phase 5: Post-Summit** (1-2 weeks after)
- Send replay reminders
- Final cart close push
- Thank speakers
- Send affiliate payouts
- Summit debrief

---

## Speaker Tracker Component

A dedicated component within the wizard (and accessible from the Summit Project page) to track:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Speakers (15/20 confirmed)                               [+ Add Speaker]│
├─────────────────────────────────────────────────────────────────────────┤
│ Name           │ Topic          │ Bio │ Photo │ Swipe │ Recording │ ✓  │
│ Sarah Smith    │ Email Marketing│ ✅  │ ✅    │ ✅    │ ⏳        │ 80%│
│ Mike Johnson   │ Mindset        │ ✅  │ ⏳    │ ✅    │ ❌        │ 50%│
│ Lisa Chen      │ Funnels        │ ⏳  │ ⏳    │ ❌    │ ❌        │ 25%│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Integration with Existing Systems

1. **Projects**: Summit creates a project with `is_summit: true`
2. **Tasks**: All summit tasks linked to project via `project_id`
3. **Dashboard**: Summit shows in LaunchZone during active period
4. **Debrief**: Summit debrief wizard (future - separate from launch debrief)
5. **Templates**: Save summit as template for future events

---

## Implementation Priority

**Sprint 1: Foundation**
1. Create database tables (`summits`, `summit_speakers`)
2. Create `SummitWizardData` types
3. Create main `SummitWizard.tsx` component
4. Create Steps 1-3 (Basics, Structure, Speakers)

**Sprint 2: Configuration**
1. Create Steps 4-6 (All-Access, Timeline, Tech)
2. Create `SummitTimelineVisual` component
3. Add to WizardHub and routes

**Sprint 3: Marketing & Completion**
1. Create Steps 7-9 (Marketing, Engagement, Review)
2. Create `create-summit` edge function
3. Implement task generation logic

**Sprint 4: Speaker Management**
1. Create `SpeakerTracker` component
2. Create `useSummitSpeakers` hook
3. Add speaker management to Summit Project page

---

## User Experience Goals

1. **Focused complexity** - Only show what's needed for summits
2. **Speaker-centric** - Make speaker management the core feature
3. **Timeline clarity** - Visual timeline shows all key dates
4. **Progress tracking** - Clear completion % for speaker assets
5. **Reusable** - Save as template for annual/recurring summits

