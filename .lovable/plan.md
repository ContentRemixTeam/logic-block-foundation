

# Summit Planner Enhancements: Live Panels & Task Preview

## Overview
Add two key features to improve the Summit Planner wizard:
1. **Live Panels Configuration** - Allow users to decide if they'll host live panel discussions during the summit
2. **Task Preview with Toggles** - Show all generated tasks before creation, allowing users to enable/disable individual tasks

---

## Part 1: Live Panels Configuration

### Why in Engagement Step?
Live panels are an engagement activity during the summit. Adding this to **Step 8 (Engagement)** keeps it with related features like Q&A sessions, giveaways, and community engagement.

### Data Structure Changes

**File: `src/types/summit.ts`**

Add new fields to `SummitWizardData`:
```
hasLivePanels: boolean
livePanelCount: number | null
livePanelTopics: string[]
```

Add to `DEFAULT_SUMMIT_WIZARD_DATA`:
```
hasLivePanels: false
livePanelCount: null
livePanelTopics: []
```

### UI Implementation

**File: `src/components/wizards/summit/steps/StepEngagement.tsx`**

Add a new section after "Community Type" for live panels:

```
+------------------------------------------+
|  Will you host live panels?              |
|  [ Toggle Switch ]                       |
|                                          |
|  Live panels bring speakers together     |
|  for dynamic discussions during the      |
|  summit.                                 |
+------------------------------------------+
| (If toggled ON:)                         |
|                                          |
|  How many panels?                        |
|  [ 1 ] [ 2 ] [ 3 ] [ 4+ Custom ]        |
|                                          |
|  Panel topics (optional):                |
|  +-----------------------------------+   |
|  | + Add topic                       |   |
|  | - Opening night panel             |   |
|  | - Expert roundtable               |   |
|  +-----------------------------------+   |
+------------------------------------------+
```

**Pro tip callout:** "Live panels create memorable moments! Consider an opening night panel to build excitement and a closing panel to wrap up key takeaways."

---

## Part 2: Task Preview with Toggle Controls

### Current State
The Review step (Step 9) shows an estimated task count but doesn't show individual tasks or allow selection.

### New Feature
Replace the simple task count with a full task preview that allows users to toggle tasks on/off.

### Data Structure Changes

**File: `src/types/summit.ts`**

Add to `SummitWizardData`:
```
excludedTasks: string[]  // Array of task text identifiers to exclude
```

Add to `DEFAULT_SUMMIT_WIZARD_DATA`:
```
excludedTasks: []
```

### Task Generation Refactor

**File: `supabase/functions/create-summit/index.ts`**

1. Add `id` field to each generated task for identification
2. Pass `excludedTasks` array and filter before insertion

**File: `src/types/summit.ts` or new utility file**

Create a client-side `generateTaskPreview()` function that mirrors the edge function's task generation logic. This allows showing the full task list in the wizard without a server call.

### UI Implementation

**File: `src/components/wizards/summit/steps/StepReviewCreate.tsx`**

Replace the simple task count section with an interactive task preview:

```
+------------------------------------------+
| Tasks to Create                          |
| [Select All] [Deselect All]   X selected |
+------------------------------------------+
| Phase: Speaker Recruitment (8 tasks)     |
|   [x] Create speaker pitch email         |
|   [x] Research potential speakers (1)    |
|   [x] Research potential speakers (2)    |
|   [x] Send speaker invitations (1)       |
|   [x] Send speaker invitations (2)       |
|   [x] Follow up with pending invites     |
|   [x] Set up affiliate tracking          |
|   [x] Create affiliate onboarding guide  |
+------------------------------------------+
| Phase: Content Creation (7 tasks)        |
|   [x] Create interview guide             |
|   [x] Schedule recordings (week 1)       |
|   [x] Schedule recordings (week 2)       |
|   [x] Collect bios and headshots         |
|   [x] Write swipe copy emails            |
|   [x] Send swipe copy to speakers        |
|   [ ] Design social media graphics  ^    |
|                                   Scroll |
+------------------------------------------+
| Phase: Pre-Summit Promotion (X tasks)    |
|   ...                                    |
+------------------------------------------+
| Phase: Summit Live (X tasks)             |
|   ...                                    |
+------------------------------------------+
| Phase: Post-Summit (X tasks)             |
|   ...                                    |
+------------------------------------------+
```

### UI Features

1. **Grouped by Phase** - Tasks organized into collapsible sections by summit phase
2. **Checkboxes** - Each task has a checkbox to include/exclude
3. **Select All / Deselect All** - Bulk actions per section and globally
4. **Task Count** - Shows "X of Y tasks selected"
5. **Scroll Area** - If many tasks, use a scrollable container with max-height
6. **Phase headers** - Click to expand/collapse

### Edge Function Updates

**File: `supabase/functions/create-summit/index.ts`**

1. Accept `excludedTasks` in the request body
2. Add unique `id` to each task in `generateSummitTasks()`
3. Filter out excluded tasks before database insertion
4. Add live panel tasks when `hasLivePanels` is true

New tasks to add for live panels:
- "Plan live panel: [Topic]" - for each topic
- "Invite panelists for [Topic]" - for each panel
- "Prepare panel discussion questions"
- "Test live streaming setup for panels"
- "Host live panel: [Topic]" - scheduled during summit days

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/summit.ts` | Add `hasLivePanels`, `livePanelCount`, `livePanelTopics`, `excludedTasks` fields and defaults |
| `src/components/wizards/summit/steps/StepEngagement.tsx` | Add live panels configuration UI |
| `src/components/wizards/summit/steps/StepReviewCreate.tsx` | Replace task estimate with full task preview with toggles |
| `supabase/functions/create-summit/index.ts` | Add task IDs, filter excluded tasks, add live panel tasks |

---

## New Component

**File: `src/components/wizards/summit/TaskPreviewSection.tsx`**

A dedicated component for the task preview with:
- Props: `tasks`, `excludedTasks`, `onToggleTask`, `onToggleAll`
- Grouping logic by phase
- Collapsible sections
- Checkbox controls
- Task count display

---

## Technical Implementation Notes

### Client-side Task Preview Generation
To avoid a server round-trip, create a client-side version of `generateSummitTasks()` in a new utility:

**File: `src/lib/summitTaskGenerator.ts`**

This mirrors the edge function logic and generates the same task list based on wizard data. The task IDs must match between client preview and server generation.

### Task ID Strategy
Each task needs a stable, unique identifier based on:
- Phase + task type + index (e.g., `recruitment_research_1`)

This ensures:
1. Tasks can be toggled off and stay off through wizard navigation
2. Excluded tasks are correctly filtered server-side

---

## Edge Cases

1. **Live panels without dates** - Default panel scheduling to summit days
2. **All tasks deselected** - Show warning but allow (creates project without tasks)
3. **Panel topics empty** - Generate generic "Live Panel 1/2/3" names
4. **Draft restoration** - Excluded tasks array persists with draft

---

## Testing Checklist

- [ ] Live panels toggle appears in Engagement step
- [ ] Panel count and topics appear when toggled on
- [ ] Task preview shows all generated tasks grouped by phase
- [ ] Individual tasks can be toggled on/off
- [ ] "Select All" / "Deselect All" work correctly
- [ ] Task count updates as selections change
- [ ] Excluded tasks are not created in database
- [ ] Live panel tasks appear when panels enabled
- [ ] Draft saves and restores excluded tasks correctly

