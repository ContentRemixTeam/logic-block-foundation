// Business Engine Builder — Types & Constants

export interface EngineBuilderData {
  // Step 1: Discover
  primaryPlatform: string;
  customPlatform: string;
  specificAction: string;
  additionalPlatforms: string[];
  customAdditionalPlatform: string;
  additionalPlatformActions: Record<string, string>;
  
  // Step 2: Nurture
  emailMethod: string;
  customEmailMethod: string;
  secondaryNurture: string;
  customNurture: string;
  secondaryNurtureFrequency: string;
  customNurtureFrequency: string;
  freeTransformation: string;

  // Step 3: Convert
  offerName: string;
  offerPrice: number | null;
  revenueGoal: number | null;
  salesNeeded: number | null;
  secondaryOffers: SecondaryOffer[];
  offerFrequency: string;
  customOfferFrequency: string;
  salesMethods: string[];
  customSalesMethod: string;
  secondaryRevenueSources: string[];
  customRevenueSource: string;
  revenueSourceGrowthGoal: string;
  
  // Step 4: Revenue Loop
  loopLength: string;
  contentPlan: ContentSlot[];
  
  // Step 5: Editorial Calendar
  batchOrLive: string;
  batchFrequency: string;
  batchDay: string;
  leadTimeDays: number;
  weeklySchedule: WeeklySlot[];
  engineFocusArea: string;

  // Save options
  excludedTasks: string[];
  dateOverrides: { taskId: string; newDate: string }[];
  generateTasks: boolean;
  generateContentItems: boolean;
}

export interface ContentSlot {
  week: number;
  type: 'discover' | 'nurture' | 'convert';
  description: string;
}

export interface SecondaryOffer {
  name: string;
  price: string;
}

export interface WeeklySlot {
  day: string;
  activity: string;
  type: 'create' | 'publish' | 'engage';
}

export const DEFAULT_ENGINE_DATA: EngineBuilderData = {
  primaryPlatform: '',
  customPlatform: '',
  specificAction: '',
  additionalPlatforms: [],
  customAdditionalPlatform: '',
  additionalPlatformActions: {},
  emailMethod: 'newsletter',
  customEmailMethod: '',
  secondaryNurture: '',
  customNurture: '',
  secondaryNurtureFrequency: '',
  customNurtureFrequency: '',
  freeTransformation: '',
  offerName: '',
  offerPrice: null,
  revenueGoal: null,
  salesNeeded: null,
  secondaryOffers: [],
  offerFrequency: '',
  customOfferFrequency: '',
  salesMethods: [],
  customSalesMethod: '',
  secondaryRevenueSources: [],
  customRevenueSource: '',
  revenueSourceGrowthGoal: '',
  contentPlan: [],
  loopLength: '',
  batchOrLive: '',
  batchFrequency: '',
  batchDay: '',
  leadTimeDays: 3,
  weeklySchedule: [],
  engineFocusArea: '',
  excludedTasks: [],
  dateOverrides: [],
  generateTasks: true,
  generateContentItems: true,
};

export const TOTAL_STEPS = 5;

export interface StepConfig {
  number: number;
  enginePart: string;
  icon: string;
  funLabel: string;
  title: string;
  emoji: string;
}

export const STEP_CONFIGS: StepConfig[] = [
  { number: 1, enginePart: 'Fuel System', icon: 'Fuel', funLabel: 'Fill Your Tank', title: 'How People Find You', emoji: '⛽' },
  { number: 2, enginePart: 'Engine Block', icon: 'Cog', funLabel: 'Build Your Engine', title: 'How You Stay Connected', emoji: '🔧' },
  { number: 3, enginePart: 'Turbo Boost', icon: 'Zap', funLabel: 'Hit the Gas', title: 'How You Make Money', emoji: '🚀' },
  { number: 4, enginePart: 'Rev Cycle', icon: 'RefreshCw', funLabel: 'Set Your RPM', title: 'Your Revenue Loop', emoji: '🔄' },
  { number: 5, enginePart: 'Race Day', icon: 'Flag', funLabel: 'Plan Your Laps', title: 'Your Weekly Schedule', emoji: '🏁' },
];

export const TRANSITION_MESSAGES = [
  '',
  "Tank's full. Now let's build the engine that keeps you running…",
  "Engine's humming. Time to hit the gas…",
  "You've got power. Let's set your RPM — how often you rev the cycle…",
  "RPM locked in. Let's plan your race days…",
  "🏁 Your engine is built. Here's the blueprint.",
];

export const EMAIL_METHODS = [
  { value: 'newsletter', label: 'Email Newsletter', description: 'Regular emails to your list' },
  { value: 'sequence', label: 'Email Sequence', description: 'Automated drip sequences' },
  { value: 'broadcast', label: 'Email Broadcasts', description: 'One-off targeted emails' },
];

export const SECONDARY_NURTURE_OPTIONS = [
  { value: 'podcast', label: 'Podcast', emoji: '🎙️' },
  { value: 'youtube', label: 'YouTube', emoji: '📺' },
  { value: 'blog', label: 'Blog', emoji: '✍️' },
  { value: 'community', label: 'Free Community', emoji: '👥' },
  { value: 'none', label: 'Just email for now', emoji: '📧' },
];

export const OFFER_FREQUENCIES = [
  { value: 'evergreen', label: 'Evergreen (always available)', emoji: '🌿' },
  { value: 'monthly', label: 'Monthly launches', emoji: '📅' },
  { value: 'quarterly', label: 'Quarterly launches', emoji: '🗓️' },
  { value: 'yearly', label: '1-2x per year', emoji: '🎯' },
];

export const SALES_METHODS = [
  { value: 'sales-page', label: 'Sales Page', emoji: '📄' },
  { value: 'calls', label: 'Sales/Discovery Calls', emoji: '📞' },
  { value: 'webinar', label: 'Webinar/Masterclass', emoji: '🎓' },
  { value: 'email-launch', label: 'Email Launch Sequence', emoji: '📧' },
  { value: 'checkout-link', label: 'Direct Checkout Link', emoji: '🔗' },
  { value: 'limited-time', label: 'Limited-Time Offers', emoji: '⏰' },
  { value: 'challenge-launch', label: 'Challenge/Launch Event', emoji: '🏆' },
];

export const LOOP_LENGTHS = [
  { value: '7-day', label: '7-Day Loop', description: 'Fast cycle — great for evergreen offers', emoji: '⚡' },
  { value: '14-day', label: '14-Day Loop', description: 'Balanced — build trust then offer', emoji: '⚖️' },
  { value: '30-day', label: '30-Day Loop', description: 'Deep nurture — ideal for high-ticket', emoji: '🎯' },
  { value: '90-day', label: '90-Day Loop', description: 'Launch cycle — build up to big events', emoji: '🚀' },
];

export const BATCH_OPTIONS = [
  { value: 'batch', label: 'Batch Create', description: 'Create all content in one sitting', emoji: '📦' },
  { value: 'live', label: 'Create Day-of', description: 'Create content the day you post', emoji: '🔴' },
  { value: 'hybrid', label: 'Hybrid', description: 'Batch some, create some live', emoji: '🔀' },
];

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
