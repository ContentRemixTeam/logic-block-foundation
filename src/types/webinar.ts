// Webinar/Masterclass Planner Wizard Types

export type WebinarEventType = 'webinar' | 'masterclass' | 'workshop' | 'training';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';
export type OfferTiming = 'first-10' | 'middle' | 'last-15' | 'last-20' | 'throughout';
export type ContentStyle = 'teaching' | 'demo' | 'qa' | 'hybrid';
export type EmailStatus = 'existing' | 'need-to-create';
export type BonusDeadline = '24h' | '48h' | '72h' | 'end-of-week';

export type WebinarPlatform = 
  | 'zoom'
  | 'webinarjam'
  | 'demio'
  | 'streamyard'
  | 'crowdcast'
  | 'gotowebinar'
  | 'other';

export type RegistrationPlatform =
  | 'same'
  | 'convertkit'
  | 'leadpages'
  | 'kajabi'
  | 'systeme'
  | 'other';

export interface ContentOutlineItem {
  id: string;
  title: string;
  duration: number; // minutes
  type: 'teaching' | 'demo' | 'story' | 'exercise' | 'transition';
}

export interface WebinarWizardData {
  // Step 1: Event Basics
  name: string;
  eventType: WebinarEventType;
  topic: string;
  description: string;
  eventDate: string;
  eventTime: string;
  timezone: string;
  durationMinutes: number;
  isLive: boolean;
  hasReplay: boolean;
  replayDurationHours: number;
  
  // Step 2: Target Audience
  idealAttendee: string;
  mainProblem: string;
  transformation: string;
  experienceLevel: ExperienceLevel;
  
  // Step 3: Content Structure
  contentOutline: ContentOutlineItem[];
  offerTiming: OfferTiming;
  contentStyle: ContentStyle;
  includeQa: boolean;
  qaDurationMinutes: number;
  
  // Step 4: Tech Setup
  platform: WebinarPlatform;
  registrationPlatform: RegistrationPlatform;
  registrationUrl: string;
  hasPracticeRun: boolean;
  practiceDate: string;
  
  // Step 5: Registration Flow
  registrationOpenDate: string;
  registrationHeadline: string;
  registrationBullets: string[];
  confirmationEmailStatus: EmailStatus;
  reminderSequenceCount: number;
  
  // Step 6: Offer/Pitch
  offerName: string;
  offerPrice: number;
  offerDescription: string;
  hasAttendeeBonus: boolean;
  attendeeBonusDescription: string;
  attendeeBonusDeadline: BonusDeadline;
  hasPaymentPlan: boolean;
  paymentPlanDetails: string;
  salesPageUrl: string;
  checkoutUrl: string;
  
  // Step 7: Follow-up Sequence
  followupSequenceLength: number;
  replayAccessHours: number;
  cartCloseDate: string;
  followupEmailStatus: EmailStatus;
  
  // Step 8: Goals & Task toggles
  registrationGoal: number;
  showUpGoalPercent: number;
  conversionGoalPercent: number;
  selectedTasks: Record<string, boolean>;
  
  // Index signature for useWizard compatibility
  [key: string]: unknown;
}

export const WEBINAR_EVENT_TYPES: { value: WebinarEventType; label: string; description: string }[] = [
  { value: 'webinar', label: 'Webinar', description: 'Classic online presentation with Q&A' },
  { value: 'masterclass', label: 'Masterclass', description: 'Deep-dive training on a specific topic' },
  { value: 'workshop', label: 'Workshop', description: 'Interactive session with exercises' },
  { value: 'training', label: 'Training', description: 'Step-by-step instructional session' },
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all', label: 'All Levels' },
];

export const WEBINAR_PLATFORMS: { value: WebinarPlatform; label: string }[] = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'webinarjam', label: 'WebinarJam' },
  { value: 'demio', label: 'Demio' },
  { value: 'streamyard', label: 'StreamYard' },
  { value: 'crowdcast', label: 'Crowdcast' },
  { value: 'gotowebinar', label: 'GoToWebinar' },
  { value: 'other', label: 'Other' },
];

export const REGISTRATION_PLATFORMS: { value: RegistrationPlatform; label: string }[] = [
  { value: 'same', label: 'Same as webinar platform' },
  { value: 'convertkit', label: 'ConvertKit' },
  { value: 'leadpages', label: 'Leadpages' },
  { value: 'kajabi', label: 'Kajabi' },
  { value: 'systeme', label: 'Systeme.io' },
  { value: 'other', label: 'Other' },
];

