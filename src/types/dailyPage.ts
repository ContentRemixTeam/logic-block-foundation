// Section identifiers for daily page layout
export type SectionId =
  | 'habits_tracker'
  | 'identity_anchor'
  | 'brain_dump'
  | 'one_thing'
  | 'top_3_priorities'
  | 'daily_mindset'
  | 'weekly_priorities'
  | 'monthly_focus'
  | 'cycle_snapshot'
  | 'goal_rewrite'
  | 'calendar_agenda'
  | 'info_cards'
  | 'posting_slot'
  | 'nurture_checkin'
  | 'quick_log'
  | 'completed_today'
  | 'launch_reflection'
  | 'end_of_day_reflection'
  | 'deep_mode';

// Custom question types
export type CustomQuestionType = 
  | 'checkbox' 
  | 'text' 
  | 'number' 
  | 'rating' 
  | 'time' 
  | 'dropdown';

// Custom question for daily reflections
export interface CustomQuestion {
  id: string;
  section_id: string; // Unique section_id for layout ordering
  question: string;
  type: CustomQuestionType;
  placeholder?: string;
  icon?: string; // Lucide icon name
  isRequired?: boolean;
  showInDashboard?: boolean;
  // Type-specific fields
  maxLength?: number; // For text type
  minValue?: number; // For number/rating types
  maxValue?: number; // For number/rating types
  minLabel?: string; // For rating type
  maxLabel?: string; // For rating type
  options?: string[]; // For dropdown type
  createdAt?: string;
}

