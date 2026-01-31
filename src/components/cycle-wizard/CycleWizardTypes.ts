/**
 * 90-Day Cycle Wizard Types
 * Teaching-aligned wizard for creating/editing cycles_90_day records
 */

export interface CycleWizardFormData extends Record<string, unknown> {
  // Step 1: The Big Goal
  goal: string;
  why: string;

  // Step 2: Business Diagnostic
  discoverScore: number;
  nurtureScore: number;
  convertScore: number;
  focusArea: 'discover' | 'nurture' | 'convert' | '';

  // Step 3: Your Identity
  identity: string;
  targetFeeling: string;

  // Step 4: Success Metrics
  metric1_name: string;
  metric1_start: number | null;
  metric1_goal: number | null;
  metric2_name: string;
  metric2_start: number | null;
  metric2_goal: number | null;
  metric3_name: string;
  metric3_start: number | null;
  metric3_goal: number | null;

  // Step 5: Weekly Rhythm
  weeklyPlanningDay: string;
  weeklyDebriefDay: string;
  officeHoursStart: string;
  officeHoursEnd: string;
  officeHoursDays: string[];

  // Step 6: Bottleneck & Fear
  biggestBottleneck: string;
  biggestFear: string;
  fearResponse: string;

  // Step 7: THE GAP Preparation
  gapStrategy: string;
  accountabilityPerson: string;

  // Step 8: Mindset Anchors
  usefulBelief: string;
  limitingThought: string;
  usefulThought: string;
  thingsToRemember: string[];

  // Dates (auto-calculated)
  startDate: string;
  endDate: string;
}

export interface StepProps {
  data: CycleWizardFormData;
  setData: (updates: Partial<CycleWizardFormData>) => void;
}

export interface MetricSuggestion {
  name: string;
  category: 'discover' | 'nurture' | 'convert' | 'platform';
  platform?: string;
}

export const STEP_TITLES = [
  'The Big Goal',
  'Business Diagnostic',
  'Your Identity',
  'Success Metrics',
  'Weekly Rhythm',
  'Bottleneck & Fear',
  'THE GAP',
  'Mindset Anchors',
  'Review & Complete',
] as const;

export const TOTAL_STEPS = 9;
