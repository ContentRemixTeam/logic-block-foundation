

# Add Category, Priority, and Project Selection to Mobile Quick Capture

## Problem Summary

When capturing **ideas** on mobile (via the Quick Capture drawer or the standalone Quick Add PWA app), users cannot set:
- **Category** (e.g., Business, Personal, Marketing)
- **Priority** (e.g., ASAP, Next Week, Someday)
- **Project** (link idea to a project)
- **Tags**

The desktop Quick Capture modal has all these controls for ideas (lines 1007-1196 in QuickCaptureModal.tsx), but the mobile drawer (lines 1505-1513) only shows a simple preview without any metadata selectors.

The Quick Add PWA app (QuickAddApp.tsx) has no metadata controls for ideas at all — it just saves plain text.

---

## Solution Overview

Create a reusable **IdeaQuickChips** component (similar to the existing QuickChips for tasks) and integrate it into:
1. The mobile Quick Capture drawer (`mobileContent` section)
2. The Quick Add PWA app

This gives mobile users the same one-tap metadata selection they have for tasks.

---

## Implementation Details

### Part 1: Create IdeaQuickChips Component

**New File: `src/components/quick-capture/IdeaQuickChips.tsx`**

A mobile-optimized component with horizontally scrollable chip rows for:
- **Category** - Show user's idea categories with color dots
- **Priority** - ASAP, Next Week, Next Month, Someday
- **Project** - Show user's projects with color dots
- **Tags** - Show quick-add tag input + existing tags

Design approach:
- Use the same `QuickChip` styling pattern from the existing QuickChips
- Horizontal scroll rows with `overflow-x-auto` 
- 44px minimum touch targets
- Active state highlighting when selected

### Part 2: Update Mobile Quick Capture (QuickCaptureModal.tsx)

**Location**: Lines 1505-1513 (mobile idea preview section)

Currently shows:
```tsx
{captureType === 'idea' && input.trim() && (
  <div className="p-3 rounded-lg bg-muted/50 space-y-3">
    <div className="text-sm font-medium flex items-center gap-2">
      <Lightbulb className="h-4 w-4 text-yellow-500" />
      {cleanIdeaInput(input) || '(enter your idea)'}
    </div>
  </div>
)}
```

Update to include IdeaQuickChips:
```tsx
{captureType === 'idea' && input.trim() && (
  <div className="p-3 rounded-lg bg-muted/50 space-y-3">
    <div className="text-sm font-medium flex items-center gap-2">
      <Lightbulb className="h-4 w-4 text-yellow-500" />
      {cleanIdeaInput(input) || '(enter your idea)'}
    </div>
    
    {/* Add idea metadata chips */}
    <IdeaQuickChips
      ideaData={ideaData}
      onUpdate={setIdeaData}
      categories={ideaCategories}
      projects={projects}
    />
  </div>
)}
```

### Part 3: Update Quick Add PWA App (QuickAddApp.tsx)

**Location**: Lines 100-106 (idea save logic) and Lines 229-251 (input section)

Changes needed:
1. Add state for `ideaData` (category, priority, project, tags)
2. Fetch idea categories and projects on mount
3. Add IdeaQuickChips below the input when idea type is selected
4. Update save function to include metadata when saving ideas

**Updated save for ideas**:
```tsx
} else if (selectedType === 'idea') {
  const { error } = await supabase.from('ideas').insert({
    user_id: user.id,
    content: inputValue.trim(),
    category_id: ideaData.categoryId,
    priority: ideaData.priority,
    project_id: ideaData.projectId,
    tags: ideaData.tags.length > 0 ? ideaData.tags : null,
    source_note_title: 'Quick Add',
  });
  if (error) throw error;
}
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/quick-capture/IdeaQuickChips.tsx` | **New** | Reusable chip selector for idea metadata |
| `src/components/quick-capture/index.ts` | Update | Export new IdeaQuickChips component |
| `src/components/quick-capture/QuickCaptureModal.tsx` | Update | Add IdeaQuickChips to mobile idea preview |
| `src/pages/QuickAddApp.tsx` | Update | Add idea metadata state, fetching, and chips UI |

---

## Mobile UX Design

The IdeaQuickChips will display as horizontally scrollable rows:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 💡 My brilliant marketing idea                                  │
├─────────────────────────────────────────────────────────────────┤
│ [🏷️ Category] [● Business] [● Personal] [● Marketing] →        │
├─────────────────────────────────────────────────────────────────┤
│ [⏰ ASAP] [📅 Next Week] [📅 Next Month] [💭 Someday]           │
├─────────────────────────────────────────────────────────────────┤
│ [📁 Project A] [📁 Project B] [📁 Project C] →                  │
├─────────────────────────────────────────────────────────────────┤
│ [#marketing] [#content] [+ Add Tag]                             │
└─────────────────────────────────────────────────────────────────┘
```

- Active chips highlighted with primary color
- Tap to toggle selection
- Horizontal scroll for overflow
- 44px touch targets per mobile standards

---

## Testing Checklist

After implementation:
- [ ] Open Quick Capture on mobile → select Idea → verify chips appear
- [ ] Tap Category chip → verify selection persists
- [ ] Tap Priority chip → verify selection persists  
- [ ] Tap Project chip → verify selection persists
- [ ] Add a tag → verify it appears as a chip
- [ ] Save idea → verify metadata is saved to database
- [ ] Open Quick Add PWA app → select Idea → verify chips appear
- [ ] Save idea from PWA → verify metadata is saved

