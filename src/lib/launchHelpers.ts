// Launch System Helper Functions
// Provides utilities for phase detection, offer goals, and timeline calculations

import { parseISO, differenceInDays, addDays, subDays, isWithinInterval, format } from 'date-fns';

// ============== Types ==============

export type LaunchPhase = 'runway' | 'pre-launch' | 'cart-open' | 'post-launch';
export type PhaseIntensity = 'low' | 'medium' | 'high';

export interface LaunchPhaseDates {
  runwayStart: Date;
  runwayEnd: Date;
  preLaunchStart: Date;
  preLaunchEnd: Date;
  cartOpens: Date;
  cartCloses: Date;
  postLaunchEnd: Date;
}

export interface ActiveLaunch {
  id: string;
  name: string;
  cart_opens: string;
  cart_closes: string;
  runway_start_date?: string | null;
  runway_end_date?: string | null;
  pre_launch_start_date?: string | null;
  pre_launch_end_date?: string | null;
  post_launch_end_date?: string | null;
  offer_goal?: number | null;
  revenue_goal?: number | null;
}

export interface PhaseInfo {
  phase: LaunchPhase;
  dayInPhase: number;
  totalPhaseDays: number;
  phaseName: string;
  intensity: PhaseIntensity;
  phaseStart: Date;
  phaseEnd: Date;
}

export interface DailyOfferGoal {
  daily: number;
  remaining: number;
  completed: number;
  onTrack: boolean;
  totalGoal: number;
  cartOpenDays: number;
}

export interface LaunchProgress {
  phase: LaunchPhase | null;
  tasksCompleted: number;
  tasksPending: number;
  revenueLogged: number;
  revenueGoal: number;
  revenuePercent: number;
  offersLogged: number;
  offerGoal: number;
}

export interface PhaseTaskEstimate {
  dailyTasks: number;
  totalTasks: number;
  dailyMinutes: number;
  totalHours: number;
  intensity: PhaseIntensity;
  description: string;
}

export interface TimelineValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============== Phase Detection ==============

/**
 * Gets the current launch phase based on today's date
 * @param launch - Active launch data with phase dates
 * @param today - Optional date override (defaults to now)
 * @returns Current phase or null if not in any phase
 */
export function getCurrentLaunchPhase(
  launch: ActiveLaunch,
  today: Date = new Date()
): PhaseInfo | null {
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayDate = parseISO(todayStr);

  // Parse all dates with fallbacks
  const cartOpens = parseISO(launch.cart_opens);
  const cartCloses = parseISO(launch.cart_closes);
  
  // If we have explicit phase dates, use them
  const runwayStart = launch.runway_start_date 
    ? parseISO(launch.runway_start_date) 
    : subDays(cartOpens, 14); // Default: 2 weeks before cart opens
  
  const runwayEnd = launch.runway_end_date 
    ? parseISO(launch.runway_end_date)
    : subDays(cartOpens, 7); // Default: 1 week before cart opens
  
  const preLaunchStart = launch.pre_launch_start_date
    ? parseISO(launch.pre_launch_start_date)
    : addDays(runwayEnd, 1);
  
  const preLaunchEnd = launch.pre_launch_end_date
    ? parseISO(launch.pre_launch_end_date)
    : subDays(cartOpens, 1);
  
  const postLaunchEnd = launch.post_launch_end_date
    ? parseISO(launch.post_launch_end_date)
    : addDays(cartCloses, 7); // Default: 1 week after cart closes

  // Check each phase in order
  if (isWithinInterval(todayDate, { start: runwayStart, end: runwayEnd })) {
    const dayInPhase = differenceInDays(todayDate, runwayStart) + 1;
    const totalPhaseDays = differenceInDays(runwayEnd, runwayStart) + 1;
    return {
      phase: 'runway',
      dayInPhase,
      totalPhaseDays,
      phaseName: 'Runway',
      intensity: 'low',
      phaseStart: runwayStart,
      phaseEnd: runwayEnd,
    };
  }

  if (isWithinInterval(todayDate, { start: preLaunchStart, end: preLaunchEnd })) {
    const dayInPhase = differenceInDays(todayDate, preLaunchStart) + 1;
    const totalPhaseDays = differenceInDays(preLaunchEnd, preLaunchStart) + 1;
    return {
      phase: 'pre-launch',
      dayInPhase,
      totalPhaseDays,
      phaseName: 'Pre-Launch',
      intensity: 'medium',
      phaseStart: preLaunchStart,
      phaseEnd: preLaunchEnd,
    };
  }

  if (isWithinInterval(todayDate, { start: cartOpens, end: cartCloses })) {
    const dayInPhase = differenceInDays(todayDate, cartOpens) + 1;
    const totalPhaseDays = differenceInDays(cartCloses, cartOpens) + 1;
    return {
      phase: 'cart-open',
      dayInPhase,
      totalPhaseDays,
      phaseName: 'Cart Open',
      intensity: 'high',
      phaseStart: cartOpens,
      phaseEnd: cartCloses,
    };
  }

  const postLaunchStart = addDays(cartCloses, 1);
  if (isWithinInterval(todayDate, { start: postLaunchStart, end: postLaunchEnd })) {
    const dayInPhase = differenceInDays(todayDate, postLaunchStart) + 1;
    const totalPhaseDays = differenceInDays(postLaunchEnd, postLaunchStart) + 1;
    return {
      phase: 'post-launch',
      dayInPhase,
      totalPhaseDays,
      phaseName: 'Post-Launch',
      intensity: 'medium',
      phaseStart: postLaunchStart,
      phaseEnd: postLaunchEnd,
    };
  }

  return null;
}

