

# Standardize Filter UX Across the App

## Problem Identified

The filter controls are inconsistent across the app, making them confusing:

| Location | Filter Type | How to Clear | Issue |
|----------|-------------|--------------|-------|
| Tasks Page (List View) | Dropdown with checkboxes | Click badge with X, or find "Clear" button | No "All" option in dropdown |
| Weekly Inbox | Select dropdown | Select "All Energy/Priority" | Clear and intuitive |
| Project Board Toolbar | Dropdown menu items | Click badge X or "Clear all filters" | Works but inconsistent |

**User Pain Point:** When you select a filter value (like "High Energy") in the Tasks page dropdown, there's no obvious way to go back to "show all" from inside the dropdown itself.

---

## Solution: Standardize Filter Patterns

Apply these UX principles consistently:

1. **"All" Option Inside Every Dropdown** - Users can always reset from within the menu
2. **Visual Indicator When Filter is Active** - Highlight the button/trigger
3. **Active Filter Badges with X to Remove** - Quick way to clear individual filters
4. **"Clear All" Button** - When any filter is active, show a clear option

---

## Implementation Plan

### 1. Update TaskFilters.tsx (Tasks Page)

Add "Show All" option at the top of each dropdown:

**Current Energy Dropdown:**
```
- [x] High Focus
- [ ] Medium
- [ ] Low Energy
```

**Improved:**
```
- Show All ← NEW (highlighted when no filter active)
────────────────
- [x] High Focus
- [ ] Medium
- [ ] Low Energy
```

Changes:
- Add a "Show All" menu item at the top with a separator
- When clicked, clears that specific filter type
- Visual checkmark on "Show All" when no energy filters selected
- Keep existing badge indicators on the trigger button

### 2. Enhance Active Filter Badges

Make badges more prominent and clickable:
- Add hover state that shows "Click to remove"
- Use a more obvious X icon styling
- Consider adding tooltip "Remove filter"

### 3. Add "Clear All Filters" to Toolbar

When any filter is active, show a prominent "Clear All" button:
- Position it after the filter badges
- Use a subtle but noticeable style
- Shows count of active filters

---

## Updated TaskFilters Component Design

```typescript
// Energy Filter Dropdown
<DropdownMenuContent>
  {/* Clear option always at top */}
  <DropdownMenuItem
    onClick={() => onEnergyChange([])}
    className={cn(selectedEnergy.length === 0 && "bg-accent")}
  >
    <CheckCircle2 className={cn(
      "h-4 w-4 mr-2",
      selectedEnergy.length === 0 ? "opacity-100" : "opacity-0"
    )} />
    Show All
  </DropdownMenuItem>
  
  <DropdownMenuSeparator />
  
  {/* Individual options */}
  {ENERGY_LEVELS.map(level => (
    <DropdownMenuCheckboxItem
      key={level.value}
      checked={selectedEnergy.includes(level.value)}
      onCheckedChange={() => toggleEnergy(level.value)}
    >
      {level.icon} {level.label}
    </DropdownMenuCheckboxItem>
  ))}
</DropdownMenuContent>
```

---

## Apply Same Pattern to Other Filter Locations

### WeekInbox.tsx & AvailableTasksSidebar.tsx
Already have "All" options - no changes needed, but will add visual consistency:
- Highlight trigger when filter is active
- Match badge styling

### BoardToolbar.tsx
Add "All Priorities" option to the filter dropdown.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tasks/TaskFilters.tsx` | Add "Show All" option, improve badge styling |
| `src/components/projects/monday-board/BoardToolbar.tsx` | Add "All Priorities" option |
| `src/components/weekly-plan/WeekInbox.tsx` | Minor styling consistency (highlight when active) |
| `src/components/weekly-plan/AvailableTasksSidebar.tsx` | Minor styling consistency |

---

## Visual Changes Summary

**Before (confusing):**
```
[Energy ▼]  →  ☐ High Focus
               ☑ Medium     ← How do I unselect all?
               ☐ Low Energy
```

**After (clear):**
```
[Energy (1) ▼]  →  ✓ Show All    ← Click to reset
                   ─────────────
                   ☐ High Focus
                   ☑ Medium
                   ☐ Low Energy
```

---

## Technical Notes

- Keep the multi-select capability (users can choose multiple energy levels)
- "Show All" clears the array to `[]`
- Existing badge click-to-remove functionality remains
- Mobile-friendly: 44px touch targets on all interactive elements

