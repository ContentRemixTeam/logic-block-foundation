

# AI-Powered Copy Generation Integration Across Wizards

## Executive Summary

This plan audits all existing wizards and identifies strategic integration points for AI-powered copy generation. The goal is to enable users to generate high-quality, conversion-focused copy directly within their workflow—emails, sales pages, social content, and more—that can be scheduled to the Editorial Calendar.

---

## Current Wizard Inventory

| Wizard | Steps | Content Output | AI Integration Opportunity |
|--------|-------|----------------|----------------------------|
| **Launch Planner V2** | 8 steps | Email sequences, sales page, social posts, follow-up emails | HIGH - generates 10+ content pieces |
| **Summit Planner** | 9 steps | Speaker invites, swipe copy, promo emails, social kit | HIGH - generates 15+ content pieces |
| **Content Planner** | 7 steps | Planned content items (emails, posts, blogs) | MEDIUM - already outputs to calendar |
| **Brand Wizard** | 4 steps | Voice profile, samples | Foundation - powers AI generation |

---

## Part 1: Launch Planner V2 AI Integration

### 1.1 Email Sequence Copy Generation

**Where**: Step 4 (Pre-Launch Strategy) - Email Sequences section

**Current State**: Users select which email sequences they need (Warm-Up, Launch, Cart Close, Post-Purchase) and indicate if each is "existing" or "needs creation"

**AI Enhancement**:
- Add "Generate with AI" button next to each sequence marked "needs-creation"
- Modal opens with pre-populated context from wizard data:
  - Business name from user profile
  - Offer type, price point, ideal customer from Steps 1-3
  - Launch dates for urgency copy
- Generate full sequence (3-5 emails per sequence) in brand voice
- Each email includes: Subject lines (3 variations), body, call-to-action
- "Save to Vault" or "Schedule to Calendar" actions on each

**Sequence Types to Generate**:

```text
Warm-Up Sequence (5 emails)
├── Email 1: Lead magnet delivery + welcome
├── Email 2: Your story + relate to their struggle
├── Email 3: Authority-building content
├── Email 4: Social proof + soft offer tease
└── Email 5: "Something exciting is coming" + early bird hint

Launch Sequence (5-7 emails)
├── Email 1: Cart open announcement
├── Email 2: What's included deep-dive
├── Email 3: Bonuses breakdown
├── Email 4: Objection handling (FAQs)
├── Email 5: Case study/testimonial spotlight
├── Email 6: Final 24-48 hours urgency
└── Email 7: Last chance (cart closing)

Cart Close Sequence (3-4 emails)
├── Email 1: 24 hours left
├── Email 2: 12 hours left (emotional appeal)
├── Email 3: Final hours (scarcity + transformation)
└── Email 4: "Door closed" + what's next

Post-Purchase Sequence (3 emails)
├── Email 1: Welcome + immediate next steps
├── Email 2: Reduce buyer's remorse + quick win
└── Email 3: Community/onboarding invitation
```

### 1.2 Sales Page Copy Generation

**Where**: Step 4 (Pre-Launch Strategy) - Sales Page section

**Current State**: Users indicate if sales page is "existing", "in-progress", or "needs-creation"

**AI Enhancement**:
- Add "Generate Sales Page Copy" button when status is "needs-creation" or "in-progress"
- Generate full long-form sales page in sections:
  - Headline (3 variations)
  - Subheadline + hook
  - Problem agitation
  - Solution introduction
  - What's included (modules/features)
  - Bonus stack section
  - Pricing section
  - Objection handling
  - FAQs (generate 5-7)
  - Final CTA + guarantee
- Section-by-section regeneration for fine-tuning
- Export as Google Doc or copy-to-clipboard

### 1.3 Social Content Batch

**Where**: Step 5 (Launch Week) - after offer frequency is selected

**AI Enhancement**:
- "Generate Social Content Batch" based on:
  - Offer frequency selected (daily, multiple-daily)
  - Launch duration (cart open to close)
  - Primary reach method (Instagram, LinkedIn, etc.)