/**
 * Checks if the launch is in a specific phase
 */
export function isInLaunchPhase(
  launch: ActiveLaunch,
  targetPhase: LaunchPhase,
  today: Date = new Date()
): boolean {
  const currentPhase = getCurrentLaunchPhase(launch, today);
  return currentPhase?.phase === targetPhase;
}

// ============== Countdown Functions ==============

/**
 * Calculates days until cart opens
 */
export function daysUntilCartOpens(launch: ActiveLaunch, today: Date = new Date()): number {
  const cartOpens = parseISO(launch.cart_opens);
  const days = differenceInDays(cartOpens, today);
  return Math.max(0, days);
}

/**
 * Calculates days until cart closes
 */
export function daysUntilCartCloses(launch: ActiveLaunch, today: Date = new Date()): number {
  const cartCloses = parseISO(launch.cart_closes);
  const days = differenceInDays(cartCloses, today);
  return Math.max(0, days);
}

/**
 * Calculates hours until cart closes (for urgency displays)
 */
export function hoursUntilCartCloses(launch: ActiveLaunch, now: Date = new Date()): number {
  const cartCloses = parseISO(launch.cart_closes);
  // Set cart close to end of day (11:59 PM)
  const cartClosesEndOfDay = new Date(cartCloses);
  cartClosesEndOfDay.setHours(23, 59, 59, 999);
  
  const diffMs = cartClosesEndOfDay.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  return Math.max(0, hours);
}

// ============== Offer Goals ==============

/**
 * Calculates daily offer goal based on launch data
 * Formula: Total offers needed / Cart open days
 */
export function getDailyOfferGoal(
  launch: ActiveLaunch,
  offersCompletedToday: number = 0
): DailyOfferGoal {
  const offerGoal = launch.offer_goal || 0;
  const cartOpens = parseISO(launch.cart_opens);
  const cartCloses = parseISO(launch.cart_closes);
  const cartOpenDays = differenceInDays(cartCloses, cartOpens) + 1;
  
  // Calculate daily target
  const daily = cartOpenDays > 0 ? Math.ceil(offerGoal / cartOpenDays) : 0;
  const remaining = Math.max(0, daily - offersCompletedToday);
  const onTrack = offersCompletedToday >= daily;

  return {
    daily,
    remaining,
    completed: offersCompletedToday,
    onTrack,
    totalGoal: offerGoal,
    cartOpenDays,
  };
}

// ============== Progress Tracking ==============

/**
 * Gets comprehensive launch progress
 */
