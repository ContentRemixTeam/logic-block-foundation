
# Implementation Plan: Dashboard Widget, Database Column, Settings Navigation, Testing & Documentation

## Overview
This plan addresses five related prompts to complete the daily page customization feature set:
1. **5A**: Dashboard widget promoting customization (dismissible)
2. **5B**: Database column for custom responses (already exists as `custom_reflections`)
3. **5C**: Settings navigation integration
4. **Testing Checklist**: Comprehensive QA coverage
5. **Documentation**: In-app help and tooltips

---

## Current State Analysis

### What Already Exists
- `daily_page_layouts` table with `custom_questions` JSONB column
- `daily_plans.custom_reflections` JSONB column already stores custom question responses
- Route `/settings/daily-page` is functional with DailyPageSettings.tsx
- DailyPlan.tsx already has a settings icon button linking to `/settings/daily-page`
- `user_settings.dashboard_widgets` JSONB column can store dismissed widget preferences
- `useDailyPageLayout` hook exposes layout data including whether user has customized

### What Needs to Be Built
- Dashboard promotional card (conditionally shown)
- Settings page navigation link to Daily Page settings
- First-visit onboarding tooltip
- Comprehensive testing checklist
- In-app tooltips for settings page

---

## Implementation Details

### 1. Dashboard Customization Widget (PROMPT 5A)

**File: `src/components/dashboard/CustomizePromoWidget.tsx`** (NEW)

A card component that:
- Shows title: "Customize Your Daily Page"
- Shows description: "Hide sections you don't use, add custom check-ins"
- Shows Settings/Sliders icon
- Has "Personalize" button linking to `/settings/daily-page`
- Has dismiss button (X) that saves preference

