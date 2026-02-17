
# Hide AI Copywriting From Users Entirely

## What
Remove all user-facing access to AI Copywriting so it's completely invisible. Users won't be able to see it, toggle it on, or stumble into it.

## Changes

### 1. Remove the toggle from Settings page
Delete the AI Copywriting switch block (lines 513-530) from `src/pages/Settings.tsx` so users can't enable it.

### 2. Hide AI Copywriting from Features Guide
Remove the two AI Copywriting entries from the features array in `src/components/support/FeaturesGuide.tsx`, and remove "AI Copywriting" from the categories list.

### 3. Hide AI Copywriting from FAQ
Remove all AI Copywriting FAQ entries from `src/components/support/FAQSection.tsx`, and remove the category from the FAQ category list.

### 4. Keep everything else as-is
- The sidebar filtering already hides it (defaults to `false`, no toggle to turn it on)
- The route guard in `AICopywriting.tsx` already redirects if disabled
- The database column stays (no schema change needed)
- All AI Copywriting code stays intact for when you're ready to launch

## Result
AI Copywriting becomes completely invisible to users. When you're ready to launch, just re-add the toggle to Settings.