// Daily page layout configuration
export interface DailyPageLayout {
  id: string;
  user_id: string;
  layout_name: string;
  section_order: SectionId[];
  hidden_sections: SectionId[];
  custom_questions: CustomQuestion[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Zone categorization for sections
export type SectionZone = 'banners' | 'morning' | 'context' | 'execution' | 'evening' | 'navigation';

// Section metadata definition
export interface SectionDefinition {
  id: SectionId;
  label: string;
  description: string;
  zone: SectionZone;
  icon: string;
  isConditional?: boolean;
  conditionDescription?: string;
  canHide: boolean;
  canReorder: boolean;
}

// Default section order
export const DEFAULT_SECTION_ORDER: SectionId[] = [
  'habits_tracker',
  'identity_anchor',
  'brain_dump',
  'one_thing',
  'top_3_priorities',
  'daily_mindset',
  'weekly_priorities',
  'monthly_focus',
  'cycle_snapshot',
  'goal_rewrite',
  'calendar_agenda',
  'info_cards',
  'posting_slot',
  'nurture_checkin',
  'quick_log',
  'completed_today',
  'launch_reflection',
  'end_of_day_reflection',
  'deep_mode',
];

// Section definitions with metadata
export const SECTION_DEFINITIONS: Record<SectionId, SectionDefinition> = {
  habits_tracker: {
    id: 'habits_tracker',
    label: 'Habits Tracker',
    description: 'Track your daily habits and routines',
    zone: 'morning',
    icon: 'CheckSquare',
    canHide: true,
    canReorder: true,
  },
  identity_anchor: {
    id: 'identity_anchor',
    label: 'Identity Anchor',
    description: 'Your identity statement to ground your day',
    zone: 'morning',
    icon: 'Anchor',
    isConditional: true,
    conditionDescription: 'Only shows if you have an identity anchor set',
    canHide: true,
    canReorder: true,
  },
  brain_dump: {
    id: 'brain_dump',
    label: 'Brain Dump & Scratch Pad',
    description: 'Capture thoughts and quick notes',
    zone: 'morning',
    icon: 'Brain',
    canHide: true,
    canReorder: true,
  },
  one_thing: {
    id: 'one_thing',
    label: 'ONE Thing',
    description: 'Your single most important task for today',
    zone: 'morning',
    icon: 'Target',
    canHide: false,
    canReorder: true,
  },
  top_3_priorities: {
    id: 'top_3_priorities',
    label: 'Top 3 Priorities',
    description: 'Your three key priorities for today',
    zone: 'morning',
    icon: 'ListOrdered',
    canHide: false,
    canReorder: true,
  },
  daily_mindset: {
    id: 'daily_mindset',
    label: 'Daily Mindset',
    description: 'Set your thought and feeling for the day',
    zone: 'morning',
    icon: 'Sparkles',
    canHide: true,
    canReorder: true,
  },
  weekly_priorities: {
    id: 'weekly_priorities',
    label: 'Weekly Priorities',
    description: 'View your weekly priorities for context',
    zone: 'context',
    icon: 'Calendar',
    isConditional: true,
    conditionDescription: 'Only shows if weekly priorities exist',
    canHide: true,
    canReorder: true,
  },
  monthly_focus: {
    id: 'monthly_focus',
    label: 'Monthly Focus',
    description: 'Your monthly focus reminder',
    zone: 'context',
    icon: 'CalendarDays',
    isConditional: true,
    conditionDescription: 'Only shows if monthly focus is set',
    canHide: true,
    canReorder: true,
  },
  cycle_snapshot: {
    id: 'cycle_snapshot',
    label: 'Cycle Snapshot',
    description: 'Overview of your current 90-day cycle',
    zone: 'context',
    icon: 'RotateCcw',
    isConditional: true,
    conditionDescription: 'Only shows if you have an active cycle',
    canHide: true,
    canReorder: true,
  },
  goal_rewrite: {
    id: 'goal_rewrite',
    label: 'Goal Rewrite',
    description: 'Rewrite your goal in your own words',
    zone: 'context',
    icon: 'Pencil',
    canHide: true,
    canReorder: true,
  },
  calendar_agenda: {
    id: 'calendar_agenda',
    label: 'Calendar Agenda',
    description: 'Your schedule with task scheduling',
    zone: 'execution',
    icon: 'CalendarClock',
    canHide: true,
    canReorder: true,
  },
  info_cards: {
    id: 'info_cards',
    label: 'Info Cards',
    description: 'Quick stats and information cards',
    zone: 'execution',
    icon: 'LayoutGrid',
    canHide: true,
    canReorder: true,
  },
  posting_slot: {
    id: 'posting_slot',
    label: 'Posting Slot',
    description: 'Track your content posting',
    zone: 'execution',
    icon: 'Send',
    canHide: true,
    canReorder: true,
  },
  nurture_checkin: {
    id: 'nurture_checkin',
    label: 'Nurture Check-in',
    description: 'Track nurture activities',
    zone: 'execution',
    icon: 'Heart',
    canHide: true,
    canReorder: true,
  },
  quick_log: {
    id: 'quick_log',
    label: 'Quick Log',
    description: 'Log quick wins and activities',
    zone: 'execution',
    icon: 'Zap',
    canHide: true,
    canReorder: true,
  },
  completed_today: {
    id: 'completed_today',
    label: 'Completed Today',
    description: 'Tasks you completed today',
    zone: 'execution',
    icon: 'CheckCircle',
    isConditional: true,
    conditionDescription: 'Only shows when tasks are completed',
    canHide: true,
    canReorder: true,
  },
  end_of_day_reflection: {
    id: 'end_of_day_reflection',
    label: 'End of Day Reflection',
    description: 'Reflect on your day',
    zone: 'evening',
    icon: 'Moon',
    isConditional: true,
    conditionDescription: 'Only shows after 5pm',
    canHide: true,
    canReorder: true,
  },
  launch_reflection: {
    id: 'launch_reflection',
    label: 'Launch Reflection',
    description: 'Quick wins & lessons for active launch',
    zone: 'evening',
    icon: 'Rocket',
    isConditional: true,
    conditionDescription: 'Only shows during active launches',
    canHide: true,
    canReorder: true,
  },
  deep_mode: {
    id: 'deep_mode',
    label: 'Deep Mode',
    description: 'Toggle deep work mode',
    zone: 'evening',
    icon: 'Focus',
    canHide: true,
    canReorder: true,
  },
};

// Helper to get sections by zone
export const getSectionsByZone = (zone: SectionZone): SectionDefinition[] => {
  return Object.values(SECTION_DEFINITIONS).filter(section => section.zone === zone);
};

// Helper to get visible sections based on layout
export const getVisibleSections = (
  layout: DailyPageLayout | null,
  defaultOrder: SectionId[] = DEFAULT_SECTION_ORDER
): SectionId[] => {
  if (!layout) return defaultOrder;
  
  const hiddenSet = new Set(layout.hidden_sections);
  return layout.section_order.filter(id => !hiddenSet.has(id));
};
