
# AI Copywriting + Editorial Calendar Integration Enhancement

## Overview

This plan adds two key features:

1. **Save to Content Vault** from AI Copywriting - allow users to save generated copy to the Vault for future reuse without scheduling
2. **Wizard → Editorial Calendar Integration** - route content-related wizard outputs (emails, social posts) to the Editorial Calendar instead of tasks

---

## Part 1: Save to Content Vault from AI Copywriting

### Current State

Currently, the AI Copywriting feature has an "Add to Calendar" button that creates a `content_items` record with dates. However, users may want to save copy to the Vault for later without scheduling it immediately.

### Changes Required

#### 1.1 Create `SaveToVaultModal.tsx`

A new modal component similar to `AddToCalendarModal` but focused on vault storage:

- **Fields**:
  - Title (pre-filled based on content type)
  - Content type (post, email, page, etc.)
  - Platform/Channel (optional - for organizational purposes)
  - Tags (optional - for searchability)
- **No date fields** - content goes straight to vault unscheduled
- **Sets**: `show_in_vault: true`, no dates

#### 1.2 Create `useSaveToVault` Hook

New mutation hook that:
- Creates a `content_items` record with `show_in_vault: true`
- Links to `ai_generation_id` for traceability
- Invalidates `content-vault-items` and related queries

#### 1.3 Update `ContentGenerator.tsx`

Add "Save to Vault" button alongside existing "Add to Calendar":
- Button with Archive/Library icon
- Opens `SaveToVaultModal`
- Available after copy is generated

#### 1.4 Update `CopyLibrary.tsx`

Add "Save to Vault" button in the detail dialog:
- Alongside existing "Copy" and "Add to Calendar" buttons
- Opens `SaveToVaultModal`
- Allows saving any past generation to vault

---

## Part 2: Wizard → Editorial Calendar Integration

### Current State

The wizard edge functions (`create-launch-from-wizard`, `create-summit`) currently create all outputs as `tasks`. Content items like emails, social posts, and videos are created as tasks with content metadata fields.

### Problem

Content items (emails, social media posts, blog posts) should appear on the Editorial Calendar for content planning, not just as tasks. The current approach means:
- Email sequences appear as tasks, not in the calendar lanes
- Social posts are tasks instead of calendar content
- No visual content calendar for launch content planning

### Solution

Modify wizard edge functions to create **dual entries**:
1. `content_items` record (for Editorial Calendar)
2. `tasks` record linked to the content item (for task management)

This approach:
- Uses existing `wizardContentHelpers.ts` patterns
- Maintains backward compatibility with task views
- Enables content to appear in both Calendar and Planner

### Changes Required

#### 2.1 Update `create-launch-from-wizard/index.ts`

Add content item creation for applicable task types:

```text
Content Types to Route to Editorial Calendar:
┌─────────────────────────────────┬──────────────────┬────────────┐
│ Wizard Output                   │ Calendar Type    │ Channel    │
├─────────────────────────────────┼──────────────────┼────────────┤
│ Email sequences (warmup/launch) │ email            │ email      │
│ Pre-launch emails               │ email            │ email      │
│ Urgency emails                  │ email            │ email      │
│ Post-launch follow-up           │ email            │ email      │
│ Social content batch            │ post             │ (varies)   │
│ Ad creatives                    │ visual           │ ads        │
│ Lead magnet                     │ document         │ website    │
└─────────────────────────────────┴──────────────────┴────────────┘
```

**Implementation approach:**
1. Before inserting tasks, check if task type is content-related
2. If yes, first create a `content_items` record
3. Link the task to the content item via `content_item_id`
4. Task appears in planner, content appears in calendar

#### 2.2 Update `create-summit/index.ts`

Similar updates for summit-related content:
- Speaker promo emails
- Social media posts
- Swipe emails for affiliates
- Replay notification emails

#### 2.3 Create Content Type Detection Helper

Add a helper function in both edge functions:

```typescript
interface ContentMapping {
  type: string;       // content_items.type
  channel: string;    // content_items.channel
}

function getContentMapping(taskText: string, taskType: string): ContentMapping | null {
  // Email patterns
  if (taskText.includes('email') || taskType === 'email') {
    return { type: 'email', channel: 'email' };
  }
  // Social patterns
  if (taskText.includes('social') || taskType === 'social') {
    return { type: 'post', channel: 'social' };
  }
  // ... more patterns
  return null; // Not content-related
}
```

#### 2.4 Dual Insert Pattern

For each content-related task, the flow becomes:

```text
1. Detect if task is content-related
   │
   ├─ NO  → Insert task only (current behavior)
   │
   └─ YES → Insert content_items first
            │
            ↓
          Insert task with content_item_id linked
```

---

## Part 3: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/ai-copywriting/SaveToVaultModal.tsx` | Modal for saving to vault without scheduling |
| `src/hooks/useSaveToVault.ts` | Mutation hook for vault saves |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/ai-copywriting/ContentGenerator.tsx` | Add "Save to Vault" button |
| `src/components/ai-copywriting/CopyLibrary.tsx` | Add "Save to Vault" in detail dialog |
| `supabase/functions/create-launch-from-wizard/index.ts` | Add content_items creation for email/social tasks |
| `supabase/functions/create-summit/index.ts` | Add content_items creation for email/social tasks |

---

## Technical Details

### Content Items Schema Usage

When wizards create content items:

```typescript
{
  user_id: userId,
  title: taskText.replace(/^(✉️|📱|📧)\s*/, ''), // Clean emoji prefix
  type: contentMapping.type,
  channel: contentMapping.channel,
  status: 'Draft',
  project_id: projectId,
  launch_id: launchId,
  planned_creation_date: calculateCreationDate(scheduledDate),
  planned_publish_date: scheduledDate,
  show_in_vault: true,
  tags: ['launch', 'wizard-generated'],
}
```

### Task Linking

Tasks link to content via:

```typescript
{
  // ... existing task fields
  content_item_id: contentItem.id,  // Links to calendar item
  content_type: contentMapping.type,
  content_channel: contentMapping.channel,
  content_creation_date: createDate,
  content_publish_date: publishDate,
}
```

### Query Invalidation

Both new hooks invalidate:
- `content-vault-items`
- `editorial-calendar-content`
- `editorial-calendar-unscheduled`
- `content-for-planner`

---

## Success Criteria

1. **Save to Vault** button visible in ContentGenerator after generation
2. **Save to Vault** button visible in CopyLibrary detail dialog
3. Saved vault items appear in Content Vault with `show_in_vault: true`
4. Saved vault items have no dates (unscheduled)
5. Launch wizard creates email content in Editorial Calendar
6. Launch wizard creates social content in Editorial Calendar
7. Created tasks still link to content items
8. Content appears in both Calendar lanes (Create/Publish)
9. Summit wizard similarly routes content to calendar
10. Existing task functionality remains intact

---

## User Experience Flow

### Flow 1: Save to Vault from AI Copywriting

```text
User generates copy
    ↓
Clicks "Save to Vault"
    ↓
Modal opens with title pre-filled
    ↓
User confirms (optional: adds tags)
    ↓
Content saved to Vault
    ↓
Toast: "Saved to Content Vault!"
    ↓
User can later schedule via Editorial Calendar → "From Vault" tab
```

### Flow 2: Wizard Content in Calendar

```text
User completes Launch Wizard
    ↓
System creates launch + project
    ↓
For each email/social task:
    ├─ Creates content_items record
    └─ Creates linked task
    ↓
Content appears in Editorial Calendar
Tasks appear in Daily/Weekly Planner
    ↓
User sees launch content visually on calendar
```
