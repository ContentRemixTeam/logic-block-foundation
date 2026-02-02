// Launch Planner V2 Wizard Types
// Streamlined 8-step wizard based on questionnaire

// ============== Shared Asset Types ==============
export interface BonusItem {
  id: string;
  name: string;
  status: 'existing' | 'needs-creation';
  deadline?: string; // Required only if needs-creation
}

export interface EmailSequenceItem {
  type: 'warmUp' | 'launch' | 'cartClose' | 'postPurchase' | 'custom';
  customName?: string;
  status: 'existing' | 'needs-creation';
  deadline?: string;
}

export type SalesPageStatus = 'existing' | 'needs-creation' | 'in-progress';
export type TestimonialStatus = 'have-enough' | 'need-more' | 'none' | 'skip-this-launch';

// ============== Step 1: Launch Context ==============
export type LaunchExperience = 'first-time' | 'launched-before' | 'launched-recently';
export type OfferType = 'course' | 'coaching' | 'product' | 'membership' | 'other';
export type EmailListStatus = 'comfortable' | 'small-nervous' | 'starting-zero' | 'building' | 'not-using-email';

// ============== Launch Style (NEW) ==============
export type LaunchStyle = 
  | 'standard'
  | 'challenge'
  | 'webinar'
  | 'masterclass'
  | 'flash-sale'
  | 'beta'
  | 'evergreen'
  | 'other';

// Challenge-specific config
export interface ChallengeConfig {
  challengeDuration: 3 | 5 | 7 | 10 | number;
  dailyTopics: string[];
  groupStrategy: 'pop-up' | 'existing' | 'none';
  groupPlatform: 'facebook' | 'slack' | 'discord' | 'circle' | 'mighty-networks' | 'other';
  groupPlatformOther: string;
  popUpGroupName: string;
  existingGroupLink: string;
  hasCompletionIncentive: boolean;
  incentiveType: 'giveaway' | 'bonus' | 'certificate' | 'discount' | 'other';
  incentiveDescription: string;
  incentiveQualification: 'complete-all-days' | 'submit-homework' | 'attend-live' | 'other';
  hasHomework: boolean;
  homeworkType: 'worksheet' | 'video-response' | 'group-post' | 'action-item' | 'mixed';
  homeworkSubmissionMethod: 'group' | 'email' | 'form' | 'dm';
}

// Webinar-specific config
export interface WebinarConfig {
  platform: 'zoom' | 'webinarjam' | 'streamyard' | 'crowdcast' | 'other';
  platformOther: string;
  hasReplay: boolean;
  replayDuration: '24-hours' | '48-hours' | '72-hours' | 'until-cart-close';
  pitchTiming: 'at-end' | 'throughout' | 'after-qa';
  hasLiveBonus: boolean;
  liveBonusDescription: string;
  registrationGoal: number | null;
  showUpStrategy: 'email-reminders' | 'sms' | 'both';
}

// Flash sale config
export interface FlashSaleConfig {
  saleDuration: '12-hours' | '24-hours' | '48-hours' | '72-hours';
  discountType: 'percent-off' | 'dollar-off' | 'bonus-stack';
  discountAmount: string;
  hasCountdownTimer: boolean;
  emailCount: number;
  socialPostsPlanned: number;
}

// Beta launch config
export interface BetaLaunchConfig {
  betaDiscount: number; // percentage off
  betaSpots: number;
  requiresFeedback: boolean;
  feedbackMethod: 'survey' | 'calls' | 'community' | 'other';
  collectsTestimonials: boolean;
}

// Masterclass config
export interface MasterclassConfig {
  numberOfDays: 2 | 3 | 4 | 5 | number;
  dailyThemes: string[];
  replayPeriod: '24-hours' | '48-hours' | '72-hours' | 'until-cart-close';
  hasReplayOnlyOffer: boolean;
  replayOnlyOfferDescription: string;
}

// Default configs
export const DEFAULT_CHALLENGE_CONFIG: ChallengeConfig = {
  challengeDuration: 5,
  dailyTopics: [],
  groupStrategy: 'pop-up',
  groupPlatform: 'facebook',
  groupPlatformOther: '',
  popUpGroupName: '',
  existingGroupLink: '',
  hasCompletionIncentive: false,
  incentiveType: 'bonus',
  incentiveDescription: '',
  incentiveQualification: 'complete-all-days',
  hasHomework: false,
  homeworkType: 'action-item',
  homeworkSubmissionMethod: 'group',
};

export const DEFAULT_WEBINAR_CONFIG: WebinarConfig = {
  platform: 'zoom',
  platformOther: '',
  hasReplay: true,
  replayDuration: '48-hours',
  pitchTiming: 'at-end',
  hasLiveBonus: false,
  liveBonusDescription: '',
  registrationGoal: null,
  showUpStrategy: 'email-reminders',
};

