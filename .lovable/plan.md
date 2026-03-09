

## Plan: Fix Task Generation Logic + Eliminate Pink Accents

### Problem 1: Tasks don't reflect the user's actual schedule

**Current behavior:** The task generator finds the *first* "create" slot and the *first* "publish" slot in the schedule and generates one generic "Create content" + "Publish content" task per week on those days. If a user schedules "Publish TikTok video" on Monday, Wednesday, and Friday, only ONE publish task is created per week.

**Fix:** Rewrite `generateEngineBuilderTasksPreview` to be schedule-driven rather than phase-driven for the lead-gen/weekly-ops sections:

- Iterate through every slot in `weeklySchedule` and generate a task per slot per week (4 weeks)
- The task text should include the user's actual activity description (e.g., "📢 Publish TikTok video") not generic "Publish Week 1 content"
- Keep setup and convert phases as-is (one-off tasks)
- Remove the duplicate "weekly-ops" section that currently re-generates the same schedule slots
- Similarly update `handleSaveToBossPlanner` content item generation to create items per publish slot, not one generic item per week

### Problem 2: Pink accents throughout all workshop components

**Root cause:** 10+ files use Tailwind's `border-primary`, `bg-primary/10`, `text-primary`, `ring-primary/20` classes which resolve to the app's global pink theme. Only the wizard wrapper has engine-specific CSS overrides, but these don't override Tailwind utility classes.

**Fix:** Add CSS overrides in the `EngineBuilderWizard.tsx` `<style>` block to remap `--primary` within the `.engine-wizard` scope:

```css
.engine-wizard {
  --primary: 32 95% 44%;
  --primary-foreground: 0 0% 100%;
  --ring: 32 95% 44%;
  --accent: 32 95% 44% / 0.08;
}
```

This single change will fix ALL child components at once without editing each file individually. The `--primary` CSS variable used by Tailwind will resolve to amber/orange within the wizard scope.

Additionally fix the `EngineLoopGraphic.tsx` SVG strokes which use `hsl(var(--primary))` — these will be automatically fixed by the CSS variable override.

### Files to change

1. **`src/components/workshop/EngineBuilderWizard.tsx`** — Add `--primary` CSS variable override in the style block scoped to `.engine-wizard`
2. **`src/lib/engineBuilderTaskGenerator.ts`** — Rewrite to generate tasks from each individual schedule slot rather than generic per-week tasks
3. **`src/components/workshop/EngineBuilderWizard.tsx`** — Update content item generation in `handleSaveToBossPlanner` to create one content item per publish slot per week

