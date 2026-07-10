/**
 * Single source of truth for the "Extra Features" per-user visibility system.
 *
 * Features are hidden, never removed. Every route / nav item / dashboard widget
 * that belongs to a toggle-able feature references the key defined here so we
 * only need to update one file to change grouping.
 *
 * Core surface (Dashboard, Today, Weekly, Monthly, 90-Day Cycle, Tasks,
 * Brain Dump, Notes, Content calendar, Financial tracker, Settings) is always
 * visible and is NOT listed in this map.
 */

export type FeatureKey =
  | 'courses'
  | 'focus_pets'
  | 'ai_writing'
  | 'coaching'
  | 'challenges';

export const FEATURE_DEFAULTS: Record<FeatureKey, boolean> = {
  courses: false,
  focus_pets: false,
  ai_writing: false,
  coaching: false,
  challenges: false,
};

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  description: string;
}

export const FEATURE_LIST: FeatureMeta[] = [
  {
    key: 'courses',
    label: 'Courses & Study Plans',
    description: "Track courses you're taking and build gentle study plans.",
  },
  {
    key: 'focus_pets',
    label: 'Focus Pets & Rewards',
    description: 'Little companions, quests, and small celebrations while you work.',
  },
  {
    key: 'ai_writing',
    label: 'AI Writing Assistant',
    description: 'Draft posts, emails, and content with AI help.',
  },
  {
    key: 'coaching',
    label: 'Coaching & Mastermind Tools',
    description: 'Mastermind hub, office hours, coaching log & prep.',
  },
  {
    key: 'challenges',
    label: 'Challenges & Celebrations',
    description: 'Monthly challenges, streaks, and celebration overlays.',
  },
];

/**
 * Route path (or path prefix) → feature key.
 * A route not in this map is considered core and always accessible.
 * Matching is prefix-based, longest-match wins.
 */
export const ROUTE_FEATURE_MAP: Array<{ prefix: string; feature: FeatureKey }> = [
  // courses
  { prefix: '/courses', feature: 'courses' },

  // focus_pets / arcade
  { prefix: '/arcade', feature: 'focus_pets' },
  { prefix: '/focus', feature: 'focus_pets' },
  { prefix: '/quest', feature: 'focus_pets' },

  // ai_writing
  { prefix: '/ai-copywriting', feature: 'ai_writing' },
  { prefix: '/content-vault', feature: 'ai_writing' },

  // launch_tools
  { prefix: '/wizards/launch', feature: 'launch_tools' },
  { prefix: '/wizards/launch-v1', feature: 'launch_tools' },
  { prefix: '/wizards/summit', feature: 'launch_tools' },
  { prefix: '/wizards/money-momentum', feature: 'launch_tools' },
  { prefix: '/wizards/flash-sale', feature: 'launch_tools' },
  { prefix: '/wizards/webinar', feature: 'launch_tools' },
  { prefix: '/wizards/content-challenge', feature: 'launch_tools' },
  { prefix: '/wizards/lead-magnet', feature: 'launch_tools' },
  { prefix: '/launch-debrief', feature: 'launch_tools' },
  { prefix: '/sprint-dashboard', feature: 'launch_tools' },
  { prefix: '/money-moves-sprint', feature: 'launch_tools' },

  // coaching
  { prefix: '/mastermind', feature: 'coaching' },
  { prefix: '/office-hours', feature: 'coaching' },
  { prefix: '/coaching-log', feature: 'coaching' },
  { prefix: '/coach-prep', feature: 'coaching' },

  // challenges
  { prefix: '/monthly-theme', feature: 'challenges' },
  { prefix: '/challenges', feature: 'challenges' },
];

export function featureForRoute(pathname: string): FeatureKey | null {
  let best: { prefix: string; feature: FeatureKey } | null = null;
  for (const entry of ROUTE_FEATURE_MAP) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + '/')) {
      if (!best || entry.prefix.length > best.prefix.length) best = entry;
    }
  }
  return best?.feature ?? null;
}
