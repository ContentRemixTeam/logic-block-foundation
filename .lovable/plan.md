

# Enhanced Adaptive Learning System

## Overview

This plan enhances the existing adaptive learning system to make it more powerful, visible, and comprehensive. Users will see what the AI has learned from their feedback, get positive feedback options (not just negative), and the system will share learnings across related content types.

---

## Current State

### What Exists:
- **Feedback Collection**: Users rate 1-10, add tags (`too_formal`, `too_long`, etc.), and free-text notes
- **Pattern Analysis**: `AdaptiveLearningService.analyzeFeedbackPatterns()` analyzes last 20 rated generations per content type
- **Prompt Injection**: Adjusts temperature, tone shifts, and adds strategic guidance to prompts
- **Activation Threshold**: Requires 3+ rated generations before learning activates
- **Limitation**: Only tracks per content type (no cross-learning)

### Current Feedback Tags:
```typescript
['too_formal', 'too_casual', 'too_long', 'too_short', 'needs_more_emotion', 
 'too_salesy', 'bland_generic', 'wrong_tone', 'missing_cta', 'great_hook']
```

### What's Missing:
- No visibility into what the AI has learned
- Only 1 positive tag (`great_hook`) vs 9 improvement tags
- No cross-content-type learning
- No pre-generation notification of adjustments
- No Learning Dashboard

---

## Implementation Phases

### Phase 1: Expand Feedback Tags (Positive + Negative)

Add balanced positive/negative tags to capture what users love:

```typescript
export const NEGATIVE_FEEDBACK_TAGS = [
  'too_formal',      // → adjust formality -1
  'too_casual',      // → adjust formality +1
  'too_long',        // → shorter length
  'too_short',       // → longer length
  'needs_more_emotion', // → emotion +2
  'too_salesy',      // → reduce urgency/CTAs
  'bland_generic',   // → increase specificity/temp
  'wrong_tone',      // → voice mismatch warning
  'missing_cta',     // → add CTA guidance
  'weak_hook',       // → prioritize hooks
  'confusing_structure', // → clearer structure
  'off_brand',       // → study brand DNA more
];

export const POSITIVE_FEEDBACK_TAGS = [
  'great_hook',       // → emphasize hooks
  'perfect_tone',     // → maintain voice approach
  'love_the_story',   // → use more storytelling
  'excellent_cta',    // → maintain CTA style
  'great_length',     // → keep current length
  'perfect_emotion',  // → maintain emotion level
  'love_the_specifics', // → keep using specific numbers/examples
  'on_brand',         // → maintain brand alignment
  'natural_voice',    // → this IS the user's voice
  'great_structure',  // → keep structural patterns
];
```

**UI Change**: Show positive tags when rating ≥8, negative tags when rating <8

---

### Phase 2: Learning Insights Display

#### 2.1 Create `LearningInsightsCard` Component

A card that shows users what the AI has learned, displayed on:
- AI Dashboard (summary view)
- Generate page (before generation)

**Structure:**
```text
╔══════════════════════════════════════════════╗
║ 🧠 What I've Learned From Your Feedback      ║
╠══════════════════════════════════════════════╣
║ Based on 12 rated generations:               ║
║                                              ║
║ ✓ You prefer SHORTER copy (adjusted -20%)   ║
║ ✓ You love strong hooks (prioritizing)      ║
║ ✓ Tone match is important (extra care)      ║
║                                              ║
║ ❌ Avoiding: Hard CTAs, Urgent language     ║
║ ✓ Emphasizing: Storytelling, Specifics      ║
║                                              ║
║ Avg Rating: 7.8/10 (↑ from 6.2 first week) ║
╚══════════════════════════════════════════════╝
```

#### 2.2 Pre-Generation Learning Notice

Add a subtle notification before generating:

```text
💡 Based on your feedback, I'll adjust for:
   • More casual tone
   • Shorter length
   • Strong opening hooks
```

---

### Phase 3: Cross-Content-Type Learning

Enable learning to transfer between related content types:

```typescript
const CONTENT_TYPE_FAMILIES = {
  email: ['welcome_email_1', 'welcome_email_2', 'welcome_email_3', 
          'welcome_email_4', 'welcome_email_5', 'email_newsletter', 'promo_email'],
  social: ['instagram_post', 'linkedin_post', 'twitter_thread', 'facebook_ad'],
  sales: ['sales_page_headline', 'sales_page_body'],
  video: ['video_script'],
  blog: ['blog_post'],
};

const UNIVERSAL_LEARNINGS = [
  'too_formal', 'too_casual', 'wrong_tone', 'bland_generic',
  'natural_voice', 'on_brand', 'off_brand'
];
```

**Logic:**
1. When generating Email 3, pull learning from ALL email types
2. Tone/voice learnings apply universally
3. Length/structure learnings are content-type specific

---

### Phase 4: Update Adaptive Learning Service

#### 4.1 New Method: `getGlobalLearnings()`

Analyzes ALL rated generations (not per content type) for universal patterns:

