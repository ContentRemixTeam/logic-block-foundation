
# 30 Days of Content Wizard - Quality-First Implementation Plan

## Overview

A 6-step wizard that prioritizes copy quality over quantity, generating one platform at a time with full editing control before calendar scheduling. The wizard checks for existing launches/promotions, helps users discover strategic content pillars, and uses **deep platform-specific instructions** to generate high-converting content.

## Key Architecture Addition: Platform Content Strategy Configs

Similar to how `email-sequence-strategy.ts` provides deep conversion intelligence for email types, we will create `platform-content-strategy.ts` with comprehensive, platform-specific instructions for generating high-converting content on each platform.

### Platform Strategy Config Structure

Each platform will have a complete strategy configuration including:

```text
PlatformStrategyConfig {
  // Platform fundamentals
  platform: string
  displayName: string
  description: string
  
  // Audience & psychology
  audienceBehavior: {
    whyTheyreHere: string
    scrollingMindset: string
    engagementTriggers: string[]
  }
  
  // Content format rules
  formatRules: {
    optimalLength: { min: number, max: number, unit: 'words' | 'characters' }
    structure: string[]  // Required structural elements
    hookRequirements: string[]
    visualNotes: string[]
  }
  
  // Conversion psychology
  conversionMechanics: {
    primaryGoal: string
    secondaryGoals: string[]
    ctaStrategy: string
    avoidAtAllCosts: string[]
  }
  
  // Platform-specific patterns
  psychologicalHooks: string[]
  bestPerformingFormats: string[]
  
  // Examples (10/10 quality standards)
  goldStandardExamples: {
    hook: string[]
    fullPost: string
    whyItWorks: string[]
  }
  
  // Anti-patterns
  platformSpecificMistakes: string[]
}
```

### Platform Configurations

#### Instagram

```text
Instagram Strategy:
- Audience: Visual learners seeking inspiration/entertainment, thumb-stopping in a fast scroll
- Psychology: "Will this make me look/feel good if I save/share it?"
- Format: 
  - Hook in first 5 words (visible above "...more")
  - 100-150 words optimal (carousel captions can go longer)
  - Line breaks every 1-2 sentences
  - End with question OR soft CTA
  - 3-5 hashtags at end (not in middle)
- Hooks that work:
  - "The [X] mistake that cost me [Y]"
  - "Stop doing [X] if you want [Y]"
  - "I was today years old when I learned..."
  - "POV: You finally [desired outcome]"
- Conversion: Drive saves (algorithm loves it) + comments (triggers replies)
- Avoid: Long paragraphs, hard selling in feed, too many hashtags
```

#### LinkedIn

```text
LinkedIn Strategy:
- Audience: Professionals seeking industry insights, career growth, business wisdom
- Psychology: "Will this make me look smart if I engage with it?"
- Format:
  - Hook line standalone (first 210 characters visible before "...see more")
  - Short paragraphs (1-2 sentences each)
  - One clear insight or story
  - 150-300 words optimal
  - End with thought-provoking question
- Hooks that work:
  - "I [did unexpected thing]. Here's what happened:"
  - "Everyone's talking about [X]. Here's what they're missing:"
  - "My worst [professional thing] taught me [lesson]"
  - Contrarian takes on industry norms
- Conversion: Drive comments (algorithm prioritizes) + follows
- Avoid: Being too sales-y, generic inspiration, hashtag spam
```

#### Twitter/X

```text
Twitter/X Strategy:
- Audience: Information seekers, news junkies, niche communities
- Psychology: "Is this quotable? Can I look smart by sharing this?"
- Format:
  - Single tweet: Max 280 chars, punchiest possible
  - Thread: 5-12 tweets, numbered, each standalone valuable
  - First tweet MUST hook + hint at value coming
  - Last tweet: Summary + CTA
- Hooks that work:
  - "Unpopular opinion: [contrarian take]"
  - "[Number] things I wish I knew about [topic]:"
  - "The difference between [A] and [B]:"
  - "Most people [common mistake]. Top [1%/performers] [better approach]:"
- Conversion: Drive retweets (reach) + replies (engagement)
- Avoid: Threads that could be one tweet, generic motivation
```