export const OFFER_TIMING_OPTIONS: { value: OfferTiming; label: string; description: string }[] = [
  { value: 'first-10', label: 'Early Mention', description: 'Briefly mention offer in first 10 minutes' },
  { value: 'middle', label: 'Middle Transition', description: 'Natural segue to offer mid-presentation' },
  { value: 'last-15', label: 'Final 15 Minutes', description: 'Classic pitch at the end' },
  { value: 'last-20', label: 'Final 20 Minutes', description: 'Extended pitch section' },
  { value: 'throughout', label: 'Woven Throughout', description: 'Soft mentions throughout + final pitch' },
];

export const CONTENT_STYLES: { value: ContentStyle; label: string }[] = [
  { value: 'teaching', label: 'Teaching/Education' },
  { value: 'demo', label: 'Live Demo/Walkthrough' },
  { value: 'qa', label: 'Q&A Focused' },
  { value: 'hybrid', label: 'Hybrid (Mix of styles)' },
];

export const BONUS_DEADLINES: { value: BonusDeadline; label: string }[] = [
  { value: '24h', label: '24 hours after webinar' },
  { value: '48h', label: '48 hours after webinar' },
  { value: '72h', label: '72 hours after webinar' },
  { value: 'end-of-week', label: 'End of the week' },
];

export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export const DEFAULT_WEBINAR_DATA: WebinarWizardData = {
  // Step 1
  name: '',
  eventType: 'webinar',
  topic: '',
  description: '',
  eventDate: '',
  eventTime: '12:00',
  timezone: 'America/New_York',
  durationMinutes: 60,
  isLive: true,
  hasReplay: true,
  replayDurationHours: 48,
  
  // Step 2
  idealAttendee: '',
  mainProblem: '',
  transformation: '',
  experienceLevel: 'all',
  
  // Step 3
  contentOutline: [],
  offerTiming: 'last-15',
  contentStyle: 'teaching',
  includeQa: true,
  qaDurationMinutes: 15,
  
  // Step 4
  platform: 'zoom',
  registrationPlatform: 'same',
  registrationUrl: '',
  hasPracticeRun: true,
  practiceDate: '',
  
  // Step 5
  registrationOpenDate: '',
  registrationHeadline: '',
  registrationBullets: ['', '', ''],
  confirmationEmailStatus: 'need-to-create',
  reminderSequenceCount: 3,
  
  // Step 6
  offerName: '',
  offerPrice: 0,
  offerDescription: '',
  hasAttendeeBonus: false,
  attendeeBonusDescription: '',
  attendeeBonusDeadline: '48h',
  hasPaymentPlan: false,
  paymentPlanDetails: '',
  salesPageUrl: '',
  checkoutUrl: '',
  
  // Step 7
  followupSequenceLength: 5,
  replayAccessHours: 48,
  cartCloseDate: '',
  followupEmailStatus: 'need-to-create',
  
  // Step 8
  registrationGoal: 100,
  showUpGoalPercent: 30,
  conversionGoalPercent: 5,
  selectedTasks: {},
};

// Validation helper
export function validateWebinarStep(step: number, data: WebinarWizardData): boolean {
  // Allow navigation between steps without strict validation
  return true;
}

// Task generation phases
export const WEBINAR_TASK_PHASES = {
  planning: 'Planning Phase',
  content: 'Content Creation Phase',
  tech: 'Tech Setup Phase',
  registration: 'Registration Phase',
  promotion: 'Promotion Phase',
  event: 'Event Day Phase',
  followup: 'Follow-up Phase',
} as const;

export interface WebinarTask {
  id: string;
  phase: string;
  title: string;
  description: string;
  daysFromEvent: number; // negative = before event, positive = after
  isContent?: boolean;
  contentType?: string;
}

