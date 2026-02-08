
# Universal Content System + Brand DNA Implementation Plan

## Overview

This plan transforms the AI copywriting system from email-focused to a universal content generation engine with 10+ content types, adds Brand DNA features for deep personalization (custom banned phrases, frameworks, signature phrases, emoji preferences, and brand values), and integrates everything into the existing generation pipeline.

---

## Current State Analysis

### What Exists:
- **Content Types**: 9 types defined in `CONTENT_TYPE_OPTIONS` (5 welcome emails, 2 sales page types, 1 social post, 1 promo email)
- **Brand Profile**: Basic fields (business_name, industry, voice_profile, voice_samples) in `brand_profiles` table
- **Copy Controls**: Length, emotion, urgency, tone controls with defaults per content type
- **Quality System**: Multi-pass generation with AI detection, banned phrases, and tactical tip validation
- **Generation Modes**: Efficient (4-pass) and Premium (7-pass)

### What's Missing:
- Universal content types (LinkedIn, Twitter threads, Facebook ads, blog posts, video scripts, Instagram)
- Brand DNA features (custom banned words, frameworks, signature phrases, emoji control, brand values)
- Content type selector UI organized by category
- Integration of Brand DNA into the generation pipeline

---

## Implementation Phases

### Phase 1: Database Schema Updates

Add Brand DNA fields to the `brand_profiles` table:

```sql
ALTER TABLE brand_profiles
ADD COLUMN IF NOT EXISTS custom_banned_phrases TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS frameworks JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS signature_phrases JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS emoji_preferences JSONB DEFAULT '{"use_emojis": false, "preferred_emojis": []}',
ADD COLUMN IF NOT EXISTS content_philosophies TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS brand_values TEXT[] DEFAULT '{}';
```

**No new tables needed** - extends existing brand_profiles for data locality.

---

### Phase 2: Type Definitions

#### 2.1 Universal Content Types (`src/types/contentTypes.ts`)

Create a new organized content type system:

| Category | Content Types |
|----------|--------------|
| **Email** | Welcome Emails 1-5, Newsletter, Promo Email |
| **Social** | Instagram Post, LinkedIn Post, Twitter/X Thread |
| **Ad** | Facebook Ad |
| **Sales** | Sales Page Headline, Sales Page Body |
| **Other** | Blog Post, Video Script |

Each type includes:
- **id**: Unique identifier
- **category**: Email/Social/Ad/Sales/Other
- **name**: Display name
- **icon**: Emoji for UI
- **description**: What it's for
- **defaultControls**: Auto-set copy controls
- **guidance**: Specific prompt instructions for that content type

#### 2.2 Brand DNA Types (`src/types/brandDNA.ts`)

```typescript
interface BrandDNA {
  custom_banned_phrases: string[];
  frameworks: BrandFramework[];
  signature_phrases: string[];
  emoji_preferences: { use_emojis: boolean; preferred_emojis: string[] };
  content_philosophies: string[];
  brand_values: string[];
}

interface BrandFramework {
  id: string;
  name: string;
  description: string;
  example?: string;
}
```

---

### Phase 3: UI Components

#### 3.1 Content Type Selector (`src/components/ai-copywriting/ContentTypeSelector.tsx`)

**Design:**
- Visual grid organized by category (Email, Social, Ad, Sales, Other)
- Each type shows icon, name, and description
- Selected state highlighted with primary color
- Replaces current dropdown in ContentGenerator

#### 3.2 Brand DNA Editor (`src/components/ai-copywriting/BrandDNAPanel.tsx`)

**Tabbed interface with 4 sections:**

| Tab | Features |
|-----|----------|
| **Banned Words** | Add/remove custom phrases to avoid |
| **Frameworks** | Create named frameworks with descriptions and examples |
| **Phrases** | Signature expressions + emoji preferences toggle |
| **Values** | Content philosophies and brand values (text areas) |

---

### Phase 4: Hooks & Data Layer

#### 4.1 Brand DNA Hook (`src/hooks/useBrandDNA.ts`)

- `useBrandDNA()`: Fetches Brand DNA from brand_profiles, returns DEFAULT_BRAND_DNA for new users
- `saveBrandDNA()`: Updates Brand DNA fields on brand_profiles

#### 4.2 Update Existing Hooks

