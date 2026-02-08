// Content Challenge Types for 30 Days of Content Wizard

export interface ContentPillar {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  emoji: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ContentChallenge {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  platforms: string[];
  promotion_context: PromotionContext;
  pillar_ids: string[];
  ideal_customer: string | null;
  status: ChallengeStatus;
  completion_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ContentChallengeDay {
  id: string;
  user_id: string;
  challenge_id: string;
  day_number: number;
  date: string;
  platform: string;
  pillar_id: string | null;
  title: string | null;
  hook: string | null;
  content_idea: string | null;
  full_copy: string | null;
  content_item_id: string | null;
  status: ChallengeDayStatus;
  created_at: string;
  updated_at: string;
}

export type ChallengeStatus = 'draft' | 'active' | 'completed' | 'abandoned';
export type ChallengeDayStatus = 'planned' | 'drafted' | 'finalized' | 'published' | 'skipped';

export interface PromotionContext {
  type: 'launch' | 'flash_sale' | 'webinar' | 'summit' | 'lead_magnet' | 'product' | 'nurture' | 'custom';
  id?: string;
  name?: string;
  description?: string;
}

// Wizard step data
export interface ContentChallengeWizardData {
  // Step 1: Context Check
  promotionContext: PromotionContext;
  hasActivePromotion: boolean;
  
  // Step 2: Ideal Customer & Pillars
  idealCustomer: string;
  problemsSolved: string;
  topicsOfInterest: string;
  selectedPillarIds: string[];
  newPillars: Omit<ContentPillar, 'id' | 'user_id' | 'created_at' | 'updated_at'>[];
  
  // Step 3: Platform Selection
  selectedPlatforms: string[];
  platformOrder: string[];
  
  // Step 4: Content Generation (per platform)
  contentByPlatform: Record<string, ContentDayDraft[]>;
  currentPlatformIndex: number;
  
  // Step 5: Calendar Schedule
  scheduledContent: ScheduledContentItem[];
  postingTimes: Record<string, string>; // platform -> time
  
  // Step 6: Review
  createPublishingTasks: boolean;
  challengeName: string;
  startDate: string;
}

export interface ContentDayDraft {
  dayNumber: number;
  platform: string;
  pillarId: string | null;
  pillarName?: string;
  title: string;
  hook: string;
  contentIdea: string;
  fullCopy: string;
  status: 'idea' | 'generated' | 'edited' | 'finalized';
}

export interface ScheduledContentItem {
  dayNumber: number;
  date: string;
  platform: string;
  pillarId: string | null;
  title: string;
  hook: string;
  fullCopy: string;
  postingTime: string;
}

// Default wizard data
export const DEFAULT_CONTENT_CHALLENGE_DATA: ContentChallengeWizardData = {
  promotionContext: { type: 'nurture' },
  hasActivePromotion: false,
  idealCustomer: '',
  problemsSolved: '',
  topicsOfInterest: '',
  selectedPillarIds: [],
  newPillars: [],
  selectedPlatforms: [],
  platformOrder: [],
  contentByPlatform: {},
  currentPlatformIndex: 0,
  scheduledContent: [],
  postingTimes: {},
  createPublishingTasks: true,
  challengeName: '30 Days of Content',
  startDate: '',
};

// Validation helpers
export function validateContextStep(data: ContentChallengeWizardData): boolean {
  return data.promotionContext.type !== undefined;
}

export function validatePillarsStep(data: ContentChallengeWizardData): boolean {
  return (
    data.idealCustomer.trim().length >= 10 &&
    (data.selectedPillarIds.length >= 3 || data.newPillars.length >= 3)
  );
}

export function validatePlatformStep(data: ContentChallengeWizardData): boolean {
  return data.selectedPlatforms.length >= 1 && data.selectedPlatforms.length <= 3;
}

export function validateGenerationStep(data: ContentChallengeWizardData): boolean {
  // Check if at least one platform has all content finalized
  const platformsWithContent = Object.entries(data.contentByPlatform);
  if (platformsWithContent.length === 0) return false;
  
  return platformsWithContent.some(([_, content]) => 
    content.length === 30 && content.every(c => c.status === 'finalized')
  );
}

export function validateScheduleStep(data: ContentChallengeWizardData): boolean {
  return data.scheduledContent.length > 0 && data.startDate !== '';
}

export function validateReviewStep(data: ContentChallengeWizardData): boolean {
  return data.challengeName.trim().length > 0;
}

// Available platforms
export const AVAILABLE_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: 'Instagram', description: 'Visual content, reels, stories, carousels' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'Linkedin', description: 'Professional content, thought leadership' },
  { id: 'twitter', name: 'Twitter/X', icon: 'Twitter', description: 'Short-form, threads, quick takes' },
  { id: 'tiktok', name: 'TikTok', icon: 'Video', description: 'Short video scripts, trending content' },
  { id: 'facebook', name: 'Facebook', icon: 'Facebook', description: 'Community posts, personal stories' },
  { id: 'blog', name: 'Blog', icon: 'FileText', description: 'Long-form articles, SEO content' },
  { id: 'youtube', name: 'YouTube', icon: 'Youtube', description: 'Video scripts, show notes' },
  { id: 'email', name: 'Email Newsletter', icon: 'Mail', description: 'Weekly emails, nurture sequences' },
] as const;

// Default pillar colors
export const PILLAR_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f97316', // Orange
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ef4444', // Red
];