```typescript
static async getGlobalLearnings(userId: string): Promise<GlobalLearnings> {
  // Fetch all rated generations (last 50)
  // Identify universal patterns (tone, voice, brand alignment)
  // Return cross-applicable insights
}
```

#### 4.2 New Method: `getLearningInsights()`

Returns human-readable insights for the UI:

```typescript
interface LearningInsights {
  totalRated: number;
  avgRating: number;
  ratingTrend: 'improving' | 'stable' | 'declining';
  keyAdjustments: string[]; // e.g., "Shorter copy", "More casual tone"
  avoidPatterns: string[];
  emphasizePatterns: string[];
  strengthAreas: string[]; // What you consistently love
}
```

#### 4.3 Update `analyzeFeedbackPatterns()`

Merge family-level and global learnings:

```typescript
// Before: Only analyzed exact content type
// After: Analyzes content type + family + universal patterns
```

---

### Phase 5: Update UI Components

#### 5.1 Modify `ContentGenerator.tsx`

Add learning insights display before the Generate button:

```typescript
{learningInsights && learningInsights.totalRated >= 3 && (
  <LearningNotice insights={learningInsights} />
)}
```

#### 5.2 Modify Rating UI

- Rating ≥8: Show positive feedback tags
- Rating <8: Show negative feedback tags  
- Always show free-text option

```typescript
{rating !== null && (
  <FeedbackTagsSelector
    tags={rating >= 8 ? POSITIVE_FEEDBACK_TAGS : NEGATIVE_FEEDBACK_TAGS}
    selected={feedbackTags}
    onToggle={toggleFeedbackTag}
    variant={rating >= 8 ? 'success' : 'improvement'}
  />
)}
```

#### 5.3 Update `AIDashboard.tsx`

Add Learning Insights card:

```typescript
<LearningInsightsCard />
```

---

## File Changes Summary

| Action | File Path |
|--------|-----------|
| **Modify** | `src/types/aiCopywriting.ts` (split FEEDBACK_TAGS into positive/negative) |
| **Modify** | `src/lib/adaptive-learning-service.ts` (add global learnings, insights, cross-type) |
| **Create** | `src/components/ai-copywriting/LearningInsightsCard.tsx` |
| **Create** | `src/components/ai-copywriting/LearningNotice.tsx` |
| **Create** | `src/components/ai-copywriting/FeedbackTagsSelector.tsx` |
| **Create** | `src/hooks/useLearningInsights.ts` |
| **Modify** | `src/components/ai-copywriting/ContentGenerator.tsx` (add insights, update tags) |
| **Modify** | `src/components/ai-copywriting/AIDashboard.tsx` (add insights card) |

---

## Technical Details

### Content Type Families for Cross-Learning

```typescript
export const CONTENT_TYPE_FAMILIES: Record<string, string[]> = {
  email: [
    'welcome_email_1', 'welcome_email_2', 'welcome_email_3',
    'welcome_email_4', 'welcome_email_5', 'email_newsletter', 'promo_email'
  ],
  social: ['instagram_post', 'linkedin_post', 'twitter_thread', 'facebook_ad'],
  sales: ['sales_page_headline', 'sales_page_body'],
  longform: ['blog_post', 'video_script'],
};

export const UNIVERSAL_LEARNINGS = [
  'too_formal', 'too_casual', 'wrong_tone', 'natural_voice',
  'on_brand', 'off_brand', 'bland_generic'
];
```

### Learning Insight Examples

When user's feedback patterns show:
- 5+ "too_long" tags → Display: "You prefer shorter, punchier copy"
- 3+ "great_hook" tags → Display: "Strong hooks are working well - prioritizing"
- avg rating improving → Display: "Quality trending up! (7.2 → 8.1)"

### New Positive Feedback Tag Mappings

```typescript
// In generateAdaptiveParams():
if (pattern.successFactors.includes('love_the_story')) {
  params.emphasizePatterns.push('Storytelling');
  params.strategicGuidance.push('USER LOVES: Stories and personal examples. Use more narrative.');
}

if (pattern.successFactors.includes('perfect_tone')) {
  params.strategicGuidance.push('SUCCESS: Voice match is excellent. Maintain this approach.');
}

if (pattern.successFactors.includes('love_the_specifics')) {
  params.emphasizePatterns.push('Specific numbers and examples');
  params.strategicGuidance.push('USER LOVES: Concrete details and specific numbers. Always include.');
}
```

---

## Success Criteria

- ✅ Users can provide positive feedback (what they love) not just improvements
- ✅ Learning Insights card shows on Dashboard with human-readable adjustments  
- ✅ Pre-generation notice shows what adjustments will be made
- ✅ Cross-content-type learning works (Email 1 feedback helps Email 2-5)
- ✅ Universal learnings (tone, voice) apply across all content types
- ✅ Rating trend is tracked and displayed (improving/stable/declining)
- ✅ At least 10 positive and 12 negative feedback tags available
- ✅ UI clearly separates positive (green) from improvement (amber) tags

