// Wizard AI Generation Types
// Types for generating AI copy within wizards (Launch, Summit, Content Planner)

import { ContentType } from './aiCopywriting';

// ============== Wizard Content Types ==============
export type WizardContentType =
  // Launch Planner - Email Sequences
  | 'launch_warmup_sequence'
  | 'launch_open_sequence'
  | 'launch_cartclose_sequence'
  | 'launch_followup_sequence'
  | 'launch_postpurchase_sequence'
  // Launch Planner - Sales Copy
  | 'launch_sales_page'
  | 'launch_sales_page_headline'
  | 'launch_sales_page_body'
  // Launch Planner - Social
  | 'launch_social_batch'
  // Summit Planner
  | 'summit_speaker_invite'
  | 'summit_speaker_followup'
  | 'summit_swipe_pack'
  | 'summit_promo_sequence'
  | 'summit_social_kit'
  | 'summit_nurture_sequence'
  // Content Planner
  | 'content_brief'
  | 'content_repurpose_batch'
  | 'content_newsletter';

// ============== Wizard Types ==============
export type WizardType = 'launch-v2' | 'summit' | 'content-planner';

// ============== Generated Content Structure ==============
export interface GeneratedEmail {
  id: string;
  sequencePosition: number;
  purpose: string;
  subjectLines: string[];
  body: string;
  sendDay: number; // Days relative to sequence start
  aiDetectionScore: number;
}

export interface GeneratedSocialPost {
  id: string;
  platform: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
  suggestedDate: string;
  aiDetectionScore: number;
}

export interface GeneratedSalesPageSection {
  id: string;
  sectionType: 'headline' | 'subheadline' | 'problem' | 'solution' | 'features' | 'bonuses' | 'pricing' | 'faq' | 'cta' | 'guarantee';
  content: string;
  variations?: string[];
  aiDetectionScore: number;
}

export interface GeneratedSalesPage {
  headline: GeneratedSalesPageSection;
  subheadline: GeneratedSalesPageSection;
  problem: GeneratedSalesPageSection;
  solution: GeneratedSalesPageSection;
  features: GeneratedSalesPageSection;
  bonuses: GeneratedSalesPageSection;
  pricing: GeneratedSalesPageSection;
  faq: GeneratedSalesPageSection;
  cta: GeneratedSalesPageSection;
  guarantee: GeneratedSalesPageSection;
  fullCopy: string;
  aiDetectionScore: number;
}

export interface GeneratedContentBrief {
  id: string;
  contentType: string;
  hookOptions: string[];
  keyPoints: string[];
  callToAction: string;
  estimatedLength: string;
}

// ============== Generation Context ==============
export interface WizardGenerationContext {
  wizardType: WizardType;
  contentType: WizardContentType;
  
  // Business context (from brand profile)
  businessName: string;
  industry: string;
  targetCustomer: string;
  whatYouSell: string;
  voiceProfile?: {
    style_summary?: string;
    tone_scores?: {
      formality: number;
      energy: number;
      humor: number;
      emotion: number;
    };
    signature_phrases?: string[];
  };
  voiceSamples?: string[];
  
  // Offer context (from wizard data)
  offerName: string;
  offerType: string;
  pricePoint: number | null;
  paymentPlanDetails?: string;
  idealCustomer: string;
  bonuses?: string[];
  guarantee?: string;
  
  // Timeline context
  cartOpensDate?: string;
  cartClosesDate?: string;
  launchDuration?: number; // days
  
  // Launch-specific
  launchStyle?: string;
  urgencyType?: 'spots' | 'deadline' | 'price-increase' | 'none';
  spotLimit?: number;
  
  // Additional user-provided context
  additionalContext?: string;
}

// ============== Generation Request/Response ==============
export interface WizardGenerationRequest {
  context: WizardGenerationContext;
  contentType: WizardContentType;
  options?: {
    regenerateSingle?: string; // ID of single item to regenerate
    temperature?: number;
  };
}

