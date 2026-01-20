export type CourseStatus = 'not_started' | 'in_progress' | 'implementing' | 'complete' | 'archived';

export type ROIType = 'revenue' | 'leads' | 'calls' | 'conversion' | 'time_saved' | 'skill' | 'other';

export type CheckinType = 'weekly' | 'monthly' | 'roi';

export interface Course {
  id: string;
  user_id: string;
  title: string;
  provider: string | null;
  course_url: string | null;
  purchase_date: string | null;
  status: CourseStatus;
  intention: string | null;
  roi_type: ROIType | null;
  roi_target: string | null;
  success_criteria: string | null;
  start_date: string | null;
  target_finish_date: string | null;
  roi_checkin_days: number;
  roi_checkin_date: string | null;
  progress_percent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseStudyPlan {
  id: string;
  user_id: string;
  course_id: string;
  sessions_per_week: number;
  session_minutes: number;
  preferred_days: number[];
  start_date: string;
  target_finish_date: string | null;
  auto_generate_sessions: boolean;
  last_generation_op_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseCheckin {
  id: string;
  user_id: string;
  course_id: string;
  checkin_type: CheckinType;
  checkin_date: string;
  on_track: boolean | null;
  notes: string | null;
  blocker: string | null;
  created_at: string;
}

export interface CourseWithNextSession extends Course {
  next_session_date?: string | null;
  next_session_title?: string | null;
  study_plan?: CourseStudyPlan | null;
}

export interface CourseFormData {
  title: string;
  provider?: string;
  course_url?: string;
  purchase_date?: string;
  intention?: string;
  roi_type?: ROIType;
  roi_target?: string;
  success_criteria?: string;
  start_date?: string;
  target_finish_date?: string;
  roi_checkin_days: number;
}

export interface StudyPlanFormData {
  sessions_per_week: number;
  session_minutes: number;
  preferred_days: number[];
  start_date: string;
  target_finish_date?: string;
}

export interface CheckinFormData {
  checkin_type: CheckinType;
  on_track: boolean | null;
  notes?: string;
  blocker?: string;
}

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  implementing: 'Implementing',
  complete: 'Complete',
  archived: 'Archived',
};

export const ROI_TYPE_LABELS: Record<ROIType, string> = {
  revenue: 'Revenue',
  leads: 'Leads',
  calls: 'Calls Booked',
  conversion: 'Conversion Rate',
  time_saved: 'Time Saved',
  skill: 'Skill Acquired',
  other: 'Other',
};

export const CHECKIN_TYPE_LABELS: Record<CheckinType, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  roi: 'ROI Review',
};

export const BLOCKER_OPTIONS = [
  { value: 'time', label: 'Time constraints' },
  { value: 'unclear', label: 'Unclear implementation' },
  { value: 'priorities', label: 'Shifted priorities' },
  { value: 'advanced', label: 'Content too advanced' },
  { value: 'other', label: 'Other' },
];

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
