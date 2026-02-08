// Learning Insights Types for Adaptive Learning UI

export interface LearningInsights {
  totalRated: number;
  avgRating: number;
  ratingTrend: 'improving' | 'stable' | 'declining';
  keyAdjustments: string[]; // Human-readable adjustments being made
  avoidPatterns: string[]; // Things user consistently dislikes
  emphasizePatterns: string[]; // Things user consistently loves
  strengthAreas: string[]; // What's working well
  hasEnoughData: boolean;
}

export interface GlobalLearnings {
  universalPatterns: {
    formalityPreference: 'more_casual' | 'more_formal' | 'balanced';
    toneAlignment: 'excellent' | 'good' | 'needs_work';
    lengthPreference: 'shorter' | 'longer' | 'just_right';
    emotionLevel: 'more_emotional' | 'less_emotional' | 'balanced';
  };
  successFactors: string[];
  commonIssues: string[];
  totalRatedAcrossTypes: number;
}

export const DEFAULT_LEARNING_INSIGHTS: LearningInsights = {
  totalRated: 0,
  avgRating: 0,
  ratingTrend: 'stable',
  keyAdjustments: [],
  avoidPatterns: [],
  emphasizePatterns: [],
  strengthAreas: [],
  hasEnoughData: false,
};

// Tag to human-readable mapping
export const TAG_LABELS: Record<string, string> = {
  // Negative tags
  too_formal: 'Too formal',
  too_casual: 'Too casual',
  too_long: 'Too long',
  too_short: 'Too short',
  needs_more_emotion: 'Needs more emotion',
  too_salesy: 'Too salesy',
  bland_generic: 'Bland/generic',
  wrong_tone: 'Wrong tone',
  missing_cta: 'Missing CTA',
  weak_hook: 'Weak hook',
  confusing_structure: 'Confusing structure',
  off_brand: 'Off brand',
  // Positive tags
  great_hook: 'Great hook',
  perfect_tone: 'Perfect tone',
  love_the_story: 'Love the story',
  excellent_cta: 'Excellent CTA',
  great_length: 'Great length',
  perfect_emotion: 'Perfect emotion',
  love_the_specifics: 'Love the specifics',
  on_brand: 'On brand',
  natural_voice: 'Natural voice',
  great_structure: 'Great structure',
};

// Maps feedback patterns to human-readable adjustments
export function getAdjustmentDescription(issue: string): string {
  const adjustmentMap: Record<string, string> = {
    too_formal: 'Using more casual, conversational tone',
    too_casual: 'Using more professional language',
    too_long: 'Writing shorter, punchier copy',
    too_short: 'Adding more detail and depth',
    needs_more_emotion: 'Adding more emotional expression',
    too_salesy: 'Reducing sales language',
    bland_generic: 'Being more specific and unique',
    wrong_tone: 'Matching voice more carefully',
    missing_cta: 'Including clear CTAs',
    weak_hook: 'Prioritizing strong hooks',
    confusing_structure: 'Using clearer structure',
    off_brand: 'Studying brand DNA more carefully',
    // Positive adjustments
    great_hook: 'Maintaining strong hooks',
    perfect_tone: 'Keeping current tone approach',
    love_the_story: 'Using more storytelling',
    excellent_cta: 'Maintaining CTA style',
    great_length: 'Keeping current length',
    perfect_emotion: 'Maintaining emotion level',
    love_the_specifics: 'Including specific details',
    on_brand: 'Continuing brand alignment',
    natural_voice: 'Maintaining natural voice',
    great_structure: 'Keeping structural patterns',
  };
  return adjustmentMap[issue] || issue.replace(/_/g, ' ');
}
