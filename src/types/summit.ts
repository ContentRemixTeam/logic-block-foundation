// Summit Wizard Types

export type ExperienceLevel = 'first-time' | 'some-experience' | 'experienced';
export type PrimaryGoal = 'list-growth' | 'sales' | 'authority' | 'launch-offer' | 'combination';
export type SessionFormat = 'pre-recorded' | 'live' | 'mixed';
export type SessionLength = '20-30' | '45' | '60';
export type SpeakersAreAffiliates = 'all' | 'some' | 'none';
export type ReplayPeriod = '24-hours' | '48-hours' | '7-days' | 'permanent';
export type SpeakerEmailRequirement = 'required' | 'optional' | 'none';
export type CommunityType = 'popup-fb' | 'existing' | 'slack-discord' | 'none';
export type PostSummitNurture = 'email-sequence' | 'personal-outreach' | 'both' | 'none';
export type SummitStatus = 'planning' | 'active' | 'completed';

export interface SummitSpeaker {
  id?: string;
  summit_id?: string;
  user_id?: string;
  name: string;
  email: string;
  topic: string;
  session_title: string;
  session_order: number;
  bio_received: boolean;
  headshot_received: boolean;
  swipe_copy_sent: boolean;
  recording_received: boolean;
  affiliate_link_sent: boolean;
  recording_deadline: string | null;
  is_affiliate: boolean;
  affiliate_commission: number | null;
  notes: string;
}

export interface SummitWizardData {
  // Step 1: Basics
  name: string;
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  
  // Step 2: Structure
  numDays: number;
  customDays: number | null;
  sessionsPerDay: number;
  sessionFormat: SessionFormat;
  sessionLength: SessionLength;
  
  // Step 3: Speaker Strategy
  targetSpeakerCount: number;
  speakerRecruitmentDeadline: string;
  speakersAreAffiliates: SpeakersAreAffiliates;
  affiliateCommission: number;
  customCommission: number | null;
  speakers: SummitSpeaker[];
  
  // Step 4: All-Access Pass
  hasAllAccessPass: 'yes' | 'no' | 'considering';
  allAccessPrice: number | null;
  allAccessHasPaymentPlan: boolean;
  allAccessPaymentPlanDetails: string;
  allAccessIncludes: string[];
  hasVipTier: boolean;
  vipPrice: number | null;
  vipIncludes: string;
  
  // Step 5: Timeline
  registrationOpens: string;
  summitStartDate: string;
  summitEndDate: string;
  cartCloses: string;
  replayPeriod: ReplayPeriod;
  
  // Step 6: Tech & Delivery
  hostingPlatform: string;
  hostingPlatformOther: string;
  emailPlatform: string;
  emailPlatformOther: string;
  checkoutPlatform: string;
  checkoutPlatformOther: string;
  hasLiveSessions: boolean;
  streamingPlatform: string;
  streamingPlatformOther: string;
  
  // Step 7: Marketing Strategy
  promotionMethods: string[];
  registrationGoal: number | null;
  speakerEmailRequirement: SpeakerEmailRequirement;
  swipeEmailsCount: number;
  hasSocialKit: boolean;
  
  // Step 8: Engagement & Experience
  communityType: CommunityType;
  engagementActivities: string[];
  hasPostSummitOffer: boolean;
  postSummitOfferDetails: string;
  postSummitNurture: PostSummitNurture;
}

