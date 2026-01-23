// Launch Planner Wizard Types

export interface LaunchLiveEvent {
  type: 'webinar' | 'qa' | 'workshop' | 'challenge' | 'masterclass';
  date: string;
  time?: string;
  topic: string;
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

  // Step 2: Content Reuse
  selectedContentIds: string[];

  // Step 3: Pre-Launch Setup
  hasWaitlist: boolean;
  waitlistOpens: string;
  waitlistIncentive: string;
  hasLeadMagnet: boolean | 'skip';
  leadMagnetTopic: string;
  leadMagnetDueDate: string;
  emailSequences: string[]; // 'pre-launch', 'launch', 'mid-launch', 'urgency', 'post-launch'

  // Step 4: Launch Activities
  liveEvents: LaunchLiveEvent[];
  hasAds: boolean | 'maybe';
  adsBudget: number | null;
  adsPlatform: string[];
  socialPostsPerDay: number;
  socialStrategy: string[];

  // Step 5: Making Offers
  offerGoal: number;
  offerBreakdown: {
    emails: number;
    socialPosts: number;
    stories: number;
    dms: number;
    salesCalls: number;
    liveEvents: number;
  };

  // Step 6: Thought Work + Post-Launch
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
  name: '',
  cartOpens: '',
  cartCloses: '',
  launchDuration: '7_days',
  revenueGoal: null,
  pricePerSale: null,
  salesNeeded: 0,
  selectedContentIds: [],
  hasWaitlist: false,
  waitlistOpens: '',
  waitlistIncentive: '',
  hasLeadMagnet: false,
  leadMagnetTopic: '',
  leadMagnetDueDate: '',
  emailSequences: [],
  liveEvents: [],
  hasAds: false,
  adsBudget: null,
  adsPlatform: [],
  socialPostsPerDay: 1,
  socialStrategy: [],
  offerGoal: 50,
  offerBreakdown: {
    emails: 0,
    socialPosts: 0,
    stories: 0,
    dms: 0,
    salesCalls: 0,
    liveEvents: 0,
  },
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