- Extend `useBrandProfile` to include Brand DNA fields
- Update `useGenerateCopy` to pass Brand DNA to OpenAIService

---

### Phase 5: Generation Pipeline Integration

#### 5.1 Update OpenAI Service (`src/lib/openai-service.ts`)

1. **Add Brand DNA to context interface:**
```typescript
context: {
  businessProfile?: Partial<BrandProfile>;
  brandDNA?: BrandDNA; // Add this
  productToPromote?: UserProduct | null;
  additionalContext?: string;
  pastFeedback?: AICopyGeneration[];
}
```

2. **Inject Brand DNA into system prompt:**
```
❌ NEVER USE THESE WORDS:
- [custom_banned_phrases...]

🎯 YOUR FRAMEWORKS:
**Framework Name**: Description
Example: "..."

💬 SIGNATURE PHRASES (use when relevant):
- "..."

😊 Preferred emojis: 🎉 ✨ 💡 (or ❌ DO NOT USE EMOJIS)

📚 CONTENT PHILOSOPHIES:
- [philosophies...]
```

3. **Update banned phrase validation:**
```typescript
const allBanned = [
  ...BANNED_PHRASES, // System defaults
  ...(options.context.brandDNA?.custom_banned_phrases || [])
];
```

4. **Add content type guidance:**
```typescript
const contentTypeDef = getContentType(options.contentType);
if (contentTypeDef) {
  prompt += `\n\n═══ CONTENT TYPE: ${contentTypeDef.name} ═══\n`;
  prompt += contentTypeDef.guidance;
}
```

---

### Phase 6: Update ContentGenerator UI

1. Replace dropdown with `<ContentTypeSelector>` component
2. Auto-set copy controls when content type changes
3. Fetch Brand DNA and pass to generation

---

### Phase 7: Navigation & Routing

1. Add Brand DNA page route: `/ai-copywriting/brand-dna`
2. Add navigation link in AI Dashboard or sidebar

---

## File Changes Summary

| Action | File Path |
|--------|-----------|
| **Create** | `src/types/contentTypes.ts` |
| **Create** | `src/types/brandDNA.ts` |
| **Create** | `src/components/ai-copywriting/ContentTypeSelector.tsx` |
| **Create** | `src/components/ai-copywriting/BrandDNAPanel.tsx` |
| **Create** | `src/hooks/useBrandDNA.ts` |
| **Modify** | `src/types/aiCopywriting.ts` (add new content types) |
| **Modify** | `src/types/copyControls.ts` (add defaults for new types) |
| **Modify** | `src/lib/openai-service.ts` (Brand DNA + content guidance) |
| **Modify** | `src/hooks/useAICopywriting.ts` (fetch/pass Brand DNA) |
| **Modify** | `src/components/ai-copywriting/ContentGenerator.tsx` (new selector) |
| **Modify** | `src/components/ai-copywriting/AIDashboard.tsx` (Brand DNA link) |

---

## Technical Details

### New Content Types with Defaults

```text
instagram_post:   short, high emotion, no urgency, casual
linkedin_post:    medium, moderate emotion, no urgency, balanced
twitter_thread:   medium, moderate emotion, no urgency, casual
facebook_ad:      short, high emotion, soft urgency, casual
blog_post:        long, moderate emotion, no urgency, balanced
video_script:     medium, high emotion, no urgency, casual
email_newsletter: medium, moderate emotion, no urgency, balanced
```

### Content Type Guidance Examples

**Instagram Post:**
```
REQUIREMENTS:
- Hook in first 3 words
- Line breaks for readability (2-3 lines max per paragraph)
- One clear point
- Engagement question at end
- 100-300 words max
```

**Video Script:**
```
REQUIREMENTS:
- Hook in first 3 seconds
- Pattern interrupts every 30s
- Conversational (write how you speak)
- Visual cues noted: [B-roll], [Show screen]
- Strong CTA
- 300-800 words (2-5 min)
```

---

## Success Criteria

- 10+ content types available, organized by category
- Content type selection auto-sets appropriate copy controls
- Brand DNA page allows managing custom banned phrases, frameworks, signature phrases, emoji preferences, and values
- All Brand DNA elements appear in generated content
- Custom banned phrases are enforced (added to existing banned phrase check)
- Each content type has specific guidance in the prompt
- Generation quality remains consistent (8+/10 for Premium mode)
