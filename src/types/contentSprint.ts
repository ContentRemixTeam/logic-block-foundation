// Content Sprint Wizard Types

export type SprintPlatform = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'blog' | 'podcast';
export type SprintTimeline = '1_week' | '2_week' | '1_month' | 'ongoing';
export type CreationMethod = 'batch_one_day' | 'weekly_batch' | 'as_you_go' | 'mixed';

export interface ContentSprintWizardData {
  // Step 1: Platform & Type
  platform: SprintPlatform | '';
  contentType: string;
  pieceCount: number;
  timeline: SprintTimeline | '';

  // Step 2: Theme & Reuse
  theme: string;
  selectedContentIds: string[];
  newPiecesCount: number;
  timeSaved: number; // hours

  // Step 3: Production & Posting
  creationMethod: CreationMethod | '';
  batchDate: string;
  editDate: string;
  scheduleDate: string;
  postingFrequency: string;
  firstPostDate: string;
  lastPostDate: string;
  needsHelp: string[];
}

export const DEFAULT_CONTENT_SPRINT_DATA: ContentSprintWizardData = {
  platform: '',
  contentType: '',
  pieceCount: 30,
  timeline: '',
  theme: '',
  selectedContentIds: [],
  newPiecesCount: 0,
  timeSaved: 0,
  creationMethod: '',
  batchDate: '',
  editDate: '',
  scheduleDate: '',
  postingFrequency: '',
  firstPostDate: '',
  lastPostDate: '',
  needsHelp: [],
};

export const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram', description: 'Reels, Posts, Stories' },
  { value: 'tiktok', label: 'TikTok', description: 'Short videos' },
  { value: 'youtube', label: 'YouTube', description: 'Long videos' },
  { value: 'linkedin', label: 'LinkedIn', description: 'Professional content' },
  { value: 'blog', label: 'Your blog', description: 'Written content' },
  { value: 'podcast', label: 'Podcast', description: 'Audio content' },
] as const;

export const CONTENT_TYPE_EXAMPLES: Record<SprintPlatform, string[]> = {
  instagram: ['Reels', 'Carousel posts', 'Single posts', 'Stories'],
  tiktok: ['Short videos', 'Duets', 'Trends'],
  youtube: ['Long-form videos', 'Shorts', 'Lives'],
  linkedin: ['Text posts', 'Articles', 'Carousels', 'Videos'],
  blog: ['Blog posts', 'Guides', 'Case studies'],
  podcast: ['Episodes', 'Solo episodes', 'Interviews'],
};

export const TIMELINE_OPTIONS = [
  { value: '1_week', label: '1-week sprint' },
  { value: '2_week', label: '2-week sprint' },
  { value: '1_month', label: '1-month sprint' },
  { value: 'ongoing', label: 'Ongoing (no end date)' },
] as const;

export const CREATION_METHOD_OPTIONS = [
  { value: 'batch_one_day', label: 'Batch it all in one day' },
  { value: 'weekly_batch', label: 'Weekly batching' },
  { value: 'as_you_go', label: 'Create as you go', description: '(not recommended)' },
  { value: 'mixed', label: 'Mix of batching + as-you-go' },
] as const;

export const POSTING_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '5x_week', label: '5x per week' },
  { value: '3x_week', label: '3x per week' },
  { value: 'custom', label: 'Custom' },
] as const;

export const HELP_OPTIONS = [
  { value: 'hooks', label: 'Hook ideas' },
  { value: 'captions', label: 'Caption templates' },
  { value: 'hashtags', label: 'Hashtag lists' },
  { value: 'ctas', label: 'CTA ideas' },
] as const;
