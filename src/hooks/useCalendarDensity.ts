import { useState, useEffect } from 'react';

export type CalendarDensity = 'compact' | 'comfortable' | 'spacious';

export function useCalendarDensity() {
  const [density, setDensity] = useState<CalendarDensity>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const stored = localStorage.getItem('calendar-density');
    return (stored as CalendarDensity) || 'comfortable';
  });

  // Persist on change
  useEffect(() => {
    localStorage.setItem('calendar-density', density);
  }, [density]);

  return { density, setDensity };
}
