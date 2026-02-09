// LinkedIn Templates System - Type Definitions

export interface LinkedInTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  hookPattern: string;
  structure: string[];
  example: string;
  exampleWhyItWorks: string[];
}

export interface LinkedInAntiAIRules {
  bannedPhrases: string[];
  requiredPatterns: string[];
  engagementRules: string[];
}

export interface LinkedInTemplatePrefs {
  preferredTemplate: string | null;
  usageStats: Record<string, number>;
}

export const DEFAULT_LINKEDIN_TEMPLATE_PREFS: LinkedInTemplatePrefs = {
  preferredTemplate: null,
  usageStats: {}
};

// Helper to parse LinkedIn template prefs from database JSON
export function parseLinkedInTemplatePrefs(data: unknown): LinkedInTemplatePrefs {
  if (!data || typeof data !== 'object') {
    return DEFAULT_LINKEDIN_TEMPLATE_PREFS;
  }
  
  const parsed = data as Record<string, unknown>;
  return {
    preferredTemplate: typeof parsed.preferredTemplate === 'string' ? parsed.preferredTemplate : null,
    usageStats: (typeof parsed.usageStats === 'object' && parsed.usageStats !== null)
      ? parsed.usageStats as Record<string, number>
      : {}
  };
}
