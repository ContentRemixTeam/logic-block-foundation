
# LinkedIn Templates System - Revised Implementation Plan

## Summary of Adjustments Made

Based on your feedback, I've revised the plan to address all 5 issues:

| Issue | Original Plan | Revised Approach |
|-------|---------------|------------------|
| #1 Database Table | Create column in `brand_dna` table | Use `brand_profiles` table (the actual table where Brand DNA is stored) |
| #2 Storage Efficiency | ~2000 tokens per template | ~700 tokens total with shared anti-AI rules |
| #3 Template Storage | Store template definitions in database | Templates in CODE as constants, only user preferences in database |
| #4 Brand DNA Integration | Separate anti-AI rules | Merge with existing `custom_banned_phrases` from Brand DNA |
| #5 File Structure | 3 files | 4 files with clean separation |

---

## Files to Create

| File | Purpose | Size |
|------|---------|------|
| `src/types/linkedinTemplates.ts` | Type definitions for templates and preferences | ~60 lines |
| `src/lib/linkedin-templates.ts` | Template constants + shared anti-AI rules | ~250 lines |
| `src/lib/linkedin-prompt-builder.ts` | Builds efficient prompts from templates | ~150 lines |
| `src/components/ai-copywriting/LinkedInTemplateSelector.tsx` | Visual template selection UI | ~200 lines |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ai-copywriting/ContentGenerator.tsx` | Add template selection step when `contentType === 'linkedin_post'` |
| `src/lib/openai-service.ts` | Route LinkedIn generation through template prompt builder when template selected |
| `src/types/brandDNA.ts` | Add `linkedin_template_prefs` interface to BrandDNA type |
| `src/hooks/useBrandDNA.ts` | Update to handle new preferences field |

## Database Changes

Add a JSONB column to `brand_profiles` for user preferences only (not template definitions):

```sql
ALTER TABLE public.brand_profiles
ADD COLUMN IF NOT EXISTS linkedin_template_prefs jsonb DEFAULT '{
  "preferredTemplate": null,
  "usageStats": {}
}'::jsonb;
```

This column stores only:
- `preferredTemplate`: Last used template ID (for default selection)
- `usageStats`: Object tracking how many times each template was used
- Future: `customTemplates` array for user-created templates

---

## Technical Implementation Details

### 1. Template Constants (src/lib/linkedin-templates.ts)

Templates stored efficiently in code:

```text
LINKEDIN_ANTI_AI_RULES (shared - 150 tokens)
├── bannedPhrases: string[]       // "delve", "unlock potential", etc.
├── requiredPatterns: string[]    // Contractions, specific numbers
└── engagementRules: string[]     // Question endings, etc.

LINKEDIN_TEMPLATES (5 templates - ~550 tokens total)
├── vulnerable_pivot
│   ├── id, name, description
│   ├── hookPattern: "[Shocking admission] + context"
│   ├── structure: 5 required steps
│   └── example: One gold-standard post (~100 words)
├── numbers_story
├── if_i_started_over
├── contrarian_take
└── mistake_autopsy
```

### 2. Prompt Builder (src/lib/linkedin-prompt-builder.ts)

The builder will:
1. Take the selected template + user's topic/brain dump
2. Merge banned phrases from:
   - `LINKEDIN_ANTI_AI_RULES.bannedPhrases` (system defaults)
   - `brandDNA.custom_banned_phrases` (user's custom list)
3. Build a compact prompt (~1000 tokens total) with:
   - Template structure requirements
   - One gold-standard example
   - Combined anti-AI rules with strong enforcement language
   - Platform strategy from existing `LINKEDIN_STRATEGY`

```typescript
export function buildLinkedInTemplatePrompt(
  template: LinkedInTemplate,
  topic: string,
  brandDNA: BrandDNA,
  brainDump?: string
): { systemPrompt: string; userPrompt: string }
```

### 3. Type Definitions (src/types/linkedinTemplates.ts)

```typescript
interface LinkedInTemplate {
  id: string;
  name: string;
  description: string;
  hookPattern: string;
  structure: string[];
  example: string;
  exampleWhyItWorks: string[];
}