export const DEFAULT_FLASH_SALE_CONFIG: FlashSaleConfig = {
  saleDuration: '48-hours',
  discountType: 'percent-off',
  discountAmount: '',
  hasCountdownTimer: true,
  emailCount: 5,
  socialPostsPlanned: 5,
};

export const DEFAULT_BETA_LAUNCH_CONFIG: BetaLaunchConfig = {
  betaDiscount: 50,
  betaSpots: 20,
  requiresFeedback: true,
  feedbackMethod: 'survey',
  collectsTestimonials: true,
};

export const DEFAULT_MASTERCLASS_CONFIG: MasterclassConfig = {
  numberOfDays: 3,
  dailyThemes: [],
  replayPeriod: '48-hours',
  hasReplayOnlyOffer: false,
  replayOnlyOfferDescription: '',
};

// ============== Step 2: Goal & Timeline ==============
export type LaunchTimeline = '2-weeks' | '3-4-weeks' | '5-6-weeks' | 'other';
export type RevenueGoalTier = 'first-sale' | '500-1000' | '1000-2500' | '2500-plus' | 'testing' | 'custom' | 'no-goal';

// ============== Step 3: Offer Details - ENHANCED PRICING ==============
export type HasLimitations = 'none' | 'existing-clients' | 'limited-spots';
export type GuaranteeType = 'money-back' | 'results' | 'satisfaction' | 'none' | 'other';

export interface PaymentPlanOption {
  id: string;
  installments: number;      // e.g., 2, 3, 4, 6, 12
  installmentAmount: number; // e.g., 349
  totalAmount?: number;      // Auto-calculated
}

// Special pricing offer type - 'none' means just using scarcity (deadline/spots)
export type SpecialOfferType = 'none' | 'discount' | 'bonus' | 'both';

export interface OfferPricing {
  fullPrice: number | null;           // Pay-in-full price
  originalValue: number | null;       // "Value" for anchoring
  // Early Bird
  hasEarlyBirdPrice: boolean;
  earlyBirdOfferType: SpecialOfferType;
  earlyBirdPrice: number | null;      // Discount price (if discount or both)
  earlyBirdBonus: string;             // Bonus description (if bonus or both)
  earlyBirdDeadline: string;          // When early bird expires
  // Waitlist
  hasWaitlistPrice: boolean;
  waitlistOfferType: SpecialOfferType;
  waitlistPrice: number | null;       // Discount price (if discount or both)
  waitlistBonus: string;              // Bonus description (if bonus or both)
  // Payment plans
  paymentPlans: PaymentPlanOption[];  // Multiple payment plans
  // VIP
  hasVipTier: boolean;
  vipPrice: number | null;
  vipIncludes: string;                // What's included in VIP
}

export interface OrderBump {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface Upsell {
  id: string;
  name: string;
  price: number;
  showWhen: 'checkout' | 'post-purchase' | 'both';
}

export interface OfferStack {
  orderBumps: OrderBump[];
  upsells: Upsell[];
  hasDownsell: boolean;
  downsellDetails: string;
  guaranteeType: GuaranteeType;
  guaranteeDuration: string;           // "30 days", "60 days", "Lifetime"
  guaranteeDetails: string;
}

// ============== Step 4: Pre-Launch Strategy ==============
export type MainReachMethod = 'email' | 'social' | 'direct-outreach' | 'combination' | 'unsure';
export type ContentCreationStatus = 'ready' | 'partial' | 'from-scratch';
export type ContentVolume = 'light' | 'medium' | 'heavy';

// Email Sequence Types (legacy - for backward compatibility)
export interface EmailSequenceTypes {
  warmUp: boolean;
  launch: boolean;
  cartClose: boolean;
  postPurchase: boolean;
}

// Automation Types
export interface AutomationTypes {
  tagging: boolean;
  abandonedCart: boolean;
  purchaseConfirmation: boolean;
  waitlistToSales: boolean;
  deadlineUrgency: boolean;
  leadMagnetDelivery: boolean;
}

// ============== Step 5: Launch Week Strategy ==============
export type LaunchMethod = 'email-only' | 'social-email' | 'outreach-email' | 'in-person' | 'combination' | 'other';
export type OfferFrequency = 'once' | 'daily' | 'multiple-daily' | 'every-other-day' | 'unsure' | 'other';
export type LiveComponent = 'none' | 'one' | 'multiple' | 'considering' | 'other';

// ============== Step 6: Post-Launch Strategy ==============
export type PromotionDuration = '1-week' | '2-weeks' | 'until-goal' | 'ongoing' | 'unsure' | 'other';
export type FollowUpWillingness = 'one-email' | 'multiple-emails' | 'personal-outreach' | 'simple' | 'unsure' | 'none-planned' | 'other';

// ============== Step 7: Contingency Planning ==============
export type BiggestFear = 
  | 'zero-sales' 
  | 'waste-time' 
  | 'judgment' 
  | 'not-ready' 
  | 'too-much-demand' 
  | 'audience-small' 
  | 'too-salesy' 
  | 'no-fear';

export type ZeroSalesMeaning = 'offer-problem' | 'not-enough-promotion' | 'nobody-wants' | 'unsure' | 'just-data';
export type ZeroSalesPlan = 'figure-out-retry' | 'adjust-relaunch' | 'take-break' | 'no-plan' | 'unsure';

// ============== Step 8: Review & Complete ==============
export type WhatYouNeed = 'task-list' | 'offer-help' | 'confidence' | 'accountability' | 'nothing';

// ============== GAP Support (kept for backward compatibility) ==============
export type GapSupportType = 'daily-motivation' | 'mid-week-check' | 'thought-work' | 'keep-tasks' | 'decide-later';

// ============== Live Event (reused from existing) ==============
export interface LaunchLiveEvent {
  type: 'webinar' | 'qa' | 'workshop' | 'challenge' | 'masterclass' | 'other';
  date: string;
  time?: string;
  topic: string;
  customType?: string; // For 'other' type
}

// ============== Free Event Types - ENHANCED ==============
export type FreeEventType = 'webinar' | 'workshop' | 'challenge' | 'masterclass' | '';
export type FreeEventPhase = 'runway' | 'pre-launch' | 'cart-open';

export interface FreeEventDetails {
  // Basic info
  type: FreeEventType;
  date: string;
  time: string;
  phase: FreeEventPhase | '';
  
