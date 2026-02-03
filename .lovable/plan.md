

# Wizard ↔ Editorial Calendar Integration

## Overview
Create a deep integration between wizards (Launch Planner, Content Planner) and the Editorial Calendar so that when users complete a wizard, their email sequences, content pieces, and other scheduled items automatically appear:
1. On their **task list** (clearly marked as content pieces)
2. On the **Editorial Calendar** (in the correct Create/Publish lanes)

---

## Current State Analysis

### What Already Exists
1. **Tasks table** has content calendar fields:
   - `content_item_id` - link to content_items
   - `content_type` - type of content (Newsletter, Post, etc.)
   - `content_channel` - platform (Email, Instagram, etc.)
   - `content_creation_date` - when to create
   - `content_publish_date` - when to publish

2. **Editorial Calendar** already displays:
   - `content_items` with creation/publish dates
   - `content_plan_items` with planned dates
   - `tasks` that have content_type set

3. **Content Items** table has:
   - `creation_task_id` and `publish_task_id` fields (for bidirectional linking)

### What's Missing
1. **Wizard outputs don't create content_items** - Launch wizard creates tasks but not linked content items
2. **No content badge in TaskCard** - Tasks with content_type aren't visually distinguished
3. **Email sequences not scheduled as content** - Email sequence tasks are created but without calendar dates
4. **No automatic creation/publish date separation** - Wizard tasks only get `scheduled_date`, not dual dates

---

## Solution Architecture

### Phase 1: Enhance Task Card with Content Indicator

Add a visual badge to TaskCard when a task is content-related:

```
┌─────────────────────────────────────────────────┐
│ ☐ Write welcome email sequence                  │
│   📧 Email • Create: Jan 15 • Publish: Jan 22   │
│   🚀 Spring Launch                              │
└─────────────────────────────────────────────────┘
```

**Files to modify:**
- `src/components/tasks/TaskCard.tsx` - Add content type badge and calendar dates display

### Phase 2: Upgrade Launch Wizard V2 Edge Function

Update `create-launch-v2` edge function to:

1. **Create content_items** for each email sequence
2. **Link tasks to content_items** via `content_item_id`
3. **Set dual dates** on both tasks and content_items

**New Email Content Flow:**
```
Email Sequence "Warm-Up" (needs-creation, deadline: Jan 15)
                      ↓
Creates:
├── content_item (type: Newsletter, channel: Email)
│   ├── planned_creation_date: deadline - 3 days
│   ├── planned_publish_date: deadline
│   └── project_id: launch project
├── task "Create: Warm-Up Email Sequence"
│   ├── scheduled_date: creation date
│   ├── content_item_id: → content_item
│   ├── content_type: Newsletter
│   ├── content_channel: Email
│   ├── content_creation_date: deadline - 3 days
│   └── content_publish_date: deadline
└── task "Send: Warm-Up Email Sequence"
    ├── scheduled_date: publish date
    └── content_item_id: → content_item
```

### Phase 3: Add Content Integration to Content Planner

Update ContentPlannerWizard completion to:

1. Create `content_items` for each planned piece
2. Generate linked tasks with dual dates
3. Set `content_creation_date` and `content_publish_date` on tasks

**Files to modify:**
- `src/components/wizards/content-planner/ContentPlannerWizard.tsx` - Add content_items creation
- Create edge function `execute-content-plan` for atomic creation

---

## Technical Implementation

### 1. Update TaskCard Component

Add content indicator section:

```typescript
// In TaskCard.tsx, add after project indicator:

{/* Content Calendar indicator */}
{task.content_type && (
  <div className="flex items-center gap-2 mt-1">
    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400">
      <FileText className="h-3 w-3 mr-1" />
      {task.content_type}
    </Badge>
    {task.content_channel && (
      <span className="text-xs text-muted-foreground">
        • {task.content_channel}
      </span>
    )}
    {(task.content_creation_date || task.content_publish_date) && (
      <span className="text-xs text-muted-foreground">
        {task.content_creation_date && `Create: ${format(parseISO(task.content_creation_date), 'MMM d')}`}
        {task.content_creation_date && task.content_publish_date && ' → '}
        {task.content_publish_date && `Publish: ${format(parseISO(task.content_publish_date), 'MMM d')}`}
      </span>
    )}
  </div>
)}
```

