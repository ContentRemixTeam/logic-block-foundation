/**
 * Default data and constants for the 90-Day Cycle Wizard
 */

import { addDays, format } from 'date-fns';
import { CycleWizardFormData, MetricSuggestion } from './CycleWizardTypes';

export const getDefaultFormData = (): CycleWizardFormData => {
  const today = new Date();
  const endDate = addDays(today, 90);

  return {
    // Step 1: The Big Goal
    goal: '',
    why: '',

    // Step 2: Business Diagnostic
    discoverScore: 5,
    nurtureScore: 5,
    convertScore: 5,
    focusArea: '',

    // Step 3: Your Identity
    identity: '',
    targetFeeling: '',

    // Step 4: Success Metrics
    metric1_name: '',
    metric1_start: null,
    metric1_goal: null,
    metric2_name: '',
    metric2_start: null,
    metric2_goal: null,
    metric3_name: '',
    metric3_start: null,
    metric3_goal: null,

    // Step 5: Weekly Rhythm
    weeklyPlanningDay: 'Sunday',
    weeklyDebriefDay: 'Friday',
    officeHoursStart: '09:00',
    officeHoursEnd: '17:00',
    officeHoursDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],

    // Step 6: Bottleneck & Fear
    biggestBottleneck: '',
    biggestFear: '',
    fearResponse: '',

    // Step 7: THE GAP Preparation
    gapStrategy: '',
    accountabilityPerson: '',

    // Step 8: Mindset Anchors
    usefulBelief: '',
    limitingThought: '',
    usefulThought: '',
    thingsToRemember: [],

    // Dates
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
};

// Focus-based metric suggestions
export const FOCUS_METRICS: Record<string, MetricSuggestion[]> = {
  discover: [
    { name: 'New followers', category: 'discover' },
    { name: 'Profile views', category: 'discover' },
    { name: 'Website visitors', category: 'discover' },
    { name: 'Content reach', category: 'discover' },
    { name: 'Lead magnet downloads', category: 'discover' },
  ],
  nurture: [
    { name: 'Email list size', category: 'nurture' },
    { name: 'Email open rate %', category: 'nurture' },
    { name: 'Engagement rate', category: 'nurture' },
    { name: 'Community members', category: 'nurture' },
    { name: 'Story views', category: 'nurture' },
  ],
  convert: [
    { name: 'Revenue $', category: 'convert' },
    { name: 'Sales made', category: 'convert' },
    { name: 'Discovery calls booked', category: 'convert' },
    { name: 'Conversion rate %', category: 'convert' },
    { name: 'Clients enrolled', category: 'convert' },
  ],
};

// Platform-specific metric suggestions
export const PLATFORM_METRICS: Record<string, MetricSuggestion[]> = {
  instagram: [
    { name: 'Instagram followers', category: 'platform', platform: 'instagram' },
    { name: 'Instagram engagement rate', category: 'platform', platform: 'instagram' },
    { name: 'Story views', category: 'platform', platform: 'instagram' },
    { name: 'DMs received', category: 'platform', platform: 'instagram' },
    { name: 'Reels views', category: 'platform', platform: 'instagram' },
  ],
  email: [
    { name: 'Email list size', category: 'platform', platform: 'email' },
    { name: 'Email open rate %', category: 'platform', platform: 'email' },
    { name: 'Email click rate %', category: 'platform', platform: 'email' },
    { name: 'Emails sent', category: 'platform', platform: 'email' },
  ],
  podcast: [
    { name: 'Podcast downloads', category: 'platform', platform: 'podcast' },
    { name: 'Podcast reviews', category: 'platform', platform: 'podcast' },
    { name: 'Podcast subscribers', category: 'platform', platform: 'podcast' },
    { name: 'Episodes published', category: 'platform', platform: 'podcast' },
  ],
  youtube: [
    { name: 'YouTube subscribers', category: 'platform', platform: 'youtube' },
    { name: 'YouTube watch hours', category: 'platform', platform: 'youtube' },
    { name: 'YouTube views', category: 'platform', platform: 'youtube' },
    { name: 'Videos published', category: 'platform', platform: 'youtube' },
  ],
  linkedin: [
    { name: 'LinkedIn connections', category: 'platform', platform: 'linkedin' },
    { name: 'LinkedIn post impressions', category: 'platform', platform: 'linkedin' },
    { name: 'LinkedIn profile views', category: 'platform', platform: 'linkedin' },
    { name: 'LinkedIn engagement', category: 'platform', platform: 'linkedin' },
  ],
  tiktok: [
    { name: 'TikTok followers', category: 'platform', platform: 'tiktok' },
    { name: 'TikTok views', category: 'platform', platform: 'tiktok' },
    { name: 'TikTok engagement', category: 'platform', platform: 'tiktok' },
  ],
};

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const IDENTITY_PROMPTS = [
  'A successful business owner who...',
  'Someone who consistently...',
  'A person who trusts...',
  'A leader who...',
];

export const FEELING_SUGGESTIONS = [
  'Confident',
  'Abundant',
  'Peaceful',
  'Excited',
  'Grounded',
  'Empowered',
  'Free',
  'Proud',
];

// Validation function for each step
export function validateStep(step: number, data: CycleWizardFormData): boolean {
  switch (step) {
    case 1:
      return data.goal.trim().length > 0 && data.goal.length <= 200;
    case 2:
      return data.discoverScore >= 1 && data.nurtureScore >= 1 && data.convertScore >= 1;
    case 3:
      return true; // Optional step
    case 4:
      return !!data.metric1_name && data.metric1_start !== null;
    case 5:
      return !!data.weeklyPlanningDay && !!data.weeklyDebriefDay;
    case 6:
      return true; // Optional step
    case 7:
      return true; // Optional but encouraged
    case 8:
      return true; // Optional step
    case 9:
      return true; // Review step
    default:
      return true;
  }
}

// Calculate focus area from diagnostic scores
export function calculateFocusArea(
  discover: number,
  nurture: number,
  convert: number
): 'discover' | 'nurture' | 'convert' {
  const min = Math.min(discover, nurture, convert);
  if (discover === min) return 'discover';
  if (nurture === min) return 'nurture';
  return 'convert';
}
