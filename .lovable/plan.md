
## New Dashboard Page Foundation

### Overview
Create a simplified, maintainable Dashboard page at `src/pages/Dashboard.tsx` with a clean widget container system. This replaces the current complex 1400+ line implementation with a structured foundation that can be incrementally enhanced.

---

### Architecture

```text
+-----------------------------------------------+
|  HEADER                                        |
|  [Title]           [Customize] [Edit Plan]    |
+-----------------------------------------------+
|                                               |
|  WIDGET CONTAINER (Full Width)                |
|  +-------------------------------------------+|
|  | Quarter Progress Bar (always visible)     ||
|  +-------------------------------------------+|
|  |------------ Divider Line -----------------|
|  +-------------------------------------------+|
|  | Planning Next Steps (always visible)      ||
|  +-------------------------------------------+|
|  |------------ Divider Line -----------------|
|  +-------------------------------------------+|
|  | 90-Day Goal Card (default on)             ||
|  +-------------------------------------------+|
|  |------------ Divider Line -----------------|
|  +-------------------------------------------+|
|  | Focus Area Indicator (default on)         ||
|  +-------------------------------------------+|
|                                               |
+-----------------------------------------------+
```

---

### Implementation Details

#### 1. Page Structure

**File:** `src/pages/Dashboard.tsx`

- Import Layout component for consistent page wrapper
- Use existing `useAuth` hook for user context
- Use existing `useIsMobile` hook for responsive behavior
- Import shadcn/ui components: Card, CardHeader, CardTitle, Button, Progress

#### 2. Header Section

- **Desktop:** Full text buttons ("Customize Layout", "Edit Plan")
- **Mobile:** Icon-only buttons (Settings icon, Pencil icon)
- "Customize Layout" button: Placeholder for now (can link to `/dashboard/customize` later)
- "Edit Plan" button: Links to `/cycle-setup`

```tsx
// Desktop
<Button variant="outline">Customize Layout</Button>
<Button variant="outline">Edit Plan</Button>

// Mobile (using useIsMobile)
<Button variant="outline" size="icon"><Settings2 /></Button>
<Button variant="outline" size="icon"><Pencil /></Button>
```

#### 3. Widget Container System

Create a reusable pattern for widget sections:

```tsx
interface WidgetSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  elevated?: boolean;  // Alternating backgrounds
  alwaysVisible?: boolean;
}
```

**Visual Features:**
- Full-width containers
- Divider lines between sections (using `<Separator />` or border classes)
- Alternating backgrounds: `bg-card` (surface) vs `bg-muted/30` (surface-elevated)
- Consistent padding and spacing

#### 4. Placeholder Widget Sections

Each section is a Card with just the header for now:

| Widget | Always Visible | Default | Background |
|--------|----------------|---------|------------|
| Quarter Progress Bar | Yes | - | surface |
| Planning Next Steps | Yes | - | surface-elevated |
| 90-Day Goal Card | No | On | surface |
| Focus Area Indicator | No | On | surface-elevated |

**Quarter Progress Bar:**
```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <TrendingUp className="h-5 w-5 text-primary" />
      Quarter Progress
    </CardTitle>
  </CardHeader>
  <CardContent>
    <Progress value={0} className="h-3" />
    <p className="text-sm text-muted-foreground mt-2">Day 0 of 90</p>
  </CardContent>
</Card>
```

**Planning Next Steps:**
```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <ListTodo className="h-5 w-5 text-primary" />
      Planning Next Steps
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">Your next actions will appear here</p>
  </CardContent>
</Card>
```

#### 5. Responsive Design

Using Tailwind classes:

```tsx
// Container
<div className="space-y-0">
  {/* Single column on all screens */}
  {/* Widgets stack vertically */}
</div>

// Header buttons
<div className="flex items-center gap-2">
  {/* Mobile: icon buttons */}
  <Button variant="outline" size="icon" className="md:hidden">
    <Settings2 className="h-4 w-4" />
  </Button>
  
  {/* Desktop: text buttons */}
  <Button variant="outline" className="hidden md:flex">
    <Settings2 className="h-4 w-4 mr-2" />
    Customize Layout
  </Button>
</div>
```

#### 6. File Structure

**Modified file:**
- `src/pages/Dashboard.tsx` - Complete rewrite with new foundation

**Preserved patterns:**
- Uses `Layout` component wrapper
- Uses existing auth hooks
- Uses shadcn/ui components
- Maintains route at `/dashboard`

---

### Code Structure

```tsx
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Settings2, 
  Pencil, 
  TrendingUp, 
  ListTodo, 
  Target, 
  Compass 
} from 'lucide-react';

export default function Dashboard() {
  const isMobile = useIsMobile();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Your 90-day planning hub</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile: Icon buttons */}
            {/* Desktop: Text buttons */}
          </div>
        </div>

        {/* Widget Container */}
        <div className="space-y-0 rounded-xl border overflow-hidden">
          {/* Quarter Progress - Always visible */}
          <WidgetSection title="Quarter Progress" icon={<TrendingUp />}>
            <Progress value={0} />
          </WidgetSection>
          
          <Separator />
          
          {/* Planning Next Steps - Always visible */}
          <WidgetSection title="Planning Next Steps" icon={<ListTodo />} elevated>
            <p>Your next actions...</p>
          </WidgetSection>
          
          <Separator />
          
          {/* 90-Day Goal - Default on */}
          <WidgetSection title="90-Day Goal" icon={<Target />}>
            <p>Your main goal...</p>
          </WidgetSection>
          
          <Separator />
          
          {/* Focus Area - Default on */}
          <WidgetSection title="Focus Area" icon={<Compass />} elevated>
            <p>Your strategic focus...</p>
          </WidgetSection>
        </div>
      </div>
    </Layout>
  );
}
```

---

### Mobile Responsiveness

| Element | Desktop | Mobile |
|---------|---------|--------|
| Header buttons | Text + icon | Icon only |
| Widget layout | Full width | Full width |
| Spacing | `space-y-6` | `space-y-4` |
| Card padding | `p-6` | `p-4` |

---

### Technical Notes

1. **Keep existing route** - `/dashboard` stays the same in App.tsx
2. **Preserve lazy loading** - Component export remains `export default function Dashboard()`
3. **Use existing components** - Layout, Card, Button, Progress from shadcn/ui
4. **Clean foundation** - Remove 1400 lines of complex logic; data integration comes later
5. **Widget toggle ready** - Structure supports future `isWidgetEnabled()` integration

---

### What This Does NOT Include (Next Steps)

- Data fetching from edge functions
- Widget customization modal
- Actual progress calculations
- Quest mode theming
- Recovery banners and popups
- XP/Streak displays
- Real content in placeholder sections

These will be added incrementally in follow-up prompts.