- Generate platform-specific posts:
  - Cart open announcement
  - Daily value posts with soft pitch
  - Testimonial highlight posts
  - Countdown posts (final 48h, 24h, 12h)
  - Behind-the-scenes content
  - Cart close urgency post
- Each post includes: Caption + CTA + hashtag suggestions
- Batch save to Editorial Calendar with correct dates

### 1.4 Follow-Up Emails

**Where**: Step 6 (Post-Launch) - after follow-up willingness is selected

**AI Enhancement**:
- Generate follow-up emails based on selection:
  - "One email" → Single "closed but..." email
  - "Multiple emails" → 3-4 email sequence:
    - "Doors closed, but..."
    - "Want feedback" + survey
    - "When we reopen" + waitlist
    - Future value preview
  - "Personal outreach" → DM/email templates for 1:1

---

## Part 2: Summit Planner AI Integration

### 2.1 Speaker Outreach Templates

**Where**: Step 3 (Speaker Strategy) - after target speaker count is set

**AI Enhancement**:
- "Generate Speaker Invite Templates" button
- Generate 3 versions:
  - Cold outreach (never met)
  - Warm outreach (connection exists)
  - VIP/influencer pitch
- Include:
  - Subject line variations
  - Personalization placeholders
  - Clear value proposition
  - What you need from them
  - Timeline expectations
- "Generate Follow-Up Template" for non-responses

### 2.2 Affiliate/Speaker Swipe Copy

**Where**: Step 7 (Marketing Strategy) - when swipe emails count > 0

**Current State**: User selects 2, 3, or 5 swipe emails to provide speakers

**AI Enhancement**:
- "Generate Swipe Email Pack" button
- Auto-generate based on swipeEmailsCount:
  - Email 1: Initial announcement + registration link
  - Email 2: "Why this summit" + speaker credibility
  - Email 3: All-access pass value pitch
  - Email 4: Countdown/reminder
  - Email 5: Final chance + FOMO
- Each includes speaker fill-in placeholders: `[YOUR NAME]`, `[YOUR AUDIENCE PAIN POINT]`
- Export as downloadable PDF or Google Doc
- Add to Content Vault for reuse

### 2.3 Summit Promo Email Sequence

**Where**: Step 7 (Marketing Strategy) - for host's own list

**AI Enhancement**:
- "Generate My Promo Sequence" (separate from swipe copy)
- 5-7 emails for the host to send:
  - Registration open announcement
  - Speaker lineup reveal
  - "Why I'm hosting this" personal story
  - Session sneak peeks
  - Early bird AAP pricing (if applicable)
  - Summit starts tomorrow
  - Daily during-summit emails (value + AAP pitch)
  - Post-summit recap + AAP deadline

### 2.4 Social Media Promo Kit

**Where**: Step 7 (Marketing Strategy) - when hasSocialKit is true

**AI Enhancement**:
- "Generate Social Promo Kit"
- Create platform-specific content:
  - Instagram captions (5-8 posts)
  - LinkedIn posts (3-5 posts)
  - Facebook/Twitter variations
- Include:
  - Registration push posts
  - Individual speaker spotlight templates
  - Countdown posts
  - Shareable quote graphics (text only, for Canva)
- Batch schedule to Editorial Calendar

### 2.5 Post-Summit Nurture Sequence

**Where**: Step 8 (Engagement) - when postSummitNurture is selected

**AI Enhancement**:
- Generate based on selection:
  - "Email sequence" → 5-email nurture:
    - Summit recap + replays reminder
    - Top 3 takeaways
    - AAP final pitch + deadline
    - "Doors closing" urgency
    - "What's next" + segmentation
  - "Personal outreach" → 1:1 templates for hot leads

---

## Part 3: Content Planner AI Integration

### 3.1 Content Brief Generation

**Where**: Step 3 (Format Selection) - after formats are selected

