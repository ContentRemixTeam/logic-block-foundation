// Copy Control Types - User customization for AI generation

export type CopyLength = 'short' | 'medium' | 'long';
export type EmotionalIntensity = 'low' | 'moderate' | 'high';
export type UrgencyLevel = 'none' | 'soft' | 'strong';
export type ToneStyle = 'casual' | 'balanced' | 'professional';

export interface CopyControls {
  length: CopyLength;
  emotion: EmotionalIntensity;
  urgency: UrgencyLevel;
  tone: ToneStyle;
}

export interface LengthConfig {
  label: string;
  wordRange: string;
  description: string;
  promptAddition: string;
}

export interface EmotionConfig {
  label: string;
  description: string;
  promptAddition: string;
  toneShift: number;
}

export interface UrgencyConfig {
  label: string;
  description: string;
  promptAddition: string;
}

export interface ToneConfig {
  label: string;
  description: string;
  promptAddition: string;
  formalityShift: number;
}

// Control configurations
export const LENGTH_CONFIGS: Record<CopyLength, LengthConfig> = {
  short: {
    label: 'Short',
    wordRange: '200-300 words',
    description: 'Quick hit, one key point, tight and punchy',
    promptAddition: 'KEEP THIS TIGHT. 200-300 words MAXIMUM. Every word must earn its place. Cut ruthlessly. One main idea only. Structure: Hook → One Key Point → CTA.'
  },
  medium: {
    label: 'Medium',
    wordRange: '400-500 words',
    description: 'Balanced depth, 3-4 key points, most versatile',
    promptAddition: 'Aim for 400-500 words. Balance depth with readability. 3-4 key points maximum. Structure: Hook → Story/Context → Teaching → CTA.'
  },
  long: {
    label: 'Long',
    wordRange: '600-800 words',
    description: 'Deep dive, complete story, handle objections',
    promptAddition: 'This is a deep dive. 600-800 words. Build the case thoroughly. Handle objections. Tell complete story. Structure: Hook → Problem Agitation → Story → Solution → Social Proof → Overcome Objections → CTA.'
  }
};

export const EMOTION_CONFIGS: Record<EmotionalIntensity, EmotionConfig> = {
  low: {
    label: 'Neutral/Factual',
    description: 'Informative, clear, practical - helpful colleague',
    promptAddition: 'Keep emotion LOW. Be informative, clear, practical. Think: helpful colleague sharing info. Avoid passionate language, personal stories, dramatic statements.',
    toneShift: -2
  },
  moderate: {
    label: 'Warm/Relatable',
    description: 'Empathetic, encouraging - trusted friend',
    promptAddition: 'Moderate emotional connection. Be warm, empathetic, relatable. Think: trusted friend giving advice. Include brief personal touches, understanding language, encouraging tone.',
    toneShift: 0
  },
  high: {
    label: 'Passionate/Inspiring',
    description: 'Vulnerable, inspiring, deeply felt - motivational',
    promptAddition: 'HIGH emotional resonance. Be vulnerable, inspiring, deeply empathetic. Make them FEEL something. Include personal stories, vivid imagery, emotional language. This should hit them in the chest.',
    toneShift: 2
  }
};

export const URGENCY_CONFIGS: Record<UrgencyLevel, UrgencyConfig> = {
  none: {
    label: 'No Urgency',
    description: 'Pure value, relationship building, no pressure',
    promptAddition: 'ZERO urgency. This is pure value-add, relationship building. No pressure. No deadlines. CTA should be invitation only (reply, share, try this). Avoid: deadlines, limited spots, cart closing, now/today pressure.'
  },
  soft: {
    label: 'Gentle Nudge',
    description: 'Encouraging reminder, coming soon, worth considering',
    promptAddition: 'Soft urgency. Gentle reminder that action is beneficial. No pressure, just encouragement. Language: "You might want to...", "Don\'t miss out on...", "Coming up soon...". CTA: encouraging suggestion.'
  },
  strong: {
    label: 'Real Deadline',
    description: 'Limited time, clear consequences, must be authentic',
    promptAddition: 'STRONG urgency. Real deadline. Real consequences of not acting. But must be AUTHENTIC. Require: specific date/time, real reason for deadline, what happens after. CTA: clear deadline (Cart closes X, Only Y spots, Ends tonight). WARNING: Only use if deadline is REAL. Fake scarcity breaks trust.'
  }
};

export const TONE_CONFIGS: Record<ToneStyle, ToneConfig> = {
  casual: {
    label: 'Casual',
    description: 'Like texting a friend - very conversational',
    promptAddition: 'Write like you\'re texting a close friend. Lots of contractions, sentence fragments OK, casual language. Loose grammar is fine. Super conversational. Use "gonna" not "going to". Short sentences. Even fragments.',
    formalityShift: -2
  },
  balanced: {
    label: 'Balanced',
    description: 'Professional but approachable - experienced guide',
    promptAddition: 'Strike a balance: professional enough to be credible, conversational enough to be relatable. Experienced guide, not distant expert. Some contractions, clear structure, authoritative but approachable.',
    formalityShift: 0
  },
  professional: {
    label: 'Professional',
    description: 'Polished expert - authoritative and refined',
    promptAddition: 'Write with authority and polish. You\'re the expert they came to learn from. Still warm, but more refined. Fewer contractions, complete sentences, sophisticated vocabulary, clear authority.',
    formalityShift: 2
  }
};

// Smart defaults by content type
export const CONTENT_TYPE_CONTROL_DEFAULTS: Record<string, CopyControls> = {
  welcome_email_1: {
    length: 'short',
    emotion: 'moderate',
    urgency: 'none',
    tone: 'balanced'
  },
  welcome_email_2: {
    length: 'medium',
    emotion: 'high',
    urgency: 'none',
    tone: 'balanced'
  },
  welcome_email_3: {
    length: 'medium',
    emotion: 'moderate',
    urgency: 'none',
    tone: 'balanced'
  },
  welcome_email_4: {
    length: 'medium',
    emotion: 'moderate',
    urgency: 'soft',
    tone: 'balanced'
  },
  welcome_email_5: {
    length: 'long',
    emotion: 'moderate',
    urgency: 'soft',
    tone: 'balanced'
  },
  social_post: {
    length: 'short',
    emotion: 'high',
    urgency: 'none',
    tone: 'casual'
  },
  sales_page_headline: {
    length: 'short',
    emotion: 'high',
    urgency: 'soft',
    tone: 'professional'
  },
  sales_page_body: {
    length: 'long',
    emotion: 'high',
    urgency: 'strong',
    tone: 'professional'
  },
  promo_email: {
    length: 'medium',
    emotion: 'moderate',
    urgency: 'soft',
    tone: 'balanced'
  }
};

export const DEFAULT_COPY_CONTROLS: CopyControls = {
  length: 'medium',
  emotion: 'moderate',
  urgency: 'none',
  tone: 'balanced'
};
