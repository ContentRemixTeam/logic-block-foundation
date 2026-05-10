
# Quick Capture — Phase 1 (planning-first refocus)

A focused pass to (a) remove finance from the Quick Capture surface, (b) fix the time parser, (c) add tag-based energy + multi-destination routing, and (d) tighten draft safety. No schema changes. No AI. No deletes. Finance pages and the `financial_transactions` table stay intact.

## Pre-flight answers

**1. Files I will change**
- `src/components/quick-capture/useCaptureTypeDetection.ts`
  - Drop `'income' | 'expense'` from `CaptureType`; remove `INCOME_PHRASES`, `EXPENSE_PHRASES`, `CURRENCY_PATTERN` paths.
  - Add `'note' | 'project' | 'content' | 'question' | 'reminder'` to `CaptureType` for routing parity with `captureTags.ts`.
  - Fix the time regex (see §3).
  - Add `energy_level` parsing to `parseTaskInput` (see §4) and to `ParsedTask`.
  - Add a new `routeFromTags(input)` helper that reuses `src/lib/captureTags.ts` for line-level destination detection.
  - Lower confidence behavior so untagged short input does not snap to `task` (see §3 default → `note`).
- `src/components/quick-capture/QuickCaptureModal.tsx`
  - Remove income/expense tabs, financial form, financial state, `financial_categories` fetch, `financial_transactions` insert, `TrendingUp`/`TrendingDown`/`DollarSign` imports, and `'income'/'expense'` branches in save / disabled / focus logic.
  - Replace burst save with a tag-routed multi-line save: each line is routed to task/idea/note/project via `captureTags.ts`. Mixed lines work. Preserve the existing `useTaskMutations.createTask` path for task lines.
  - Expand draft persistence to include: `input, captureType, parsedTask (date/priority/duration/tags/projectId/energy_level), ideaData (categoryId, priority, tags, projectId)`.
  - Type pills become: Task · Idea · Note · Content (existing → ContentSaveModal). Note is the gentle inbox fallback. Project/Question/Reminder routing is reachable via tags from any pill (no extra pills needed in Phase 1).
- `src/components/quick-capture/QuickChips.tsx`
  - Add an Energy chip (Low / Medium / High focus) wired to `parsedTask.energy_level`.
- `src/components/quick-capture/EditableChips.tsx`
  - Same energy chip on desktop preview.
- `src/pages/QuickAddApp.tsx` (PWA)
  - Remove `expense`/`income` from `typeOptions`, the amount input, `financial_transactions` insert, finance icons, `isFinancial` branches.
  - Switch grid to 3-column for Task/Idea/Note (Note added as inbox fallback). Reuse same routing helper for typed tags.
- `src/pages/InstallQuickAdd.tsx`
  - Drop Expenses/Income tiles + finance icons; rephrase the "switch with one tap" benefit copy to planning-only.

**Out of scope this pass**: `BrainDump.tsx`, `SmartScratchPad.tsx`, `QuickCaptureProvider.tsx`, `QuickCaptureButton.tsx`, `IdeaQuickChips.tsx` — they don't reference finance and don't need behavior changes.

**2. Removing finance safely**
- No DB migration. `financial_transactions`, `financial_categories`, finance pages, and the `/finances` route stay.
- We only delete the UI surfaces in Quick Capture / Quick Add PWA / Install screen.
- Type union narrowed: `CaptureType` no longer includes `income | expense`. All branches that switched on these types are removed (validated by TS — build will surface any stragglers).
- `'quick-capture-draft'` localStorage values from old versions that contain `captureType: 'income' | 'expense'` are sanitized on restore: if the loaded `captureType` is not in the new union, fall back to `'task'` and clear that field.
- Recents (`quick-capture-recent-tags`, `quick-capture-recent-projects`) are untouched.

**3. Fixing the parser**
Current `\b(\d{1,2})(:\d{2})?\s*(am|pm)?\b` strips bare numbers because `am|pm` is optional. Replacement:
```
const TIME_REGEX = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i;
```
Only matches `3pm`, `3:00`, `3:00pm`, `10am`. Bare `3` in "write 3 emails" is left in place. The same change is applied to `TIME_DATE_PATTERNS`.

Also: when detection confidence is **low** and there are no tags, return `suggestedType: 'note'` (was `'task'`). The modal's existing override flag still lets the user switch back to Task with one tap, and chip values entered are kept on switch.