  // Deep planning
  name: string;                        // "The 5-Day Content Challenge"
  hook: string;                        // "Learn to create a month of content in 5 days"
  teachingTopics: string[];            // What you're teaching (for webinar: 3 points, for challenge: daily topics)
  
  // Registration & Show-up
  registrationGoal: number | null;     // How many signups?
  sendReminders: boolean;              // Will you send reminder emails?
  
  // Special Offer
  hasEventOnlyOffer: boolean;          // Special deal for attendees?
  eventOfferDescription: string;       // What's the offer?
  eventOfferDeadline: string;          // When does it expire? (e.g., "24 hours after")
  eventOfferDiscount: string;          // e.g., "$200 off", "Bonus XYZ"
  
  // Challenge-specific
  challengeDuration: number | null;    // 3, 5, 7 days
  hasFacebookGroup: boolean;
  dailyEmails: boolean;
}

// Default free event details
export const DEFAULT_FREE_EVENT_DETAILS: FreeEventDetails = {
  type: '',
  date: '',
  time: '',
  phase: '',
  name: '',
  hook: '',
  teachingTopics: [],
  registrationGoal: null,
  sendReminders: true,
  hasEventOnlyOffer: false,
  eventOfferDescription: '',
  eventOfferDeadline: '',
  eventOfferDiscount: '',
  challengeDuration: null,
  hasFacebookGroup: false,
  dailyEmails: false,
};

// Default offer pricing
export const DEFAULT_OFFER_PRICING: OfferPricing = {
  fullPrice: null,
  originalValue: null,
  hasEarlyBirdPrice: false,
  earlyBirdOfferType: 'none',
  earlyBirdPrice: null,
  earlyBirdBonus: '',
  earlyBirdDeadline: '',
  hasWaitlistPrice: false,
  waitlistOfferType: 'none',
  waitlistPrice: null,
  waitlistBonus: '',
  paymentPlans: [],
  hasVipTier: false,
  vipPrice: null,
  vipIncludes: '',
};

// Default offer stack
export const DEFAULT_OFFER_STACK: OfferStack = {
  orderBumps: [],
  upsells: [],
  hasDownsell: false,
  downsellDetails: '',
  guaranteeType: 'none',
  guaranteeDuration: '',
  guaranteeDetails: '',
};

// ============== Main Wizard Data Type ==============
export interface LaunchWizardV2Data {
  // Step 1: Launch Context (Q1-Q3)
  launchExperience: LaunchExperience | '';
  previousLaunchLearnings: string;
  whatWentWell: string;
  whatToImprove: string;
  offerType: OfferType | '';
  otherOfferType: string;
  emailListStatus: EmailListStatus | '';
  
  // Step 1b: Launch Style (NEW)
  launchStyle: LaunchStyle | '';
  challengeConfig: ChallengeConfig;
  webinarConfig: WebinarConfig;
  flashSaleConfig: FlashSaleConfig;
  betaLaunchConfig: BetaLaunchConfig;
  masterclassConfig: MasterclassConfig;
  