**AI Enhancement**:
- "Generate Content Briefs" for each selected format
- Create working documents with:
  - Hook/angle (3 options)
  - Key points to cover
  - Call-to-action suggestions
  - Estimated length/duration
- Save briefs to Content Vault

### 3.2 Batch Content Generation

**Where**: Step 5 (Batching) - when batching is enabled

**AI Enhancement**:
- "Generate Batch from Core Content"
- User provides: 1 core piece (blog post, podcast, video)
- AI generates derivatives:
  - 3-5 social posts (different angles)
  - Email newsletter version
  - Quote graphics (text for Canva)
  - Thread/carousel breakdown
- All scheduled to Editorial Calendar

### 3.3 Calendar Content Fill-In

**Where**: Step 6 (Calendar) - when viewing blank calendar days

**AI Enhancement**:
- "AI Fill Gap" button on empty calendar days
- Based on:
  - Messaging framework from Step 2
  - Selling points from Step 2
  - Recent content patterns
- Generate quick content suggestions
- One-click add to that date

---

## Part 4: Technical Architecture

### 4.1 Shared AI Generation Service

Extend the existing `OpenAIService` to support wizard contexts:

```typescript
// Extended content types for wizards
type WizardContentType = 
  // Launch emails
  | 'launch_warmup_sequence'
  | 'launch_open_sequence'
  | 'launch_cartclose_sequence'
  | 'launch_followup_sequence'
  | 'launch_sales_page'
  // Summit content
  | 'summit_speaker_invite'
  | 'summit_swipe_pack'
  | 'summit_promo_sequence'
  | 'summit_social_kit'
  | 'summit_nurture_sequence'
  // Social batches
  | 'social_launch_batch'
  | 'social_summit_batch'
  // Content planner
  | 'content_brief'
  | 'content_repurpose_batch';

interface WizardGenerationContext {
  wizardType: 'launch-v2' | 'summit' | 'content-planner';
  wizardData: Record<string, unknown>;
  contentType: WizardContentType;
  additionalContext?: string;
}
```

### 4.2 Multi-Pass Generation for Sequences

For email sequences and sales pages, use enhanced multi-pass:

```text
Pass 1: Generate full sequence draft (temp 0.8)
Pass 2: Critique for conversion optimization (temp 0.3)
    - Check subject line open-worthiness
    - Verify emotional hooks
    - Ensure consistent voice
    - Check CTAs are action-oriented
Pass 3: Rewrite with improvements (temp 0.7)
Pass 4: AI detection refinement if score > 3 (temp 0.8)
```

### 4.3 Content Prompting Strategy

Each content type has specialized prompts leveraging:
- **Brand Profile**: Voice profile, signature phrases, tone scores
- **Wizard Context**: Offer details, pricing, ideal customer, deadlines
- **Launch Psychology**: Urgency triggers, objection handling, transformation promises

### 4.4 Output Formatting

All generated content includes:
- Clear section headers
- Subject line variations (for emails)
- Editable placeholders marked with `[BRACKETS]`
- Suggested send dates relative to launch
- AI detection score with assessment

---

## Part 5: New Components to Create

| Component | Purpose |
|-----------|---------|
| `WizardAIGeneratorModal.tsx` | Reusable modal for in-wizard AI generation |
| `EmailSequenceGenerator.tsx` | Generates full email sequences |
| `SalesPageGenerator.tsx` | Generates long-form sales page copy |
| `SocialBatchGenerator.tsx` | Generates platform-specific social batches |
| `SpeakerInviteGenerator.tsx` | Generates speaker outreach templates |
| `SwipePackGenerator.tsx` | Generates affiliate/speaker swipe copy |
| `ContentBriefGenerator.tsx` | Generates content briefs for planner |

### 5.1 Shared Hook

```typescript
useWizardAIGeneration({
  wizardType: 'launch-v2' | 'summit' | 'content-planner',
  wizardData: WizardData,
  onGenerationComplete: (content) => void,
  onScheduleToCalendar: (items) => void,
  onSaveToVault: (items) => void,
})
```