export const DEFAULT_SUMMIT_WIZARD_DATA: SummitWizardData = {
  // Step 1
  name: '',
  experienceLevel: 'first-time',
  primaryGoal: 'list-growth',
  
  // Step 2
  numDays: 5,
  customDays: null,
  sessionsPerDay: 5,
  sessionFormat: 'pre-recorded',
  sessionLength: '45',
  
  // Step 3
  targetSpeakerCount: 20,
  speakerRecruitmentDeadline: '',
  speakersAreAffiliates: 'all',
  affiliateCommission: 40,
  customCommission: null,
  speakers: [],
  
  // Step 4
  hasAllAccessPass: 'yes',
  allAccessPrice: null,
  allAccessHasPaymentPlan: false,
  allAccessPaymentPlanDetails: '',
  allAccessIncludes: ['lifetime-replay'],
  hasVipTier: false,
  vipPrice: null,
  vipIncludes: '',
  
  // Step 5
  registrationOpens: '',
  summitStartDate: '',
  summitEndDate: '',
  cartCloses: '',
  replayPeriod: '48-hours',
  
  // Step 6
  hostingPlatform: '',
  hostingPlatformOther: '',
  emailPlatform: '',
  emailPlatformOther: '',
  checkoutPlatform: '',
  checkoutPlatformOther: '',
  hasLiveSessions: false,
  streamingPlatform: '',
  streamingPlatformOther: '',
  
  // Step 7
  promotionMethods: ['email-list', 'speaker-promotions'],
  registrationGoal: null,
  speakerEmailRequirement: 'optional',
  swipeEmailsCount: 5,
  hasSocialKit: true,
  
  // Step 8
  communityType: 'popup-fb',
  engagementActivities: [],
  hasPostSummitOffer: false,
  postSummitOfferDetails: '',
  postSummitNurture: 'email-sequence',
};

// Options for selectors
export const EXPERIENCE_OPTIONS = [
  { value: 'first-time', label: 'First time ever', description: 'This is my first summit' },
  { value: 'some-experience', label: 'Hosted 1-2 before', description: 'I have some experience' },
  { value: 'experienced', label: 'Experienced summit host', description: "I've run multiple summits" },
] as const;

export const GOAL_OPTIONS = [
  { value: 'list-growth', label: 'Grow my email list', icon: '📧' },
  { value: 'sales', label: 'Make sales', icon: '💰' },
  { value: 'authority', label: 'Build authority', icon: '🏆' },
  { value: 'launch-offer', label: 'Launch a new offer', icon: '🚀' },
  { value: 'combination', label: 'Combination', icon: '🎯' },
] as const;

export const DAYS_OPTIONS = [
  { value: 3, label: '3 days', description: 'Compact summit' },
  { value: 5, label: '5 days', description: 'Standard summit' },
  { value: 7, label: '7+ days', description: 'Extended summit' },
  { value: 0, label: 'Custom', description: 'Enter custom number' },
] as const;

export const SESSIONS_PER_DAY_OPTIONS = [
  { value: 4, label: '3-4 sessions/day' },
  { value: 6, label: '5-6 sessions/day' },
  { value: 8, label: '7+ sessions/day' },
] as const;

export const FORMAT_OPTIONS = [
  { value: 'pre-recorded', label: 'Pre-recorded interviews', description: 'Less stressful, more polished' },
  { value: 'live', label: 'Live sessions', description: 'More engagement, requires coordination' },
  { value: 'mixed', label: 'Mix of both', description: 'Best of both worlds' },
] as const;

export const LENGTH_OPTIONS = [
  { value: '20-30', label: '20-30 minutes', description: 'Quick and focused' },
  { value: '45', label: '45 minutes', description: 'Standard length' },
  { value: '60', label: '60 minutes', description: 'Deep dive sessions' },
] as const;

export const SPEAKER_COUNT_OPTIONS = [
  { value: 12, label: '10-15 speakers', description: 'Intimate summit' },
  { value: 20, label: '16-25 speakers', description: 'Standard summit' },
  { value: 33, label: '26-40 speakers', description: 'Large summit' },
  { value: 50, label: '40+ speakers', description: 'Mega summit' },
] as const;

export const AFFILIATE_OPTIONS = [
  { value: 'all', label: 'Yes, all speakers are affiliates' },
  { value: 'some', label: 'Some speakers, not all' },
  { value: 'none', label: 'No affiliate program' },
] as const;

export const COMMISSION_OPTIONS = [
  { value: 30, label: '30%' },
  { value: 40, label: '40%' },
  { value: 50, label: '50%' },
  { value: 0, label: 'Custom' },
] as const;

export const ALL_ACCESS_INCLUDES_OPTIONS = [
  { value: 'lifetime-replay', label: 'Lifetime replay access' },
  { value: 'downloads', label: 'Downloadable resources' },
  { value: 'bonus-trainings', label: 'Bonus trainings' },
  { value: 'community', label: 'Private community access' },
  { value: 'live-qa', label: 'Live Q&A sessions' },
  { value: 'other', label: 'Other' },
] as const;