  // Step 2: Goal & Timeline (Q4-Q6)
  launchTimeline: LaunchTimeline | '';
  otherLaunchTimeline: string; // Custom duration for 'other'
  cartOpensDate: string;
  cartClosesDate: string;
  revenueGoalTier: RevenueGoalTier | '';
  customRevenueGoal: number | null;
  
  // Step 2b: Phase Timeline (NEW - 4-phase system)
  runwayStartDate: string;
  runwayEndDate: string;
  preLaunchStartDate: string;
  preLaunchEndDate: string;
  postLaunchEndDate: string;
  useCustomTimeline: boolean;
  
  // Step 2c: Free Event (NEW - structured)
  hasFreeEvent: boolean;
  freeEventType: FreeEventType;
  freeEventDate: string;
  freeEventTime: string;
  freeEventPhase: FreeEventPhase | '';
  
  // Step 3: Offer Details (Q7-Q10) - ENHANCED
  name: string;
  pricePoint: number | null;           // Legacy - kept for migration
  hasPaymentPlan: boolean;             // Legacy - kept for migration
  paymentPlanDetails: string;          // Legacy - kept for migration
  idealCustomer: string;
  mainBonus: string;                   // Legacy - kept for migration
  bonusStack: BonusItem[];
  hasLimitations: HasLimitations | '';
  limitationDetails: string;
  spotLimit: number | null;
  offerGoal: number | null;
  
  // NEW: Enhanced pricing structure
  offerPricing: OfferPricing;
  offerStack: OfferStack;
  
  // NEW: Free event deep planning
  freeEventDetails: FreeEventDetails;
  
  // Step 4: Pre-Launch Strategy (Q11-Q13)
  mainReachMethod: MainReachMethod | '';
  socialPlatform: string;
  combinationDetails: string;
  contentCreationStatus: ContentCreationStatus | '';
  contentVolume: ContentVolume | '';
  customPreLaunchItems: string[]; // User's custom checklist items
  
  // Email Sequences & Automations
  emailSequenceTypes: EmailSequenceTypes; // Legacy - kept for backward compatibility
  emailSequences: EmailSequenceItem[]; // NEW - with status tracking
  customEmailSequences: string[]; // Legacy
  automationTypes: AutomationTypes;
  
  // Sales Page Status (NEW)
  salesPageStatus: SalesPageStatus;
  salesPageDeadline: string;
  
  // Testimonials (NEW)
  testimonialStatus: TestimonialStatus;
  testimonialGoal: number;
  testimonialDeadline: string;
  customAutomations: string[];
  
  // Step 5: Launch Week Strategy (Q14-Q16)
  launchMethod: LaunchMethod | '';
  otherLaunchMethod: string; // Custom method for 'other'
  offerFrequency: OfferFrequency | '';
  otherOfferFrequency: string; // Custom frequency for 'other'
  liveComponent: LiveComponent | '';
  otherLiveComponent: string; // Custom live component for 'other'
  liveEventDetails: LaunchLiveEvent[];
  
  // Step 6: Post-Launch Strategy (Q17-Q18)
  promotionDuration: PromotionDuration | '';
  otherPromotionDuration: string; // Custom duration for 'other'
  followUpWillingness: FollowUpWillingness | '';
  otherFollowUpWillingness: string; // Custom follow-up for 'other'
  debriefDate: string;
  
  // Step 7: Contingency Planning (Q19-Q21)
  biggestFears: BiggestFear[];
  zeroSalesMeaning: ZeroSalesMeaning | '';
  zeroSalesPlan: ZeroSalesPlan | '';
  
  // Step 8: THE GAP Check (Q22-Q23) - conditional
  gapOverlapDetected: boolean;
  gapAcknowledged: boolean;
  gapSupportType: GapSupportType | '';
  gapResponse: 'continue' | 'adjust-dates' | 'add-support' | ''; // NEW - user's GAP choice
  
  // Step 9: Review & Complete (Q24-Q25)
  readinessScore: number;
  whatYouNeed: WhatYouNeed | '';
  
  // Calculated fields
  salesNeeded: number;
  
