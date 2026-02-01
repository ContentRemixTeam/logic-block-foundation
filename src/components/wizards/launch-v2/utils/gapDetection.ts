// GAP Detection Utility for Launch Planner V2
// THE GAP = days 15-30 of a 90-day cycle (weeks 3-4)
// This is when energy and motivation typically dip

import { addDays, subDays, isWithinInterval, parseISO, differenceInDays, format } from 'date-fns';

export interface GapOverlapResult {
  overlaps: boolean;
  overlapWeeks: number[];
  cycleStartDate?: string;
  gapStartDate?: string;
  gapEndDate?: string;
  daysInGap?: number;
  severity: 'none' | 'partial' | 'full';
  message?: string;
  warningLevel: 'info' | 'warning' | 'critical';
}

export interface GapPhaseRecommendation {
  phase: 'runway' | 'pre-launch' | 'cart-open' | 'post-launch';
  recommendation: string;
  adjustmentSuggestion?: string;
  isAffected: boolean;
}

export interface GapAdjustmentSuggestion {
  originalDate: string;
  suggestedDate: string;
  daysShifted: number;
  direction: 'earlier' | 'later';
  reason: string;
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
    return { overlaps: false, overlapWeeks: [], severity: 'none', warningLevel: 'info' };
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
      warningLevel: 'info',
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

  // Determine severity and warning level
  const totalGapDays = 16; // Days 15-30
  const severity: 'none' | 'partial' | 'full' = 
    daysInGap === 0 ? 'none' :
    daysInGap >= totalGapDays * 0.5 ? 'full' : 'partial';
  
  const warningLevel = getGapWarningLevel(severity, overlapWeeks);

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
    warningLevel,
    message,
  };
}

/**
 * Gets warning level based on severity and overlap
 */
