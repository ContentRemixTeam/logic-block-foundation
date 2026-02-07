

# Hybrid AI Email Generation Integration for Launch Planner V2

## Overview

This plan implements a user-friendly AI copy generation flow that meets users where they are in their planning process, with three key integration points:

1. **Step 4 (Pre-Launch Strategy)** - Lightweight hints when "Need to write" is selected
2. **Step 8 (Review Step)** - Batch generation hub before creating the launch
3. **Post-Wizard (Project Page)** - Persistent access to content generation

---

## User Experience Flow

```text
Step 4: Pre-Launch Strategy
    User selects "Warm-Up Sequence" → "Need to write"
        ↓
    See subtle hint: "✨ AI can write this for you"
    (No action required here - just awareness)
        ↓
    Continue planning...
        ↓
Step 8: Review & Complete
    See new "Content to Create" section showing:
    ├── 📧 Warm-Up Sequence (5 emails) - Need to write
    ├── 📧 Launch Sequence (7 emails) - Need to write
    ├── 📄 Sales Page - In progress
    └── [Generate All with AI] or [Generate] per item
        ↓
    User clicks "Generate Warm-Up Sequence"
        ↓
    Modal opens with context preview (offer, dates, customer)
    Multi-pass generation (30-45s)
    Preview 5 emails with AI detection scores
        ↓
    User can:
    ├── Regenerate individual emails
    ├── Edit inline
    ├── "Add to Calendar" (schedules based on cart open date)
    └── "Save to Vault" (for later)
        ↓
    Click "Create Launch"
        ↓
Project Page (after creation)
    "Content Needs" card shows any ungenerated sequences
    Same AI generation available post-wizard
```

---

## Part 1: Step 4 - Lightweight AI Hints

### File: `src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx`

**Changes:**

Add subtle AI hint when user selects "Need to write" for any email sequence.

**Current behavior** (lines 537-547):
```tsx
{sequence?.status === 'needs-creation' && (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">Deadline (optional)</Label>
    <Input type="date" ... />
  </div>
)}
```

**New behavior:**
```tsx
{sequence?.status === 'needs-creation' && (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-xs text-primary">
      <Sparkles className="h-3 w-3" />
      <span>AI can write this for you in the Review step</span>
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Deadline (optional)</Label>
      <Input type="date" ... />
    </div>
  </div>
)}
```

**Also add hint for Sales Page:**

When `salesPageStatus === 'needs-creation'`:
```tsx
<div className="flex items-center gap-2 text-xs text-primary mt-2">
  <Sparkles className="h-3 w-3" />
  <span>Generate sales page copy with AI in the Review step</span>
</div>
```

---

## Part 2: Step 8 - Content Generation Hub

### File: `src/components/wizards/launch-v2/steps/StepReviewComplete.tsx`

**New Section: Content to Create**

Add this section between "Launch Summary" and "Task Preview" (around line 201):

**Structure:**
```tsx
{/* Content to Create Hub */}
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-base">
      <FileText className="h-5 w-5 text-primary" />
      Content to Create
    </CardTitle>
    <p className="text-sm text-muted-foreground">
      Generate high-quality copy with AI before creating your launch
    </p>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* List of content needing creation */}
    {contentNeedsCreation.map(item => (
      <ContentNeedsItem 
        key={item.id}
        item={item}
        onGenerate={() => openAIGenerator(item)}
        hasAPIKey={hasValidAPIKey}
      />
    ))}
    
    {/* Batch generate button */}
    {contentNeedsCreation.length > 1 && (
      <div className="pt-3 border-t">
        <Button onClick={handleGenerateAll} disabled={!hasValidAPIKey}>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate All ({contentNeedsCreation.length} items)
        </Button>
      </div>
    )}
    
    {/* No API key warning */}
    {!hasValidAPIKey && (
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <span>Connect your OpenAI API key to use AI generation. </span>
          <Link to="/ai-copywriting" className="underline">Set up API key</Link>
        </AlertDescription>
      </Alert>
    )}
  </CardContent>
</Card>
```

