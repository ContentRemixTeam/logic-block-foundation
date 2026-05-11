## Goal

Make every Smart Wizard end with a clear, reassuring "Add this to my planner" experience — preview, confirm, success — so wizard answers reliably become tasks/projects/content/habits the user can find in the rest of the app.

Scope: 12 wizards under /cycle-wizard, /cycle-setup, /wizards/launch, /wizards/habits, /wizards/content, /wizards/summit, /wizards/money-momentum, /wizards/project-designer, /wizards/lead-magnet, /wizards/flash-sale, /wizards/webinar, /wizards/content-challenge.

## Approach: shared building blocks first, then per-wizard wiring

Rather than rewriting each wizard from scratch, I'll add a small reusable layer and apply it everywhere. This keeps existing edge functions, drafts, and Supabase tables intact.

### Phase 1 — Quick wins + shared infrastructure (this slice)

1. **Fix Wizard Hub bugs**
   - "View Last" navigates to `/cycle-view/:id` (route exists) instead of broken `/cycle/:id`.
   - Treat `launch-planner` and `launch-planner-v2` as the same wizard for history/last-completion lookup.
   - Show "View Last" for any completion that has a created project/launch/etc., not only `created_cycle_id`.
   - Group history entries under one display name when template aliases exist.

2. **Standardize wizard template names** (constants module)
   - New `src/lib/wizardTemplates.ts` exporting canonical names + alias map. All wizards import from here so completions, drafts, and hub all line up.

3. **Shared review/success components** in `src/components/wizards/shared/`
   - `WizardReviewStep`: shows "Here's what we'll add to your planner" with checkable sections (project / tasks / content / habits / events / recurring), counts, expandable previews, single "Create Now" button with double-click guard.
   - `WizardSuccessScreen`: post-create screen with contextual buttons (View project, View tasks, Today, Weekly Plan, Editorial Calendar) based on what was created. Handles partial-success messaging + retry.
   - `useWizardCreate` hook: idempotent submit guard, draft clearing only after success, partial-success state, calls `wizardIntegration` helpers.

4. **Cycle Wizard / Cycle Setup disambiguation**
   - Mark the richer one as "90-Day Business Planner (recommended)" and the other as "Quick cycle setup" in the hub + their page headers. No deletion.
   - Add task creation options to Cycle Wizard review step:
     - monthly check-in projects
     - weekly planning recurring task
     - first 3 days of cycle tasks (from Top 3)
     - low-energy backup tasks
     - end-of-cycle review task

5. **Habit Wizard draft cleanup**
   - Clear draft + completion-mark in same transaction as habit creation success.

6. **Project Designer: draft/resume/save status UI**
   - Wire `useWizard` (already in other wizards) so it gets the same autosave + ResumeDraftDialog + WizardSaveStatus indicator as the rest.

### Phase 2 — Per-wizard review screen + dual-write (separate slice)

For each of: launch (v1+v2), content, summit, money-momentum, lead-magnet, flash-sale, webinar, content-challenge, project-designer:

- Insert `WizardReviewStep` as the final step before any creation call.
- Map wizard data → preview sections (project/tasks/content/habits/events/recurring) with counts + expandable details.
- Allow users to toggle off categories before confirm.
- After successful creation, swap to `WizardSuccessScreen` with the right destination buttons.
- Ensure tasks created go through the existing `useResilientTaskMutation` / `useTasks` path so they appear in Tasks, Today, Weekly Plan, project pages, and widgets (per the project memory rule).
- Ensure projects use `useProjects` hooks; content uses `useContentVaultItems` + editorial calendar; habits use existing habit endpoints.
- Add `system_source`, energy level, priority, scheduled_date, project_id on every generated task.

### Phase 3 — Polish + verification (separate slice)

- Audit each route end-to-end and confirm acceptance criteria.
- Add a low-energy variant generator helper for big tasks.
- Make sure double-submit guard, partial-success, and retry path are exercised.

## Technical notes

- No schema changes required for Phase 1. Phase 2 may add `system_source` strings only (no migration).
- All draft clearing remains conditional on successful create (preserves recovery on failure).
- All existing edge functions kept; we only add a thin client-side review/success layer around them.
- Memory rule respected: task creation always via `useResilientTaskMutation`; never direct table writes.

## What this slice ships

Phase 1 only: hub fixes, shared `WizardReviewStep` + `WizardSuccessScreen` + `useWizardCreate`, Cycle wizard task options, Habit draft cleanup, Project Designer status UI, template name constants. Then I'll come back for Phase 2 (per-wizard wiring) and Phase 3 (polish) as follow-up slices so each is reviewable.

Reply "go" to start Phase 1, or tell me to reorder / cut scope.