**4. Energy parsing**
- Recognize `#low-energy`, `#medium-energy`, `#high-focus` (from `captureTags.ts`) plus loose phrasings `"low energy"`, `"medium energy"`, `"high focus"`.
- Map → `energy_level`: `low_energy` | `medium_energy` | `high_focus` (matching the existing string column on `tasks`).
- Strip the matched tag/phrase from `cleanedText` so it doesn't appear in the saved task title; modifier tags from `captureTags.ts` (`sales`, `admin`, `email`, etc.) are kept in `tags[]` and saved into `context_tags`.
- `ParsedTask` gains `energy_level?: 'low_energy' | 'medium_energy' | 'high_focus'`.
- `createTask.mutateAsync` is called with `energy_level` (already supported by the schema).

**5. Keeping existing task/idea saving working**
- Task save path unchanged: `useTaskMutations().createTask` + `parsedTask` chips + `context_tags`. Burst path keeps the same mutation per line; only routing logic is added (lines tagged `#idea`/`#note`/`#project` are dispatched to their respective save calls already used in the modal: `save-idea` edge fn for ideas, direct insert into `journal_pages` for notes, direct insert into `ideas` for `#project`).
- Idea save (`save-idea` edge fn) is unchanged; idea metadata chips and `IdeaQuickChips` keep working.
- Recents update logic unchanged.
- Cmd/Ctrl+K, Esc, mobile drawer, voice capture, draft recovery, burst mode, project chips: all preserved.

## Implementation steps

1. **`useCaptureTypeDetection.ts`**
   - Narrow `CaptureType`. Remove finance arrays/regex.
   - Replace time regex to require am/pm or `H:MM`. Update `TIME_DATE_PATTERNS` accordingly.
   - Add `ENERGY_TAGS` map; extend `parseTaskInput` to extract energy and strip from `cleanText`. Extend `ParsedTask`.
   - Add `routeFromTags(input)` thin wrapper around `routeForLine` from `@/lib/captureTags`.
   - Update default low-confidence return to `note`.

2. **`QuickCaptureModal.tsx`**
   - Strip all finance state, fetch, insert, validation, focus-on-amount, type-pill buttons (desktop + mobile), color overrides, save labels.
   - Remove finance imports.
   - Add Note pill (and keep Content pill which already opens `ContentSaveModal`).
   - Replace `handleBurstSave` → `handleMultiLineSave(lines)` that routes each line: task → existing path; idea/project → existing idea insert; note → `journal_pages` insert (mirrors `useBrainDump.createItemsFromText`). Failed lines reported via toast; succeeded count tallied to `savedThisSession`.
   - Save-button label: `Save Task` / `Save Idea` / `Save Note` / `Save N items` for multi-line.
   - Persist full draft snapshot (`input, captureType, parsedTask, ideaData`) on debounced typing. On restore, sanitize legacy finance type and re-hydrate parsed/idea state. Also save draft on `onOpenChange(false)` with non-empty input.
   - Energy chip wired through `handleQuickChipUpdate({ energy_level })`.

3. **`QuickChips.tsx` / `EditableChips.tsx`**
   - Add an Energy popover (Low / Medium / High focus) with the existing chip pattern. No styling overhaul.

4. **`QuickAddApp.tsx`**
   - Remove finance from `typeOptions`, `isFinancial`, amount input, finance insert.
   - Add Note option (saves to `journal_pages`); reuse routing helper so typed tags also work.
   - Auth/ManifestSwitcher/session validation untouched.

5. **`InstallQuickAdd.tsx`**
   - Drop Expense/Income tiles; copy reads "Switch between task, idea, note with one tap".
   - Keep all install/PWA logic.

6. **Verify**
   - Type-check (build runs automatically).
   - Unit-spot check parser cases: `"write 3 emails"` keeps `text === "write 3 emails"`; `"call client tomorrow 3pm 30m !high #sales"` → date=tomorrow, time=3pm, duration=30, priority=high, tags=['sales']; `"deep work 2h #high-focus"` → duration=120, energy_level='high_focus'.
   - Walk through modal: type a single task, multi-line mixed (task + idea + note + project), close mid-typing → reopen → draft restored, voice still works, finance pills gone.
   - Confirm `/finances` page still loads and `financial_transactions` table is untouched.

## Risks & mitigations
- **Stale draft with `captureType: 'income'`** → sanitize on restore, fall back to `'task'`.
- **Note insert path** mirrors `useBrainDump` (`journal_pages.insert({ user_id, title, content })`); same RLS already in use.
- **Routing precedence** uses `task > project > idea > note > content > question > reminder`; matches `captureTags.ts` rules already shipped in Phase 1 of Brain Dump.

## Out of scope
- AI classification.
- New schema columns (energy_level already exists; routing tags ride on `context_tags`).
- Removing or migrating any finance data.
- Redesigning Quick Capture beyond removing finance and adding Note pill + Energy chip.