  // Index signature for Record<string, unknown> compatibility
  [key: string]: unknown;
}

// ============== Default Values ==============
export const DEFAULT_LAUNCH_V2_DATA: LaunchWizardV2Data = {
  // Step 1
  launchExperience: '',
  previousLaunchLearnings: '',
  whatWentWell: '',
  whatToImprove: '',
  offerType: '',
  otherOfferType: '',
  emailListStatus: '',
  
  // Step 1b: Launch Style (NEW)
  launchStyle: '',
  challengeConfig: DEFAULT_CHALLENGE_CONFIG,
  webinarConfig: DEFAULT_WEBINAR_CONFIG,
  flashSaleConfig: DEFAULT_FLASH_SALE_CONFIG,
  betaLaunchConfig: DEFAULT_BETA_LAUNCH_CONFIG,
  masterclassConfig: DEFAULT_MASTERCLASS_CONFIG,
  launchTimeline: '',
  otherLaunchTimeline: '',
  cartOpensDate: '',
  cartClosesDate: '',
  revenueGoalTier: '',
  customRevenueGoal: null,
  
  // Step 2b: Phase Timeline (NEW)
  runwayStartDate: '',
  runwayEndDate: '',
  preLaunchStartDate: '',
  preLaunchEndDate: '',
  postLaunchEndDate: '',
  useCustomTimeline: false,
  
  // Step 2c: Free Event (NEW)
  hasFreeEvent: false,
  freeEventType: '',
  freeEventDate: '',
  freeEventTime: '',
  freeEventPhase: '',
  
  // Step 3 - Enhanced Offer Details
  name: '',
  pricePoint: null,
  hasPaymentPlan: false,
  paymentPlanDetails: '',
  idealCustomer: '',
  mainBonus: '', // Legacy
  bonusStack: [],
  hasLimitations: '',
  limitationDetails: '',
  spotLimit: null,
  offerGoal: null,
  
  // NEW: Enhanced pricing structure
  offerPricing: DEFAULT_OFFER_PRICING,
  offerStack: DEFAULT_OFFER_STACK,
  
  // NEW: Free event deep planning
  freeEventDetails: DEFAULT_FREE_EVENT_DETAILS,
  
  // Step 4
  mainReachMethod: '',
  socialPlatform: '',
  combinationDetails: '',
  contentCreationStatus: '',
  customPreLaunchItems: [],
  contentVolume: '',
  
  // Email Sequences & Automations
  emailSequenceTypes: {
    warmUp: false,
    launch: false,
    cartClose: false,
    postPurchase: false,
  },
  emailSequences: [], // NEW - with status tracking
  customEmailSequences: [],
  automationTypes: {
    tagging: false,
    abandonedCart: false,
    purchaseConfirmation: false,
    waitlistToSales: false,
    deadlineUrgency: false,
    leadMagnetDelivery: false,
  },
  customAutomations: [],
  
  // Sales Page Status (NEW)
  salesPageStatus: 'needs-creation',
  salesPageDeadline: '',
  
  // Testimonials (NEW)
  testimonialStatus: 'none',
  testimonialGoal: 5,
  testimonialDeadline: '',
  
  // Step 5
  launchMethod: '',
  otherLaunchMethod: '',
  offerFrequency: '',
  otherOfferFrequency: '',
  liveComponent: '',
  otherLiveComponent: '',
  liveEventDetails: [],
  
  // Step 6
  promotionDuration: '',
  otherPromotionDuration: '',
  followUpWillingness: '',
  otherFollowUpWillingness: '',
  debriefDate: '',
  
  // Step 7
  biggestFears: [],
  zeroSalesMeaning: '',
  zeroSalesPlan: '',
  
  // Step 8
  gapOverlapDetected: false,
  gapAcknowledged: false,
  gapSupportType: '',
  gapResponse: '',
  
  // Step 9
  readinessScore: 5,
  whatYouNeed: '',
  
  // Calculated
  salesNeeded: 0,
};

// ============== Option Arrays for UI ==============

export const LAUNCH_EXPERIENCE_OPTIONS = [
  { value: 'first-time', label: 'First time launching ever', description: 'This is your debut! We\'ll give you extra guidance.' },
  { value: 'launched-before', label: 'I\'ve launched before (6+ months ago)', description: 'You have some experience. Let\'s build on it.' },
  { value: 'launched-recently', label: 'I\'ve launched recently (last 90 days)', description: 'You\'re in launch mode! Let\'s keep the momentum.' },
] as const;

export const OFFER_TYPE_OPTIONS = [
  { value: 'course', label: 'Course/Program', icon: '📚' },
  { value: 'coaching', label: 'Coaching/Service', icon: '🎯' },
  { value: 'product', label: 'Product (digital or physical)', icon: '📦' },
  { value: 'membership', label: 'Membership', icon: '🔑' },
  { value: 'other', label: 'Other', icon: '✨' },
] as const;

export const EMAIL_LIST_STATUS_OPTIONS = [
  { value: 'comfortable', label: 'Yes, and I\'m comfortable with the size', color: 'green' },
  { value: 'small-nervous', label: 'Yes, but it\'s small and I\'m nervous', color: 'yellow' },
  { value: 'starting-zero', label: 'No, I\'m starting from zero', color: 'red' },
  { value: 'building', label: 'Building it as I go', color: 'blue' },
  { value: 'not-using-email', label: "I'm not using email for this launch", color: 'gray' },
] as const;

export const LAUNCH_STYLE_OPTIONS = [
  { 
    value: 'standard', 
    label: 'Standard Launch', 
    description: 'Cart open → Cart close with email sequence',
    icon: '🚀',
    suggestedTimeline: '3-4-weeks',
  },
  { 
    value: 'challenge', 
    label: 'Challenge Launch', 
    description: 'Multi-day challenge leading to your offer',
    icon: '🎯',
    suggestedTimeline: '3-4-weeks',
  },
  { 
    value: 'webinar', 
    label: 'Webinar Launch', 
    description: 'Free training with pitch at the end',
    icon: '🎥',
    suggestedTimeline: '3-4-weeks',
  },
  { 
    value: 'masterclass', 
    label: 'Masterclass', 
    description: 'Multi-day deep training event',
    icon: '🎓',
    suggestedTimeline: '5-6-weeks',
  },
  { 
    value: 'flash-sale', 
    label: 'Flash Sale', 
    description: 'Quick 24-72 hour promotional sale',
    icon: '⚡',
    suggestedTimeline: '2-weeks',
  },
  { 
    value: 'beta', 
    label: 'Beta Launch', 
    description: 'Test product at discount, gather feedback',
    icon: '🧪',
    suggestedTimeline: '3-4-weeks',
  },
  { 
    value: 'evergreen', 
    label: 'Evergreen Funnel', 
    description: 'Always available, automated sequence',
    icon: '🌲',
    suggestedTimeline: 'other',
  },
  { 
    value: 'other', 
    label: 'Other', 
    description: "I'll configure this manually",
    icon: '✨',
    suggestedTimeline: '3-4-weeks',
  },
] as const;

export const LAUNCH_TIMELINE_OPTIONS = [
  { value: '2-weeks', label: '2 weeks (short sprint)', description: 'Fast & intense. Best for warm audiences.' },
  { value: '3-4-weeks', label: '3-4 weeks (standard launch)', description: 'Classic launch timing. Good balance.' },
  { value: '5-6-weeks', label: '5-6 weeks (extended)', description: 'More time to nurture. Good for cold audiences.' },
  { value: 'other', label: 'Other', description: 'I have a different timeline in mind.' },
] as const;

export const REVENUE_GOAL_TIER_OPTIONS = [
  { value: 'first-sale', label: 'Just get my first sale ($0 → $500)', color: 'green' },
  { value: '500-1000', label: 'Make $500-$1,000', color: 'blue' },
  { value: '1000-2500', label: 'Make $1,000-$2,500', color: 'purple' },
  { value: '2500-plus', label: 'Make $2,500+', color: 'gold' },
  { value: 'testing', label: 'I\'m just testing/getting experience', color: 'gray' },
  { value: 'custom', label: 'I have a specific amount in mind', color: 'teal' },
  { value: 'no-goal', label: "I don't have a specific revenue goal for this launch", color: 'gray' },
] as const;

export const HAS_LIMITATIONS_OPTIONS = [
  { value: 'none', label: 'No limitations - anyone can buy' },
  { value: 'existing-clients', label: 'Only existing clients/students' },
  { value: 'limited-spots', label: 'Limited spots available' },
] as const;

export const MAIN_REACH_METHOD_OPTIONS = [
  { value: 'email', label: 'Email list', icon: '📧' },
  { value: 'social', label: 'Social media', icon: '📱' },
  { value: 'direct-outreach', label: 'Direct outreach/conversations', icon: '💬' },
  { value: 'combination', label: 'Combination', icon: '🔗' },
  { value: 'unsure', label: 'Unsure - this is my challenge', icon: '❓' },
] as const;

export const CONTENT_CREATION_STATUS_OPTIONS = [
  { value: 'ready', label: 'Yes, I\'m ready to go', color: 'green' },
  { value: 'partial', label: 'Partially - some content exists', color: 'yellow' },
  { value: 'from-scratch', label: 'No, I need to create from scratch', color: 'red' },
] as const;

export const CONTENT_VOLUME_OPTIONS = [
  { value: 'light', label: 'Light touch (3-5 pieces)', description: 'Minimal but focused' },
  { value: 'medium', label: 'Medium (5-10 pieces)', description: 'Good coverage' },
  { value: 'heavy', label: 'Heavy nurture (10+ pieces)', description: 'Maximum engagement' },
] as const;

export const EMAIL_SEQUENCE_TYPE_OPTIONS = [
  { key: 'warmUp', label: 'Warm-up sequence', description: '3-7 emails to build anticipation' },
  { key: 'launch', label: 'Launch week', description: '5-7 emails announcing your offer' },
  { key: 'cartClose', label: 'Cart close urgency', description: '3 emails for final push' },
  { key: 'postPurchase', label: 'Post-purchase onboarding', description: 'Welcome new buyers' },
] as const;

export const AUTOMATION_TYPE_OPTIONS = [
  { key: 'tagging', label: 'Tagging/segmentation', description: 'Tag buyers, non-buyers, engaged leads' },
  { key: 'abandonedCart', label: 'Abandoned cart sequence', description: 'Follow up on incomplete purchases' },
  { key: 'purchaseConfirmation', label: 'Purchase confirmation sequence', description: 'Order + onboarding emails' },
  { key: 'waitlistToSales', label: 'Waitlist to sales sequence', description: 'Move waitlist to cart open' },
  { key: 'deadlineUrgency', label: 'Deadline/urgency automations', description: 'Cart closing countdown' },
  { key: 'leadMagnetDelivery', label: 'Lead magnet delivery', description: 'Auto-deliver free resources' },
] as const;

export const LAUNCH_METHOD_OPTIONS = [
  { value: 'email-only', label: 'Email sequence to list' },
  { value: 'social-email', label: 'Social media + email combo' },
  { value: 'outreach-email', label: 'Direct outreach/calls + email' },
  { value: 'in-person', label: 'In-person/workshop format' },
  { value: 'combination', label: 'Combination' },
  { value: 'other', label: 'Other' },
] as const;

export const OFFER_FREQUENCY_OPTIONS = [
  { value: 'once', label: 'Once (single email/post)' },
  { value: 'daily', label: 'Daily' },
  { value: 'multiple-daily', label: 'Multiple times per day' },
  { value: 'every-other-day', label: 'Every other day' },
  { value: 'unsure', label: 'Unsure - I need guidance' },
  { value: 'other', label: 'Other' },
] as const;

export const LIVE_COMPONENT_OPTIONS = [
  { value: 'none', label: 'No live element' },
  { value: 'one', label: 'One live call/workshop/event' },
  { value: 'multiple', label: 'Multiple live touchpoints' },
  { value: 'considering', label: 'Thinking about it - not sure yet' },
  { value: 'other', label: 'Other' },
] as const;

export const PROMOTION_DURATION_OPTIONS = [
  { value: '1-week', label: '1 week total' },
  { value: '2-weeks', label: '2 weeks total' },
  { value: 'until-goal', label: 'Until I hit my revenue goal' },
  { value: 'ongoing', label: 'Ongoing sales (not a "launch")' },
  { value: 'unsure', label: 'Not sure' },
  { value: 'other', label: 'Other' },
] as const;

export const FOLLOW_UP_WILLINGNESS_OPTIONS = [
  { value: 'one-email', label: 'One follow-up email for non-buyers' },
  { value: 'multiple-emails', label: 'Multiple follow-ups (3-5 emails)' },
  { value: 'personal-outreach', label: 'Personal outreach to interested people' },
  { value: 'simple', label: 'Keep it simple - just one push' },
  { value: 'unsure', label: 'I don\'t know what\'s normal' },
  { value: 'none-planned', label: 'No follow-up planned for this launch' },
  { value: 'other', label: 'Other' },
] as const;

export const BIGGEST_FEAR_OPTIONS = [
  { value: 'zero-sales', label: 'Nobody will buy / I\'ll get zero sales', icon: '😰' },
  { value: 'waste-time', label: 'I\'ll lose money or waste time', icon: '⏰' },
  { value: 'judgment', label: 'People will judge my offer/pricing', icon: '👀' },
  { value: 'not-ready', label: 'I\'m not ready / something\'s missing', icon: '🤔' },
  { value: 'too-much-demand', label: 'I won\'t be able to keep up with demand', icon: '🔥' },
  { value: 'audience-small', label: 'My audience is too small', icon: '📉' },
  { value: 'too-salesy', label: 'I\'ll seem too salesy/pushy', icon: '🙈' },
  { value: 'no-fear', label: 'I have no fear - bring it on!', icon: '💪' },
] as const;

export const ZERO_SALES_MEANING_OPTIONS = [
  { value: 'offer-problem', label: 'It means something\'s wrong with my offer' },
  { value: 'not-enough-promotion', label: 'It means I didn\'t do enough promotion' },
  { value: 'nobody-wants', label: 'It means nobody wants what I have' },
  { value: 'unsure', label: 'I don\'t know - I haven\'t thought about it' },
  { value: 'just-data', label: 'It\'s just data that helps me improve' },
] as const;

export const ZERO_SALES_PLAN_OPTIONS = [
  { value: 'figure-out-retry', label: 'Figure out what went wrong and try again' },
  { value: 'adjust-relaunch', label: 'Adjust and relaunch immediately' },
  { value: 'take-break', label: 'Take a break and assess' },
  { value: 'no-plan', label: 'I have no plan - this is why I\'m scared' },
  { value: 'unsure', label: 'I\'m not sure' },
] as const;

export const GAP_SUPPORT_TYPE_OPTIONS = [
  { value: 'daily-motivation', label: 'Daily motivation + accountability', description: 'Daily mindset check-in tasks added to your plan' },
  { value: 'mid-week-check', label: 'Mid-week coaching call/check-in', description: 'Reminders to pause and assess how you\'re doing' },
  { value: 'thought-work', label: 'Thought work on limiting beliefs', description: 'CTFAR exercises scheduled during GAP weeks' },
  { value: 'keep-tasks', label: 'Just keep the tasks coming, I can do this', description: 'Standard tasks with no extra support' },
  { value: 'decide-later', label: 'I\'ll let you know when I get there', description: 'We\'ll check in when you reach THE GAP' },
] as const;

export const GAP_RESPONSE_OPTIONS = [
  { value: 'continue', label: 'I understand the risk - continue with these dates', icon: '✓' },
  { value: 'adjust-dates', label: 'Adjust my timeline to avoid THE GAP', icon: '📅' },
  { value: 'add-support', label: 'Add extra support tasks (daily mindset check-ins)', icon: '💪' },
] as const;

export const WHAT_YOU_NEED_OPTIONS = [
  { value: 'task-list', label: 'A clear day-by-day task list I can follow', icon: '📋' },
  { value: 'offer-help', label: 'Help with the offer/positioning', icon: '🎯' },
  { value: 'confidence', label: 'Confidence that this will work', icon: '💪' },
  { value: 'accountability', label: 'Just hold me accountable', icon: '🤝' },
  { value: 'nothing', label: 'Nothing - I\'m ready to go', icon: '🚀' },
] as const;

// ============== Free Event Options (NEW) ==============
export const FREE_EVENT_TYPE_OPTIONS = [
  { value: 'webinar', label: 'Webinar', icon: '🎥', description: 'Live presentation with Q&A' },
  { value: 'workshop', label: 'Workshop', icon: '🛠️', description: 'Hands-on training session' },
  { value: 'challenge', label: 'Challenge', icon: '🎯', description: 'Multi-day challenge event' },
  { value: 'masterclass', label: 'Masterclass', icon: '🎓', description: 'Deep-dive teaching session' },
] as const;

export const FREE_EVENT_PHASE_OPTIONS = [
  { value: 'runway', label: 'During Runway', description: 'Warm them up early (before you announce)' },
  { value: 'pre-launch', label: 'During Pre-Launch', description: 'Final push before cart opens (recommended)' },
  { value: 'cart-open', label: 'During Cart Open', description: 'Maximize attendance while cart is open' },
] as const;

// ============== Fear to CTFAR Prompts ==============
export const FEAR_THOUGHT_MAP: Record<BiggestFear, string> = {
  'zero-sales': 'Nobody is going to buy and I\'ll embarrass myself',
  'waste-time': 'I\'ll spend all this time and have nothing to show for it',
  'judgment': 'People will think my price is too high or my offer is bad',
  'not-ready': 'I\'m missing something important and I\'ll fail because of it',
  'too-much-demand': 'I won\'t be able to handle the success if it comes',
  'audience-small': 'My audience is too small to make any meaningful sales',
  'too-salesy': 'I\'ll annoy people and they\'ll unsubscribe or unfollow me',
  'no-fear': 'I\'m ready for whatever happens',
};

export const FEAR_FEELING_MAP: Record<BiggestFear, string> = {
  'zero-sales': 'anxious, afraid',
  'waste-time': 'worried, hesitant',
  'judgment': 'vulnerable, exposed',
  'not-ready': 'uncertain, unprepared',
  'too-much-demand': 'overwhelmed, nervous',
  'audience-small': 'discouraged, doubtful',
  'too-salesy': 'uncomfortable, guilty',
  'no-fear': 'confident, excited',
};

// ============== Readiness Messages ==============
export const READINESS_MESSAGES = {
  low: "You don't have to feel ready. You're going to do this anyway. Let's make a plan.",
  medium: "You're in the zone. Let's do this.",
  high: "Let's go. You've got this.",
} as const;

export function getReadinessMessage(score: number): string {
  if (score <= 5) return READINESS_MESSAGES.low;
  if (score <= 7) return READINESS_MESSAGES.medium;
  return READINESS_MESSAGES.high;
}

// ============== Teaching Content ==============
export const TEACHING_CONTENT = {
  firstTimeLauncher: "Your first launch is about LEARNING, not revenue. Success = you launched. Everything else is bonus data.",
  experiencedLauncher: "You know the drill. Let's refine your system and make this one even better.",
  
  zeroSalesMeaning: {
    'offer-problem': "Your offer can be improved. That's learnable. Every great offer started as a mediocre one.",
    'not-enough-promotion': "Most launches under-promote by 10x. The good news? You can fix that right now.",
    'nobody-wants': "This belief is almost never true. Let's reframe it: maybe they just didn't see it, or it wasn't the right time.",
    'unsure': "Not knowing is okay. That's why we plan for multiple scenarios.",
    'just-data': "Great mindset! You're ready to learn from whatever happens.",
  },
} as const;
