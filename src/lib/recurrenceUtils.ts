// Recurrence utilities for content calendar
import { addDays, addWeeks, addMonths, format, isBefore, isEqual, parseISO, setDate, lastDayOfMonth, getDay } from 'date-fns';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  days?: number[]; // 0=Sunday, 1=Monday, etc. (for weekly/biweekly)
  monthDay?: number; // 1-31 or -1 for last day (for monthly)
  ends: 'never' | 'on_date' | 'after_occurrences';
  endDate?: string; // ISO date string
  occurrences?: number;
}

export interface RecurrenceChild {
  creationDate: string | null;
  publishDate: string | null;
}

/**
 * Generate recurrence dates based on a pattern
 * @param pattern The recurrence pattern configuration
 * @param startDate The initial date to start from
 * @param maxOccurrences Maximum number of occurrences to generate (default 52 for a year)
 * @returns Array of ISO date strings
 */
export function generateRecurrenceDates(
  pattern: RecurrencePattern,
  startDate: string,
  maxOccurrences: number = 52
): string[] {
  const dates: string[] = [];
  const start = parseISO(startDate);
  let current = start;
  let count = 0;

  // Determine end condition
  const maxCount = pattern.ends === 'after_occurrences' 
    ? Math.min(pattern.occurrences || 12, maxOccurrences)
    : maxOccurrences;
  
  const endDate = pattern.ends === 'on_date' && pattern.endDate 
    ? parseISO(pattern.endDate)
    : null;

  while (count < maxCount) {
    const dateStr = format(current, 'yyyy-MM-dd');
    
    // Check end date condition
    if (endDate && isBefore(endDate, current)) {
      break;
    }

    // For weekly/biweekly, only add if day matches
    if ((pattern.frequency === 'weekly' || pattern.frequency === 'biweekly') && pattern.days?.length) {
      const dayOfWeek = getDay(current);
      if (pattern.days.includes(dayOfWeek)) {
        dates.push(dateStr);
        count++;
      }
    } else {
      // For daily/monthly, add all
      dates.push(dateStr);
      count++;
    }

    // Advance to next date
    switch (pattern.frequency) {
      case 'daily':
        current = addDays(current, 1);
        break;
      case 'weekly':
        current = addDays(current, 1);
        break;
      case 'biweekly':
        // Move day by day, but only count every 2 weeks
        current = addDays(current, 1);
        break;
      case 'monthly':
        if (pattern.monthDay === -1) {
          // Last day of month
          current = lastDayOfMonth(addMonths(current, 1));
        } else if (pattern.monthDay) {
          current = setDate(addMonths(current, 1), Math.min(pattern.monthDay, 28));
        } else {
          current = addMonths(current, 1);
        }
        break;
    }
  }

  return dates;
}

/**
 * Generate child content items for recurring content
 * @param baseItem The parent content item data
 * @param publishDates Array of publish dates
 * @param daysBetweenCreateAndPublish Number of days before publish for creation date
 * @returns Array of child item data
 */
export function generateRecurringChildren(
  publishDates: string[],
  daysBetweenCreateAndPublish: number = 0
): RecurrenceChild[] {
  return publishDates.map(publishDate => {
    const publishDateObj = parseISO(publishDate);
    const creationDate = daysBetweenCreateAndPublish > 0 
      ? format(addDays(publishDateObj, -daysBetweenCreateAndPublish), 'yyyy-MM-dd')
      : null;
    
    return {
      creationDate,
      publishDate,
    };
  });
}

/**
 * Get human-readable recurrence description
 */
export function getRecurrenceDescription(pattern: RecurrencePattern): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let desc = '';
  
  switch (pattern.frequency) {
    case 'daily':
      desc = 'Every day';
      break;
    case 'weekly':
      if (pattern.days?.length) {
        const days = pattern.days.map(d => dayNames[d]).join(', ');
        desc = `Weekly on ${days}`;
      } else {
        desc = 'Every week';
      }
      break;
    case 'biweekly':
      if (pattern.days?.length) {
        const days = pattern.days.map(d => dayNames[d]).join(', ');
        desc = `Every 2 weeks on ${days}`;
      } else {
        desc = 'Every 2 weeks';
      }
      break;
    case 'monthly':
      if (pattern.monthDay === -1) {
        desc = 'Monthly on the last day';
      } else if (pattern.monthDay) {
        desc = `Monthly on the ${pattern.monthDay}${getOrdinalSuffix(pattern.monthDay)}`;
      } else {
        desc = 'Every month';
      }
      break;
  }

  // Add end condition
  if (pattern.ends === 'on_date' && pattern.endDate) {
    desc += ` until ${format(parseISO(pattern.endDate), 'MMM d, yyyy')}`;
  } else if (pattern.ends === 'after_occurrences' && pattern.occurrences) {
    desc += ` for ${pattern.occurrences} times`;
  }

  return desc;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Frequency options for dropdown
 */
export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

/**
 * Day options for weekly/biweekly
 */
export const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

/**
 * Month day options for monthly
 */
export const MONTH_DAY_OPTIONS = [
  ...Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `${i + 1}${getOrdinalSuffix(i + 1)}` })),
  { value: -1, label: 'Last day' },
] as const;
