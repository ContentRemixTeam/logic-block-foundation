// Launch Planner Wizard Types

// Pre-launch task configuration for checklist
export interface PreLaunchTaskConfig {
  // Sales Assets
  salesPage: boolean;
  salesPageDeadline: string;
  checkoutFlow: boolean;
  waitlistPage: boolean;
  waitlistDeadline: string;
  orderBumpUpsell: boolean;
  bonuses: boolean;
  
  // Social Proof
  testimonials: boolean;
  testimonialGoal: number;
  testimonialDeadline: string;
  caseStudies: boolean;
  videoTestimonials: boolean;
  resultsScreenshots: boolean;
  
  // Tech Setup
  emailSequences: boolean;
  emailTypes: {
    warmUp: boolean;
    launch: boolean;
    cartClose: boolean;
    postPurchase: boolean;
  };
  automations: boolean;
  trackingPixels: boolean;
  
  // Content Prep
  liveEventContent: boolean;
  liveEventType: 'webinar' | 'workshop' | 'masterclass' | 'challenge' | 'other' | '';
  socialContent: boolean;
  adCreatives: boolean;
  leadMagnet: boolean;
}

export interface LaunchLiveEvent {
  type: 'webinar' | 'qa' | 'workshop' | 'challenge' | 'masterclass' | 'other';
  date: string;
  time?: string;
  topic: string;
  customType?: string; // For 'other' type
}

// NEW: Content pieces for pre-launch planning
export interface ContentPiece {
  id: string;
  type: 'blog' | 'social' | 'video' | 'email' | 'podcast';
  title: string;
  scheduledWeek: number; // -4, -3, -2, -1, 0 for launch week
  status: 'planned' | 'drafted' | 'scheduled' | 'published';
}

// NEW: Video content planning
export interface VideoContent {
  id: string;
  platform: 'youtube' | 'instagram' | 'tiktok';
  topic: string;
  scheduledDate: string;
}

// NEW: Podcast appearances
export interface PodcastAppearance {
  id: string;
  showName: string;
  topic: string;
  recordingDate: string;
  releaseDate?: string;
}

// NEW: Sales asset item
export interface SalesAsset {
  id: string;
  type: 'testimonial' | 'case-study' | 'bonus' | 'guarantee';
  title: string;
  status: 'needed' | 'in-progress' | 'complete';
}

export interface LaunchWizardData {
  // Step 1: Launch Basics
  name: string;
  cartOpens: string;
  cartCloses: string;
  launchDuration: '3_days' | '5_days' | '7_days' | '14_days' | 'evergreen';
  revenueGoal: number | null;
  pricePerSale: number | null;
  salesNeeded: number;

  // Step 2: Runway Timeline (NEW)
  runwayWeeks: 2 | 4 | 6 | 8;
  runwayStartDate: string; // Auto-calculated from cartOpens - runwayWeeks
  warmUpStrategy: 'email-series' | 'video-series' | 'challenge' | 'workshop-series' | 'content-blitz' | 'other';
  warmUpStrategyOther: string; // Custom strategy description
  warmUpFrequency: 'daily' | 'every-other-day' | '2x-week' | 'weekly';

  // Step 3: Messaging Strategy (NEW)
  currentMindset: string;
  beliefShifts: Array<{ from: string; to: string }>;
  transformationPromise: string;
  objectionsToAddress: string[];

  // Step 4: Content Plan (NEW)
  contentFormats: {
    email: boolean;
    video: boolean;
    podcast: boolean;
    blog: boolean;
    social: boolean;
  };
  videoCount: number;
  podcastTopics: string[];
  contentPieces: ContentPiece[];

  // Step 5: Content Reuse (was Step 2)
  selectedContentIds: string[];

  // Step 5b: Content Gap Analysis (NEW)
  contentGapAnalysis?: {
    reusedCount: number;
    gapsCount: number;
    estimatedTimeSavedMinutes: number;
    gaps: Array<{
      type: string;
      category: string;
      count: number;
    }>;
  };
  autoCreateGapTasks: boolean;

  // Step 6: Pre-Launch Tasks (comprehensive checklist)
  preLaunchTasks: PreLaunchTaskConfig;

  // Step 7: Launch Activities (was Step 4)
  liveEvents: LaunchLiveEvent[];
  hasAds: boolean | 'maybe';
  adsBudget: number | null;
  adsPlatform: string[];
  socialPostsPerDay: number;
  socialStrategy: string[];

