
# Custom Project Designer - Implementation Plan

## Overview

Create an intelligent wizard that guides users through designing their own custom project board. Instead of picking a generic template, users answer questions about their use case, and the wizard generates a tailored project board with appropriate columns, suggested fields, and structure.

---

## Use Case Examples

The wizard will recognize and optimize for these business scenarios (and more):

| Use Case | Suggested Columns | Key Features |
|----------|-------------------|--------------|
| **Coaching/Consulting** | Lead → Discovery Call → Proposal → Client → Follow-up | Contact info, revenue tracking |
| **Product Launch** | Ideas → Planning → Creating → Launch → Post-Launch | Launch dates, revenue goals |
| **Content Creation** | Brainstorm → Drafting → Editing → Scheduled → Published | Due dates, platform tags |
| **Client Projects** | Briefing → In Progress → Review → Revision → Delivered | Client name, deadlines |
| **Event Planning** | Planning → Vendors → Promotion → Event Day → Wrap-up | Event date, budget |
| **Sales Pipeline** | Lead → Qualified → Proposal → Negotiation → Won/Lost | Deal value, probability |
| **Hiring/Recruitment** | Sourcing → Screening → Interview → Offer → Hired | Candidate info, role |
| **Course/Program** | Module Planning → Creating → Review → Published | Module numbers, duration |

---

## Wizard Flow (5 Steps)

### Step 1: What Are You Tracking?

Ask the user what type of work they want to manage:

```text
What would you like to track?

( ) Clients or Leads (coaching, consulting, sales)
( ) Content (blog posts, videos, podcasts)
( ) Products or Offers (launches, digital products)
( ) Events (webinars, summits, workshops)
( ) Projects (client work, internal projects)
( ) Custom (I'll describe my own workflow)

[Or describe it yourself: _______________]
```

If "Custom" or text entered, use AI to analyze and suggest appropriate columns.

### Step 2: Define Your Workflow Stages

Based on Step 1, present suggested columns that users can:
- Keep as-is
- Rename
- Remove
- Add new columns
- Reorder (drag-and-drop)

```text
Here's a suggested workflow for tracking leads:

[Lead] → [Discovery Call] → [Proposal Sent] → [Client] → [Follow-up]
  ↑          ↑                   ↑               ↑           ↑
[Edit]    [Edit]             [Edit]          [Edit]      [Edit]

[+ Add Stage]

Colors for each stage can be customized.
```

### Step 3: What Information Do You Need?

Ask what data fields they want on each card/project:

```text
What information do you want to track for each item?

[✓] Name (required)
[✓] Description
[ ] Contact Email
[ ] Contact Phone
[ ] Company Name
[ ] Revenue/Deal Value
[✓] Due Date
[✓] Priority
[ ] Tags/Labels
[ ] Notes
[ ] Assigned To (for teams - coming soon)
[ ] Custom Field: [___________]
```

For coaching/leads use case, pre-select contact fields.
For launches, pre-select revenue and dates.

### Step 4: Appearance & Settings

```text
Board Settings

Name your board: [_______________]
Example: "Client Pipeline" or "Q1 Launches"

Default view:
( ) Kanban Board (drag cards between columns)
( ) List View (sortable table)

Card display:
[✓] Show progress bar
[✓] Show due date on card
[ ] Show revenue on card
[✓] Compact cards (less padding)

Theme color: [color picker]
```

### Step 5: Review & Create

Show a preview of the board with sample cards:

```text
Your Custom Board: Client Pipeline

[Lead]          [Discovery]      [Proposal]       [Client]
┌──────────┐   ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Jane Doe │   │ Bob Smith│    │ Acme Corp│    │ XYZ Inc  │
│ Consult  │   │ Call Tue │    │ $5,000   │    │ Active   │
│ $2,500   │   │ $3,000   │    │ Pending  │    │ $4,000   │
└──────────┘   └──────────┘    └──────────┘    └──────────┘

Ready to create?

[Create Board]  [Save as Template]  [Back to Edit]
```

---

## Database Changes

### New Table: `project_board_templates`

Store user-created board configurations as reusable templates:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | Owner |
| name | TEXT | Template name |
| description | TEXT | What it's for |
| use_case | TEXT | Category (leads, content, etc.) |
| columns | JSONB | Array of column definitions |
| card_fields | JSONB | Which fields to show |
| settings | JSONB | Display preferences |
| is_public | BOOLEAN | Share with community (future) |
| created_at | TIMESTAMPTZ | |

### Update: `project_boards` table

Add optional reference to template:

| Column | Type | Purpose |
|--------|------|---------|
| template_id | UUID | Link to source template (nullable) |
| card_fields | JSONB | Which fields are visible on cards |
| settings | JSONB | Board-specific display settings |

### New Table: `project_card_fields`

Define custom fields for projects within a board:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| board_id | UUID | Which board |
| user_id | UUID | Owner |
| field_name | TEXT | Display name |
| field_key | TEXT | Internal key |
| field_type | TEXT | text, number, date, select, email, phone, url |
| options | JSONB | For select type, list of options |
| sort_order | INTEGER | Order in forms/cards |
| is_required | BOOLEAN | Validation |
| show_on_card | BOOLEAN | Display on card preview |