#### TikTok

```text
TikTok Strategy:
- Audience: Entertainment-first, educational content must feel fun
- Psychology: "Will I look good if I share this?"
- Format:
  - Script hook: First 3 seconds determine watch-through
  - Pattern interrupt every 5-10 seconds
  - Total: 15-60 seconds optimal (under 3 min for longer form)
  - Text overlay captions for soundless viewing
- Hooks that work:
  - "Wait, you're still doing [X]?!"
  - "The reason your [X] isn't working..."
  - "I can't believe I'm sharing this but..."
  - "This changed everything for my [niche]"
- Conversion: Watch time > likes (algorithm cares about completion)
- Avoid: Slow starts, no text overlays, too polished (raw feels authentic)
```

#### Facebook

```text
Facebook Strategy:
- Audience: Community-focused, longer attention spans, older demographic
- Psychology: "Does this resonate with my life/values?"
- Format:
  - 100-250 words optimal
  - Personal stories perform best
  - Can be more casual/personal than LinkedIn
  - Questions drive comments
- Hooks that work:
  - Personal stories and milestones
  - "Can I be honest about something?"
  - Community-building questions
  - Behind-the-scenes of business/life
- Conversion: Comments + shares (shares = massive reach)
- Avoid: Too promotional, link-heavy posts, impersonal content
```

#### Blog Post

```text
Blog Strategy:
- Audience: Active searchers, problem-aware, seeking solutions
- Psychology: "Will this actually solve my problem?"
- Format:
  - 1200-2500 words for SEO
  - H2/H3 headers every 200-300 words
  - Bullet points and numbered lists
  - Introduction: Hook + promise + roadmap
  - Conclusion: Summary + clear next step
- Structure:
  1. Hook (story or problem statement)
  2. Why this matters (stakes)
  3. Main teaching (3-5 key points)
  4. Examples/stories for each point
  5. Action steps
  6. CTA
- Conversion: Email opt-in + related content
- Avoid: Fluff intros, walls of text, no clear takeaways
```

#### YouTube

```text
YouTube Strategy:
- Audience: Lean-back viewers, seeking entertainment + education
- Psychology: "Will I feel smarter/better after watching?"
- Format:
  - Hook: First 10 seconds determine watch-through
  - Pattern interrupts every 30-60 seconds
  - Timestamps for long-form
  - Optimal: 8-15 minutes for algorithm
- Script structure:
  1. Hook (promise or curiosity gap) - 0-10s
  2. Intro/credibility - 10-30s
  3. Content delivery with pattern interrupts
  4. CTA placement at 80% mark (before drop-off)
  5. End screen CTA
- Conversion: Watch time + subscribers + comments
- Avoid: Long intros, asking for subscribe too early
```

#### Email Newsletter

```text
Newsletter Strategy:
- Audience: Opted-in readers, warmer than social
- Psychology: "Was this worth opening? Will next week's be worth it?"
- Format:
  - 300-600 words optimal for weekly
  - One main topic/teaching per issue
  - Personal touch (feels 1:1, not 1:many)
  - Consistent structure readers can expect
- Structure:
  - Subject line: Specific + curiosity
  - Opening: Personal hook or quick story
  - Main teaching: One actionable insight
  - CTA: Soft (reply) or specific (click)
  - Sign-off: Consistent, personal
- Conversion: Replies (relationship) + click-throughs (offers)
- Avoid: Selling every email, being too long, inconsistency
```

## Files to Create

### New Strategy/Config Files

| File | Purpose |
|------|---------|
| `src/lib/platform-content-strategy.ts` | Deep platform-specific conversion configs (similar to email-sequence-strategy.ts) |
| `src/types/contentChallenge.ts` | TypeScript interfaces for wizard data, defaults, validation |

### Database Tables

| Table | Purpose |
|-------|---------|
| `content_challenges` | Challenge metadata (platforms, promotion context, dates) |
| `content_pillars` | Reusable content pillars with names, descriptions, colors |

### Wizard Components

