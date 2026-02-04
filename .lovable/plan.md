

# Campaign Bars and Filtering for Editorial Calendar

## Overview
Add visual campaign/launch bars to the Editorial Calendar that span the days they're active, with a slide-in panel for campaign details and the ability to filter calendar content by campaign.

---

## Current State

### What Exists
1. **`useEditorialCalendar.ts`** - Fetches content items, plan items, and tasks for the week
2. **`useLaunches.ts`** - Existing hook that fetches launches for dropdowns
3. **`CalendarWeekView.tsx`** - 7-column grid showing days of the week
4. **`EditorialCalendarView.tsx`** - Main view with navigation, filters, and DnD context
5. **Sheet UI component** - Available for slide-in panels

### What's Missing
- No campaign data in the editorial calendar hook
- No visual representation of campaigns spanning days
- No campaign filter dropdown
- No campaign detail slide-in panel

---

## Implementation Plan

### Part 1: Add Campaign Data to useEditorialCalendar Hook

**File: `src/hooks/useEditorialCalendar.ts`**

**Changes:**
1. Add `campaignFilter` optional parameter to hook options
2. Add new `campaignsQuery` that fetches launches overlapping with the current week
3. Apply campaign filter to content items query
4. Include `launch_id` in content items select
5. Return campaigns array and include in loading state

**Key Query Logic:**
```typescript
// Campaigns that overlap with current week:
// cart_opens <= weekEnd AND cart_closes >= weekStart
.or(`and(cart_opens.lte.${weekEndStr},cart_closes.gte.${weekStartStr})`)
```

**Return additions:**
- `campaigns`: Array of launches with assigned display colors
- Updated `isLoading` to include campaigns query

---

### Part 2: Create CampaignBar Component

**New File: `src/components/editorial-calendar/CampaignBar.tsx`**

**Visual Design:**
- Horizontal bar that spans across the correct days of the week
- Uses campaign's assigned color
- Shows rocket icon + campaign name
- Clickable to open slide-in panel
- Tooltip showing full date range

**Grid Positioning Logic:**
- Calculate which day of week campaign starts (clamped to Mon-Sun)
- Calculate which day of week campaign ends (clamped to Mon-Sun)
- Use CSS Grid column span: `grid-column: start / span count`

**Component Interface:**
```typescript
interface Campaign {
  id: string;
  name: string;
  cart_opens: string;
  cart_closes: string;
  display_color: string;
}

interface CampaignBarProps {
  campaign: Campaign;
  weekStart: Date;
  onClick: (campaignId: string) => void;
}
```

---

### Part 3: Update CalendarWeekView with Campaign Bars

**File: `src/components/editorial-calendar/CalendarWeekView.tsx`**

**Changes:**
1. Add new props: `campaigns`, `onCampaignClick`
2. Add campaign bars section above the day columns
3. Stack multiple campaigns vertically if overlapping

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ CAMPAIGN BARS SECTION (if campaigns exist)         │
│ ┌─────────────────────────────────────────────────┐│
│ │ 🚀 Spring Launch  ████████████████████████      ││
│ │           🚀 Flash Sale  ████████               ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │         │
│ ... day columns continue ...                        │
└─────────────────────────────────────────────────────┘
```

---

### Part 4: Create CampaignSlideIn Panel

**New File: `src/components/editorial-calendar/CampaignSlideIn.tsx`**

**Uses:** Sheet component from UI library

**Content Sections:**
1. **Header**
   - Campaign name with rocket icon
   - Date range (formatted nicely)

2. **Stats Cards (2-column grid)**
   - Revenue Goal (DollarSign icon)
   - Duration (Calendar icon showing days)

3. **Content Summary**
   - Total content items linked to this campaign
   - Breakdown by platform (badges with counts)
   - Breakdown by status (draft, scheduled, published)

4. **Actions**
   - "Edit Launch" button - navigates to Launch Wizard with edit param
   - "Filter to This" button - applies campaign filter and closes panel

**Data Queries:**
- Fetch full campaign details from launches table
- Fetch content items where `launch_id` matches campaign

---

### Part 5: Add Campaign Filter Dropdown

**File: `src/components/editorial-calendar/EditorialCalendarView.tsx`**

**New State:**
- `selectedCampaignId`: string | null - for slide-in panel
- `campaignFilter`: string | null - for filtering content

**UI Changes:**
1. Add Select dropdown in header (next to view toggle)
   - "All Campaigns" option (value: 'all')
   - Separator
   - List of active campaigns with color dot + name

2. Pass `campaignFilter` to `useEditorialCalendar` hook

3. Pass campaigns and click handler to `CalendarWeekView`

4. Render `CampaignSlideIn` component conditionally

---

### Part 6: Update EditorialCalendarView Integration

**File: `src/components/editorial-calendar/EditorialCalendarView.tsx`**

**New Imports:**
- Select components from ui/select
- CampaignSlideIn component
- CampaignBar component (indirectly via CalendarWeekView)

**Handler Updates:**
- `handleCampaignClick`: Opens slide-in panel
- `handleFilterToCampaign`: Sets campaign filter from slide-in

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useEditorialCalendar.ts` | Modify | Add campaigns query, campaign filter, return campaigns |
| `src/components/editorial-calendar/CampaignBar.tsx` | Create | Visual campaign bar component |
| `src/components/editorial-calendar/CalendarWeekView.tsx` | Modify | Add campaigns prop, render campaign bars |
| `src/components/editorial-calendar/CampaignSlideIn.tsx` | Create | Slide-in panel with campaign details |
| `src/components/editorial-calendar/EditorialCalendarView.tsx` | Modify | Add filter state, campaign dropdown, integrate slide-in |
| `src/components/editorial-calendar/index.ts` | Modify | Export new components |

---

## Implementation Order

1. **Hook Update** - Add campaigns query and filter to useEditorialCalendar
2. **CampaignBar Component** - Create the visual bar with grid positioning
3. **CalendarWeekView Update** - Add campaign bars section
4. **CampaignSlideIn Component** - Create detail panel
5. **EditorialCalendarView Integration** - Add dropdown, state, and slide-in
6. **Update Exports** - Add new components to index.ts

---

## Testing Checklist

**Campaign Bars:**
- [ ] Bars appear for campaigns that overlap current week
- [ ] Bars span correct days (start to end)
- [ ] Bars handle campaigns that start before/end after the week
- [ ] Multiple campaigns stack vertically
- [ ] Click opens slide-in panel
- [ ] Tooltip shows full date range

**Campaign Slide-In:**
- [ ] Shows correct campaign details
- [ ] Content count and breakdown is accurate
- [ ] "Edit Launch" navigates correctly
- [ ] "Filter to This" applies filter and closes

**Campaign Filter:**
- [ ] Dropdown shows all active campaigns
- [ ] Selecting filters content to that campaign only
- [ ] "All Campaigns" clears filter
- [ ] Filter state persists across week navigation
- [ ] Campaign bars always show regardless of filter

**Edge Cases:**
- [ ] No campaigns - bars section doesn't render
- [ ] Campaign with no content - shows 0 items message
- [ ] Campaign with null cart_opens/closes - handled gracefully