### New Table: `project_custom_values`

Store values for custom fields:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| project_id | UUID | Which project |
| field_id | UUID | Which custom field |
| value_text | TEXT | Text/select values |
| value_number | NUMERIC | Number values |
| value_date | DATE | Date values |

---

## Frontend Components

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/wizards/project-designer/ProjectDesignerWizard.tsx` | Main wizard component |
| `src/components/wizards/project-designer/index.ts` | Exports |
| `src/components/wizards/project-designer/steps/StepUseCase.tsx` | Step 1: What are you tracking? |
| `src/components/wizards/project-designer/steps/StepWorkflow.tsx` | Step 2: Define workflow stages |
| `src/components/wizards/project-designer/steps/StepFields.tsx` | Step 3: Information to track |
| `src/components/wizards/project-designer/steps/StepSettings.tsx` | Step 4: Appearance |
| `src/components/wizards/project-designer/steps/StepReview.tsx` | Step 5: Preview and create |
| `src/components/wizards/project-designer/steps/index.ts` | Step exports |
| `src/components/wizards/project-designer/BoardPreview.tsx` | Visual preview component |
| `src/components/wizards/project-designer/ColumnEditor.tsx` | Edit/reorder columns |
| `src/components/wizards/project-designer/FieldSelector.tsx` | Choose fields to track |
| `src/types/projectDesigner.ts` | Type definitions |
| `src/lib/projectDesignerTemplates.ts` | Pre-built use case suggestions |
| `src/hooks/useProjectDesigner.ts` | Hook for wizard state/creation |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/wizards/WizardHub.tsx` | Add Project Designer card |
| `src/types/wizard.ts` | Add template name constant |
| `src/App.tsx` | Add route for wizard |
| `src/components/projects/CreateBoardModal.tsx` | Add "Use Designer" button |
| `src/components/projects/ProjectBoardView.tsx` | Support custom fields display |
| `src/components/projects/BoardCard.tsx` | Render custom field values |
| `src/components/projects/NewProjectModal.tsx` | Add custom field inputs |

---

## Type Definitions

```typescript
// src/types/projectDesigner.ts

export type UseCaseType = 
  | 'leads' 
  | 'content' 
  | 'products' 
  | 'events' 
  | 'projects' 
  | 'custom';

export interface ColumnDefinition {
  name: string;
  color: string;
  description?: string;
}

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'email' 
  | 'phone' 
  | 'url' 
  | 'select' 
  | 'currency';

export interface FieldDefinition {
  key: string;
  name: string;
  type: FieldType;
  required: boolean;
  showOnCard: boolean;
  options?: string[]; // For select type
}

export interface BoardSettings {
  defaultView: 'kanban' | 'list';
  showProgressBar: boolean;
  showDueDate: boolean;
  showRevenue: boolean;
  compactCards: boolean;
  themeColor: string;
}

export interface ProjectDesignerData {
  useCase: UseCaseType;
  customDescription: string;
  columns: ColumnDefinition[];
  fields: FieldDefinition[];
  boardName: string;
  settings: BoardSettings;
  saveAsTemplate: boolean;
  templateName: string;
}

export const DEFAULT_PROJECT_DESIGNER_DATA: ProjectDesignerData = {
  useCase: 'projects',
  customDescription: '',
  columns: [
    { name: 'To Do', color: '#94A3B8' },
    { name: 'In Progress', color: '#F59E0B' },
    { name: 'Done', color: '#10B981' },
  ],
  fields: [
    { key: 'name', name: 'Name', type: 'text', required: true, showOnCard: true },
    { key: 'description', name: 'Description', type: 'text', required: false, showOnCard: false },
    { key: 'due_date', name: 'Due Date', type: 'date', required: false, showOnCard: true },
  ],
  boardName: '',
  settings: {
    defaultView: 'kanban',
    showProgressBar: true,
    showDueDate: true,
    showRevenue: false,
    compactCards: false,
    themeColor: '#6366F1',
  },
  saveAsTemplate: false,
  templateName: '',
};
```

---

## Use Case Templates