  // Step 8: Video & Podcasts (NEW)
  videoContent: VideoContent[];
  podcastAppearances: PodcastAppearance[];

  // Step 9: Sales Assets (NEW)
  salesPageDeadline: string;
  hasTestimonials: boolean;
  testimonialGoal: number;
  hasBonuses: boolean;
  bonuses: string[];
  salesAssets: SalesAsset[];

  // Step 10: Making Offers (was Step 5)
  offerGoal: number;
  offerBreakdown: {
    emails: number;
    socialPosts: number;
    stories: number;
    dms: number;
    salesCalls: number;
    liveEvents: number;
  };

  // Step 11: Thought Work + Post-Launch (was Step 6)
  belief: string;
  limitingThought: string;
  usefulThought: string;
  postPurchaseFlow: string[];
  nonBuyerFollowup: string;
  debriefDate: string;

  // Index signature for Record<string, unknown> compatibility
  [key: string]: unknown;
}

export const DEFAULT_LAUNCH_WIZARD_DATA: LaunchWizardData = {
  // Step 1
  name: '',
  cartOpens: '',
  cartCloses: '',
  launchDuration: '7_days',
  revenueGoal: null,
  pricePerSale: null,
  salesNeeded: 0,
  // Step 2 - Runway
  runwayWeeks: 4,
  runwayStartDate: '',
  warmUpStrategy: 'email-series',
  warmUpStrategyOther: '',
  warmUpFrequency: '2x-week',
  // Step 3 - Messaging
  currentMindset: '',
  beliefShifts: [
    { from: '', to: '' },
    { from: '', to: '' },
    { from: '', to: '' },
  ],
  transformationPromise: '',
  objectionsToAddress: ['', '', ''],
  // Step 4 - Content Plan
  contentFormats: {
    email: true,
    video: false,
    podcast: false,
    blog: false,
    social: true,
  },
  videoCount: 3,
  podcastTopics: ['', '', '', ''],
  contentPieces: [],
  // Step 5 - Content Reuse
  selectedContentIds: [],
  // Step 5b - Content Gap Analysis
  contentGapAnalysis: undefined,
  autoCreateGapTasks: true,
  // Step 6 - Pre-Launch Tasks
  preLaunchTasks: {
    // Sales Assets
    salesPage: false,
    salesPageDeadline: '',
    checkoutFlow: false,
    waitlistPage: false,
    waitlistDeadline: '',
    orderBumpUpsell: false,
    bonuses: false,
    // Social Proof
    testimonials: false,
    testimonialGoal: 5,
    testimonialDeadline: '',
    caseStudies: false,
    videoTestimonials: false,
    resultsScreenshots: false,
    // Tech Setup
    emailSequences: false,
    emailTypes: {
      warmUp: true,
      launch: true,
      cartClose: true,
      postPurchase: false,
    },
    automations: false,
    trackingPixels: false,
    // Content Prep
    liveEventContent: false,
    liveEventType: '',
    socialContent: false,
    adCreatives: false,
    leadMagnet: false,
  },
  // Step 7 - Activities
  liveEvents: [],
  hasAds: false,
  adsBudget: null,
  adsPlatform: [],
  socialPostsPerDay: 1,
  socialStrategy: [],
  // Step 8 - Video & Podcasts
  videoContent: [],
  podcastAppearances: [],
  // Step 9 - Sales Assets
  salesPageDeadline: '',
  hasTestimonials: false,
  testimonialGoal: 5,
  hasBonuses: false,
  bonuses: [],
  salesAssets: [],
  // Step 10 - Offers
  offerGoal: 50,
  offerBreakdown: {
    emails: 0,
    socialPosts: 0,
    stories: 0,
    dms: 0,
    salesCalls: 0,
    liveEvents: 0,
  },
  // Step 11 - Thought Work
  belief: '',
  limitingThought: '',
  usefulThought: '',
  postPurchaseFlow: [],
  nonBuyerFollowup: '',
  debriefDate: '',
};

export const LAUNCH_DURATION_OPTIONS = [
  { value: '3_days', label: '3 days' },
  { value: '5_days', label: '5 days' },
  { value: '7_days', label: '7 days' },
  { value: '14_days', label: '14 days' },
  { value: 'evergreen', label: 'Evergreen (always open)' },
] as const;