export interface GeneratedSequence {
  sequenceType: string;
  sequenceLabel: string;
  emails: GeneratedEmail[];
  totalEmails: number;
  avgAiScore: number;
  tokensUsed: number;
  generationTimeMs: number;
}

export interface WizardGenerationResult {
  success: boolean;
  contentType: WizardContentType;
  generatedAt: string;
  
  // Different result types based on content
  emailSequence?: GeneratedSequence;
  socialBatch?: GeneratedSocialPost[];
  salesPage?: GeneratedSalesPage;
  contentBriefs?: GeneratedContentBrief[];
  
  // Metrics
  tokensUsed: number;
  generationTimeMs: number;
  avgAiDetectionScore: number;
  
  // Error handling
  error?: string;
}

// ============== Calendar/Vault Integration ==============
export interface CalendarScheduleItem {
  title: string;
  body: string;
  type: 'email' | 'post' | 'page';
  channel: string;
  plannedCreationDate: string;
  plannedPublishDate: string;
  tags: string[];
  aiGenerationId?: string;
}

export interface VaultSaveItem {
  title: string;
  body: string;
  contentType: ContentType | string;
  channel?: string;
  tags: string[];
  generationId?: string;
}

// ============== UI State ==============
export interface WizardAIGeneratorState {
  isGenerating: boolean;
  currentPass: 'draft' | 'critique' | 'rewrite' | 'detection' | 'complete';
  progress: number; // 0-100
  result: WizardGenerationResult | null;
  error: string | null;
}

// ============== Sequence Configuration ==============
export interface EmailSequenceConfig {
  sequenceType: WizardContentType;
  label: string;
  emailCount: number;
  emails: Array<{
    position: number;
    purpose: string;
    tone: string;
    structure: string[];
    avoid: string[];
    sendDay: number;
  }>;
}

