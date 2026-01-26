

## Text Highlighting and Tagging Feature - Gap Analysis and Enhancement Plan

### Current Status: Mostly Complete

The core text selection and tagging feature is **already implemented** and working in Notes. The existing implementation includes:

- Text selection detection (desktop mouse + mobile long-press)
- Floating toolbar appearing above selected text
- Task creation modal with priority, due date, project options
- Idea creation modal with project linking
- Success/error toasts
- Mobile-friendly buttons (44px touch targets)
- Helpful hint text for users

### What Needs to Be Added

The following gaps exist between current implementation and your spec:

---

### 1. Database Schema Updates

Add `note_id` and `note_title` columns to enable proper back-references:

**Tasks table:**
```sql
ALTER TABLE tasks
ADD COLUMN source_note_id UUID REFERENCES journal_pages(id) ON DELETE SET NULL,
ADD COLUMN source_note_title TEXT;
```

**Ideas table:**
```sql
ALTER TABLE ideas
ADD COLUMN source_note_id UUID REFERENCES journal_pages(id) ON DELETE SET NULL,
ADD COLUMN source_note_title TEXT;
```

---

### 2. Edge Function Updates

**manage-task:**
- Add `source_note_id` and `source_note_title` to Zod schema
- Include fields in insert/update operations

**save-idea:**
- Add `source_note_id` and `source_note_title` to Zod schema
- Include fields in insert operations

---

### 3. Update CreateFromSelectionModal

Pass the new note reference fields instead of embedding in generic `notes`:

```typescript
// For tasks
body: {
  ...existingFields,
  source_note_id: sourceNoteId,
  source_note_title: sourceNoteTitle,  // Pass from parent
}

// For ideas
body: {
  ...existingFields,
  source_note_id: sourceNoteId,
  source_note_title: sourceNoteTitle,
}
```

---

### 4. Visual Badges Feature (Complex Addition)

This is the most complex part. To show badges next to tagged text requires:

**Option A: Inline Text Marking (Complex)**
- Store text positions/ranges when tagging
- Create a new `note_text_tags` table to track tagged ranges
- Re-render note content with inline badge spans
- Handle text changes that shift positions

**Option B: Related Items Panel (Simpler)**
- Show a "Created from this note" section below the note content
- List all tasks/ideas linked via `source_note_id`
- Each item is clickable to view/edit
- No need to modify note content rendering

**Recommendation**: Option B is more reliable and doesn't require tracking text positions which can drift as notes are edited.

---

### 5. View Task/Idea Modal

When clicking a badge or linked item, open a view/edit modal:

- Create `ViewTaskModal` component (may already exist)
- Create `ViewIdeaModal` component (may already exist)
- Show full task/idea details with edit capabilities

---

### Implementation Order

1. **Database migration** - Add `source_note_id` and `source_note_title` columns
2. **Edge function updates** - Accept new fields in manage-task and save-idea
3. **Update modal** - Pass note reference fields from CreateFromSelectionModal
4. **Add source note display** - Show "Created from: [Note Title]" in task/idea views
5. **Related items panel** - Show linked tasks/ideas below note content
6. **Quick view modals** - Click to view/edit linked items

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Add columns to tasks and ideas |
| `supabase/functions/manage-task/index.ts` | Add note fields to schema and insert |
| `supabase/functions/save-idea/index.ts` | Add note fields to schema and insert |
| `src/components/notes/CreateFromSelectionModal.tsx` | Pass new fields |
| `src/components/notes/SelectableNoteContent.tsx` | Add sourceNoteTitle prop |
| `src/pages/Notes.tsx` | Pass note title to SelectableNoteContent |
| `src/components/notes/NoteLinkedItems.tsx` | **NEW** - Show related tasks/ideas |

---

### Mobile Considerations

All existing components already meet mobile requirements:
- Text selection works via long-press (100ms delay for touch)
- Toolbar buttons are 36px+ height with proper padding
- Modals work on small screens
- Hint text adapts to screen size

---

### Testing Checklist

After implementation:
- [ ] Select text on desktop (mouse) - works
- [ ] Select text on mobile (long-press) - works  
- [ ] Toolbar appears when text selected - works
- [ ] "Save as Task" creates task with note reference
- [ ] "Save as Idea" creates idea with note reference
- [ ] Linked items panel shows created tasks/ideas
- [ ] Click linked item opens view modal
- [ ] Original note text stays intact - works
- [ ] Works with multiple tags in same note
- [ ] Error handling works - works