| Component | Purpose |
|-----------|---------|
| `ContentChallengeWizard.tsx` | Main orchestrator using useWizard hook |
| `StepContextCheck.tsx` | Detect/select active promotions |
| `StepPillarsDiscovery.tsx` | Ideal customer + AI pillar suggestions |
| `StepPlatformSelection.tsx` | Choose 1-3 platforms |
| `StepGenerateEdit.tsx` | Per-platform generation with inline editing |
| `StepScheduleCalendar.tsx` | 30-day grid with drag-drop |
| `StepReviewLaunch.tsx` | Final review and content item creation |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `generate-content-pillars` | AI pillar discovery based on ideal customer |
| `generate-platform-content` | Batch 30-day idea generation per platform |
| `generate-single-post` | High-quality copy generation for individual post |
| `create-content-challenge` | Automation for content_items + publishing tasks |

### Hooks

| Hook | Purpose |
|------|---------|
| `useActivePromotions.ts` | Aggregates launches, flash sales, webinars, lead magnets, summits |
| `useContentPillars.ts` | CRUD for reusable content pillars |

## Integration Strategy

### AI Generation Flow

1. **Pillar Generation** (Step 2)
   - Model: `google/gemini-3-flash-preview`
   - Input: Ideal customer, problems solved, topics of interest
   - Output: 5-7 pillar suggestions

2. **Batch Idea Generation** (Step 4)
   - Model: `google/gemini-3-flash-preview`
   - Input: Platform strategy config + pillars + promotion context
   - Output: 30 content ideas with hooks (one API call per platform)

3. **Individual Copy Generation** (Step 4)
   - Model: `google/gemini-2.5-flash` (higher quality for final copy)
   - Input: Platform strategy config + idea + pillar + Brand DNA
   - Output: Full platform-optimized post with proper formatting
   - Includes validation against platform-specific rules

### Quality Enforcement

Each generated post will be validated against its platform strategy:
- Character/word count within platform range
- Required structural elements present
- No platform-specific anti-patterns
- Passes general banned phrases check

### Editorial Calendar Integration

All finalized content creates:
- `content_items` record with `show_in_vault: true`
- Publishing task for scheduled date
- Platform and type properly mapped for calendar display

## Technical Implementation Sequence

1. Database migration (content_challenges, content_pillars)
2. Create `platform-content-strategy.ts` with all platform configs
3. Types file with interfaces and validation
4. `useActivePromotions` hook
5. `useContentPillars` hook  
6. Edge functions (4 functions)
7. Step 1-2 components
8. Step 3-4 components (with ContentIdeaCard for inline editing)
9. Step 5-6 components
10. Main wizard orchestrator
11. Page wrapper and routing
12. WizardHub and integration registration
13. wizard_templates database entry
14. Edge function deployment

## User Experience Summary

```text
Step 1: "You have 'Summer Sale' launching June 15. Create content supporting it?"
         → Auto-detects active promotions from database
         → Falls back to asking about freebies/events/products

Step 2: "Who is your ideal customer?"
         → AI suggests 5-7 content pillars based on customer + business
         → User selects 3-5 pillars with custom colors

Step 3: "Which platforms?" (select 1-3)
         → Instagram, LinkedIn, Twitter/X, TikTok, Facebook, Blog, YouTube, Email

Step 4: Platform 1 - Instagram
         → AI generates 30 ideas with hooks using deep platform strategy
         → User reviews, edits, clicks "Generate Copy" on each
         → Rich text editor for final polish
         → Mark as "Finalized" when satisfied
         → Repeat for each selected platform

Step 5: 30-day calendar grid
         → Drag-drop to reorder
         → Assign specific posting times
         → Visual pillar color coding

Step 6: Review + Create
         → Summary by platform and pillar
         → Creates content_items + publishing tasks
         → Navigate to Editorial Calendar
```

## Key Differentiator

The `platform-content-strategy.ts` file will contain the same depth of strategic intelligence that `email-sequence-strategy.ts` has for emails - including psychological frameworks, conversion mechanics, format rules, gold standard examples, and anti-patterns - ensuring every generated post is optimized for the specific platform's algorithm, audience behavior, and conversion goals.