export function getGapWarningLevel(
  severity: 'none' | 'partial' | 'full',
  overlapWeeks: number[]
): 'info' | 'warning' | 'critical' {
  if (severity === 'none') return 'info';
  if (severity === 'full' && overlapWeeks.length === 2) return 'critical';
  if (severity === 'full' || overlapWeeks.length === 2) return 'warning';
  return 'info';
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
 * Gets phase-specific recommendations when GAP is detected
 */
export function getGapPhaseRecommendations(
  gapResult: GapOverlapResult,
  phases: {
    runwayStart: string;
    runwayEnd: string;
    preLaunchStart: string;
    preLaunchEnd: string;
    cartOpens: string;
    cartCloses: string;
    postLaunchEnd: string;
  }
): GapPhaseRecommendation[] {
  if (!gapResult.overlaps || !gapResult.gapStartDate || !gapResult.gapEndDate) {
    return [];
  }

  const gapStart = parseISO(gapResult.gapStartDate);
  const gapEnd = parseISO(gapResult.gapEndDate);
  const recommendations: GapPhaseRecommendation[] = [];

  // Check each phase for GAP overlap
  const checkPhase = (
    phase: 'runway' | 'pre-launch' | 'cart-open' | 'post-launch',
    phaseStart: string,
    phaseEnd: string
  ) => {
    const start = parseISO(phaseStart);
    const end = parseISO(phaseEnd);
    
    const isAffected = 
      isWithinInterval(start, { start: gapStart, end: gapEnd }) ||
      isWithinInterval(end, { start: gapStart, end: gapEnd }) ||
      (start <= gapStart && end >= gapEnd);

    if (!isAffected) {
      return { phase, recommendation: 'This phase is clear of THE GAP.', isAffected: false };
    }

    const phaseRecommendations: Record<string, { rec: string; adj?: string }> = {
      'runway': {
        rec: 'Your runway phase overlaps with THE GAP. Consider building in extra buffer time.',
        adj: 'Start runway 1 week earlier to give yourself breathing room.',
      },
      'pre-launch': {
        rec: 'Pre-launch during THE GAP can feel exhausting. Schedule shorter, focused work blocks.',
        adj: 'Move pre-launch dates earlier to finish before THE GAP hits.',
      },
      'cart-open': {
        rec: 'CRITICAL: Cart open during THE GAP is high-risk. Add daily mindset check-ins and reduce task load by 20%.',
        adj: 'Consider delaying cart open to after THE GAP ends, or starting much earlier.',
      },
      'post-launch': {
        rec: 'Post-launch fatigue + THE GAP is manageable. Keep follow-up tasks simple.',
        adj: 'No adjustment needed - post-launch is already lower intensity.',
      },
    };

    const { rec, adj } = phaseRecommendations[phase];
    return { phase, recommendation: rec, adjustmentSuggestion: adj, isAffected: true };
  };

  recommendations.push(checkPhase('runway', phases.runwayStart, phases.runwayEnd));
  recommendations.push(checkPhase('pre-launch', phases.preLaunchStart, phases.preLaunchEnd));
  recommendations.push(checkPhase('cart-open', phases.cartOpens, phases.cartCloses));
  recommendations.push(checkPhase('post-launch', phases.cartCloses, phases.postLaunchEnd));

  return recommendations;
}

/**
 * Calculates suggested date adjustments to avoid THE GAP
 */
export function calculateGapAdjustment(
  cartOpensDate: string,
  cycleStart: string
): GapAdjustmentSuggestion | null {
  const cycleStartDate = parseISO(cycleStart);
  const cartOpens = parseISO(cartOpensDate);
  
  const gapStart = addDays(cycleStartDate, 14); // Day 15
  const gapEnd = addDays(cycleStartDate, 30);   // Day 31
  
  // Check if cart opens falls in THE GAP
  if (!isWithinInterval(cartOpens, { start: gapStart, end: gapEnd })) {
    return null;
  }
  
  // Calculate days to shift
  const daysToShiftEarlier = differenceInDays(cartOpens, gapStart) + 1;
  const daysToShiftLater = differenceInDays(gapEnd, cartOpens) + 1;
  
  // Prefer shifting later (to after THE GAP) unless it's much shorter to go earlier
  if (daysToShiftEarlier <= 3 && daysToShiftEarlier < daysToShiftLater) {
    const suggestedDate = subDays(gapStart, 1);
    return {
      originalDate: cartOpensDate,
      suggestedDate: format(suggestedDate, 'yyyy-MM-dd'),
      daysShifted: daysToShiftEarlier,
      direction: 'earlier',
      reason: `Move cart open ${daysToShiftEarlier} days earlier to launch before THE GAP`,
    };
  }
  
  // Shift later (after THE GAP)
  const suggestedDate = addDays(gapEnd, 1);
  return {
    originalDate: cartOpensDate,
    suggestedDate: format(suggestedDate, 'yyyy-MM-dd'),
    daysShifted: daysToShiftLater,
    direction: 'later',
    reason: `Move cart open ${daysToShiftLater} days later to launch after THE GAP ends`,
  };
}

/**
 * Generates GAP support tasks based on support type
 */
export function generateGapSupportTasks(
  supportType: 'daily-motivation' | 'mid-week-check' | 'thought-work' | 'keep-tasks' | 'decide-later',
  gapStartDate: string,
  gapEndDate: string
): { date: string; task: string; type: 'mindset' }[] {
  const tasks: { date: string; task: string; type: 'mindset' }[] = [];
  const gapStart = parseISO(gapStartDate);
  const gapEnd = parseISO(gapEndDate);
  const gapDays = differenceInDays(gapEnd, gapStart) + 1;

  switch (supportType) {
    case 'daily-motivation':
      // Add daily mindset check-in
      for (let i = 0; i < gapDays; i++) {
        const date = addDays(gapStart, i);
        tasks.push({
          date: format(date, 'yyyy-MM-dd'),
          task: '🧠 GAP Check-in: How am I feeling? What thought is loudest? What\'s one small win today?',
          type: 'mindset',
        });
      }
      break;
      
    case 'mid-week-check':
      // Add check-ins at start, middle, and end of GAP
      const midPoint = Math.floor(gapDays / 2);
      [0, midPoint, gapDays - 1].forEach((dayOffset) => {
        const date = addDays(gapStart, dayOffset);
        tasks.push({
          date: format(date, 'yyyy-MM-dd'),
          task: '🔍 GAP Mid-Week Check: Am I on track? What support do I need? Who can I reach out to?',
          type: 'mindset',
        });
      });
      break;
      
    case 'thought-work':
      // Add CTFAR prompts every 3 days
      for (let i = 0; i < gapDays; i += 3) {
        const date = addDays(gapStart, i);
        tasks.push({
          date: format(date, 'yyyy-MM-dd'),
          task: '✍️ GAP Thought Work: Complete a CTFAR model on any limiting belief that came up today',
          type: 'mindset',
        });
      }
      break;
      
    case 'keep-tasks':
    case 'decide-later':
      // No extra tasks
      break;
  }

  return tasks;
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
  
  acknowledgmentPrompt: {
    title: "⚠️ YOUR LAUNCH OVERLAPS WITH THE GAP",
    description: "Your launch dates fall during weeks 3-4 of your 90-day cycle. This is when motivation typically dips.",
    options: [
      { value: 'continue', label: "I understand the risk - continue with these dates" },
      { value: 'adjust-dates', label: "Adjust my timeline to avoid THE GAP" },
      { value: 'add-support', label: "Add extra support tasks (daily mindset check-ins)" },
    ],
    acknowledgmentText: "I acknowledge this may require extra effort",
  },
};
