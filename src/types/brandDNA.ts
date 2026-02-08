// Brand DNA Types - Deep brand customization for AI generation

export interface BrandFramework {
  id: string;
  name: string;
  description: string;
  example?: string;
}

export interface EmojiPreferences {
  use_emojis: boolean;
  preferred_emojis: string[];
}

export interface BrandDNA {
  custom_banned_phrases: string[];
  frameworks: BrandFramework[];
  signature_phrases: string[];
  emoji_preferences: EmojiPreferences;
  content_philosophies: string[];
  brand_values: string[];
}

export const DEFAULT_BRAND_DNA: BrandDNA = {
  custom_banned_phrases: [],
  frameworks: [],
  signature_phrases: [],
  emoji_preferences: {
    use_emojis: false,
    preferred_emojis: []
  },
  content_philosophies: [],
  brand_values: []
};

// Helper to parse Brand DNA from database JSON
export function parseBrandDNA(data: {
  custom_banned_phrases?: string[] | null;
  frameworks?: unknown;
  signature_phrases?: unknown;
  emoji_preferences?: unknown;
  content_philosophies?: string[] | null;
  brand_values?: string[] | null;
}): BrandDNA {
  return {
    custom_banned_phrases: data.custom_banned_phrases || [],
    frameworks: (Array.isArray(data.frameworks) ? data.frameworks : []) as BrandFramework[],
    signature_phrases: (Array.isArray(data.signature_phrases) ? data.signature_phrases : []) as string[],
    emoji_preferences: (data.emoji_preferences && typeof data.emoji_preferences === 'object' 
      ? data.emoji_preferences 
      : DEFAULT_BRAND_DNA.emoji_preferences) as EmojiPreferences,
    content_philosophies: data.content_philosophies || [],
    brand_values: data.brand_values || []
  };
}