```typescript
// src/lib/projectDesignerTemplates.ts

export const USE_CASE_TEMPLATES: Record<UseCaseType, {
  columns: ColumnDefinition[];
  suggestedFields: FieldDefinition[];
  defaultBoardName: string;
}> = {
  leads: {
    columns: [
      { name: 'Lead', color: '#94A3B8' },
      { name: 'Discovery Call', color: '#3B82F6' },
      { name: 'Proposal Sent', color: '#F59E0B' },
      { name: 'Client', color: '#10B981' },
      { name: 'Follow-up', color: '#8B5CF6' },
    ],
    suggestedFields: [
      { key: 'contact_email', name: 'Email', type: 'email', required: false, showOnCard: true },
      { key: 'contact_phone', name: 'Phone', type: 'phone', required: false, showOnCard: false },
      { key: 'company', name: 'Company', type: 'text', required: false, showOnCard: true },
      { key: 'deal_value', name: 'Deal Value', type: 'currency', required: false, showOnCard: true },
      { key: 'next_action', name: 'Next Action Date', type: 'date', required: false, showOnCard: true },
    ],
    defaultBoardName: 'Client Pipeline',
  },
  content: {
    columns: [
      { name: 'Ideas', color: '#8B5CF6' },
      { name: 'Drafting', color: '#F59E0B' },
      { name: 'Editing', color: '#3B82F6' },
      { name: 'Scheduled', color: '#06B6D4' },
      { name: 'Published', color: '#10B981' },
    ],
    suggestedFields: [
      { key: 'content_type', name: 'Type', type: 'select', required: false, showOnCard: true, options: ['Blog', 'Video', 'Podcast', 'Social'] },
      { key: 'platform', name: 'Platform', type: 'select', required: false, showOnCard: true, options: ['Website', 'YouTube', 'Instagram', 'LinkedIn', 'Twitter'] },
      { key: 'publish_date', name: 'Publish Date', type: 'date', required: false, showOnCard: true },
      { key: 'word_count', name: 'Word Count', type: 'number', required: false, showOnCard: false },
    ],
    defaultBoardName: 'Content Calendar',
  },
  // ... other use cases
};
```

---

## Edge Function: `create-custom-board`

Creates the board with all custom fields in a single transaction:

```typescript
// Request body
interface CreateCustomBoardRequest {
  name: string;
  columns: ColumnDefinition[];
  fields: FieldDefinition[];
  settings: BoardSettings;
  saveAsTemplate: boolean;
  templateName?: string;
}

// Response
interface CreateCustomBoardResponse {
  success: boolean;
  board_id: string;
  template_id?: string;
  message: string;
}
```

Logic:
1. Create `project_boards` entry
2. Create `project_columns` entries for each column
3. Create `project_card_fields` entries for custom fields
4. Optionally create `project_board_templates` entry
5. Return IDs

---

## UI/UX Details

### Column Editor (Step 2)

- Drag-and-drop reordering with @dnd-kit
- Inline rename by clicking column name
- Color picker popover for each column
- Delete button with confirmation
- Add column button at end
- Minimum 2 columns, maximum 10

### Field Selector (Step 3)

- Checkbox list of available fields
- Built-in fields (name, description, dates) at top
- Custom fields section below
- "Add Custom Field" expands inline form:
  - Field name
  - Field type dropdown
  - Required toggle
  - Show on card toggle
  - Options list (for select type)

### Board Preview (Step 5)

- Mini Kanban board with sample cards
- Uses actual column names and colors
- Sample cards show selected fields
- Responsive - stacks on mobile
- Animated transitions when columns change

---

## Mobile Considerations

- All wizard steps work on mobile
- Column editor uses swipe to reorder on touch
- Preview shows 2 columns at a time with horizontal scroll
- Touch-friendly field checkboxes (44px targets)
- Bottom sheet for color pickers

---

## Integration Points

### Wizard Hub

Add to `IMPLEMENTED_WIZARDS` array and create template in database.

### Create Board Modal

Add "Design Custom Board" button that links to the wizard:

```typescript
<Button variant="outline" onClick={() => navigate('/wizards/project-designer')}>
  <Wand2 className="h-4 w-4 mr-2" />
  Design Custom Board
</Button>
```

### Project Cards

Update `BoardCard.tsx` to render custom field values:

```typescript
// Fetch custom values for project
const customValues = useProjectCustomValues(project.id);

// Render configured fields
{boardFields.filter(f => f.showOnCard).map(field => (
  <div key={field.key} className="text-xs text-muted-foreground">
    {formatFieldValue(customValues[field.key], field.type)}
  </div>
))}
```

---

## Implementation Phases

### Phase 1: Database & Types
1. Create database migrations for new tables
2. Add RLS policies
3. Create TypeScript types
4. Create use case templates

### Phase 2: Wizard Core
1. Create wizard data types and defaults
2. Create `ProjectDesignerWizard` using existing `useWizard` hook
3. Implement Step 1: Use Case Selection
4. Implement Step 2: Workflow Stages (column editor)

### Phase 3: Fields & Settings
1. Implement Step 3: Field Selection
2. Implement Step 4: Appearance Settings
3. Create board preview component

### Phase 4: Creation Logic
1. Implement Step 5: Review
2. Create `create-custom-board` edge function
3. Handle board creation with custom fields
4. Add to Wizard Hub

### Phase 5: Integration
1. Update `BoardCard` for custom fields
2. Update `NewProjectModal` for custom field inputs
3. Add custom field editing to project detail
4. Add "Design Custom" option to Create Board Modal

---

## Success Metrics

After implementation, users should be able to:
- Create a coaching/leads pipeline in under 3 minutes
- See relevant fields on their project cards
- Save their configurations as reusable templates
- Easily track custom data without workarounds
