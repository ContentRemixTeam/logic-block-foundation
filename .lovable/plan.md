

# Fix: Calendar Density State Not Syncing Across Components

## Problem

The density toggle appears to work (it saves to localStorage), but **the calendar doesn't visually update** because each component calling `useCalendarDensity()` creates its own isolated React state.

**Current Flow (Broken):**
```text
User clicks "Compact"
    → EditorialCalendarView calls setDensity('compact')
    → Its local useState updates ✓
    → localStorage updates ✓
    → CalendarContentCard has separate useState (still 'comfortable') ✗
    → CalendarDayColumn has separate useState (still 'comfortable') ✗
    → No visual change!
```

**Why it happens:** The hook uses `useState` which creates independent state per component instance. The localStorage write happens, but other components never re-read it until page refresh.

---

## Solution: React Context for Shared State

Create a `CalendarDensityProvider` context that wraps the Editorial Calendar, ensuring all components share the same state.

**Fixed Flow:**
```text
User clicks "Compact"
    → Provider's setDensity('compact') called
    → Single shared state updates ✓
    → localStorage updates ✓
    → All consuming components receive new value via context ✓
    → Visual update happens immediately! ✓
```

---

## Implementation

### File 1: Update `src/hooks/useCalendarDensity.ts`

Add a Context-based provider and update the hook to consume from context when available.

```typescript
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export type CalendarDensity = 'compact' | 'comfortable' | 'spacious';

interface CalendarDensityContextValue {
  density: CalendarDensity;
  setDensity: (density: CalendarDensity) => void;
}

const CalendarDensityContext = createContext<CalendarDensityContextValue | null>(null);

// Provider component - wrap the calendar with this
export function CalendarDensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensity] = useState<CalendarDensity>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const stored = localStorage.getItem('calendar-density');
    return (stored as CalendarDensity) || 'comfortable';
  });

  // Persist on change
  useEffect(() => {
    localStorage.setItem('calendar-density', density);
  }, [density]);

  return (
    <CalendarDensityContext.Provider value={{ density, setDensity }}>
      {children}
    </CalendarDensityContext.Provider>
  );
}

// Hook - uses context when available, falls back to local state
export function useCalendarDensity() {
  const context = useContext(CalendarDensityContext);
  
  // If provider exists, use shared context
  if (context) {
    return context;
  }
  
  // Fallback for usage outside provider (shouldn't happen in calendar)
  const [density, setDensity] = useState<CalendarDensity>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const stored = localStorage.getItem('calendar-density');
    return (stored as CalendarDensity) || 'comfortable';
  });

  useEffect(() => {
    localStorage.setItem('calendar-density', density);
  }, [density]);

  return { density, setDensity };
}
```

### File 2: Update `src/components/editorial-calendar/EditorialCalendarView.tsx`

Wrap the component with the provider so all child components share state.

```typescript
// Add import
import { CalendarDensityProvider, useCalendarDensity, CalendarDensity } from '@/hooks/useCalendarDensity';

// Wrap the main content with provider
export function EditorialCalendarView() {
  return (
    <CalendarDensityProvider>
      <EditorialCalendarViewInner />
    </CalendarDensityProvider>
  );
}

// Move current component logic here
function EditorialCalendarViewInner() {
  // ... all existing code
  const { density, setDensity } = useCalendarDensity();
  // ... rest of component
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useCalendarDensity.ts` | Add Context, Provider, and update hook to use context |
| `src/components/editorial-calendar/EditorialCalendarView.tsx` | Wrap with `CalendarDensityProvider` |

---

## No Changes Needed

These files already call `useCalendarDensity()` correctly - they just need the provider wrapped above them:
- `CalendarContentCard.tsx` - already uses hook ✓
- `CalendarDayColumn.tsx` - already uses hook ✓

---

## Testing Checklist

- [ ] Click "Compact" - cards immediately shrink (no refresh needed)
- [ ] Click "Comfortable" - cards return to normal size
- [ ] Click "Spacious" - cards expand with extra details
- [ ] Refresh page - density setting persists from localStorage
- [ ] All cards in all day columns update simultaneously

