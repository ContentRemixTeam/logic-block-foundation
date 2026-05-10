## Goal

Make `/tasks` feel like a calm, premium **master task list** inspired by Sunsama — without turning it into the Daily Planning page. All tasks from projects, planners, and wizards continue to live and update here.

## Safety check (answers to your pre-implementation questions)

1. **Components changing** (presentation only):
   - `src/pages/Tasks.tsx` — page shell, header, container width, ambient background
   - `src/components/tasks/TasksPageToolbar.tsx` — collapse to two quiet rows + combined filter popover
   - `src/components/tasks/TaskCard.tsx` — Sunsama-style card with reduced badges + priority edge bar
   - `src/components/tasks/views/TaskListView.tsx` — editorial group headers + inline add-task row + empty states
   - `src/components/tasks/TaskQuickAdd.tsx` — add a compact "inline" variant prop (no behavior change for existing usages)

2. **Frontend/presentation only?** Yes. No schema, hook, route, auth, or backend changes. `useTasks()` / `useTaskMutations()` and the existing optimistic cache logic remain untouched, so edits/completions still propagate everywhere.

3. **Data risk?** None. We don't touch persistence, mutations, offline sync, or task shape. All filters/controls stay reachable (just behind a popover). Existing `Task` type fields are read-only consumed.

4. **Step-by-step plan** is below.

## Implementation steps

### 1. Page shell — calmer canvas (`Tasks.tsx`)
- Wrap the whole page in `bg-gradient-to-b from-background via-background to-muted/30 min-h-screen`.
- For list view, center content in `max-w-5xl mx-auto px-6 pt-10 pb-24`. Kanban / Monday board / Timeline / Three-day stay full width.
- Replace stacked header (stat tiles + cycle badge + recovery banner) with one editorial header:
  - **H1**: dynamic title — `Today` / `This Week` / `All Tasks` / `Completed` based on `activeTab`.
  - **Subtitle**: `format(today, 'EEEE, MMMM d')` · `{openCount} open tasks` · `{plannedHours} hrs planned` (only show planned hrs if `> 0`).
  - Sub-subtitle (muted, smaller, only on All): "Tasks from your projects, plans, and wizards live here."
- Move `TaskRecoveryBanner` + `CycleBadge` into a thin "status strip" that only renders when present (`recovery || activeCycle`). Use `text-xs text-muted-foreground` styling.
- Remove the "No date" / "In projects" stat tiles from header. (They're already filterable in the toolbar.)

### 2. Toolbar — quiet, two rows (`TasksPageToolbar.tsx`)
- **Row 1** — primary tab pills (`Today · Week · All · Completed`). Use ghost variant with an active underline (border-b-2 primary) instead of filled background. Counts shown as small muted numbers next to each label.
- **Row 2** (right-aligned cluster):
  - Search: icon-only button, expands to inline input on click; collapses on blur if empty.
  - Filters: single icon button → one combined `Popover` containing Priority, Energy, Tags, Projects, Launches (sections inside a `ScrollArea`). Show a small primary-colored dot on the icon when any filter is active.
  - View switcher: 3 small icon-only buttons in a segmented `bg-muted rounded-full p-1` pill (List / Kanban / Three-day). Other view modes accessible via dropdown overflow if more than 3.
- Drop visible: "Saved Filters (0)", "Manage Fields", standalone energy chips, project/launch chip rows.
- Keep all underlying state/props identical so `Tasks.tsx` doesn't need filter logic changes.

### 3. Task cards — Sunsama style (`TaskCard.tsx`)
- Card: `bg-card rounded-xl shadow-sm hover:shadow-md transition-all border-0 px-4 py-3` with a 3px left edge bar colored by priority (`bg-destructive` / `bg-amber-500` / `bg-blue-400` / `bg-transparent`).
- Layout: `[checkbox] [title + optional 1-line description] [spacer] [time chip] [project tag] [overflow menu]`.
- Energy: tiny icon (no label), `Tooltip` for "Low Energy / Medium / High Focus".
- Time: small monospace chip — `8:00` if `scheduled_time`, else `1h 30m` if `duration_minutes`, in `bg-muted/60 text-xs font-mono px-2 py-0.5 rounded-md`.
- Project: `# project-name` style with a colored dot, link-like (`text-muted-foreground hover:text-foreground`).
- Source label (from `source` / `created_via` if present): tiny muted "From Daily Plan" / "From Wizard" / "From Project" — only when source exists.
- Drop the explicit Status badge from list rendering (still editable via detail dialog).
- Completed: `line-through opacity-50`. Stable layout, no extra "Done" badge.
- Spacing between cards in groups: `space-y-2`.

### 4. Group headers — editorial (`TaskListView.tsx`)
- Replace bold colored icons with: `<dot> LABEL · count <thin divider line> <chevron>`.
- Style: `text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium`.
- Overdue: `bg-destructive/60` dot + `text-destructive/80` label only — no warning icon, no full-color treatment.
- Add `animate-fade-in` to each group section.

### 5. Inline "+ Add task" row (`TaskListView.tsx` + `TaskQuickAdd.tsx`)
- Add a `variant?: 'inline'` prop to `TaskQuickAdd` that strips the card chrome and renders a single muted row: `+ Add task` placeholder, focuses on click, Enter saves, Esc blurs.
- Render this row at the top of each visible group. Default new-task date matches the group (Today, Tomorrow, etc.) — pass `defaultDate` prop.
- Keep existing dialog-based creation (header "+ New task" button) intact.
- Empty group: muted `Nothing planned` line, then the inline add row. No big illustration.

### 6. Energy support
- Already filterable via `filters.energy`; surface inside the new combined filter popover with the existing `EnergyLevel` checkboxes.
- Group-by Energy already supported in `TaskListView` via `GROUP_BY_OPTIONS`; keep available in the filter popover under "Group by".
- Card shows energy as the tiny icon (step 3).

### 7. Save state surfacing
- `useTaskMutations` exposes mutation states. Add a small status indicator near the toolbar (`text-xs text-muted-foreground`): "Saving…" while any mutation is `isPending`, "Saved" briefly after success, otherwise hidden. No new save logic.

### 8. Motion / color polish
- Use existing `animate-fade-in`, `hover-scale` utilities only.
- All colors via semantic tokens (`bg-card`, `text-muted-foreground`, `bg-destructive`, etc.). No new tokens, no new keyframes.

### 9. Mobile responsiveness
- Header stacks vertically below `sm`. Subtitle wraps.
- Toolbar Row 1 horizontal scrolls if needed (`overflow-x-auto no-scrollbar`).
- Task card layout uses flex-wrap so chips drop to a second line on narrow widths.
- View switcher hides on mobile (defaults to list).

## Out of scope (explicitly)
- Daily Planning page, Projects page, planning pages, wizards.
- Kanban / Timeline / Three-day / Monday board internals (they'll inherit the new `TaskCard` automatically since they reuse it; no further changes).
- Calendar sidebar, schema, theme tokens, auth.

## Risk summary
- Data: none — read-only presentation.
- Behavior: all filters/controls preserved, just relocated. Existing tab/filter persistence (localStorage) untouched.
- Cross-app sync: untouched — uses same `useTasks` hooks.
