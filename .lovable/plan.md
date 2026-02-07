
# AI Copywriting + Editorial Calendar Integration

## Overview

This plan implements bidirectional integration between the AI Copywriting feature and the Editorial Calendar, enabling two key workflows:

1. **From Copywriting → Calendar**: Add generated copy directly to the Editorial Calendar
2. **From Calendar → Copywriting**: Generate AI copy when scheduling content

## Data Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        AI COPYWRITING                               │
│  ┌──────────────────┐     ┌──────────────────┐                     │
│  │ ContentGenerator │ ──► │ CopyLibrary      │                     │
│  │ (generates copy) │     │ (stores history) │                     │
│  └──────────────────┘     └──────────────────┘                     │
│           │                        │                                │
│           ▼                        ▼                                │
│   "Add to Calendar"        "Add to Calendar"                       │
│      (new button)             (new button)                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      content_items TABLE                            │
│  - body: stores the generated copy                                  │
│  - type: email, social_post, etc.                                  │
│  - channel: platform (email, instagram, etc.)                       │
│  - planned_creation_date / planned_publish_date                     │
│  - ai_generation_id: (NEW) links back to ai_copy_generations        │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                       EDITORIAL CALENDAR                            │
│  ┌──────────────────┐     ┌──────────────────────────┐             │
│  │ AddContentDialog │     │ ContentQuickEditDrawer   │             │
│  │ (new tab: AI)    │     │ (new: "Generate Copy")   │             │
│  └──────────────────┘     └──────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Database Changes

### Add column to link content items to AI generations

A new nullable column on `content_items` to track which AI generation produced the copy:

- **Column**: `ai_generation_id UUID REFERENCES ai_copy_generations(id)`
- **Purpose**: Enables traceability between calendar content and its AI-generated source

---

## Part 2: AI Copywriting Changes

### 2.1 ContentGenerator.tsx - Add "Add to Calendar" button

After generating copy, add a new button next to "Copy" and "Regenerate":

- **Button**: "Add to Calendar" with Calendar icon
- **Action**: Opens a modal/dialog to schedule the content
- **Fields in modal**:
  - Title (pre-filled based on content type, e.g., "Welcome Email #1")
  - Platform (auto-mapped from content type: email, social, etc.)
  - Creation Date (optional)
  - Publish Date (required)
  - Campaign/Launch (optional dropdown)
- **On submit**: Creates a `content_items` record with:
  - `body`: the generated copy
  - `type`: mapped from content type
  - `channel`: mapped from content type (email, instagram, etc.)
  - `ai_generation_id`: the ID of the generation
  - `show_in_vault`: true
  - Dates as specified

### 2.2 CopyLibrary.tsx - Add "Add to Calendar" in detail dialog

In the existing detail dialog, add a button alongside "Copy to Clipboard":

- **Button**: "Add to Calendar"
- **Opens same scheduling modal as ContentGenerator**

### 2.3 Create new component: AddToCalendarModal

A reusable modal component that:
- Accepts generated copy text, content type, and generation ID
- Shows scheduling form (title, platform, dates, campaign)
- Creates the content_items record
- Invalidates Editorial Calendar queries

---

## Part 3: Editorial Calendar Changes

### 3.1 AddContentDialog.tsx - New "AI Generate" tab

Add a fourth tab alongside "Create New", "From Ideas", and "From Vault":

- **Tab**: "AI Generate" with Sparkles icon
- **Content**:
  - Content type dropdown (matching AI Copywriting types)
  - Product to promote dropdown (optional)
  - Additional context textarea
  - "Generate Copy" button
  - Preview of generated copy
  - Date selection (creation + publish)
  - Campaign selection
- **Flow**:
  1. User selects content type and optional product
  2. Clicks "Generate Copy"
  3. AI generates copy (shows loading state with progress)
  4. Copy appears in preview area
  5. User reviews, sets dates, clicks "Add to Calendar"
  6. Creates content_items with the generated body

### 3.2 ContentQuickEditDrawer.tsx - Add "Generate Copy" button

For existing calendar items that have no body copy:

- **Button**: "Generate with AI" in the Copy/Caption section
- **Pre-condition**: Item must be a content_item (not task/plan)
- **Action**: Opens inline generation UI or redirects to AI Copywriting
- **Alternative flow**: If body is empty, show a quick CTA to generate

### 3.3 Tier gating

The AI generation features require Entrepreneur or Mastermind tier:
- Check tier before showing AI tab/buttons
- Show upgrade prompt for Personal tier users

---

## Part 4: Content Type Mapping

Map AI content types to Editorial Calendar formats:

| AI Content Type | Calendar Type | Calendar Channel |
|-----------------|---------------|------------------|
| welcome_email_1-5 | email | email |
| promo_email | email | email |
| sales_page_headline | page | website |
| sales_page_body | page | website |
| social_post | post | (user selects) |

---

## Part 5: Files to Create/Modify

### New Files

1. **`src/components/ai-copywriting/AddToCalendarModal.tsx`**
   - Reusable modal for scheduling AI-generated copy
   - Props: copy text, content type, generation ID, onSuccess callback
   - Form: title, platform, dates, campaign
   - Creates content_items record

2. **`src/hooks/useAddCopyToCalendar.ts`**
   - Mutation hook for creating content_items from AI generations
   - Handles the content type → calendar type mapping
   - Invalidates appropriate query keys

### Modified Files

1. **`src/components/ai-copywriting/ContentGenerator.tsx`**
   - Add "Add to Calendar" button after generation
   - Import and use AddToCalendarModal
   - Track modal open state

2. **`src/components/ai-copywriting/CopyLibrary.tsx`**
   - Add "Add to Calendar" button in detail dialog
   - Import and use AddToCalendarModal

3. **`src/components/editorial-calendar/AddContentDialog.tsx`**
   - Add "AI Generate" tab (4th tab)
   - Import content type options from AI types
   - Add generation state and preview
   - Integrate with OpenAI service for generation

4. **`src/components/editorial-calendar/ContentQuickEditDrawer.tsx`**
   - Add "Generate with AI" button when body is empty
   - Optional: inline quick generation

5. **Database migration**
   - Add `ai_generation_id` column to content_items

---

## Technical Details

### Query Invalidation

When adding copy to calendar, invalidate:
- `editorial-calendar-content`
- `editorial-calendar-unscheduled`
- `content-vault-items`
- `content-for-planner`

### Tier Check Pattern

```typescript
const { tier } = useUserTier();
const canUseAI = tier === 'entrepreneur' || tier === 'mastermind';
```

### Content Type Mapping Helper

```typescript
function mapContentTypeToCalendar(aiType: ContentType): { type: string; channel: string } {
  if (aiType.includes('email')) {
    return { type: 'email', channel: 'email' };
  }
  if (aiType.includes('sales_page')) {
    return { type: 'page', channel: 'website' };
  }
  if (aiType === 'social_post') {
    return { type: 'post', channel: '' }; // User selects
  }
  return { type: 'post', channel: '' };
}
```

---

## Success Criteria

- From ContentGenerator: "Add to Calendar" button schedules copy with dates
- From CopyLibrary: Can schedule any past generation to calendar
- From AddContentDialog: New "AI Generate" tab generates and schedules in one flow
- From ContentQuickEditDrawer: Can generate copy for empty content items
- All features gated to Entrepreneur/Mastermind tiers
- Generated copy appears correctly in calendar with proper dates/lanes
- Content appears in Content Vault with AI-generated body
