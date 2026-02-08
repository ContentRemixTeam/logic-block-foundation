// Lead Magnet Creator Wizard Types

export type LeadMagnetFormat = 
  | 'pdf'
  | 'checklist'
  | 'template'
  | 'workbook'
  | 'video'
  | 'audio'
  | 'quiz'
  | 'resource-list'
  | 'mini-course'
  | 'toolkit'
  | 'other';

export type LandingPagePlatform =
  | 'convertkit'
  | 'flodesk'
  | 'mailchimp'
  | 'leadpages'
  | 'squarespace'
  | 'wordpress'
  | 'stan-store'
  | 'systeme'
  | 'kajabi'
  | 'other';

export type LandingPageStatus = 'existing' | 'need-to-create' | 'platform-default';
export type DeliveryMethod = 'email' | 'redirect' | 'both';
export type SequencePurpose = 'value' | 'soft-sell' | 'discovery-call' | 'paid-offer';
export type SequenceStatus = 'existing' | 'need-to-create';

export type PromotionMethod = 
  | 'social'
  | 'email-list'
  | 'collaborations'
  | 'paid-ads'
  | 'seo-blog'
  | 'podcast'
  | 'direct-outreach'
  | 'combination';

export interface BrainstormIdea {
  title: string;
  format: string;
  hook: string;
  whyItWorks: string;
}

export interface LeadMagnetWizardData {
  // Step 1: Idea
  hasIdea: boolean;
  name: string;
  description: string;
  
  // Brainstorm bot context
  brainstormContext: {
    idealCustomer: string;
    mainProblem: string;
    paidOffer: string;
  };
  generatedIdeas: BrainstormIdea[];
  
  // Step 2: Ideal Subscriber
  idealSubscriber: string;
  mainProblem: string;
  transformation: string;
  platforms: string[];
  
  // Step 3: Format & Deliverables
  format: LeadMagnetFormat;
  estimatedLength: string;
  deliverables: string[];
  hasBonus: boolean;
  bonusDescription: string;
  
  // Step 4: Opt-in Promise
  headline: string;
  subheadline: string;
  bullets: string[];
  resultPromise: string;
  
  // Step 5: Tech Setup
  landingPagePlatform: LandingPagePlatform;
  landingPageStatus: LandingPageStatus;
  emailProvider: LandingPagePlatform;
  deliveryMethod: DeliveryMethod;
  landingPageUrl: string;
  
  // Step 6: Email Sequence
  emailSequenceLength: number;
  emailSequencePurpose: SequencePurpose;
  emailSequenceStatus: SequenceStatus;
  emailSequenceDeadline: string;
  
  // Step 7: Promotion
  promotionMethod: PromotionMethod;
  promotionPlatforms: string[];
  promotionStartDate: string;
  promotionDuration: string;
  weeklyCommitment: number;
  
  // Step 8: Task toggles
  selectedTasks: Record<string, boolean>;
  
  // Index signature for useWizard compatibility
  [key: string]: unknown;
}

export const LEAD_MAGNET_FORMATS: { value: LeadMagnetFormat; label: string; icon: string }[] = [
  { value: 'pdf', label: 'PDF Guide/eBook', icon: '📄' },
  { value: 'checklist', label: 'Checklist', icon: '✅' },
  { value: 'template', label: 'Template/Swipe File', icon: '📋' },
  { value: 'workbook', label: 'Workbook', icon: '📓' },
  { value: 'video', label: 'Video Training', icon: '🎥' },
  { value: 'audio', label: 'Audio/Podcast', icon: '🎧' },
  { value: 'quiz', label: 'Quiz/Assessment', icon: '❓' },
  { value: 'resource-list', label: 'Resource List', icon: '📚' },
  { value: 'mini-course', label: 'Mini Course (email-based)', icon: '📧' },
  { value: 'toolkit', label: 'Toolkit/Bundle', icon: '🧰' },
  { value: 'other', label: 'Other', icon: '✨' },
];

export const LANDING_PAGE_PLATFORMS: { value: LandingPagePlatform; label: string }[] = [
  { value: 'convertkit', label: 'ConvertKit' },
  { value: 'flodesk', label: 'Flodesk' },
  { value: 'mailchimp', label: 'Mailchimp' },
  { value: 'leadpages', label: 'Leadpages' },
  { value: 'squarespace', label: 'Squarespace' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'stan-store', label: 'Stan Store' },
  { value: 'systeme', label: 'Systeme.io' },
  { value: 'kajabi', label: 'Kajabi' },
  { value: 'other', label: 'Other' },
];

export const SOCIAL_PLATFORMS = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'Pinterest',
  'YouTube',
  'TikTok',
  'Twitter/X',
  'Threads',
];

export const PROMOTION_METHODS: { value: PromotionMethod; label: string; description: string }[] = [
  { value: 'social', label: 'Social Media Posts', description: 'Regular posts on your social channels' },
  { value: 'email-list', label: 'Email to Existing List', description: 'Promote to your current subscribers' },
  { value: 'collaborations', label: 'Collaborations/Swaps', description: 'Partner with others in your niche' },
  { value: 'paid-ads', label: 'Paid Ads', description: 'Facebook, Instagram, or Google ads' },
  { value: 'seo-blog', label: 'SEO/Blog', description: 'Organic traffic from search engines' },
  { value: 'podcast', label: 'Podcast Mentions', description: 'Your podcast or guest appearances' },
  { value: 'direct-outreach', label: 'Direct Outreach', description: 'Personal DMs or emails' },
  { value: 'combination', label: 'Combination', description: 'Mix of multiple methods' },
];

