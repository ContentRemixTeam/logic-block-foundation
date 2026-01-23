// Email Campaign Wizard Types

export type EmailGoal = 'nurture' | 'sell' | 'welcome' | 'reengage';
export type EmailAudience = 'cold' | 'warm' | 'customers' | 'event';
export type SendFrequency = 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | 'custom';

export interface EmailCampaignWizardData {
  // Step 1: Goal & Audience
  name: string;
  goal: EmailGoal | '';
  audience: EmailAudience | '';
  emailCount: number;

  // Step 2: Content Reuse
  selectedContentIds: string[];
  emailsToWrite: number;

  // Step 3: Campaign Details
  problemSolved: string;
  transformation: string;
  mainCta: string;
  sendFrequency: SendFrequency | '';
  customFrequency: string;
  offerCount: number;
  startDate: string;
}

export const DEFAULT_EMAIL_CAMPAIGN_DATA: EmailCampaignWizardData = {
  name: '',
  goal: '',
  audience: '',
  emailCount: 5,
  selectedContentIds: [],
  emailsToWrite: 0,
  problemSolved: '',
  transformation: '',
  mainCta: '',
  sendFrequency: '',
  customFrequency: '',
  offerCount: 0,
  startDate: '',
};

export const EMAIL_GOAL_OPTIONS = [
  { value: 'nurture', label: 'Nurture', description: 'Build trust, no selling' },
  { value: 'sell', label: 'Sell something', description: 'Launch sequence with offers' },
  { value: 'welcome', label: 'Welcome new subscribers', description: 'Onboard new people' },
  { value: 'reengage', label: 'Re-engage', description: 'Wake up people who went quiet' },
] as const;

export const EMAIL_AUDIENCE_OPTIONS = [
  { value: 'cold', label: 'Cold leads', description: 'Just found you' },
  { value: 'warm', label: 'Warm leads', description: 'Been on your list a while' },
  { value: 'customers', label: 'Past customers', description: 'Already bought from you' },
  { value: 'event', label: 'Event attendees', description: 'People who attended something' },
] as const;

export const EMAIL_COUNT_OPTIONS = [
  { value: 3, label: '3 emails', description: 'Short sequence' },
  { value: 5, label: '5 emails', description: 'Standard' },
  { value: 7, label: '7 emails', description: 'Deeper dive' },
  { value: 10, label: '10+ emails', description: 'Launch or welcome series' },
] as const;

export const SEND_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_2_days', label: 'Every 2 days' },
  { value: 'every_3_days', label: 'Every 3 days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
] as const;

export const EMAIL_CTA_OPTIONS = [
  { value: 'book_call', label: 'Book a call' },
  { value: 'buy', label: 'Buy a product' },
  { value: 'waitlist', label: 'Join a waitlist' },
  { value: 'reply', label: 'Reply to your email' },
  { value: 'consume', label: 'Consume free content' },
  { value: 'other', label: 'Other' },
] as const;