// Sequence configurations by type
export const EMAIL_SEQUENCE_CONFIGS: Record<string, EmailSequenceConfig> = {
  launch_warmup_sequence: {
    sequenceType: 'launch_warmup_sequence',
    label: 'Warm-Up Sequence',
    emailCount: 5,
    emails: [
      {
        position: 1,
        purpose: 'Deliver lead magnet + welcome',
        tone: 'Warm, inviting, helpful',
        structure: ['Thank them briefly', 'Personal story showing understanding', 'One actionable tip', 'Reply CTA'],
        avoid: ['Selling', 'Overwhelming info', 'Generic inspiration'],
        sendDay: 0,
      },
      {
        position: 2,
        purpose: 'Share your story + relate to their struggle',
        tone: 'Vulnerable, authentic, relatable',
        structure: ['Mirror their struggle', 'Your similar experience', 'Key realization moment', 'What you learned'],
        avoid: ['Humble bragging', 'Vague transformation language', 'Pitching'],
        sendDay: 1,
      },
      {
        position: 3,
        purpose: 'Authority-building teaching content',
        tone: 'Confident teacher, generous',
        structure: ['Address common mistake', 'Why it happens (empathy)', 'Your framework', 'Step 1 to implement'],
        avoid: ['Gatekeeping advice', 'Being preachy', 'Too theoretical'],
        sendDay: 3,
      },
      {
        position: 4,
        purpose: 'Social proof + soft intro to offer',
        tone: 'Excited storytelling about client wins',
        structure: ['Client success story', 'What made the difference', 'Connect to reader', 'Mention offer exists'],
        avoid: ['Making it sound too easy', 'Salesy language', 'Fake urgency'],
        sendDay: 5,
      },
      {
        position: 5,
        purpose: '"Something exciting is coming" + early bird hint',
        tone: 'Anticipation, excitement, exclusive',
        structure: ['Hint at upcoming opportunity', 'Why you created it', 'Early access mention', 'Watch for next email CTA'],
        avoid: ['Full pitch', 'Over-hyping', 'Vague promises'],
        sendDay: 7,
      },
    ],
  },
  launch_open_sequence: {
    sequenceType: 'launch_open_sequence',
    label: 'Launch Sequence',
    emailCount: 7,
    emails: [
      {
        position: 1,
        purpose: 'Cart open announcement',
        tone: 'Excited, clear, direct',
        structure: ['Big announcement', 'What it is + who it is for', 'Key transformation', 'Clear CTA with link'],
        avoid: ['Burying the offer', 'Too much detail', 'Weak CTA'],
        sendDay: 0,
      },
      {
        position: 2,
        purpose: "What's included deep-dive",
        tone: 'Detailed, valuable, comprehensive',
        structure: ['Module/feature breakdown', 'Benefit of each', 'Who this helps most', 'CTA reminder'],
        avoid: ['Just listing features', 'No emotional connection', 'Overwhelming detail'],
        sendDay: 1,
      },
      {
        position: 3,
        purpose: 'Bonuses breakdown',
        tone: 'Generous, exciting, valuable',
        structure: ['Introduce bonuses', 'Value of each', 'Why you included them', 'Total value stack'],
        avoid: ['Filler bonuses', 'Unclear value', 'Missing deadlines'],
        sendDay: 2,
      },
      {
        position: 4,
        purpose: 'Objection handling (FAQs)',
        tone: 'Empathetic, reassuring, honest',
        structure: ['Address top objections', 'Honest answers', 'Guarantee reminder', 'Invite questions'],
        avoid: ['Defensive tone', 'Dismissing concerns', 'Over-promising'],
        sendDay: 3,
      },
      {
        position: 5,
        purpose: 'Case study/testimonial spotlight',
        tone: 'Story-driven, proof-focused, inspirational',
        structure: ['Client before situation', 'Their experience', 'Results achieved', 'Reader could be next'],
        avoid: ['Unrealistic claims', 'Missing specifics', 'Forced testimonials'],
        sendDay: 4,
      },
      {
        position: 6,
        purpose: 'Final 24-48 hours urgency',
        tone: 'Urgent, honest, helpful',
        structure: ['Deadline reminder', 'What they will miss', 'Quick recap of value', 'Last chance CTA'],
        avoid: ['Fake urgency', 'Manipulation', 'Desperation'],
        sendDay: 5,
      },
      {
        position: 7,
        purpose: 'Last chance (cart closing)',
        tone: 'Final, decisive, supportive',
        structure: ['Hours left', 'For the person on the fence', 'One final reason', 'Clear final CTA'],
        avoid: ['Guilt tripping', 'Begging', 'Weak close'],
        sendDay: 6,
      },
    ],
  },
  launch_cartclose_sequence: {
    sequenceType: 'launch_cartclose_sequence',
    label: 'Cart Close Sequence',
    emailCount: 4,
    emails: [
      {
        position: 1,
        purpose: '24 hours left',
        tone: 'Urgent, clear, supportive',
        structure: ['Deadline in 24 hours', 'Quick value recap', 'Answer common hesitation', 'CTA with urgency'],
        avoid: ['Panic-inducing', 'Too much new info', 'Weak urgency'],
        sendDay: 0,
      },
      {
        position: 2,
        purpose: '12 hours left (emotional appeal)',
        tone: 'Emotional, connecting, decisive',
        structure: ['Time running out', 'Imagine their life with solution', 'Last push to decide', 'Strong CTA'],
        avoid: ['Manipulation', 'Desperation', 'Guilt'],
        sendDay: 0,
      },
      {
        position: 3,
        purpose: 'Final hours (scarcity + transformation)',
        tone: 'Decisive, transformation-focused, urgent',
        structure: ['Last chance message', 'Transformation they deserve', 'What changes after purchase', 'Final CTA'],
        avoid: ['Over-promising', 'Begging', 'Weak close'],
        sendDay: 1,
      },
      {
        position: 4,
        purpose: 'Door closed + what is next',
        tone: 'Grateful, forward-looking, helpful',
        structure: ['Cart is closed', 'Thank non-buyers', 'What they can still do', 'Stay in touch CTA'],
        avoid: ['Making them feel bad', 'Abandoning them', 'No next steps'],
        sendDay: 1,
      },
    ],
  },
  launch_postpurchase_sequence: {
    sequenceType: 'launch_postpurchase_sequence',
    label: 'Post-Purchase Sequence',
    emailCount: 3,
    emails: [
      {
        position: 1,
        purpose: 'Welcome + immediate next steps',
        tone: 'Celebratory, clear, supportive',
        structure: ['Congratulate their decision', 'Immediate access instructions', 'First step to take', 'Support resources'],
        avoid: ['Overwhelming with info', 'Upselling immediately', 'Vague instructions'],
        sendDay: 0,
      },
      {
        position: 2,
        purpose: "Reduce buyer's remorse + quick win",
        tone: 'Reassuring, action-oriented, encouraging',
        structure: ['Validate their decision', 'Share a quick win exercise', 'Success story of similar buyer', 'Encouragement'],
        avoid: ['Doubt-inducing', 'Too much pressure', 'Ignoring their feelings'],
        sendDay: 1,
      },
      {
        position: 3,
        purpose: 'Community/onboarding invitation',
        tone: 'Welcoming, community-focused, exciting',
        structure: ['Introduce community', 'How to get most value', 'Connect with others', 'Questions welcome'],
        avoid: ['Overwhelming with options', 'No clear next step', 'Abandoning them'],
        sendDay: 3,
      },
    ],
  },
  launch_followup_sequence: {
    sequenceType: 'launch_followup_sequence',
    label: 'Follow-Up Sequence',
    emailCount: 4,
    emails: [
      {
        position: 1,
        purpose: '"Doors closed, but..." message',
        tone: 'Empathetic, forward-looking, helpful',
        structure: ['Acknowledge doors closed', 'Value they can still get', 'Future opportunity hint', 'Stay connected CTA'],
        avoid: ['Making them feel bad', 'Hard sell', 'Abandoning them'],
        sendDay: 1,
      },
      {
        position: 2,
        purpose: 'Feedback request + survey',
        tone: 'Curious, humble, appreciative',
        structure: ['Thank them for considering', 'Ask what held them back', 'Survey link or question', 'Promise to listen'],
        avoid: ['Defensive', 'Pushy', 'Ignoring their input'],
        sendDay: 3,
      },
      {
        position: 3,
        purpose: '"When we reopen" + waitlist',
        tone: 'Informative, exclusive, forward-looking',
        structure: ['When next opportunity is', 'Waitlist benefits', 'What will change', 'Join waitlist CTA'],
        avoid: ['Vague timing', 'No incentive', 'Pressure'],
        sendDay: 5,
      },
      {
        position: 4,
        purpose: 'Future value preview',
        tone: 'Generous, valuable, relationship-building',
        structure: ['Free value content', 'Preview of future offerings', 'How to stay connected', 'Soft relationship CTA'],
        avoid: ['Hard selling', 'Ignoring their decision', 'No value'],
        sendDay: 7,
      },
    ],
  },
};

// ============== Content Needs Item ==============
export interface ContentNeedItem {
  id: string;
  type: 'email_sequence' | 'sales_page' | 'social_batch';
  contentType: WizardContentType;
  label: string;
  emailCount?: number;
  purpose: string;
}

// Map wizard sequence types to content types
export const SEQUENCE_TYPE_TO_CONTENT_TYPE: Record<string, WizardContentType> = {
  warmUp: 'launch_warmup_sequence',
  launch: 'launch_open_sequence',
  cartClose: 'launch_cartclose_sequence',
  postPurchase: 'launch_postpurchase_sequence',
  followUp: 'launch_followup_sequence',
};