**ContentNeedsItem Component (inline):**
```tsx
function ContentNeedsItem({ item, onGenerate, hasAPIKey, isGenerated }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-3">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{item.label}</p>
          <p className="text-xs text-muted-foreground">
            {item.emailCount} emails • {item.purpose}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isGenerated ? (
          <Badge className="bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Generated
          </Badge>
        ) : (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onGenerate}
            disabled={!hasAPIKey}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Generate
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Helper function to build content needs list:**
```tsx
const buildContentNeedsList = useMemo(() => {
  const needs: ContentNeedItem[] = [];
  
  // Email sequences that need creation
  const sequences = data.emailSequences || [];
  sequences.forEach(seq => {
    if (seq.status === 'needs-creation') {
      const config = EMAIL_SEQUENCE_CONFIGS[`launch_${seq.type}_sequence`];
      if (config) {
        needs.push({
          id: seq.type,
          type: 'email_sequence',
          contentType: `launch_${seq.type}_sequence` as WizardContentType,
          label: config.label,
          emailCount: config.emailCount,
          purpose: config.emails[0]?.purpose || 'Email sequence',
        });
      }
    }
  });
  
  // Sales page
  if (data.salesPageStatus === 'needs-creation' || data.salesPageStatus === 'in-progress') {
    needs.push({
      id: 'sales_page',
      type: 'sales_page',
      contentType: 'launch_sales_page',
      label: 'Sales Page',
      purpose: 'Full long-form sales page copy',
    });
  }
  
  return needs;
}, [data.emailSequences, data.salesPageStatus]);
```

---

## Part 3: Generated Content State Management

### New State in StepReviewComplete

Track which content has been generated within the wizard session:

```tsx
const [generatedContent, setGeneratedContent] = useState<Record<string, boolean>>({});
const [openGeneratorType, setOpenGeneratorType] = useState<WizardContentType | null>(null);

// After successful generation
const handleGenerationComplete = (contentType: WizardContentType) => {
  setGeneratedContent(prev => ({ ...prev, [contentType]: true }));
  setOpenGeneratorType(null);
};
```

---

## Part 4: Integrate WizardAIGeneratorModal

### In StepReviewComplete

Add the modal component and connect it to the Review step:

```tsx
{/* AI Generation Modal */}
<WizardAIGeneratorModal
  open={openGeneratorType !== null}
  onOpenChange={(open) => !open && setOpenGeneratorType(null)}
  wizardType="launch-v2"
  wizardData={data}
  contentType={openGeneratorType || 'launch_warmup_sequence'}
  baseDate={data.cartOpensDate}
  onScheduleToCalendar={(emails, baseDate) => {
    // Will be scheduled when calendar is set up
  }}
  onSaveToVault={(emails) => {
    // Will be saved to vault
  }}
/>
```

---

## Part 5: API Key Status Check

### New Hook Usage

Add API key status check to StepReviewComplete:

```tsx
import { useAPIKey } from '@/hooks/useAICopywriting';

// In component
const { data: apiKey } = useAPIKey();
const hasValidAPIKey = apiKey?.key_status === 'valid';
```

---

## Part 6: Visual Flow Indicators

### Generated Content Indicator

When content is generated, update the UI:

**Before generation:**
```
📧 Warm-Up Sequence (5 emails)    [Generate]
```

**After generation:**
```
✅ Warm-Up Sequence (5 emails)    [View] [Regenerate]
   └── Scheduled to calendar • Est. cost: $0.18
```

---

## Part 7: Files Summary

| File | Changes |
|------|---------|
| `src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx` | Add AI hints for email sequences and sales page |
| `src/components/wizards/launch-v2/steps/StepReviewComplete.tsx` | Add "Content to Create" hub section with AI generation |
| `src/components/wizards/shared/ContentNeedsHub.tsx` | **NEW** - Reusable component for content generation list |
| `src/types/wizardAIGeneration.ts` | Add `ContentNeedItem` type |

---

## Part 8: Technical Details

### New Type: ContentNeedItem

Add to `src/types/wizardAIGeneration.ts`:

```tsx
export interface ContentNeedItem {
  id: string;
  type: 'email_sequence' | 'sales_page' | 'social_batch';
  contentType: WizardContentType;
  label: string;
  emailCount?: number;
  purpose: string;
}
```

### Mapping Email Sequence Types

| Wizard Selection | WizardContentType |
|-----------------|-------------------|
| warmUp | `launch_warmup_sequence` |
| launch | `launch_open_sequence` |
| cartClose | `launch_cartclose_sequence` |
| postPurchase | `launch_postpurchase_sequence` |
| (follow-up) | `launch_followup_sequence` |

---

## Part 9: Edge Cases Handled

1. **No API key configured**: Show warning with link to settings, disable generate buttons
2. **No brand profile**: Modal shows requirement message
3. **No sequences marked "needs creation"**: Hide the entire Content to Create section
4. **User skips generation**: Content is still available post-wizard on project page
5. **Partial generation**: Track which items are generated, allow individual regeneration

---

## Part 10: Future Enhancement - Post-Wizard Access

After the launch is created, the Project page will have a "Content Needs" card that lists any sequences marked as "needs-creation" that weren't generated. This ensures users can always access AI generation even after completing the wizard.

**Implementation deferred to next phase** - will use the same `ContentNeedsHub` component.

---

## Success Criteria

1. Users see subtle AI hints in Step 4 when selecting "Need to write"
2. Step 8 shows clear list of content needing creation
3. Users can generate individual sequences or batch generate all
4. Generated content shows AI detection scores
5. Content can be scheduled to calendar or saved to vault
6. Missing API key shows clear guidance
7. Generated state persists within wizard session
8. Smooth UX with loading states and progress indicators