### 2. Create Content Helper Functions

New utility file for wizard content creation:

```typescript
// src/lib/wizardContentHelpers.ts

interface ContentTaskPair {
  contentItem: Partial<ContentItem>;
  createTask: Partial<Task>;
  publishTask?: Partial<Task>;
}

export function generateEmailSequenceContent(
  sequence: EmailSequenceItem,
  launchData: LaunchWizardV2Data,
  projectId: string,
  userId: string
): ContentTaskPair {
  const publishDate = sequence.deadline || launchData.cartOpensDate;
  const createDate = subDays(parseISO(publishDate), 3);
  
  return {
    contentItem: {
      user_id: userId,
      title: `${getSequenceLabel(sequence.type)} Email Sequence`,
      type: 'Newsletter',
      channel: 'Email',
      status: 'Draft',
      project_id: projectId,
      planned_creation_date: format(createDate, 'yyyy-MM-dd'),
      planned_publish_date: publishDate,
    },
    createTask: {
      user_id: userId,
      task_text: `Create: ${getSequenceLabel(sequence.type)} Email Sequence`,
      scheduled_date: format(createDate, 'yyyy-MM-dd'),
      content_type: 'Newsletter',
      content_channel: 'Email',
      content_creation_date: format(createDate, 'yyyy-MM-dd'),
      content_publish_date: publishDate,
      task_type: 'content_creation',
      project_id: projectId,
      is_system_generated: true,
    },
    publishTask: {
      user_id: userId,
      task_text: `Send: ${getSequenceLabel(sequence.type)} Email Sequence`,
      scheduled_date: publishDate,
      content_type: 'Newsletter',
      content_channel: 'Email',
      content_creation_date: format(createDate, 'yyyy-MM-dd'),
      content_publish_date: publishDate,
      task_type: 'content_publish',
      project_id: projectId,
      is_system_generated: true,
    },
  };
}
```

### 3. Upgrade create-launch-v2 Edge Function

Add content item creation:

```typescript
// In create-launch-v2/index.ts

// After creating project, before creating tasks:

// 3. Create content items for email sequences
const contentItems: ContentItemToCreate[] = [];

if (data.emailSequences && data.emailSequences.length > 0) {
  for (const sequence of data.emailSequences) {
    const publishDate = sequence.deadline || data.cartOpensDate;
    const createDate = format(addDays(parseISO(publishDate), -3), 'yyyy-MM-dd');
    
    contentItems.push({
      user_id: userId,
      title: `${getSequenceLabel(sequence.type)} Email Sequence`,
      type: 'Newsletter',
      channel: 'Email',
      status: 'Draft',
      project_id: project.id,
      planned_creation_date: createDate,
      planned_publish_date: publishDate,
      tags: ['launch', 'email', data.name],
    });
  }
}

// Insert content items
const { data: createdContent } = await serviceClient
  .from('content_items')
  .insert(contentItems)
  .select('id, title');

// Create corresponding tasks with content_item_id links
// ... (modify existing task creation to include content fields)
```

### 4. Update Content Planner Wizard

Modify completion handler to create full content ecosystem:

