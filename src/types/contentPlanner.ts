// Content Planner Wizard Types

// Step 1: Mode Selection
export type ContentPlanMode = 'regular' | 'launch';
export type PlanningPeriod = 'this-week' | 'next-week' | 'this-month' | 'custom';

// Step 2: Messaging Framework
export type MessagingAngle = 'fear' | 'aspiration' | 'logic' | 'social-proof';

export interface SellingPoint {
  id: string;
  label: string;
  description: string;
  isCore: boolean;
  sortOrder: number;
}

// Step 3: Format Selection (comprehensive list)
export type ContentFormat = 
  // Email & Text
  | 'email-sequence' | 'email-single' | 'blog-post' | 'linkedin-post' 
  | 'twitter-thread' | 'newsletter'
  // Video
  | 'youtube-video' | 'youtube-short' | 'instagram-reel' | 'tiktok'
  | 'live-stream' | 'sales-video' | 'testimonial-video' | 'tutorial-video'
  // Audio
  | 'podcast-episode' | 'podcast-guest' | 'audio-course'
  // Events
  | 'webinar' | 'workshop' | 'challenge' | 'masterclass' | 'group-call'
  // Documents
  | 'case-study' | 'pdf-guide' | 'workbook' | 'checklist'
  // Visual
  | 'infographic' | 'carousel' | 'quote-graphic'
  // Social
  | 'instagram-post' | 'facebook-post' | 'community-post';

// Main Wizard Data
export interface ContentPlannerData {
  // Step 1: Mode
  mode: ContentPlanMode | '';
  launchId: string | null;
  planningPeriod: PlanningPeriod | '';
  customStartDate: string;
  customEndDate: string;
  
  // Step 2: Messaging
  coreProblem: string;
  uniqueSolution: string;
  targetCustomer: string;
  sellingPoints: SellingPoint[];
  messagingAngles: MessagingAngle[];
  coreNarrative: string;
  
  // Step 3: Formats
  selectedFormats: ContentFormat[];
  
  // Step 4: Vault
  selectedRepurposeIds: string[];
  repurposeTargetFormats: Record<string, ContentFormat[]>;
  
  // Step 5: Batching
  batchingEnabled: boolean;
  coreContentTitle: string;
  coreContentType: ContentFormat | '';
  batchTargetFormats: ContentFormat[];
  
  // Step 6: Calendar
  plannedItems: PlannedContentItem[];
  
  // Step 7: Review
  generateTasks: boolean;
  
  // Task configuration for preview
  excludedTasks: string[];
  taskDateOverrides: Array<{ taskId: string; newDate: string }>;
  
  // Index signature for useWizard compatibility
  [key: string]: unknown;
}

export interface PlannedContentItem {
  id: string;
  title: string;
  type: ContentFormat;
  date: string;
  phase?: string;
  sellingPointIds: string[];
  messagingAngle: MessagingAngle | '';
  isRepurposed: boolean;
  sourceId?: string;
}

// Default data for wizard initialization
export const DEFAULT_CONTENT_PLANNER_DATA: ContentPlannerData = {
  // Step 1
  mode: '',
  launchId: null,
  planningPeriod: '',
  customStartDate: '',
  customEndDate: '',
  
  // Step 2
  coreProblem: '',
  uniqueSolution: '',
  targetCustomer: '',
  sellingPoints: [],
  messagingAngles: [],
  coreNarrative: '',
  
  // Step 3
  selectedFormats: [],
  
  // Step 4
  selectedRepurposeIds: [],
  repurposeTargetFormats: {},
  
  // Step 5
  batchingEnabled: false,
  coreContentTitle: '',
  coreContentType: '',
  batchTargetFormats: [],
  
  // Step 6
  plannedItems: [],
  
  // Step 7
  generateTasks: true,
  
  // Task configuration
  excludedTasks: [],
  taskDateOverrides: [],
};

// Format metadata for display
export interface FormatMetadata {
  id: ContentFormat;
  label: string;
  description: string;
  icon: string;
  category: 'email' | 'video' | 'audio' | 'events' | 'documents' | 'visual' | 'social';
  estimatedMinutes: number;
  repurposeFromFormats?: ContentFormat[];
}

// Vault suggestion for repurposing
export interface RepurposeSuggestion {
  contentId: string;
  title: string;
  type: string;
  performance: {
    openRate?: number;
    clickRate?: number;
    conversionRate?: number;
    engagementRate?: number;
  };
  suggestedFormats: ContentFormat[];
  timeSavedMinutes: number;
  launchName?: string;
}

// Batching preview
export interface BatchedOutline {
  format: ContentFormat;
  title: string;
  outline: string[];
  estimatedMinutes: number;
}

// Database types
export interface MessagingFramework {
  id: string;
  user_id: string;
  launch_id: string | null;
  cycle_id: string | null;
  name: string;
  core_problem: string | null;
  unique_solution: string | null;
  target_customer: string | null;
  core_narrative: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellingPointDB {
  id: string;
  user_id: string;
  framework_id: string;
  label: string;
  description: string | null;
  is_core: boolean;
  sort_order: number;
  total_uses: number;
  conversion_rate: number | null;
  best_format: string | null;
  created_at: string;
}

export interface ContentPlan {
  id: string;
  user_id: string;
  launch_id: string | null;
  cycle_id: string | null;
  framework_id: string | null;
  name: string;
  mode: ContentPlanMode;
  start_date: string | null;
  end_date: string | null;
  selected_formats: string[];
  core_content_id: string | null;
  batching_enabled: boolean;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ContentPlanItem {
  id: string;
  user_id: string;
  plan_id: string;
  content_item_id: string | null;
  title: string;
  content_type: string;
  channel: string | null;
  planned_date: string | null;
  phase: string | null;
  selling_point_ids: string[] | null;
  messaging_angle: string | null;
  is_repurposed: boolean;
  repurposed_from_id: string | null;
  status: 'planned' | 'in_progress' | 'created' | 'published';
  sort_order: number;
  created_at: string;
}
