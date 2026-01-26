

## Course Organization for Notes Section

### Overview
Add the ability to link journal pages (notes) to courses from the user's course library. This enables course-specific note organization with filtering, badges, and a dedicated notes tab within the course detail page.

---

### 1. Database Schema Changes

Add `course_id` and `course_title` columns to the `journal_pages` table:

```sql
-- Add course reference columns to journal_pages
ALTER TABLE public.journal_pages
ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
ADD COLUMN course_title TEXT;

-- Create indexes for better filtering performance
CREATE INDEX idx_journal_pages_course_id ON public.journal_pages(course_id);
CREATE INDEX idx_journal_pages_user_course ON public.journal_pages(user_id, course_id);
```

**Key decisions:**
- `course_id` references courses table with `ON DELETE SET NULL` - if course is deleted, notes keep `course_title` but lose `course_id`
- `course_title` stored for quick display and to preserve context when course is deleted

---

### 2. Edge Function Updates

**get-journal-pages/index.ts:**
- Add `course_id` query parameter for filtering
- Include course data in select query (like existing project join)
- Add course search to search filter (search course_title too)

**save-journal-page/index.ts:**
- Add `course_id` and `course_title` to Zod schema
- Include in insert/update operations
- Validate course belongs to user before saving (optional security check)

---

### 3. Notes Page Updates (src/pages/Notes.tsx)

**State additions:**
- `courseFilter`: string | null for filtering notes by course
- Fetch user's courses for dropdown

**JournalPage interface update:**
```typescript
interface JournalPage {
  // ... existing fields
  course_id: string | null;
  course_title: string | null;
  course?: { id: string; title: string } | null;
}
```

**Filter Section:**
- Add course filter dropdown in the filter bar (alongside project filter)
- Filter options: "All Notes", "General Notes" (no course), then list all user courses with 📚 icon
- Show filter count: "5 notes in [Course Name]"
- Persist filter in URL query params using `useSearchParams`

**Page Form Updates:**
- Add "Link to Course (optional)" dropdown in the create/edit page modal
- Fetch courses with `useQuery` hook (similar to projects)
- When course selected, save both `course_id` and `course_title`
- Group courses by status in dropdown (In Progress, Complete, etc.)

**Note Card Display:**
- Add course badge next to project badge if linked: `📚 [Course Title]`
- Badge styled with course-related color (blue/indigo theme)
- Click badge to filter by that course

**Search Enhancement:**
- Update search filter to include `course_title` matching

**Sort/Group Options:**
- Add "By Course" option to sort dropdown
- When selected, group notes by course with collapsible sections

---

### 4. Course Detail Page Updates (src/pages/CourseDetail.tsx)

**Add "Notes" tab to the tabs section:**

```typescript
<TabsList className="grid w-full grid-cols-5">  // Change from 4 to 5
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="plan">Study Plan</TabsTrigger>
  <TabsTrigger value="notes">
    Notes
    {notesCount > 0 && <Badge className="ml-1">{notesCount}</Badge>}
  </TabsTrigger>
  <TabsTrigger value="takeaways">Takeaways</TabsTrigger>
  <TabsTrigger value="checkins">Check-ins</TabsTrigger>
</TabsList>
```

**Notes Tab Content:**
- Fetch notes linked to this course: `course_id = :courseId`
- Display as list with title, content preview, created date
- Click to navigate to `/notes` with note selected (or open inline modal)
- "Add Note" button to create new note linked to this course
- Empty state: "No notes for this course yet"

---

### 5. New Component: CourseNotesTab

Create `src/components/courses/CourseNotesTab.tsx`:

```typescript
interface CourseNotesTabProps {
  courseId: string;
  courseName: string;
}
```

**Features:**
- Fetch notes where `course_id` = courseId
- List view with note cards (title, preview, date)
- "Add Note" button that navigates to Notes page with pre-selected course
- Click note to open in modal or navigate to Notes page

---

### 6. New Hook: useCourseNotes

Create `src/hooks/useCourseNotes.ts`:

```typescript
export function useCourseNotes(courseId: string) {
  return useQuery({
    queryKey: ['course-notes', courseId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await supabase.functions.invoke('get-journal-pages', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        query: { course_id: courseId },
      });
      
      return response.data;
    },
    enabled: !!courseId,
  });
}
```

---

### 7. Data Validation & Edge Cases

**Course ownership validation:**
- Before saving note with course_id, verify course belongs to current user
- Edge function can do this with a simple existence check

**Deleted course handling:**
- If course deleted, notes keep `course_title` (for context)
- Display as "📚 [Course Title] (deleted)" in UI
- course_id becomes null but course_title remains

**Search integration:**
- Update notes search filter to match against `course_title` field
- Both in frontend filtering and edge function query

---

### 8. Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[new].sql` | Create | Add course columns to journal_pages |
| `supabase/functions/get-journal-pages/index.ts` | Modify | Add course_id filter, include course in response |
| `supabase/functions/save-journal-page/index.ts` | Modify | Add course fields to schema and save |
| `src/pages/Notes.tsx` | Modify | Add course filter, course dropdown in form, course badge |
| `src/pages/CourseDetail.tsx` | Modify | Add Notes tab with linked notes |
| `src/components/courses/CourseNotesTab.tsx` | Create | Notes tab content component |
| `src/hooks/useCourseNotes.ts` | Create | Hook for fetching course-specific notes |

---

### 9. UI/UX Details

**Course Filter Dropdown (Notes page):**
```
📋 All Notes
─────────────
📝 General Notes (no course)
─────────────
📚 Marketing Foundations
📚 Sales Mastery
📚 Leadership Course
```

**Course Badge on Note Card:**
- Blue/indigo background to differentiate from project badges
- 📚 icon prefix
- Clickable to filter by that course

**Course Dropdown in Note Form:**
- Grouped by status: "In Progress", "Complete", etc.
- Shows course title with status indicator
- "No course" option at top

---

### 10. Mobile Considerations

- Course dropdown uses native select on mobile for thumb-friendly interaction
- Course badges sized for touch (44px tap target)
- Filter dropdown scrollable if many courses
- Course notes tab in CourseDetail responsive

---

### 11. Implementation Order

1. **Database migration** - Add course columns to journal_pages
2. **Edge functions** - Update get and save functions
3. **Notes page - form** - Add course dropdown to create/edit modal
4. **Notes page - filter** - Add course filter dropdown
5. **Notes page - display** - Add course badge to note cards
6. **Notes page - search** - Include course_title in search
7. **CourseDetail - Notes tab** - Add notes tab with linked notes
8. **Sort by course** - Add grouping option

