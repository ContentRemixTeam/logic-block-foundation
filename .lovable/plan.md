

# Campaign Assignment in Quick Edit Drawer

## Overview
The Campaign Layers feature is **already fully implemented** except for one piece: the ability to assign or change a campaign (launch) when editing a content item in the quick edit drawer.

## Current State Summary

| Feature | Status |
|---------|--------|
| `launch_id` column on `content_items` | Implemented |
| Campaign query in `useEditorialCalendar` | Implemented |
| Campaign filter in header | Implemented |
| `CampaignBar` component | Implemented |
| `CampaignSlideIn` panel | Implemented |
| Campaign bars in `CalendarWeekView` | Implemented |
| Campaign assignment in Quick Edit | **Missing** |

## Implementation Plan

### Update ContentQuickEditDrawer

**File:** `src/components/editorial-calendar/ContentQuickEditDrawer.tsx`

**Changes:**

1. **Add imports:**
   - `useQuery` from TanStack Query
   - `supabase` client
   - `useAuth` hook
   - `Select` UI components

2. **Add state for selected campaign:**
   - `selectedCampaign`: string | null

3. **Add query to fetch available launches:**
   - Fetch launches with `cart_closes >= today`
   - Order by `cart_opens`

4. **Fetch current item's launch_id:**
   - When item changes and source is `content_item`, query for the item's `launch_id`
   - Set `selectedCampaign` state accordingly

5. **Add Campaign dropdown to form:**
   - Insert between Platform field and Creation Date field
   - Show "No Campaign" option plus all available launches
   - Display launch name with date range

6. **Update save handler:**
   - When saving, if item is a `content_item`, update the `launch_id` field

## Technical Details

```
┌─────────────────────────────────────────────────┐
│ Quick Edit Drawer                               │
├─────────────────────────────────────────────────┤
│ Title:          [Newsletter #12        ] [🔗]   │
│ Platform:       [Email                      ]   │
│ Campaign:       [Spring Launch (Mar 1-15) ▼]   │ ← NEW
│                                                 │
│ ● Creation Date                                 │
│ [📅 Pick a date                            ]   │
│                                                 │
│ ● Publish Date                                  │
│ [📅 March 10, 2026                        ]   │
│                                                 │
│ Source: Content Vault                           │
├─────────────────────────────────────────────────┤
│ [Cancel]                    [Save Changes]      │
└─────────────────────────────────────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/editorial-calendar/ContentQuickEditDrawer.tsx` | Add campaign dropdown, fetch launches, update on save |

## Testing Checklist

- [ ] Quick edit drawer shows campaign dropdown for content items
- [ ] Dropdown shows "No Campaign" plus all active launches
- [ ] Current campaign is pre-selected when editing
- [ ] Changing campaign and saving updates the `launch_id`
- [ ] Clearing campaign (selecting "No Campaign") sets `launch_id` to null
- [ ] Campaign bars and filtering still work after assignment changes

