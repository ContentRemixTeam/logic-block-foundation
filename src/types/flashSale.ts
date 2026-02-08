/**
 * Flash Sale Wizard Types
 * Quick-launch sale wizard with urgency timers and email sequences
 */

export interface FlashSaleWizardData extends Record<string, unknown> {
  // Step 1: The Sale
  saleName: string;
  productName: string;
  productId: string;
  originalPrice: number | null;
  salePrice: number | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number | null;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  saleDuration: 'flash-24h' | 'flash-48h' | 'flash-72h' | 'weekend' | 'custom';

  // Step 2: Urgency Strategy
  urgencyType: 'countdown' | 'limited-quantity' | 'early-bird' | 'flash-bonus' | 'combo';
  limitedQuantity: number | null;
  earlyBirdHours: number | null;
  earlyBirdBonus: string;
  flashBonus: string;
  flashBonusDeadlineHours: number | null;
  scarcityMessage: string;

  // Step 3: Target Audience
  targetAudience: string;
  painPoints: string[];
  whyNow: string;
  objections: string[];

  // Step 4: Email Sequence
  emailSequenceType: 'minimal' | 'standard' | 'aggressive';
  emailsPlanned: EmailPlan[];
  hasExistingList: boolean;
  listSize: string;

  // Step 5: Sales Copy
  headline: string;
  subheadline: string;
  urgencyHook: string;
  bullets: string[];
  cta: string;

  // Step 6: Promotion Plan
  promotionPlatforms: string[];
  promotionSchedule: PromotionItem[];
  useAds: boolean;
  adBudget: number | null;

  // Step 7: Review
  tasksEnabled: Record<string, boolean>;
}

export interface EmailPlan {
  id: string;
  type: 'announcement' | 'reminder' | 'last-chance' | 'final-hours' | 'closed' | 'early-bird';
  name: string;
  sendTime: string; // relative to sale start/end
  sendTimeLabel: string;
  subject: string;
  enabled: boolean;
}

export interface PromotionItem {
  id: string;
  platform: string;
  type: 'post' | 'story' | 'reel' | 'live' | 'email';
  scheduledFor: string;
  content: string;
}

export const SALE_DURATIONS = [
  { value: 'flash-24h', label: '24-Hour Flash Sale', hours: 24 },
  { value: 'flash-48h', label: '48-Hour Sale', hours: 48 },
  { value: 'flash-72h', label: '72-Hour Sale', hours: 72 },
  { value: 'weekend', label: 'Weekend Sale (Fri-Sun)', hours: 72 },
  { value: 'custom', label: 'Custom Duration', hours: 0 },
] as const;

export const URGENCY_TYPES = [
  { value: 'countdown', label: 'Countdown Timer', description: 'Classic urgency with live countdown' },
  { value: 'limited-quantity', label: 'Limited Quantity', description: 'Only X spots/units available' },
  { value: 'early-bird', label: 'Early Bird Bonus', description: 'Extra bonus for first X hours' },
  { value: 'flash-bonus', label: 'Disappearing Bonus', description: 'Bonus expires before sale ends' },
  { value: 'combo', label: 'Combo (Timer + Bonus)', description: 'Maximum urgency stack' },
] as const;

export const EMAIL_SEQUENCE_TYPES = {
  minimal: {
    label: 'Minimal (3 emails)',
    description: 'Announcement, reminder, last chance',
    emails: ['announcement', 'reminder', 'last-chance'],
  },
  standard: {
    label: 'Standard (5 emails)',
    description: 'Full sequence with early bird',
    emails: ['announcement', 'early-bird', 'reminder', 'last-chance', 'final-hours'],
  },
  aggressive: {
    label: 'Aggressive (7 emails)',
    description: 'Maximum touchpoints for short sales',
    emails: ['announcement', 'early-bird', 'reminder', 'midpoint', 'last-chance', 'final-hours', 'closed'],
  },
} as const;

export const DEFAULT_FLASH_SALE_DATA: FlashSaleWizardData = {
  saleName: '',
  productName: '',
  productId: '',
  originalPrice: null,
  salePrice: null,
  discountType: 'percentage',
  discountValue: null,
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '23:59',
  timezone: 'America/New_York',
  saleDuration: 'flash-48h',
  urgencyType: 'countdown',
  limitedQuantity: null,
  earlyBirdHours: null,
  earlyBirdBonus: '',
  flashBonus: '',
  flashBonusDeadlineHours: null,
  scarcityMessage: '',
  targetAudience: '',
  painPoints: [],
  whyNow: '',
  objections: [],
  emailSequenceType: 'standard',
  emailsPlanned: [],
  hasExistingList: true,
  listSize: '',
  headline: '',
  subheadline: '',
  urgencyHook: '',
  bullets: [],
  cta: 'Get It Now',
  promotionPlatforms: [],
  promotionSchedule: [],
  useAds: false,
  adBudget: null,
  tasksEnabled: {},
};

export const STEP_TITLES = [
  'The Sale',
  'Urgency Strategy',
  'Target Audience',
  'Email Sequence',
  'Sales Copy',
  'Promotion Plan',
  'Review & Launch',
] as const;

export const TOTAL_STEPS = 7;

export interface FlashSaleTask {
  id: string;
  phase: 'pre-sale' | 'during-sale' | 'post-sale';
  title: string;
  type: 'setup' | 'email' | 'social' | 'ads' | 'tracking';
  scheduledDate: string;
  contentType?: string;
  enabled: boolean;
}