export function getLaunchProgress(
  launch: ActiveLaunch,
  tasks: { status: string; launch_id?: string | null }[],
  revenueLogged: number = 0,
  offersLogged: number = 0
): LaunchProgress {
  const phase = getCurrentLaunchPhase(launch)?.phase || null;
  
  const launchTasks = tasks.filter(t => t.launch_id === launch.id);
  const tasksCompleted = launchTasks.filter(t => t.status === 'done').length;
  const tasksPending = launchTasks.filter(t => t.status !== 'done').length;
  
  const revenueGoal = launch.revenue_goal || 0;
  const revenuePercent = revenueGoal > 0 
    ? Math.round((revenueLogged / revenueGoal) * 100) 
    : 0;

  return {
    phase,
    tasksCompleted,
    tasksPending,
    revenueLogged,
    revenueGoal,
    revenuePercent,
    offersLogged,
    offerGoal: launch.offer_goal || 0,
  };
}

// ============== Timeline Calculations ==============

export type TimelineDuration = '2-weeks' | '3-4-weeks' | '5-6-weeks';

/**
 * Timeline duration configurations
 */
const TIMELINE_CONFIGS: Record<TimelineDuration, {
  runwayDays: number;
  preLaunchDays: number;
  cartOpenDays: number;
  postLaunchDays: number;
}> = {
  '2-weeks': {
    runwayDays: 5,
    preLaunchDays: 4,
    cartOpenDays: 5,
    postLaunchDays: 7,
  },
  '3-4-weeks': {
    runwayDays: 9,
    preLaunchDays: 6,
    cartOpenDays: 7,
    postLaunchDays: 7,
  },
  '5-6-weeks': {
    runwayDays: 14,
    preLaunchDays: 10,
    cartOpenDays: 10,
    postLaunchDays: 7,
  },
};

/**
 * Calculates suggested timeline based on cart opens date and duration
 */
export function calculateSuggestedTimeline(
  cartOpensDate: string,
  timeline: TimelineDuration
): LaunchPhaseDates {
  const cartOpens = parseISO(cartOpensDate);
  const config = TIMELINE_CONFIGS[timeline];
  
  // Calculate all phase dates
  const preLaunchStart = subDays(cartOpens, config.preLaunchDays);
  const runwayStart = subDays(preLaunchStart, config.runwayDays);
  const runwayEnd = subDays(preLaunchStart, 1);
  const preLaunchEnd = subDays(cartOpens, 1);
  const cartCloses = addDays(cartOpens, config.cartOpenDays - 1);
  const postLaunchEnd = addDays(cartCloses, config.postLaunchDays);

  return {
    runwayStart,
    runwayEnd,
    preLaunchStart,
    preLaunchEnd,
    cartOpens,
    cartCloses,
    postLaunchEnd,
  };
}

/**
 * Gets phase task estimates for capacity planning
 */
export function getPhaseTaskEstimate(
  phase: LaunchPhase,
  phaseDays: number
): PhaseTaskEstimate {
  const configs: Record<LaunchPhase, { dailyTasks: number; dailyMinutes: number; intensity: PhaseIntensity; description: string }> = {
    'runway': {
      dailyTasks: 3,
      dailyMinutes: 30,
      intensity: 'low',
      description: 'Build buzz quietly, segment list, prep content',
    },
    'pre-launch': {
      dailyTasks: 6,
      dailyMinutes: 90,
      intensity: 'medium',
      description: 'Announce launch, heavy promotion, free event',
    },
    'cart-open': {
      dailyTasks: 7,
      dailyMinutes: 120,
      intensity: 'high',
      description: 'Daily offers, handle objections, personal outreach',
    },
    'post-launch': {
      dailyTasks: 4,
      dailyMinutes: 60,
      intensity: 'medium',
      description: 'Follow-up emails, nurture sequence, debrief',
    },
  };

  const config = configs[phase];
  return {
    dailyTasks: config.dailyTasks,
    totalTasks: config.dailyTasks * phaseDays,
    dailyMinutes: config.dailyMinutes,
    totalHours: Math.round((config.dailyMinutes * phaseDays) / 60),
    intensity: config.intensity,
    description: config.description,
  };
}

/**
 * Calculates total launch time requirements
 */
