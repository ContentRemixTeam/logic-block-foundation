
# Add Content Examples to Brand DNA

## Overview

Add a new "Examples" tab to the Brand DNA panel where users can provide 2 examples of their own copy for each content category (Email, Social, Sales, Long-form). These examples will be injected into the AI prompt to dramatically improve output quality through few-shot learning.

---

## Why 2 Examples Per Category?

- **Few-shot learning sweet spot**: 2-3 examples give the AI enough variety to identify patterns without over-fitting to a single piece
- **Manageable for users**: 8 total examples (vs 16+ per content type) is achievable
- **Context efficiency**: Doesn't overwhelm the LLM context window
- **Cross-type learning**: Email 1 example helps generate Email 2-5

---

## Implementation Details

### 1. Database Migration

Add a new JSONB column to store content examples:

```sql
ALTER TABLE brand_profiles
ADD COLUMN IF NOT EXISTS content_examples JSONB DEFAULT '{}';
```

**Structure stored:**
```json
{
  "email": ["Example email 1...", "Example email 2..."],
  "social": ["Example social post 1...", "Example social post 2..."],
  "sales": ["Example sales copy 1...", "Example sales copy 2..."],
  "longform": ["Example blog/video script 1...", "Example blog/video script 2..."]
}
```

---

### 2. Update Types

**Modify `src/types/brandDNA.ts`:**

```typescript
export interface ContentExamples {
  email: string[];      // Up to 2 examples
  social: string[];     // Up to 2 examples
  sales: string[];      // Up to 2 examples
  longform: string[];   // Up to 2 examples
}

export interface BrandDNA {
  // ... existing fields
  content_examples: ContentExamples;
}

export const DEFAULT_CONTENT_EXAMPLES: ContentExamples = {
  email: ['', ''],
  social: ['', ''],
  sales: ['', ''],
  longform: ['', '']
};
```

---

### 3. Update Brand DNA Panel UI

**Modify `src/components/ai-copywriting/BrandDNAPanel.tsx`:**

Add a 5th tab "Examples" to the TabsList:

```typescript
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="banned">Banned Words</TabsTrigger>
  <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
  <TabsTrigger value="phrases">Phrases</TabsTrigger>
  <TabsTrigger value="values">Values</TabsTrigger>
  <TabsTrigger value="examples">Examples</TabsTrigger>
</TabsList>
```

**New Examples Tab Content:**

4 cards, one per category (Email, Social, Sales, Long-form), each with:
- Category title and description
- 2 textarea fields for examples
- Helper text explaining what to paste

```text
╔═══════════════════════════════════════════════════════════╗
║ 📧 Email Examples                                         ║
║ Paste examples of emails you've written that capture      ║
║ your voice (welcome emails, promos, newsletters)          ║
╠═══════════════════════════════════════════════════════════╣
║ Example 1: [Large textarea]                               ║
║                                                           ║
║ Example 2: [Large textarea]                               ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║ 📱 Social Media Examples                                  ║
║ Share social posts that performed well (any platform)     ║
╠═══════════════════════════════════════════════════════════╣
║ Example 1: [Medium textarea]                              ║
║                                                           ║
║ Example 2: [Medium textarea]                              ║
╚═══════════════════════════════════════════════════════════╝

... (Sales, Long-form cards)
```

---

### 4. Update Hook & Parsing

**Modify `src/hooks/useBrandDNA.ts`:**

- Update the select query to include `content_examples`
- Update the save mutation to persist `content_examples`

**Modify `src/types/brandDNA.ts` `parseBrandDNA()` function:**

```typescript
export function parseBrandDNA(data: {...}): BrandDNA {
  return {
    // ... existing parsing
    content_examples: (data.content_examples && typeof data.content_examples === 'object'
      ? data.content_examples
      : DEFAULT_CONTENT_EXAMPLES) as ContentExamples
  };
}
```

---

### 5. Inject Examples into AI Prompt

**Modify `src/lib/openai-service.ts` `buildBrandDNAPromptAdditions()`:**

Add section to inject relevant examples based on content type:

```typescript
// Content examples for this type
if (brandDNA.content_examples && contentFamily) {
  const examples = brandDNA.content_examples[contentFamily];
  if (examples && examples.filter(e => e.trim()).length > 0) {
    additions += '\n\n📝 USER\'S OWN EXAMPLES (match this style EXACTLY):\n';
    examples.forEach((ex, i) => {
      if (ex.trim()) {
        additions += `\n--- Example ${i + 1} ---\n${ex}\n`;
      }
    });
    additions += '\n⚠️ CRITICAL: Study these examples closely. Match the structure, sentence patterns, and personality.\n';
  }
}
```

**Pass content family to the method:**
- When generating "welcome_email_3", pass family "email"
- This selects the right examples automatically

---

## File Changes Summary

| Action | File |
|--------|------|
| **Create** | `supabase/migrations/XXXXX_add_content_examples.sql` |
| **Modify** | `src/types/brandDNA.ts` (add ContentExamples interface + default) |
| **Modify** | `src/hooks/useBrandDNA.ts` (fetch/save content_examples) |
| **Modify** | `src/components/ai-copywriting/BrandDNAPanel.tsx` (add Examples tab) |
| **Modify** | `src/lib/openai-service.ts` (inject examples into prompt) |

---

## User Experience

1. User navigates to Brand DNA → Examples tab
2. Sees 4 cards: Email, Social, Sales, Long-form
3. Pastes 1-2 examples of their best copy into each category
4. Clicks Save
5. Next generation in that category will include their examples as few-shot learning references
6. AI matches their style much more closely

---

## Content Category Helpers

| Category | Content Types Covered | Example Prompt |
|----------|----------------------|----------------|
| **Email** | Welcome 1-5, Newsletter, Promo | "Paste a welcome email or newsletter you've sent" |
| **Social** | Instagram, LinkedIn, Twitter, Facebook | "Paste a social post that performed well" |
| **Sales** | Sales page headline, body | "Paste sales page copy or a landing page section" |
| **Long-form** | Blog post, Video script | "Paste a blog intro or video script excerpt" |