export const REPLAY_OPTIONS = [
  { value: '24-hours', label: '24 hours' },
  { value: '48-hours', label: '48 hours' },
  { value: '7-days', label: '7 days' },
  { value: 'permanent', label: 'Permanent (all-access only)' },
] as const;

export const HOSTING_PLATFORMS = [
  { value: 'heysummit', label: 'HeySummit' },
  { value: 'kajabi', label: 'Kajabi' },
  { value: 'thinkific', label: 'Thinkific' },
  { value: 'custom', label: 'Custom website' },
  { value: 'facebook-group', label: 'Facebook Group' },
  { value: 'other', label: 'Other' },
] as const;

export const EMAIL_PLATFORMS = [
  { value: 'kit', label: 'Kit (ConvertKit)' },
  { value: 'activecampaign', label: 'ActiveCampaign' },
  { value: 'mailchimp', label: 'Mailchimp' },
  { value: 'flodesk', label: 'Flodesk' },
  { value: 'other', label: 'Other' },
] as const;

export const CHECKOUT_PLATFORMS = [
  { value: 'thrivecart', label: 'ThriveCart' },
  { value: 'samcart', label: 'SamCart' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'kajabi', label: 'Kajabi' },
  { value: 'other', label: 'Other' },
] as const;

export const STREAMING_PLATFORMS = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'streamyard', label: 'StreamYard' },
  { value: 'crowdcast', label: 'Crowdcast' },
  { value: 'other', label: 'Other' },
] as const;

export const PROMOTION_METHODS = [
  { value: 'email-list', label: 'Email list' },
  { value: 'social-media', label: 'Social media' },
  { value: 'speaker-promotions', label: 'Speaker promotions (affiliates)' },
  { value: 'paid-ads', label: 'Paid ads' },
  { value: 'podcast-guesting', label: 'Podcast guesting' },
  { value: 'other', label: 'Other' },
] as const;

export const SWIPE_EMAILS_OPTIONS = [
  { value: 3, label: '3 emails' },
  { value: 5, label: '5 emails' },
  { value: 7, label: '7+ emails' },
] as const;

export const COMMUNITY_OPTIONS = [
  { value: 'popup-fb', label: 'Pop-up Facebook Group' },
  { value: 'existing', label: 'Existing community' },
  { value: 'slack-discord', label: 'Slack/Discord' },
  { value: 'none', label: 'No community' },
] as const;

export const ENGAGEMENT_ACTIVITIES = [
  { value: 'giveaways', label: 'Giveaways' },
  { value: 'qa-sessions', label: 'Q&A sessions' },
  { value: 'networking', label: 'Networking events' },
  { value: 'homework', label: 'Homework/challenges' },
] as const;

export const NURTURE_OPTIONS = [
  { value: 'email-sequence', label: 'Email sequence to all registrants' },
  { value: 'personal-outreach', label: 'Personal outreach to engaged attendees' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'None planned' },
] as const;

// Validation - Non-blocking navigation (all steps are optional)
// Per architectural standard: validation is deferred until final creation
export function validateSummitStep(step: number, data: SummitWizardData): boolean {
  // Always return true to allow free navigation between steps
  // Final validation happens at creation time
  return true;
}

export const SUMMIT_STEPS = [
  { number: 1, title: 'Basics', shortTitle: 'Basics' },
  { number: 2, title: 'Structure', shortTitle: 'Structure' },
  { number: 3, title: 'Speakers', shortTitle: 'Speakers' },
  { number: 4, title: 'All-Access Pass', shortTitle: 'AAP' },
  { number: 5, title: 'Timeline', shortTitle: 'Timeline' },
  { number: 6, title: 'Tech', shortTitle: 'Tech' },
  { number: 7, title: 'Marketing', shortTitle: 'Marketing' },
  { number: 8, title: 'Engagement', shortTitle: 'Engage' },
  { number: 9, title: 'Review', shortTitle: 'Review' },
] as const;