interface LinkedInTemplatePrefs {
  preferredTemplate: string | null;
  usageStats: Record<string, number>;
}
```

### 4. Template Selector UI

Visual card-based selection showing:
- Template name and description
- Hook pattern preview
- "View Example" button to see full gold-standard post
- Selection state (highlighted border when selected)
- Optional "Surprise Me" button for random selection

Integration into ContentGenerator flow:
```text
1. User selects "LinkedIn Post" content type
2. (Optional) Social Post Ideation for topic/brain dump
3. NEW: Template selection appears
4. User clicks Generate
5. Result shows "Generated using: [Template Name]" badge
```

---

## Token Efficiency Breakdown

| Component | Tokens |
|-----------|--------|
| Shared anti-AI rules | ~150 |
| Template structure (1 of 5) | ~80 |
| Template example (1 of 5) | ~200 |
| Platform strategy context | ~100 |
| User context (topic, brain dump) | ~100-300 |
| **Total per generation** | **~630-830 tokens** |

This is well under the 1000-token target you specified.

---

## Anti-AI Rules Merge Logic

```typescript
// In linkedin-prompt-builder.ts
const allBannedPhrases = [
  ...LINKEDIN_ANTI_AI_RULES.bannedPhrases,  // System defaults (15+ phrases)
  ...(brandDNA.custom_banned_phrases || [])  // User's custom banned phrases
];

// Deduplicate and format for prompt
const uniqueBanned = [...new Set(allBannedPhrases)];
```

This ensures that:
- All users get the core anti-AI protections automatically
- Users can add their own banned phrases in Brand DNA settings
- Everything is merged seamlessly for generation

---

## Implementation Sequence

1. **Types file** - Define LinkedInTemplate and LinkedInTemplatePrefs interfaces
2. **Templates constants** - Create the 5 templates with shared anti-AI rules
3. **Prompt builder** - Build efficient prompts that merge Brand DNA
4. **Database migration** - Add `linkedin_template_prefs` column to `brand_profiles`
5. **BrandDNA types update** - Add prefs to TypeScript types
6. **Template selector UI** - Card-based selection component
7. **ContentGenerator integration** - Add template step for LinkedIn content type
8. **OpenAI service update** - Route to template prompts when applicable

---

## The 5 Template Definitions

Each template will include:

### Vulnerable Pivot
- **Hook**: "[Shocking admission]"
- **Structure**: Admission, context, pivot insight, lesson, question
- **Example**: "I fired my best client last week..."

### Numbers Story
- **Hook**: "[Specific number] + contrast"
- **Structure**: Number hook, context, insight, framework, question
- **Example**: "I interviewed 47 candidates. Only 3 made it..."

### If I Started Over
- **Hook**: "[Time span] + hindsight"
- **Structure**: Experience claim, what I'd change, lessons list, the big one, invitation
- **Example**: "10 years in marketing. Here's what I'd tell my younger self..."

### Contrarian Take
- **Hook**: "Unpopular opinion: [challenge]"
- **Structure**: Hot take, why most believe opposite, reasoning, evidence, question
- **Example**: "Unpopular opinion: Hustle culture is killing your business..."

### Mistake Autopsy
- **Hook**: "My $X mistake"
- **Structure**: Mistake intro, what happened, analysis, lessons, prevention, question
- **Example**: "My $50,000 mistake (and what I'd do differently)..."

---

## Implementation Status ✅

All items completed:

- [x] Types file created (`src/types/linkedinTemplates.ts`)
- [x] Template constants created (`src/lib/linkedin-templates.ts`)
- [x] Prompt builder created (`src/lib/linkedin-prompt-builder.ts`)
- [x] Database migration applied (`linkedin_template_prefs` column)
- [x] BrandDNA types updated to include LinkedIn prefs
- [x] Template selector UI created (`LinkedInTemplateSelector.tsx`)
- [x] ContentGenerator integration complete
- [x] OpenAI service integration with specialized template path

## Success Criteria

After implementation, generate 5 test posts with topic "How I validated my SaaS idea before writing code" and verify:

- [ ] Each post follows its template structure distinctly
- [ ] All posts use contractions naturally
- [ ] No banned phrases appear ("delve", "unlock potential", "landscape", etc.)
- [ ] Each ends with a genuine question (not "Thoughts?" or "Agree?")
- [ ] Specific numbers/examples are included
- [ ] Posts sound human when read aloud
- [ ] User's custom banned phrases from Brand DNA are respected
