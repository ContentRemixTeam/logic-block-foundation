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