```typescript
// In ContentPlannerWizard.tsx handleCreatePlan():

// For each planned item, create both content_item AND linked tasks
for (const item of data.plannedItems) {
  // Create content item
  const { data: contentItem } = await supabase
    .from('content_items')
    .insert({
      user_id: user.id,
      title: item.title,
      type: item.type,
      channel: item.channel,
      status: 'Draft',
      project_id: data.launchId || null,
      planned_creation_date: item.createDate || null,
      planned_publish_date: item.date || null,
    })
    .select('id')
    .single();

  // Create "Create" task if creation date specified
  if (item.createDate) {
    await supabase.from('tasks').insert({
      user_id: user.id,
      task_text: `Create: ${item.title}`,
      scheduled_date: item.createDate,
      content_item_id: contentItem.id,
      content_type: item.type,
      content_channel: item.channel,
      content_creation_date: item.createDate,
      content_publish_date: item.date || null,
      project_id: data.launchId || null,
      is_system_generated: true,
      system_source: 'content_planner',
    });
  }

  // Create "Publish" task if publish date specified
  if (item.date) {
    await supabase.from('tasks').insert({
      user_id: user.id,
      task_text: `Publish: ${item.title}`,
      scheduled_date: item.date,
      content_item_id: contentItem.id,
      content_type: item.type,
      content_channel: item.channel,
      content_creation_date: item.createDate || null,
      content_publish_date: item.date,
      project_id: data.launchId || null,
      is_system_generated: true,
      system_source: 'content_planner',
    });
  }
}
```

---

## Data Flow Diagram

```
WIZARD COMPLETION
       │
       ▼
┌──────────────────────┐
│ Create content_item  │
│ (type, channel,      │
│  creation_date,      │
│  publish_date)       │
└──────────────────────┘
       │
       ├────────────────────────────┐
       ▼                            ▼
┌──────────────────┐    ┌──────────────────┐
│ Create Task      │    │ Publish Task     │
│ "Create: X"      │    │ "Publish: X"     │
│ scheduled_date = │    │ scheduled_date = │
│   creation_date  │    │   publish_date   │
│ content_item_id  │    │ content_item_id  │
└──────────────────┘    └──────────────────┘
       │                            │
       ▼                            ▼
┌─────────────────────────────────────────┐
│          EDITORIAL CALENDAR              │
│  ┌─────────┐          ┌─────────┐       │
│  │ Create  │          │ Publish │       │
│  │  Lane   │    →     │  Lane   │       │
│  │  (Teal) │          │(Violet) │       │
│  └─────────┘          └─────────┘       │
└─────────────────────────────────────────┘
       │                            │
       └──────────┬─────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│             TASK LIST                   │
│  ☐ Create: Welcome Email Sequence       │
│    📧 Newsletter • Email                │
│    Create: Jan 12 → Publish: Jan 15     │
└─────────────────────────────────────────┘
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/tasks/TaskCard.tsx` | Modify | Add content type badge and calendar dates |
| `supabase/functions/create-launch-v2/index.ts` | Modify | Add content_items creation, link to tasks |
| `src/components/wizards/content-planner/ContentPlannerWizard.tsx` | Modify | Create content_items and linked tasks |
| `src/lib/wizardContentHelpers.ts` | Create | Shared helper functions for content generation |
| `src/types/launchV2.ts` | Modify | Add content generation options to wizard data |

---

## User Experience After Implementation

### During Wizard Completion
User sees confirmation: "Created 12 content items and 24 tasks. View in Editorial Calendar →"

### On Task List
Content tasks display with:
- Purple/violet content badge showing type (Newsletter, Post, etc.)
- Channel indicator (Email, Instagram, etc.)
- Dual dates: "Create: Jan 12 → Publish: Jan 15"
- Link to editorial calendar for that item

### On Editorial Calendar
- Items appear in correct lanes automatically
- Create tasks in Teal "Create" lane
- Publish tasks in Violet "Publish" lane
- Click to open full task details or content editor

---

## Implementation Order

1. **TaskCard content indicator** - Show existing content tasks properly
2. **Launch Wizard V2 upgrade** - Generate content_items + linked tasks
3. **Content Planner upgrade** - Same pattern for content plan items
4. **Testing** - Verify items appear in both Task List and Editorial Calendar

