
# Wizard History Feature

## Overview
Add a "History" section to the Wizards page that displays all past wizard completions with the wizard name and completion date. Users can view a chronological list of everything they've completed.

---

## User Experience

### Location
Add a tabbed interface to the Wizards page:
- **Wizards** tab (default): Current wizard cards
- **History** tab: Past completions list

### History List View
Each item shows:
- Wizard icon (from template)
- Wizard display name (e.g., "Launch Planner", "Money Momentum Sprint")
- Completion date (formatted: "Feb 3, 2026 at 2:30 PM")
- Optional: Link to view created resource (cycle, project) if one was generated

---

## Implementation

### File Changes

**1. Update WizardHub.tsx**
- Add state for active tab: `'wizards' | 'history'`
- Add tab switcher UI using existing ViewSwitcher component
- Conditionally render wizard cards OR history list based on tab
- Create `WizardHistoryList` component inline or extract to separate file

**2. Create WizardHistoryList Component**
- Accept completions array and templates map as props
- Map template_name to display_name using templates data
- Format dates using `date-fns` format function
- Display in a clean list/table layout with:
  - Icon (from template.icon mapped to Lucide icons)
  - Display name
  - Formatted date
  - View action (if `created_cycle_id` exists)

### Data Flow
- Already loading all completions in WizardHub useEffect
- Already have templates loaded with display_name and icon mappings
- Create lookup map: `templateName -> displayName`

### UI Layout
```
+---------------------------+
| Smart Wizards             |
| Description text          |
+---------------------------+
| [Wizards] [History]       |  <- Tab switcher
+---------------------------+

History Tab Content:
+---------------------------+
| 💰 Money Momentum Sprint  |
|    Feb 3, 2026 at 2:30 PM |
+---------------------------+
| 💰 Money Momentum Sprint  |
|    Feb 3, 2026 at 12:00 AM|
+---------------------------+
| 🚀 Launch Planner         |
|    Jan 28, 2026 at 4:15 PM|
+---------------------------+
```

---

## Technical Details

### Template Name to Display Name Mapping
```typescript
// Create map from templates array
const templateMap = useMemo(() => {
  return templates.reduce((acc, t) => {
    acc[t.template_name] = {
      displayName: t.display_name,
      icon: t.icon
    };
    return acc;
  }, {} as Record<string, { displayName: string; icon: string | null }>);
}, [templates]);
```

### Date Formatting
```typescript
import { format } from 'date-fns';

// Format as "Feb 3, 2026 at 2:30 PM"
format(new Date(completion.completed_at), "MMM d, yyyy 'at' h:mm a")
```

### Icon Mapping
Already exists in WizardHub:
```typescript
const ICON_MAP: Record<string, React.ReactNode> = {
  Target: <Target className="h-5 w-5" />,
  Rocket: <Rocket className="h-5 w-5" />,
  Mail: <Mail className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  DollarSign: <DollarSign className="h-5 w-5" />,
};
```

---

## Components Structure

### Option A: Inline in WizardHub (simpler)
Keep everything in WizardHub.tsx with conditional rendering

### Option B: Extract Component (cleaner)
Create `src/components/wizards/WizardHistoryList.tsx`:
- Receives `completions`, `templates` as props
- Handles rendering and navigation
- WizardHub manages tabs and passes data

Recommend **Option A** for simplicity since the logic is straightforward and keeps related code together.

---

## Empty State
When no completions exist:
```
No completed wizards yet.
Complete a wizard to see it here.
```

---

## Mobile Considerations
- Stack list items vertically
- Full-width tap target
- Date below title on smaller screens
