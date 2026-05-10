
# Brain Dump / Capture — Phase 1

A focused, frontend-only pass that unifies tag language, stabilizes the Daily Plan scratch pad, and calms the `/brain-dump` UI. No schema changes. No data migration. No AI.

## Answers to your pre-flight questions

**1. Files I will change**
- `src/lib/captureTags.ts` *(new)* — single shared tag config + helpers
- `src/components/SmartScratchPad.tsx`
- `src/components/brain-dump/BrainDumpCreateForm.tsx`
- `src/components/brain-dump/BrainDumpCard.tsx`
- `src/components/brain-dump/BrainDumpBoard.tsx` *(small copy/visual tweaks only)*
- `src/components/brain-dump/BrainDumpGrid.tsx` *(small copy/visual tweaks only)*
- `src/pages/BrainDump.tsx` *(header copy + inbox grouping for untagged)*
- `src/components/ScratchPadOrganizeModal.tsx` *(copy only)*
- `src/components/daily-plan/UnprocessedTagsWarning.tsx` *(copy + tag set)*
- `src/hooks/useBrainDump.ts` — add a single new mutation `createItemsFromText(raw)` that splits lines and routes by tag. Existing `createItem`, `deleteItem`, `updateItem`, `convertCategory` left untouched.

**2. Schema changes?** None. We reuse `journal_pages`, `ideas`, and `tasks` exactly as-is. Tags beyond what destinations support are preserved verbatim inside the saved text (e.g. `#sales`, `#low-energy` stay in the title/content/task_text). No new columns.

**3. Preserving existing data?**
- No deletes or migrations.
- `useBrainDump` query, soft-delete behavior, and `convertCategory` flow are unchanged.
- Daily Plan autosave path (`save-daily-plan`, `scratch_pad_content`, local backup, beforeunload, mobile, `SaveStatusIndicator`) is not touched.
- We never strip raw user text — extra tags survive the save.

**4. Risky areas in the conversion flow**
- `useBrainDump.convertCategory` soft-deletes the source row, then inserts into the destination. If the insert fails, the original is already archived. Phase 1 does **not** restructure this, but I will:
  - rename UI affordance to "Move to…" with a confirmation toast on success and a clear error toast on failure
  - keep the existing query invalidations (`brain-dump`, `all-tasks`, `ideas`) so UI refreshes truthfully
- Out of scope (Phase 2): wrap convert in a transaction-like fallback (re-undelete on insert failure).

**5. Phase 1 implementation plan**

### Step 1 — Shared tag registry
New `src/lib/captureTags.ts` exporting:
- `CAPTURE_TAGS` array with `{ tag, label, emoji, icon, kind }` for: `task, idea, note, project, content, question, reminder, thought, win, sales, admin, email, low-energy, medium-energy, high-focus`.
- `kind` ∈ `'destination' | 'modifier'`. Destination tags route to a table; modifiers are preserved in text.
- Helpers: `parseLineTags(line)`, `routeForLine(line)` → `{ destination: 'task'|'idea'|'note'|'project', cleanedText, modifiers, allTags }`.
  - Routing precedence: `task > project > idea > note` (first match wins); untagged → `note` (inbox).
  - `cleanedText` removes only the routing destination tag; other tags stay in the text.

### Step 2 — Stabilize `SmartScratchPad`
- Drop the transparent-text / overlay highlight system. Use a normal visible `<Textarea>` (semantic tokens, no `text-transparent`, no `WebkitTextFillColor: transparent`, no scroll-sync overlay).
- Keep autocomplete popup, keyboard nav, and tag-button insertion.
- Use the shared registry (full set, scrollable popup).
- Keyboard rules: Enter inserts newline normally; Tab/Enter only consumed when the autocomplete menu is open; Esc closes popup; existing Cmd/Ctrl+Enter behavior preserved if present in parent.
- Update placeholder + helper text to the copy you specified.
- Tag count chips below the textarea become a calm muted summary (counts of detected destination tags) — no full-line backgrounds.

### Step 3 — `BrainDumpCreateForm` capture-first flow
- Remove the up-front category select from the visual hierarchy. Show a calm, large textarea first; keep an optional "Default if untagged" small `Select` below the action row defaulting to `note`.
- On submit, call new `createItemsFromText(text)`:
  - Split by `\n`, ignore empty lines.
  - For each line: route via `routeForLine`. Save to the right table using the same insert paths the existing `createItem` already uses. If a line fails, keep that line in the textarea, toast `"Saved X of Y, kept failed line(s)"`.
- Replace helper line with: "Use tags like #task, #idea, #content, #project, #question, #win — or leave it messy and sort it later."
- Placeholder: "Dump anything here. Tasks, ideas, reminders, questions, wins, content sparks…"

### Step 4 — Calmer `BrainDumpCard`
- Remove rotation, tape, and saturated post-it palette.
- New base: `bg-card rounded-xl border border-border/60 shadow-sm hover:shadow-md transition-shadow`.
- 3px left accent bar tinted by category (semantic tokens, e.g. `bg-primary/60`, `bg-accent/60`, `bg-muted-foreground/40`).
- Small tag pill (top-left), subtle date (bottom), edit/delete in a quiet hover cluster.
- Drag handle stays but muted.

### Step 5 — Inbox grouping in `/brain-dump`
- In `BrainDumpBoard`/`Grid` add a visual "Inbox" column/section seeded from notes whose text starts untagged or contains `#unprocessed`. (No schema change — pure client-side filter.) If trivial-only, show "Inbox" tab that maps to `note`.
- Calmer column headers (label · count, thin divider, no heavy bg).

### Step 6 — Copy refresh
- `ScratchPadOrganizeModal` title → "Review captured items"; buttons → "Send tasks to task list", "Save ideas", "Keep as note", "Use defaults", "Process later".
- `UnprocessedTagsWarning`: title → "You have tagged items to review"; body explains autosave is safe; buttons → "Review now", "Save and leave", "Stay here". Update `TAG_REGEX` to the full destination tag set so it doesn't miss `#note`/`#project`/`#content`/etc.

### Step 7 — Convert UX safety
- In `BrainDumpCard` (and any menu that calls `convertCategory`), label as "Move to…", show success toast on resolve and explicit error toast on reject; keep current invalidations.

### Step 8 — Verify
- Read the modified files; confirm Daily Plan save chain is untouched (no edits to `save-daily-plan`, `get-daily-plan`, `useDailyPlan`, `SaveStatusIndicator`).
- Manually walk through: typing in scratch pad (cursor visible, no overlay), inserting `#task` from autocomplete, multi-line capture in `/brain-dump`, card hover/edit/move, leaving Daily Plan with tagged items.

## Out of scope (Phase 2+)
- AI classification
- Schema changes / new tables
- Transactional `convertCategory` rewrite
- Daily Plan redesign, task manager redesign
- New "unprocessed" status column (using untagged-as-inbox heuristic instead)