// Generate tasks based on wizard data
export function getDefaultWebinarTasks(data: WebinarWizardData): WebinarTask[] {
  const tasks: WebinarTask[] = [];
  const eventType = data.eventType || 'webinar';
  const capitalizedType = eventType.charAt(0).toUpperCase() + eventType.slice(1);

  // Planning Phase (14-10 days before)
  tasks.push(
    { id: 'define-topic', phase: 'planning', title: `Define ${eventType} topic and outcomes`, description: 'Clarify the core transformation and key takeaways', daysFromEvent: -14 },
    { id: 'create-outline', phase: 'planning', title: 'Create content outline', description: 'Map out the teaching points and flow', daysFromEvent: -13 },
    { id: 'define-offer', phase: 'planning', title: 'Define offer and bonuses', description: 'Finalize what you\'ll pitch and attendee incentives', daysFromEvent: -12 },
  );

  // Content Creation Phase (10-7 days before)
  tasks.push(
    { id: 'create-slides', phase: 'content', title: 'Create presentation slides', description: 'Design slides for your teaching content', daysFromEvent: -10 },
    { id: 'write-script', phase: 'content', title: 'Write presentation script/notes', description: 'Outline what you\'ll say at each point', daysFromEvent: -9 },
    { id: 'create-pitch', phase: 'content', title: 'Create pitch/offer slides', description: 'Design the sales portion of your presentation', daysFromEvent: -8, isContent: true, contentType: 'sales-page' },
  );

  // Tech Setup Phase (7-5 days before)
  tasks.push(
    { id: 'setup-platform', phase: 'tech', title: `Set up ${data.platform || 'webinar'} room`, description: 'Configure your webinar platform settings', daysFromEvent: -7 },
    { id: 'setup-registration', phase: 'tech', title: 'Set up registration page', description: 'Create and publish your opt-in page', daysFromEvent: -7 },
    { id: 'connect-email', phase: 'tech', title: 'Connect email automation', description: 'Set up confirmation and reminder sequences', daysFromEvent: -6 },
    { id: 'test-tech', phase: 'tech', title: 'Test all tech and links', description: 'Run through entire flow as a registrant', daysFromEvent: -5 },
  );

  if (data.hasPracticeRun) {
    tasks.push({ id: 'practice-run', phase: 'tech', title: 'Conduct practice run', description: 'Full rehearsal of your presentation', daysFromEvent: -3 });
  }

  // Registration Phase (7-1 days before)
  tasks.push(
    { id: 'write-reg-page', phase: 'registration', title: 'Write registration page copy', description: 'Headlines, bullets, and CTA for sign-ups', daysFromEvent: -7, isContent: true, contentType: 'landing-page' },
    { id: 'write-confirmation', phase: 'registration', title: 'Write confirmation email', description: 'Thank you email with event details', daysFromEvent: -6, isContent: true, contentType: 'email' },
  );

  // Add reminder emails based on count
  for (let i = 1; i <= data.reminderSequenceCount; i++) {
    const daysOffset = i === 1 ? -3 : i === 2 ? -1 : 0;
    tasks.push({
      id: `write-reminder-${i}`,
      phase: 'registration',
      title: `Write reminder email ${i}`,
      description: `Reminder ${i} of ${data.reminderSequenceCount}`,
      daysFromEvent: -6 + i,
      isContent: true,
      contentType: 'email',
    });
  }

  // Promotion Phase (7-1 days before)
  tasks.push(
    { id: 'create-promo-graphics', phase: 'promotion', title: 'Create promo graphics', description: 'Social images to promote registration', daysFromEvent: -7 },
    { id: 'write-promo-1', phase: 'promotion', title: 'Write promo post #1 (Announcement)', description: 'First social post about your event', daysFromEvent: -6, isContent: true, contentType: 'social' },
    { id: 'write-promo-2', phase: 'promotion', title: 'Write promo post #2 (Problem)', description: 'Address the pain point you\'ll solve', daysFromEvent: -4, isContent: true, contentType: 'social' },
    { id: 'write-promo-3', phase: 'promotion', title: 'Write promo post #3 (Last Call)', description: 'Final reminder to register', daysFromEvent: -1, isContent: true, contentType: 'social' },
  );

  // Event Day Phase
  tasks.push(
    { id: 'final-prep', phase: 'event', title: 'Final event prep', description: 'Check tech, water, lighting, notes ready', daysFromEvent: 0 },
    { id: 'go-live', phase: 'event', title: `Go live: ${capitalizedType}`, description: 'Deliver your presentation!', daysFromEvent: 0 },
    { id: 'post-event', phase: 'event', title: 'Post-event tasks', description: 'Save recording, note questions asked', daysFromEvent: 0 },
  );

  // Follow-up Phase (1-7 days after)
  if (data.hasReplay) {
    tasks.push({ id: 'upload-replay', phase: 'followup', title: 'Upload and share replay', description: 'Make recording available to registrants', daysFromEvent: 1 });
  }

  tasks.push({ id: 'write-replay-email', phase: 'followup', title: 'Write replay email', description: 'Send replay link with offer reminder', daysFromEvent: 1, isContent: true, contentType: 'email' });

  // Add follow-up emails based on sequence length
  for (let i = 1; i <= data.followupSequenceLength; i++) {
    tasks.push({
      id: `write-followup-${i}`,
      phase: 'followup',
      title: `Write follow-up email ${i}`,
      description: `Follow-up ${i} of ${data.followupSequenceLength} in your cart sequence`,
      daysFromEvent: 1 + i,
      isContent: true,
      contentType: 'email',
    });
  }

  tasks.push({ id: 'cart-close', phase: 'followup', title: 'Cart close / bonus deadline', description: 'Final deadline for special offer', daysFromEvent: data.replayAccessHours / 24 + 1 });

  return tasks;
}
