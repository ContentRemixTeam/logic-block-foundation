// GAP Detection Utility for Launch Planner V2
// THE GAP = days 15-30 of a 90-day cycle (weeks 3-4)
// This is when energy and motivation typically dip

import { addDays, isWithinInterval, parseISO, differenceInDays } from 'date-fns';

export interface GapOverlapResult {
  overlaps: boolean;
  overlapWeeks: number[];
  cycleStartDate?: string;
  gapStartDate?: string;
  gapEndDate?: string;
  daysInGap?: number;
  severity: 'none' | 'partial' | 'full';
  message?: string;
}

/**
 * Detects if a launch overlaps with THE GAP (days 15-30) of a 90-day cycle
 */
export function detectGapOverlap(
  launchStart: Date | string,
  launchEnd: Date | string,
  cycleStart: Date | string | null
): GapOverlapResult {
  // No cycle = no GAP concern
  if (!cycleStart) {
    return { overlaps: false, overlapWeeks: [], severity: 'none' };
  }

  const startDate = typeof launchStart === 'string' ? parseISO(launchStart) : launchStart;
  const endDate = typeof launchEnd === 'string' ? parseISO(launchEnd) : launchEnd;
  const cycleStartDate = typeof cycleStart === 'string' ? parseISO(cycleStart) : cycleStart;

  // THE GAP is days 15-30 of the cycle
  const gapStart = addDays(cycleStartDate, 14); // Day 15 (0-indexed from day 1)
  const gapEnd = addDays(cycleStartDate, 30);   // Day 31 (end of week 4)

  // Check if launch dates overlap with GAP period
  const launchOverlapsGap = 
    isWithinInterval(startDate, { start: gapStart, end: gapEnd }) ||
    isWithinInterval(endDate, { start: gapStart, end: gapEnd }) ||
    (startDate <= gapStart && endDate >= gapEnd);

  if (!launchOverlapsGap) {
    return { 
      overlaps: false, 
      overlapWeeks: [], 
      severity: 'none',
      cycleStartDate: cycleStartDate.toISOString().split('T')[0],
    };
  }

  // Calculate which weeks overlap
  const overlapWeeks: number[] = [];
  
  // Week 3 is days 15-21
  const week3Start = addDays(cycleStartDate, 14);
  const week3End = addDays(cycleStartDate, 21);
  if (
    isWithinInterval(startDate, { start: week3Start, end: week3End }) ||
    isWithinInterval(endDate, { start: week3Start, end: week3End }) ||
    (startDate <= week3Start && endDate >= week3End)
  ) {
    overlapWeeks.push(3);
  }
  
  // Week 4 is days 22-30
  const week4Start = addDays(cycleStartDate, 21);
  const week4End = addDays(cycleStartDate, 30);
  if (
    isWithinInterval(startDate, { start: week4Start, end: week4End }) ||
    isWithinInterval(endDate, { start: week4Start, end: week4End }) ||
    (startDate <= week4Start && endDate >= week4End)
  ) {
    overlapWeeks.push(4);
  }

  // Calculate days in GAP
  const overlapStart = startDate > gapStart ? startDate : gapStart;
  const overlapEnd = endDate < gapEnd ? endDate : gapEnd;
  const daysInGap = Math.max(0, differenceInDays(overlapEnd, overlapStart) + 1);

  // Determine severity
  const totalGapDays = 16; // Days 15-30
  const severity: 'none' | 'partial' | 'full' = 
    daysInGap === 0 ? 'none' :
    daysInGap >= totalGapDays * 0.5 ? 'full' : 'partial';

  // Generate helpful message
  const message = generateGapMessage(overlapWeeks, daysInGap, severity);

  return {
    overlaps: true,
    overlapWeeks,
    cycleStartDate: cycleStartDate.toISOString().split('T')[0],
    gapStartDate: gapStart.toISOString().split('T')[0],
    gapEndDate: gapEnd.toISOString().split('T')[0],
    daysInGap,
    severity,
    message,
  };
}

function generateGapMessage(weeks: number[], days: number, severity: 'none' | 'partial' | 'full'): string {
  if (severity === 'none') {
    return '';
  }

  const weekText = weeks.length === 2 
    ? 'weeks 3 AND 4' 
    : `week ${weeks[0]}`;

  if (severity === 'full') {
    return `⚠️ Your launch lands during ${weekText} of your 90-day cycle (${days} days in THE GAP). This is when motivation typically dips. Let's plan extra support.`;
  }

  return `💡 Part of your launch (${days} days) overlaps with ${weekText} of your cycle. Some extra mindset support might help.`;
}

/**
 * Gets the current day of a 90-day cycle
 */
export function getCycleDay(cycleStart: Date | string): number {
  const startDate = typeof cycleStart === 'string' ? parseISO(cycleStart) : cycleStart;
  const today = new Date();
  return differenceInDays(today, startDate) + 1;
}

/**
 * Checks if today is in THE GAP
 */
export function isCurrentlyInGap(cycleStart: Date | string | null): boolean {
  if (!cycleStart) return false;
  
  const day = getCycleDay(cycleStart);
  return day >= 15 && day <= 30;
}

/**
 * Gets teaching content about THE GAP
 */
export const GAP_TEACHING_CONTENT = {
  whatIsTheGap: "THE GAP is the period between days 15-30 of your 90-day cycle. It's when initial excitement fades but results haven't arrived yet. Energy dips. Doubts creep in. It's normal - and predictable.",
  
  whyItMatters: "Launching during THE GAP compounds the normal launch stress with cycle fatigue. You might feel like quitting mid-launch. That's not a sign something's wrong - it's just THE GAP.",
  
  howToHandle: "The key is knowing it's coming and planning for it. Extra accountability, pre-written affirmations, shorter task lists, and self-compassion go a long way.",
  
  strategies: [
    "Schedule daily 5-minute mindset check-ins",
    "Pre-write encouraging notes to yourself",
    "Reduce task load by 20% during GAP weeks",
    "Line up an accountability partner for mid-launch",
    "Have your limiting-belief reframes ready to go",
  ],
};