export const RUNWAY_WEEKS_OPTIONS = [
  { value: 2, label: '2 weeks', description: 'Quick launch - minimal warm-up' },
  { value: 4, label: '4 weeks', description: 'Standard - good balance of prep and momentum' },
  { value: 6, label: '6 weeks', description: 'Extended - more time for audience building' },
  { value: 8, label: '8 weeks', description: 'Maximum - build deep trust and anticipation' },
] as const;

export const WARM_UP_STRATEGY_OPTIONS = [
  { value: 'email-series', label: 'Email series', description: '3-7 emails before launch to build anticipation' },
  { value: 'video-series', label: 'Video series', description: 'YouTube/social videos building up to launch' },
  { value: 'challenge', label: '5-day challenge', description: 'Free challenge that leads into the offer' },
  { value: 'workshop-series', label: 'Workshop series', description: '2-3 live trainings before cart opens' },
  { value: 'content-blitz', label: 'Content blitz', description: 'Daily value posts across platforms' },
  { value: 'other', label: 'Other', description: 'A different strategy that works for your business' },
] as const;

export const WARM_UP_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Maximum engagement (requires lots of content)' },
  { value: 'every-other-day', label: 'Every other day', description: 'Consistent without overwhelm' },
  { value: '2x-week', label: '2x per week', description: 'Sustainable and effective' },
  { value: 'weekly', label: 'Weekly', description: 'Lighter touch, relies on quality over quantity' },
] as const;

export const CONTENT_TYPE_OPTIONS = [
  { value: 'blog', label: 'Blog Post', icon: '📝' },
  { value: 'social', label: 'Social Post', icon: '📱' },
  { value: 'video', label: 'Video', icon: '🎬' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'podcast', label: 'Podcast', icon: '🎙️' },
] as const;

export const VIDEO_PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram Reels' },
  { value: 'tiktok', label: 'TikTok' },
] as const;

export const SOCIAL_PROOF_OPTIONS = [
  { value: 'testimonials', label: 'Written testimonials' },
  { value: 'video-testimonials', label: 'Video testimonials' },
  { value: 'case-studies', label: 'Case studies' },
  { value: 'screenshots', label: 'Screenshots/Results' },
  { value: 'media-mentions', label: 'Media mentions' },
] as const;

export const EMAIL_SEQUENCE_OPTIONS = [
  { value: 'pre-launch', label: 'Pre-launch sequence', description: 'Build hype before cart opens' },
  { value: 'launch', label: 'Launch week sequence', description: 'Make offers during cart open' },
  { value: 'mid-launch', label: 'Mid-launch nudge', description: 'For people who haven\'t bought yet' },
  { value: 'urgency', label: 'Urgency sequence', description: 'Final 24-48 hours push' },
  { value: 'post-launch', label: 'Post-launch sequence', description: 'For non-buyers after cart closes' },
] as const;

export const LIVE_EVENT_OPTIONS = [
  { value: 'webinar', label: 'Webinar' },
  { value: 'qa', label: 'Q&A' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'masterclass', label: 'Masterclass' },
  { value: 'other', label: 'Other' },
] as const;

export const AD_PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'other', label: 'Other' },
] as const;

export const SOCIAL_STRATEGY_OPTIONS = [
  { value: 'daily_posts', label: 'Posting daily about the offer' },
  { value: 'stories_feed', label: 'Stories + feed posts' },
  { value: 'bts', label: 'Behind-the-scenes content' },
  { value: 'testimonials', label: 'Testimonials and case studies' },
  { value: 'winging_it', label: 'I\'m winging it (don\'t recommend)' },
] as const;

export const POST_PURCHASE_OPTIONS = [
  { value: 'auto_welcome', label: 'Automated welcome email' },
  { value: 'onboarding', label: 'Onboarding sequence' },
  { value: 'immediate_access', label: 'Access to product immediately' },
  { value: 'personal_welcome', label: 'Personal welcome from you' },
] as const;

export const NON_BUYER_OPTIONS = [
  { value: 'nurture', label: 'Move to regular nurture sequence' },
  { value: 'downsell', label: 'Offer a downsell (lower-ticket alternative)' },
  { value: 'special_offer', label: 'Special offer for next launch' },
  { value: 'survey', label: 'Survey to understand why they didn\'t buy' },
  { value: 'nothing', label: 'Nothing - they stay on main list' },
] as const;