**Visibility Logic:**
- Only show if user layout matches default (hasn't customized)
- Check using `useDailyPageLayout` hook - compare `section_order` and `hidden_sections` to defaults
- Respect dismissed state stored in `user_settings.dashboard_widgets`

**Dismiss Logic:**
- Store in `user_settings.dashboard_widgets` as `{ dismissed_customize_promo: true }`
- Use existing Supabase update pattern

**File: `src/pages/Dashboard.tsx`**

- Import and render `CustomizePromoWidget` in the sidebar section
- Pass necessary props (isDefaultLayout, onDismiss)

---

### 2. Database Column for Custom Responses (PROMPT 5B)

**Status: Already Complete**

The column already exists:
- `daily_plans.custom_reflections` JSONB column
- `get-daily-plan` edge function returns it
- `save-daily-plan` edge function accepts and saves it
- No migration needed

For optional GIN index (performance optimization for future reporting):
```sql
CREATE INDEX IF NOT EXISTS idx_daily_plans_custom_reflections 
ON daily_plans USING gin(custom_reflections);
```

---

### 3. Settings Navigation (PROMPT 5C)

**File: `src/pages/Settings.tsx`**

Add a new card section linking to Daily Page settings:
- Position near Display Preferences
- Card with:
  - Title: "Daily Page Layout"
  - Description: "Customize sections and add check-ins"
  - Icon: LayoutGrid or Settings2
  - Button: "Customize" linking to `/settings/daily-page`

**File: `src/pages/settings/DailyPageSettings.tsx`**

Add breadcrumb navigation:
- "Settings" link / "Daily Page"
- Improve back button to go to /settings

---

### 4. Onboarding Tooltip (Documentation)

**File: `src/components/daily-plan/CustomizeTip.tsx`** (NEW)

A dismissible tooltip/banner component:
- Shows on first visit to Daily Plan after layout feature is available
- Text: "Tip: You can customize which sections appear here"
- Link: "Personalize your daily page"
- Store dismissal in localStorage: `hasSeenDailyPageCustomizeTip`

**File: `src/pages/DailyPlan.tsx`**

- Import and conditionally render `CustomizeTip` at top of page
- Check localStorage for prior dismissal

---

### 5. Section Tooltips in Settings

**File: `src/pages/settings/DailyPageSettings.tsx`**

Enhance the section list with info tooltips:
- Wrap section label with Tooltip component
- Show `section.description` on hover
- Add question mark icon trigger

---

## Technical Details

### State Management Pattern
```typescript
// Check if user has customized (not default)
const hasCustomizedLayout = useMemo(() => {
  if (!layout) return false;
  
  const hiddenMatch = layout.hidden_sections.length === 0;
  const orderMatch = layout.section_order.length === DEFAULT_SECTION_ORDER.length &&
    layout.section_order.every((id, i) => id === DEFAULT_SECTION_ORDER[i]);
  
  return !(hiddenMatch && orderMatch);
}, [layout]);
```

### Dismissed Widget Storage
```typescript
// Save dismissed state
const dismissCustomizePromo = async () => {
  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      dashboard_widgets: { dismissed_customize_promo: true }
    });
};
```

---

## Testing Checklist (PROMPT - Testing)

### Manual QA Scenarios

**Layout Creation:**
- [ ] New user gets default layout automatically
- [ ] Default includes all 18 sections visible
- [ ] Can save custom layout without errors

**Show/Hide:**
- [ ] Hiding section removes it from Daily Plan page
- [ ] Showing section adds it back immediately
- [ ] Changes persist after page refresh
- [ ] Cannot hide "ONE Thing" or "Top 3 Priorities"

**Reordering:**
- [ ] Drag-and-drop moves sections to new positions
- [ ] Order persists after save and page reload
- [ ] Daily Plan renders sections in new order
- [ ] Mobile: up/down arrows work correctly

**Custom Questions:**
- [ ] Can add checkbox type question
- [ ] Can add text type with character limit
- [ ] Can add number type with min/max
- [ ] Can add rating type with labels
- [ ] Can add time type
- [ ] Can add dropdown type with options
- [ ] Questions appear on Daily Plan page
- [ ] Checkbox toggles save correctly
- [ ] Text input saves on blur
- [ ] Rating slider saves correctly
- [ ] Required validation works
- [ ] Can edit existing question
- [ ] Can delete question (with confirmation)

**Templates:**
- [ ] Minimalist template applies correctly
- [ ] Entrepreneur template applies correctly
- [ ] Creator template applies correctly
- [ ] Wellness template adds custom questions
- [ ] Student template applies correctly
- [ ] Confirmation dialog appears before applying
- [ ] Custom questions preserved when applying template
- [ ] "Current" badge shows for active template

**Preview:**
- [ ] Preview shows accurate section order
- [ ] Hidden sections not shown in preview
- [ ] Custom questions render in preview
- [ ] Desktop/mobile toggle works
- [ ] Preview updates as settings change

**Data Persistence:**
- [ ] Layout saves to `daily_page_layouts` table
- [ ] Custom responses save to `daily_plans.custom_reflections`
- [ ] Changes sync immediately after save
- [ ] No data loss on browser refresh
- [ ] Works across different devices (same account)

**Edge Cases:**
- [ ] Empty custom questions list works normally
- [ ] All sections hidden shows appropriate message
- [ ] Long custom question text truncates nicely in preview
- [ ] Many custom questions (10+) scrolls properly
- [ ] Invalid question type defaults gracefully

**Dashboard Widget:**
- [ ] Card shows for users with default layout
- [ ] Card hidden for users who customized
- [ ] Dismiss button works and persists
- [ ] "Personalize" button navigates correctly

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/dashboard/CustomizePromoWidget.tsx` | CREATE | Promotional card for dashboard |
| `src/components/daily-plan/CustomizeTip.tsx` | CREATE | First-visit onboarding tooltip |
| `src/pages/Dashboard.tsx` | MODIFY | Add CustomizePromoWidget to sidebar |
| `src/pages/Settings.tsx` | MODIFY | Add Daily Page settings link card |
| `src/pages/settings/DailyPageSettings.tsx` | MODIFY | Add breadcrumbs, section tooltips |
| `src/hooks/useDailyPageLayout.ts` | MODIFY | Add `isDefaultLayout` helper |

---

## Dependencies
- No new npm packages required
- Uses existing Supabase tables and edge functions
- Leverages existing UI components (Card, Button, Tooltip, Badge)

---

## Estimated Scope
- 4-5 new/modified files
- Approximately 200-300 lines of new code
- No database migrations required (column exists)
- Optional GIN index for performance