export function generateFlashSaleTasks(data: FlashSaleWizardData): FlashSaleTask[] {
  const tasks: FlashSaleTask[] = [];
  const startDate = new Date(`${data.startDate}T${data.startTime}`);
  const endDate = new Date(`${data.endDate}T${data.endTime}`);
  
  // Pre-sale setup (2 days before)
  const preSaleDate = new Date(startDate);
  preSaleDate.setDate(preSaleDate.getDate() - 2);
  
  tasks.push({
    id: 'setup-page',
    phase: 'pre-sale',
    title: 'Set up sales page with countdown timer',
    type: 'setup',
    scheduledDate: preSaleDate.toISOString().split('T')[0],
    enabled: true,
  });
  
  tasks.push({
    id: 'setup-checkout',
    phase: 'pre-sale',
    title: 'Configure discount code / checkout',
    type: 'setup',
    scheduledDate: preSaleDate.toISOString().split('T')[0],
    enabled: true,
  });

  // Email tasks based on sequence
  data.emailsPlanned.forEach((email, index) => {
    if (email.enabled) {
      tasks.push({
        id: `email-${email.type}`,
        phase: email.type === 'closed' ? 'post-sale' : 'during-sale',
        title: `Write & schedule: ${email.name}`,
        type: 'email',
        scheduledDate: preSaleDate.toISOString().split('T')[0],
        contentType: 'email',
        enabled: true,
      });
    }
  });

  // Social promo tasks
  if (data.promotionPlatforms.length > 0) {
    tasks.push({
      id: 'social-teaser',
      phase: 'pre-sale',
      title: 'Create teaser post (sale coming soon)',
      type: 'social',
      scheduledDate: preSaleDate.toISOString().split('T')[0],
      contentType: 'social',
      enabled: true,
    });

    tasks.push({
      id: 'social-announcement',
      phase: 'during-sale',
      title: 'Post sale announcement',
      type: 'social',
      scheduledDate: data.startDate,
      contentType: 'social',
      enabled: true,
    });

    tasks.push({
      id: 'social-reminder',
      phase: 'during-sale',
      title: 'Post sale reminder (halfway)',
      type: 'social',
      scheduledDate: data.startDate,
      contentType: 'social',
      enabled: true,
    });

    tasks.push({
      id: 'social-lastchance',
      phase: 'during-sale',
      title: 'Post last chance reminder',
      type: 'social',
      scheduledDate: data.endDate,
      contentType: 'social',
      enabled: true,
    });
  }

  // Ads tasks
  if (data.useAds) {
    tasks.push({
      id: 'ads-create',
      phase: 'pre-sale',
      title: 'Create retargeting ad for sale',
      type: 'ads',
      scheduledDate: preSaleDate.toISOString().split('T')[0],
      enabled: true,
    });
  }

  // Post-sale
  tasks.push({
    id: 'tracking-results',
    phase: 'post-sale',
    title: 'Log final sales results',
    type: 'tracking',
    scheduledDate: endDate.toISOString().split('T')[0],
    enabled: true,
  });

  tasks.push({
    id: 'debrief',
    phase: 'post-sale',
    title: 'Complete flash sale debrief',
    type: 'tracking',
    scheduledDate: endDate.toISOString().split('T')[0],
    enabled: true,
  });

  return tasks;
}

export function generateEmailSequence(type: 'minimal' | 'standard' | 'aggressive', startDate: string, endDate: string): EmailPlan[] {
  const emails: EmailPlan[] = [];
  const config = EMAIL_SEQUENCE_TYPES[type];
  
  const emailTemplates: Record<string, Omit<EmailPlan, 'id' | 'enabled'>> = {
    announcement: {
      type: 'announcement',
      name: 'Sale Announcement',
      sendTime: 'sale-start',
      sendTimeLabel: 'When sale opens',
      subject: '🚨 Flash Sale: [X]% OFF starts NOW',
    },
    'early-bird': {
      type: 'early-bird',
      name: 'Early Bird Reminder',
      sendTime: 'start+4h',
      sendTimeLabel: '4 hours after start',
      subject: '⏰ Early bird bonus ends in [X] hours',
    },
    reminder: {
      type: 'reminder',
      name: 'Midpoint Reminder',
      sendTime: 'midpoint',
      sendTimeLabel: 'Halfway through sale',
      subject: "Don't forget: [X]% OFF ends soon",
    },
    midpoint: {
      type: 'reminder',
      name: 'Social Proof Update',
      sendTime: 'midpoint+4h',
      sendTimeLabel: '4 hours after midpoint',
      subject: '[X] people already grabbed this...',
    },
    'last-chance': {
      type: 'last-chance',
      name: 'Last Chance',
      sendTime: 'end-12h',
      sendTimeLabel: '12 hours before end',
      subject: '⚡ LAST CHANCE: Sale ends tomorrow',
    },
    'final-hours': {
      type: 'final-hours',
      name: 'Final Hours',
      sendTime: 'end-3h',
      sendTimeLabel: '3 hours before end',
      subject: '🔥 3 HOURS LEFT - Price goes up at midnight',
    },
    closed: {
      type: 'closed',
      name: 'Sale Closed',
      sendTime: 'end+1h',
      sendTimeLabel: '1 hour after end',
      subject: 'The sale is over (but read this)',
    },
  };

  config.emails.forEach((emailType, index) => {
    const template = emailTemplates[emailType];
    if (template) {
      emails.push({
        id: `email-${index}`,
        ...template,
        enabled: true,
      });
    }
  });

  return emails;
}