export function calculateTotalLaunchTime(phases: LaunchPhaseDates): {
  totalDays: number;
  totalHours: number;
  phases: Record<LaunchPhase, { days: number; hours: number }>;
} {
  const runwayDays = differenceInDays(phases.runwayEnd, phases.runwayStart) + 1;
  const preLaunchDays = differenceInDays(phases.preLaunchEnd, phases.preLaunchStart) + 1;
  const cartOpenDays = differenceInDays(phases.cartCloses, phases.cartOpens) + 1;
  const postLaunchDays = differenceInDays(phases.postLaunchEnd, phases.cartCloses);

  const runwayEstimate = getPhaseTaskEstimate('runway', runwayDays);
  const preLaunchEstimate = getPhaseTaskEstimate('pre-launch', preLaunchDays);
  const cartOpenEstimate = getPhaseTaskEstimate('cart-open', cartOpenDays);
  const postLaunchEstimate = getPhaseTaskEstimate('post-launch', postLaunchDays);

  const totalDays = runwayDays + preLaunchDays + cartOpenDays + postLaunchDays;
  const totalHours = runwayEstimate.totalHours + preLaunchEstimate.totalHours + 
                     cartOpenEstimate.totalHours + postLaunchEstimate.totalHours;

  return {
    totalDays,
    totalHours,
    phases: {
      'runway': { days: runwayDays, hours: runwayEstimate.totalHours },
      'pre-launch': { days: preLaunchDays, hours: preLaunchEstimate.totalHours },
      'cart-open': { days: cartOpenDays, hours: cartOpenEstimate.totalHours },
      'post-launch': { days: postLaunchDays, hours: postLaunchEstimate.totalHours },
    },
  };
}

// ============== Validation ==============

/**
 * Validates phase sequence is correct
 */
export function validatePhaseSequence(phases: LaunchPhaseDates): TimelineValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check sequence order
  if (phases.runwayEnd >= phases.preLaunchStart) {
    errors.push('Runway must end before pre-launch starts');
  }
  if (phases.preLaunchEnd >= phases.cartOpens) {
    errors.push('Pre-launch must end before cart opens');
  }
  if (phases.cartCloses < phases.cartOpens) {
    errors.push('Cart close date must be after cart open date');
  }
  if (phases.postLaunchEnd <= phases.cartCloses) {
    errors.push('Post-launch must end after cart closes');
  }

  // Check minimum durations
  const runwayDays = differenceInDays(phases.runwayEnd, phases.runwayStart) + 1;
  const preLaunchDays = differenceInDays(phases.preLaunchEnd, phases.preLaunchStart) + 1;
  const cartOpenDays = differenceInDays(phases.cartCloses, phases.cartOpens) + 1;

  if (runwayDays < 3) {
    errors.push('Runway must be at least 3 days');
  } else if (runwayDays < 7) {
    warnings.push('Short runway (under 7 days) - consider extending for better results');
  }

  if (preLaunchDays < 2) {
    errors.push('Pre-launch must be at least 2 days');
  } else if (preLaunchDays < 5) {
    warnings.push('Intense pre-launch period (under 5 days) - be ready for high activity');
  }

  if (cartOpenDays < 2) {
    errors.push('Cart must be open at least 2 days');
  } else if (cartOpenDays < 5) {
    warnings.push('Short cart open period creates urgency but less conversion time');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============== Date Formatting Helpers ==============

/**
 * Formats a phase date range for display
 */
export function formatPhaseRange(start: Date, end: Date): string {
  const startStr = format(start, 'MMM d');
  const endStr = format(end, 'MMM d');
  return `${startStr} - ${endStr}`;
}

/**
 * Gets phase color for UI theming
 */
export function getPhaseColor(phase: LaunchPhase): string {
  const colors: Record<LaunchPhase, string> = {
    'runway': 'blue',
    'pre-launch': 'purple',
    'cart-open': 'green',
    'post-launch': 'orange',
  };
  return colors[phase];
}

/**
 * Gets intensity badge color
 */
export function getIntensityColor(intensity: PhaseIntensity): string {
  const colors: Record<PhaseIntensity, string> = {
    'low': 'green',
    'medium': 'yellow',
    'high': 'red',
  };
  return colors[intensity];
}
