// Brand Profile Types

// Deep Writing Patterns - How they THINK through writing
export interface WritingPatterns {
  decision_making_style: 'data-driven' | 'story-driven' | 'authority-driven' | 'mixed';
  transition_style: 'abrupt' | 'smooth' | 'conversational';
  example_usage: 'specific-numbers' | 'relatable-scenarios' | 'client-stories' | 'mixed';
  objection_handling: 'direct-address' | 'story-reframe' | 'preemptive' | 'mixed';
  cta_style: 'direct-command' | 'soft-invitation' | 'question-based' | 'mixed';
}

// Structural DNA - How they construct content
export interface StructuralPreferences {
  paragraph_length: 'short' | 'medium' | 'long' | 'mixed';
  sentence_variety: number; // 1-10 scale
  list_usage: 'frequent' | 'occasional' | 'rare';
  question_usage: 'rhetorical' | 'engagement' | 'clarifying' | 'mixed';
}

// Psychological Fingerprint - Their persuasion approach
export interface PsychologicalStyle {
  empathy_level: number; // 1-10 scale
  authority_projection: 'expert' | 'peer' | 'guide' | 'mixed';
  vulnerability_index: number; // 1-10 scale
  urgency_tendency: 'soft' | 'moderate' | 'aggressive';
}

// Pattern Examples - Actual quotes showing their style
export interface PatternExamples {
  typical_opening: string[]; // How they start emails/posts
  typical_transition: string[]; // How they move between ideas
  typical_cta: string[]; // How they ask for action
  typical_proof: string[]; // How they build credibility
}

export interface VoiceProfile {
  // Core voice attributes
  style_summary: string;
  tone_scores: {
    formality: number;
    energy: number;
    humor: number;
    emotion: number;
  };
  sentence_structure?: {
    avg_length: number;
    style: 'punchy' | 'flowing' | 'mixed';
  };
  signature_phrases: string[];
  vocabulary_patterns?: {
    uses_contractions: boolean;
    industry_jargon: boolean;
    common_words: string[];
  };
  storytelling_style?: string;
  
  // Deep Writing Patterns - NEW
  writing_patterns?: WritingPatterns;
  structural_preferences?: StructuralPreferences;
  psychological_style?: PsychologicalStyle;
  pattern_examples?: PatternExamples;
}

export interface BrandProfile {
  id: string;
  user_id: string;
  business_name: string;
  industry: string | null;
  what_you_sell: string | null;
  target_customer: string | null;
  voice_profile: VoiceProfile | null;
  voice_samples: string[];
  transcript_samples: string[];
  customer_reviews: string[];
  created_at: string;
  updated_at: string;
}

// Product Types
export type ProductType = 'course' | 'coaching' | 'membership' | 'service' | 'affiliate';

export interface UserProduct {
  id: string;
  user_id: string;
  product_name: string;
  product_type: ProductType;
  price: number | null;
  affiliate_link: string | null;
  description: string | null;
  created_at: string;
}

// API Key Types
export type KeyStatus = 'untested' | 'valid' | 'invalid';

export interface UserAPIKey {
  id: string;
  user_id: string;
  encrypted_key: string;
  key_status: KeyStatus;
  last_tested: string | null;
  created_at: string;
  updated_at: string;
}

// Generation Types
export type ContentType = 
  // Welcome Email Sequence
  | 'welcome_email_1'
  | 'welcome_email_2'
  | 'welcome_email_3'
  | 'welcome_email_4'
  | 'welcome_email_5'
  // Sales Page
  | 'sales_page_headline'
  | 'sales_page_body'
  // Social Media
  | 'social_post'
  // Promotional Emails
  | 'promo_email';

export interface AICopyGeneration {
  id: string;
  user_id: string;
  content_type: ContentType;
  prompt_context: Record<string, unknown>;
  generated_copy: string;
  user_rating: number | null;
  feedback_text: string | null;
  feedback_tags: string[];
  user_edited_version: string | null;
  product_promoted: string | null;
  tokens_used: number | null;
  generation_time_ms: number | null;
  created_at: string;
}