export const DEFAULT_LEAD_MAGNET_DATA: LeadMagnetWizardData = {
  // Step 1
  hasIdea: false,
  name: '',
  description: '',
  brainstormContext: {
    idealCustomer: '',
    mainProblem: '',
    paidOffer: '',
  },
  generatedIdeas: [],
  
  // Step 2
  idealSubscriber: '',
  mainProblem: '',
  transformation: '',
  platforms: [],
  
  // Step 3
  format: 'pdf',
  estimatedLength: '',
  deliverables: [''],
  hasBonus: false,
  bonusDescription: '',
  
  // Step 4
  headline: '',
  subheadline: '',
  bullets: ['', '', ''],
  resultPromise: '',
  
  // Step 5
  landingPagePlatform: 'convertkit',
  landingPageStatus: 'need-to-create',
  emailProvider: 'convertkit',
  deliveryMethod: 'email',
  landingPageUrl: '',
  
  // Step 6
  emailSequenceLength: 5,
  emailSequencePurpose: 'soft-sell',
  emailSequenceStatus: 'need-to-create',
  emailSequenceDeadline: '',
  
  // Step 7
  promotionMethod: 'social',
  promotionPlatforms: [],
  promotionStartDate: '',
  promotionDuration: '4 weeks',
  weeklyCommitment: 3,
  
  // Step 8
  selectedTasks: {},
};

// Validation helper
export function validateLeadMagnetStep(step: number, data: LeadMagnetWizardData): boolean {
  // Allow navigation between steps without strict validation
  // Final validation happens on create
  return true;
}

// Task generation phases
export const LEAD_MAGNET_TASK_PHASES = {
  setup: 'Setup Phase',
  tech: 'Tech Setup Phase',
  copy: 'Copywriting Phase',
  promotion: 'Promotion Phase',
} as const;

// Task type
export interface LeadMagnetTask {
  id: string;
  phase: string;
  title: string;
  description: string;
  daysFromStart: number;
  isContent?: boolean;
  contentType?: string;
}

// Default tasks to generate
export function getDefaultLeadMagnetTasks(data: LeadMagnetWizardData): LeadMagnetTask[] {
  const tasks: LeadMagnetTask[] = [
    // Setup Phase
    { id: 'define-audience', phase: 'setup', title: 'Define target audience and problem', description: 'Clarify exactly who this freebie is for', daysFromStart: 0 },
    { id: 'outline-content', phase: 'setup', title: 'Outline freebie content', description: 'Create the structure/outline for your lead magnet', daysFromStart: 1 },
    { id: 'create-deliverable', phase: 'setup', title: `Create ${data.name || 'lead magnet'} deliverable`, description: 'Produce the actual content for your freebie', daysFromStart: 3 },
    { id: 'design-cover', phase: 'setup', title: 'Design cover/thumbnail', description: 'Create visual assets for your lead magnet', daysFromStart: 5 },
    
    // Tech Phase
    { id: 'setup-landing', phase: 'tech', title: 'Set up landing page', description: `Create opt-in page on ${data.landingPagePlatform}`, daysFromStart: 6 },
    { id: 'connect-email', phase: 'tech', title: 'Connect email automation', description: 'Set up delivery sequence in your email provider', daysFromStart: 7 },
    { id: 'test-optin', phase: 'tech', title: 'Test opt-in flow', description: 'Submit test signup and verify delivery works', daysFromStart: 8 },
    
    // Copy Phase
    { id: 'write-landing', phase: 'copy', title: 'Write landing page copy', description: 'Headlines, bullets, and CTA for your opt-in page', daysFromStart: 4, isContent: true, contentType: 'landing-page' },
    { id: 'write-welcome', phase: 'copy', title: 'Write welcome email', description: 'Delivery email with download link', daysFromStart: 6, isContent: true, contentType: 'email' },
  ];
  
  // Add nurture emails based on sequence length
  for (let i = 1; i <= data.emailSequenceLength; i++) {
    tasks.push({
      id: `write-nurture-${i}`,
      phase: 'copy',
      title: `Write nurture email ${i}`,
      description: `Email ${i} of ${data.emailSequenceLength} in your nurture sequence`,
      daysFromStart: 6 + i,
      isContent: true,
      contentType: 'email',
    });
  }
  
  // Promotion Phase
  tasks.push(
    { id: 'create-promo-graphics', phase: 'promotion', title: 'Create promo graphics', description: 'Social media images to promote your freebie', daysFromStart: 9 },
    { id: 'write-promo-1', phase: 'promotion', title: 'Write promo post #1', description: 'First social media post about your freebie', daysFromStart: 10, isContent: true, contentType: 'social' },
    { id: 'write-promo-2', phase: 'promotion', title: 'Write promo post #2', description: 'Second social media post about your freebie', daysFromStart: 12, isContent: true, contentType: 'social' },
    { id: 'write-promo-3', phase: 'promotion', title: 'Write promo post #3', description: 'Third social media post about your freebie', daysFromStart: 14, isContent: true, contentType: 'social' },
  );
  
  return tasks;
}