---

## Part 6: User Experience Flow

### Launch Wizard Example Flow

```text
User reaches Step 4: Pre-Launch Strategy
    ↓
Selects "Warm-Up Sequence" as "needs-creation"
    ↓
Clicks "Generate with AI" button
    ↓
Modal opens showing:
  - Context preview (offer name, dates, ideal customer)
  - "Generate 5-Email Sequence" button
    ↓
AI generates sequence (30-45s with progress)
    ↓
Preview shows all 5 emails with:
  - Subject line variations
  - Email body
  - AI detection score per email
    ↓
User can:
  - "Regenerate" any single email
  - "Edit" inline
  - "Add All to Calendar" (schedules relative to cart open)
  - "Save to Vault" (for later scheduling)
    ↓
Continues with wizard
```

---

## Part 7: Quality Assurance

### 7.1 AI Detection Scoring

Every generated piece displays:
- Score badge (1-10)
- Assessment label (Excellent, Good, Moderate Risk, High Risk)
- Auto-refinement if score > 3

### 7.2 Voice Consistency

All generation uses the user's Brand Profile:
- Voice samples from Brand Wizard
- Tone scores (formality, energy, humor, emotion)
- Signature phrases
- Anti-AI banned phrase list

### 7.3 Conversion Optimization

Prompts include direct-response copywriting principles:
- Problem-agitation-solution framework
- Specific details over vague claims
- Social proof integration
- Urgency without manipulation
- Clear, single CTAs

---

## Part 8: Implementation Priority

### Phase 1: Launch Planner V2 (Highest Impact)
1. Email sequence generation
2. Sales page generation
3. Social content batch
4. Follow-up emails

### Phase 2: Summit Planner
1. Speaker invite templates
2. Swipe copy pack
3. Promo email sequence
4. Social promo kit

### Phase 3: Content Planner
1. Content brief generation
2. Batch repurposing
3. Calendar gap filling

---

## Part 9: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/wizards/shared/WizardAIGeneratorModal.tsx` | Modal for all wizard AI generation |
| `src/components/wizards/shared/EmailSequenceGenerator.tsx` | Email sequence generation UI |
| `src/components/wizards/shared/SalesPageGenerator.tsx` | Sales page copy generator |
| `src/components/wizards/shared/SocialBatchGenerator.tsx` | Social content batch generator |
| `src/hooks/useWizardAIGeneration.ts` | Hook for wizard AI generation |
| `src/lib/wizard-ai-prompts.ts` | Specialized prompts for wizard content types |
| `src/types/wizardAIGeneration.ts` | Types for wizard AI generation |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx` | Add AI generate buttons for emails + sales page |
| `src/components/wizards/launch-v2/steps/StepLaunchWeek.tsx` | Add social content batch generator |
| `src/components/wizards/launch-v2/steps/StepPostLaunch.tsx` | Add follow-up email generator |
| `src/components/wizards/summit/steps/StepSpeakerStrategy.tsx` | Add speaker invite generator |
| `src/components/wizards/summit/steps/StepMarketingStrategy.tsx` | Add swipe pack + promo sequence generator |
| `src/components/wizards/content-planner/steps/StepFormatSelection.tsx` | Add content brief generator |
| `src/components/wizards/content-planner/steps/StepBatching.tsx` | Add batch repurpose generator |
| `src/lib/openai-service.ts` | Extend with wizard content types |

---

## Success Criteria

1. Users can generate complete email sequences within Launch Wizard
2. Generated sales page copy follows proven conversion frameworks
3. All AI content scores 3 or below on AI detection
4. Social content batches are platform-appropriate
5. Summit speaker outreach converts at higher rates with AI templates
6. Swipe copy is speaker-ready with placeholders
7. Content can be directly scheduled to Editorial Calendar
8. Content can be saved to Vault for future use
9. Voice consistency maintained across all generated content
10. Multi-pass generation ensures quality over speed