// Prompt Refinement Types
export interface PromptRefinement {
  id: string;
  user_id: string;
  content_type: string;
  tone_adjustments: Record<string, number>;
  learned_preferences: {
    avoid?: string[];
    use_more?: string[];
  };
  avg_rating: number | null;
  total_generations: number;
  updated_at: string;
}

// Brand Wizard Data
export interface BrandWizardData {
  [key: string]: unknown;
  // Step 1: Business Basics
  businessName: string;
  industry: string;
  whatYouSell: string;
  targetCustomer: string;
  
  // Step 2: Voice Discovery
  voiceSamples: string[];
  transcriptSamples: string[];
  customerReviews: string[];
  voiceProfile: VoiceProfile | null;
  voiceAnalyzed: boolean;
  
  // Step 3: Products
  products: Omit<UserProduct, 'id' | 'user_id' | 'created_at'>[];
}

export const DEFAULT_BRAND_WIZARD_DATA: BrandWizardData = {
  businessName: '',
  industry: '',
  whatYouSell: '',
  targetCustomer: '',
  voiceSamples: ['', '', '', '', ''],
  transcriptSamples: ['', '', ''],
  customerReviews: ['', '', ''],
  voiceProfile: null,
  voiceAnalyzed: false,
  products: [],
};

export const BRAND_WIZARD_STEPS = [
  { title: 'Business Basics', description: 'Tell us about your business' },
  { title: 'Learn Your Voice', description: 'Help AI understand how you write' },
  { title: 'Products & Offers', description: 'What can you promote?' },
  { title: 'Setup Complete', description: 'Ready to generate copy' },
];

// Content Type Options with categories
export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; description: string; category: string }[] = [
  { 
    value: 'welcome_email_1', 
    label: 'Welcome Email #1', 
    category: 'Email Sequences',
    description: 'First email: deliver lead magnet + build relationship'
  },
  { 
    value: 'welcome_email_2', 
    label: 'Welcome Email #2', 
    category: 'Email Sequences',
    description: 'Share your story + position yourself as guide'
  },
  { 
    value: 'welcome_email_3', 
    label: 'Welcome Email #3', 
    category: 'Email Sequences',
    description: 'High-value teaching content'
  },
  { 
    value: 'welcome_email_4', 
    label: 'Welcome Email #4', 
    category: 'Email Sequences',
    description: 'Social proof + soft intro to your offer'
  },
  { 
    value: 'welcome_email_5', 
    label: 'Welcome Email #5', 
    category: 'Email Sequences',
    description: 'Make the offer + invite next step'
  },
  { 
    value: 'sales_page_headline', 
    label: 'Sales Page Headline', 
    category: 'Sales Pages',
    description: 'Attention-grabbing headline for sales page'
  },
  { 
    value: 'sales_page_body', 
    label: 'Sales Page Body', 
    category: 'Sales Pages',
    description: 'Full long-form sales page copy'
  },
  { 
    value: 'social_post', 
    label: 'Social Media Post', 
    category: 'Social Media',
    description: 'Platform-optimized social content'
  },
  { 
    value: 'promo_email', 
    label: 'Promotional Email', 
    category: 'Emails',
    description: 'One-off promotional or launch email'
  },
];

// Industry Options
export const INDUSTRY_OPTIONS = [
  'Business Coaching',
  'Life Coaching',
  'Health & Wellness',
  'Online Education',
  'Creative Services',
  'Consulting',
  'E-commerce',
  'Real Estate',
  'Financial Services',
  'Technology',
  'Personal Development',
  'Other',
];

// Feedback Tags
export const FEEDBACK_TAGS = [
  'too_formal',
  'too_casual',
  'too_long',
  'too_short',
  'needs_more_emotion',
  'too_salesy',
  'bland_generic',
  'wrong_tone',
  'missing_cta',
  'great_hook',
];
