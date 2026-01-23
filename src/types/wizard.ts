// Smart Wizards Phase 1 Types

export type PlanningLevel = 'detailed' | 'simple' | 'minimal' | 'none';

export type TopicPlanningCadence = 'monthly' | 'weekly' | 'daily' | 'external';

export type TopicStatus = 'not_planned' | 'planned' | 'in_progress' | 'created';

export type FocusArea = 'discover' | 'nurture' | 'convert';

export interface WizardTemplate {
  id: string;
  template_name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  estimated_time_minutes: number | null;
  questions: unknown[];
  created_at: string;
}

export interface WizardCompletion {
  id: string;
  user_id: string;
  template_name: string;
  answers: Record<string, unknown>;
  planning_level: PlanningLevel | null;
  created_cycle_id: string | null;
  completed_at: string;
  created_at: string;
}

export interface DiagnosticScores {
  discover: number;
  nurture: number;
  convert: number;
}

export interface CustomMetric {
  name: string;
  startValue: number;
  goalValue: number;
}

export interface WeeklyRhythm {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
}

export interface CycleWizardData {
  // Step 1: Big Goal
  goal: string;
  whyItMatters: string;
  
  // Step 2: Business Diagnostic
  diagnosticScores: DiagnosticScores;
  focusArea: FocusArea;
  
  // Step 3: Content Foundation
  selectedContentIds: string[];
  creatingNewContent: 'yes-focus' | 'yes-maintain' | 'no';
  contentVolume: 'light' | 'moderate' | 'heavy';
  
  // Step 4: Revenue & Metrics
  revenueGoal: number | null;
  offersGoal: number;
  trackDailyOffers: boolean;
  selectedMetrics: string[];
  customMetrics: CustomMetric[];
  
  // Step 5: Weekly Rhythm
  weeklyPlanningDay: string;
  weeklyReviewDay: string;
  weeklyRhythm: WeeklyRhythm;
  officeHoursStart: string;
  officeHoursEnd: string;
  officeHoursDays: string[];
  
  // Step 6: Thought Work
  usefulBelief: string;
  limitingThought: string;
  usefulThought: string;
  accountabilityPerson: string;
  reminders: string[];
  
  // Meta
  planningLevel: PlanningLevel;
}

export interface ContentTopic {
  id: string;
  user_id: string;
  workflow_id: string | null;
  planned_date: string | null;
  topic_text: string | null;
  topic_notes: string | null;
  related_content_ids: string[] | null;
  status: TopicStatus;
  created_at: string;
  updated_at: string;
}

export interface UserContentWorkflow {
  id: string;
  user_id: string;
  workflow_name: string;
  content_type: string;
  topic_planning_cadence: TopicPlanningCadence | null;
  recurrence: string | null;
  custom_schedule: unknown | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectSnapshot {
  id: string;
  project_id: string;
  snapshot_data: unknown;
  reason: string | null;
  created_at: string;
}

// Default values for cycle wizard
export const DEFAULT_CYCLE_WIZARD_DATA: CycleWizardData = {
  goal: '',
  whyItMatters: '',
  diagnosticScores: { discover: 5, nurture: 5, convert: 5 },
  focusArea: 'discover',
  selectedContentIds: [],
  creatingNewContent: 'yes-maintain',
  contentVolume: 'moderate',
  revenueGoal: null,
  offersGoal: 90,
  trackDailyOffers: true,
  selectedMetrics: [],
  customMetrics: [],
  weeklyPlanningDay: 'Sunday',
  weeklyReviewDay: 'Friday',
  weeklyRhythm: {},
  officeHoursStart: '09:00',
  officeHoursEnd: '17:00',
  officeHoursDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  usefulBelief: '',
  limitingThought: '',
  usefulThought: '',
  accountabilityPerson: '',
  reminders: [],
  planningLevel: 'simple',
};

export const PLANNING_LEVEL_OPTIONS: {
  value: PlanningLevel;
  label: string;
  description: string;
  recommended?: boolean;
}[] = [
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Step-by-step tasks with full scheduling',
  },
  {
    value: 'simple',
    label: 'Simple',
    description: 'Light structure with key milestones',
    recommended: true,
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Just deadlines and major goals',
  },
  {
    value: 'none',
    label: 'None',
    description: 'Tracking only - no generated tasks',
  },
];

export const FOCUS_AREA_OPTIONS: {
  value: FocusArea;
  label: string;
  description: string;
}[] = [
  {
    value: 'discover',
    label: 'Discover',
    description: 'Get more people to know you exist',
  },
  {
    value: 'nurture',
    label: 'Nurture',
    description: 'Help more people for free effectively',
  },
  {
    value: 'convert',
    label: 'Convert',
    description: 'Make more offers and close more sales',
  },
];

export const SUGGESTED_METRICS: Record<FocusArea, string[]> = {
  discover: ['Social followers', 'Website visitors', 'Podcast downloads', 'Email list growth'],
  nurture: ['Email open rate', 'Engagement rate', 'Comments/replies', 'Content pieces published'],
  convert: ['Sales calls booked', 'Proposals sent', 'Conversion rate', 'Revenue'],
};
