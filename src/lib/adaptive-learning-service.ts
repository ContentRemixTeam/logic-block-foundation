// Adaptive Learning Service
// Analyzes user feedback patterns and dynamically adjusts AI generation

import { supabase } from '@/integrations/supabase/client';
import { ContentType, CONTENT_TYPE_FAMILIES, UNIVERSAL_LEARNING_TAGS } from '@/types/aiCopywriting';
import { LearningInsights, GlobalLearnings, DEFAULT_LEARNING_INSIGHTS, getAdjustmentDescription } from '@/types/learningInsights';

export interface FeedbackPattern {
  contentType: ContentType;
  avgRating: number;
  totalGenerations: number;
  commonIssues: string[]; // Most frequent feedback tags
  improvementAreas: string[];
  successFactors: string[];
}

export interface AdaptiveParams {
  temperatureAdjustment: number; // -0.2 to +0.2
  toneShift: {
    formalityShift: number; // -2 to +2
    energyShift: number; // -2 to +2
    emotionShift: number; // -2 to +2
  };
  strategicGuidance: string[]; // Additional instructions based on feedback
  avoidPatterns: string[]; // Things user consistently dislikes
  emphasizePatterns: string[]; // Things user consistently loves
}

/**
 * Get the content type family for cross-learning
 */
function getContentTypeFamily(contentType: ContentType): string | null {
  for (const [family, types] of Object.entries(CONTENT_TYPE_FAMILIES)) {
    if (types.includes(contentType)) {
      return family;
    }
  }
  return null;
}

/**
 * Get all content types in the same family
 */
function getFamilyContentTypes(contentType: ContentType): string[] {
  const family = getContentTypeFamily(contentType);
  if (!family) return [contentType];
  return CONTENT_TYPE_FAMILIES[family] || [contentType];
}

export class AdaptiveLearningService {
  
  /**
   * Get learning insights for UI display
   */
  static async getLearningInsights(userId: string): Promise<LearningInsights> {
    // Fetch all rated generations (last 50)
    const { data: generations, error } = await supabase
      .from('ai_copy_generations')
      .select('user_rating, feedback_tags, content_type, created_at')
      .eq('user_id', userId)
      .not('user_rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error || !generations || generations.length < 3) {
      return DEFAULT_LEARNING_INSIGHTS;
    }
    
    const totalRated = generations.length;
    const avgRating = generations.reduce((sum, g) => sum + (g.user_rating || 0), 0) / totalRated;
    
    // Calculate rating trend (compare first half to second half)
    const halfPoint = Math.floor(totalRated / 2);
    const recentAvg = generations.slice(0, halfPoint).reduce((sum, g) => sum + (g.user_rating || 0), 0) / Math.max(halfPoint, 1);
    const olderAvg = generations.slice(halfPoint).reduce((sum, g) => sum + (g.user_rating || 0), 0) / Math.max(totalRated - halfPoint, 1);
    
    let ratingTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAvg > olderAvg + 0.5) ratingTrend = 'improving';
    else if (recentAvg < olderAvg - 0.5) ratingTrend = 'declining';
    
    // Collect all feedback tags
    const allTags: string[] = [];
    generations.forEach(g => {
      if (g.feedback_tags && Array.isArray(g.feedback_tags)) {
        allTags.push(...g.feedback_tags);
      }
    });
    
    // Count tag frequency
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Separate positive (from high ratings) and negative (from low ratings) patterns
    const lowRatedGens = generations.filter(g => (g.user_rating || 0) < 7);
    const highRatedGens = generations.filter(g => (g.user_rating || 0) >= 8);
    
    // Avoid patterns from low ratings
    const lowRatedTags: string[] = [];
    lowRatedGens.forEach(g => {
      if (g.feedback_tags && Array.isArray(g.feedback_tags)) {
        lowRatedTags.push(...g.feedback_tags);
      }
    });
    
    const lowTagCounts = lowRatedTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avoidPatterns = Object.entries(lowTagCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    // Emphasize patterns from high ratings
    const highRatedTags: string[] = [];
    highRatedGens.forEach(g => {
      if (g.feedback_tags && Array.isArray(g.feedback_tags)) {
        highRatedTags.push(...g.feedback_tags);
      }
    });
    
    const highTagCounts = highRatedTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const emphasizePatterns = Object.entries(highTagCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    // Generate human-readable adjustments
    const keyAdjustments: string[] = [];
    avoidPatterns.slice(0, 3).forEach(tag => {
      keyAdjustments.push(getAdjustmentDescription(tag));
    });
    emphasizePatterns.slice(0, 2).forEach(tag => {
      keyAdjustments.push(getAdjustmentDescription(tag));
    });
    
    // Strength areas (positive tags that appear frequently)
    const strengthAreas = emphasizePatterns.map(tag => getAdjustmentDescription(tag));
    
    return {
      totalRated,
      avgRating,
      ratingTrend,
      keyAdjustments,
      avoidPatterns,
      emphasizePatterns,
      strengthAreas,
      hasEnoughData: totalRated >= 3,
    };
  }

  /**
   * Get global learnings across all content types
   */
  static async getGlobalLearnings(userId: string): Promise<GlobalLearnings | null> {
    const { data: generations, error } = await supabase
      .from('ai_copy_generations')
      .select('user_rating, feedback_tags, content_type, created_at')
      .eq('user_id', userId)
      .not('user_rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error || !generations || generations.length < 3) {
      return null;
    }
    
    // Collect all feedback tags from rated generations
    const allTags: string[] = [];
    const lowRatedTags: string[] = [];
    const highRatedTags: string[] = [];
    
    generations.forEach(g => {
      if (g.feedback_tags && Array.isArray(g.feedback_tags)) {
        allTags.push(...g.feedback_tags);
        if ((g.user_rating || 0) < 7) {
          lowRatedTags.push(...g.feedback_tags);
        } else if ((g.user_rating || 0) >= 8) {
          highRatedTags.push(...g.feedback_tags);
        }
      }
    });
    
    // Count universal tags only
    const universalLowTags = lowRatedTags.filter(t => UNIVERSAL_LEARNING_TAGS.includes(t));
    const universalHighTags = highRatedTags.filter(t => UNIVERSAL_LEARNING_TAGS.includes(t));
    
    // Determine preferences
    let formalityPreference: 'more_casual' | 'more_formal' | 'balanced' = 'balanced';
    const formalCount = universalLowTags.filter(t => t === 'too_formal').length;
    const casualCount = universalLowTags.filter(t => t === 'too_casual').length;
    if (formalCount > casualCount + 1) formalityPreference = 'more_casual';
    else if (casualCount > formalCount + 1) formalityPreference = 'more_formal';
    
    let toneAlignment: 'excellent' | 'good' | 'needs_work' = 'good';
    const toneIssues = universalLowTags.filter(t => t === 'wrong_tone' || t === 'off_brand').length;
    const toneSuccess = universalHighTags.filter(t => t === 'perfect_tone' || t === 'on_brand' || t === 'natural_voice').length;
    if (toneSuccess > toneIssues + 2) toneAlignment = 'excellent';
    else if (toneIssues > toneSuccess + 2) toneAlignment = 'needs_work';
    
    // Common issues and success factors
    const tagCounts = (tags: string[]) => tags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const lowCounts = tagCounts(lowRatedTags);
    const highCounts = tagCounts(highRatedTags);
    
    const commonIssues = Object.entries(lowCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    const successFactors = Object.entries(highCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    return {
      universalPatterns: {
        formalityPreference,
        toneAlignment,
        lengthPreference: 'just_right', // Could be expanded
        emotionLevel: 'balanced',
      },
      successFactors,
      commonIssues,
      totalRatedAcrossTypes: generations.length,
    };
  }
  
  /**
   * Analyze user's feedback patterns for a specific content type
   * NOW WITH CROSS-CONTENT-TYPE LEARNING
   */
  static async analyzeFeedbackPatterns(
    userId: string, 
    contentType: ContentType
  ): Promise<FeedbackPattern | null> {
    // Get all content types in the same family for cross-learning
    const familyTypes = getFamilyContentTypes(contentType);
    
    // Get all rated generations for this content type family
    const { data: generations, error } = await supabase
      .from('ai_copy_generations')
      .select('user_rating, feedback_tags, feedback_text, content_type, created_at')
      .eq('user_id', userId)
      .in('content_type', familyTypes)
      .not('user_rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30); // Increased limit for family learning
    
    // Also get global learnings for universal patterns
    const globalLearnings = await this.getGlobalLearnings(userId);
    
    if (error || !generations || generations.length === 0) {
      // Even without type-specific data, apply global learnings
      if (globalLearnings && globalLearnings.totalRatedAcrossTypes >= 3) {
        return {
          contentType,
          avgRating: 0,
          totalGenerations: 0,
          commonIssues: globalLearnings.commonIssues.filter(t => UNIVERSAL_LEARNING_TAGS.includes(t)),
          improvementAreas: [],
          successFactors: globalLearnings.successFactors.filter(t => UNIVERSAL_LEARNING_TAGS.includes(t)),
        };
      }
      return null;
    }
    
    // Calculate average rating
    const avgRating = generations.reduce((sum, g) => sum + (g.user_rating || 0), 0) / generations.length;
    
    // Collect all feedback tags
    const allTags: string[] = [];
    generations.forEach(g => {
      if (g.feedback_tags && Array.isArray(g.feedback_tags)) {
        allTags.push(...g.feedback_tags);
      }
    });
    
    // Add universal learnings from global patterns
    if (globalLearnings) {
      globalLearnings.commonIssues
        .filter(t => UNIVERSAL_LEARNING_TAGS.includes(t))
        .forEach(t => allTags.push(t));
    }
    
    // Count tag frequency
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get most common issues (tags from low-rated generations)
    const lowRatedGens = generations.filter(g => (g.user_rating || 0) < 7);
    const lowRatedTags: string[] = [];
    lowRatedGens.forEach(g => {
      if (g.feedback_tags && Array.isArray(g.feedback_tags)) {
        lowRatedTags.push(...g.feedback_tags);
      }
    });
    
    const lowRatedTagCounts = lowRatedTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Most common issues (appear in >30% of low-rated generations)
    const commonIssues = Object.entries(lowRatedTagCounts)
      .filter(([_, count]) => count >= Math.max(2, lowRatedGens.length * 0.3))
      .map(([tag]) => tag)
      .sort((a, b) => lowRatedTagCounts[b] - lowRatedTagCounts[a]);
    
    // Success factors (tags from high-rated generations)
    const highRatedGens = generations.filter(g => (g.user_rating || 0) >= 8);
    const highRatedTags: string[] = [];
    highRatedGens.forEach(g => {
      if (g.feedback_tags && Array.isArray(g.feedback_tags)) {
        highRatedTags.push(...g.feedback_tags);
      }
    });
    
    // Add global success factors
    if (globalLearnings) {
      globalLearnings.successFactors
        .filter(t => UNIVERSAL_LEARNING_TAGS.includes(t))
        .forEach(t => highRatedTags.push(t));
    }
    
    const highRatedTagCounts = highRatedTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Success factors (appear in >40% of high-rated generations)
    const successFactors = Object.entries(highRatedTagCounts)
      .filter(([_, count]) => count >= Math.max(2, highRatedGens.length * 0.4))
      .map(([tag]) => tag)
      .sort((a, b) => highRatedTagCounts[b] - highRatedTagCounts[a]);
    
    // Improvement areas (issues that haven't been resolved)
    const recentIssues = lowRatedGens.slice(0, 5).flatMap(g => g.feedback_tags || []);
    const improvementAreas = [...new Set(recentIssues)];
    
    return {
      contentType,
      avgRating,
      totalGenerations: generations.length,
      commonIssues,
      improvementAreas,
      successFactors,
    };
  }
  
  /**
   * Generate adaptive parameters based on feedback patterns
   */
  static generateAdaptiveParams(pattern: FeedbackPattern | null): AdaptiveParams {
    const defaultParams: AdaptiveParams = {
      temperatureAdjustment: 0,
      toneShift: {
        formalityShift: 0,
        energyShift: 0,
        emotionShift: 0,
      },
      strategicGuidance: [],
      avoidPatterns: [],
      emphasizePatterns: [],
    };
    
    if (!pattern || pattern.totalGenerations < 3) {
      return defaultParams;
    }
    
    const params = { ...defaultParams };
    params.toneShift = { ...defaultParams.toneShift };
    params.strategicGuidance = [];
    params.avoidPatterns = [];
    params.emphasizePatterns = [];
    
    // Temperature adjustments based on common issues
    if (pattern.commonIssues.includes('too_formal')) {
      params.temperatureAdjustment += 0.1;
      params.toneShift.formalityShift = -1;
      params.strategicGuidance.push('USER PREFERENCE: Write more casually than voice samples suggest. Be conversational, almost informal.');
    }
    
    if (pattern.commonIssues.includes('too_casual')) {
      params.temperatureAdjustment -= 0.1;
      params.toneShift.formalityShift = +1;
      params.strategicGuidance.push('USER PREFERENCE: Be more professional and polished than voice samples suggest.');
    }
    
    if (pattern.commonIssues.includes('too_long')) {
      params.strategicGuidance.push('USER PREFERENCE: Be CONCISE. Cut 20% from typical length. Get to the point faster.');
      params.avoidPatterns.push('Long paragraphs');
    }
    
    if (pattern.commonIssues.includes('too_short')) {
      params.strategicGuidance.push('USER PREFERENCE: Expand more. Add more detail, examples, and depth than usual.');
    }
    
    if (pattern.commonIssues.includes('needs_more_emotion')) {
      params.temperatureAdjustment += 0.15;
      params.toneShift.emotionShift = +2;
      params.strategicGuidance.push('USER PREFERENCE: Be MORE emotional and expressive than voice samples show. Share feelings, use vivid language, connect emotionally.');
    }
    
    if (pattern.commonIssues.includes('too_salesy')) {
      params.strategicGuidance.push('USER PREFERENCE: REDUCE sales language. Be more educational and helpful, less pushy. Soft sell only.');
      params.avoidPatterns.push('Hard CTAs', 'Urgent language', 'Scarcity tactics');
    }
    
    if (pattern.commonIssues.includes('bland_generic')) {
      params.temperatureAdjustment += 0.2;
      params.strategicGuidance.push('USER PREFERENCE: Be MORE specific and unique. Use concrete details, unusual angles, distinctive voice. Stand out.');
    }
    
    if (pattern.commonIssues.includes('wrong_tone') || pattern.commonIssues.includes('off_brand')) {
      params.strategicGuidance.push('USER PREFERENCE: Voice match is off. Study the writing samples more carefully and match the exact tone, not just the words.');
    }
    
    if (pattern.commonIssues.includes('missing_cta')) {
      params.strategicGuidance.push('USER PREFERENCE: Always include a CLEAR call-to-action. Tell them exactly what to do next.');
    }
    
    if (pattern.commonIssues.includes('weak_hook')) {
      params.strategicGuidance.push('USER PREFERENCE: Prioritize STRONG opening hooks. First sentence must grab attention.');
      params.emphasizePatterns.push('Strong opening hooks');
    }
    
    if (pattern.commonIssues.includes('confusing_structure')) {
      params.strategicGuidance.push('USER PREFERENCE: Use clear, logical structure. Make it easy to follow.');
    }
    
    // Success factors (emphasize what works) - EXPANDED
    if (pattern.successFactors.includes('great_hook')) {
      params.emphasizePatterns.push('Strong hooks');
      params.strategicGuidance.push('USER LOVES: Strong, attention-grabbing hooks. Prioritize this.');
    }
    
    if (pattern.successFactors.includes('perfect_tone') || pattern.successFactors.includes('natural_voice')) {
      params.strategicGuidance.push('SUCCESS: Voice match is excellent. Maintain this approach.');
    }
    
    if (pattern.successFactors.includes('love_the_story')) {
      params.emphasizePatterns.push('Storytelling');
      params.strategicGuidance.push('USER LOVES: Stories and personal examples. Use more narrative.');
    }
    
    if (pattern.successFactors.includes('excellent_cta')) {
      params.emphasizePatterns.push('Clear CTAs');
      params.strategicGuidance.push('USER LOVES: Your CTA style is working. Maintain it.');
    }
    
    if (pattern.successFactors.includes('love_the_specifics')) {
      params.emphasizePatterns.push('Specific numbers and examples');
      params.strategicGuidance.push('USER LOVES: Concrete details and specific numbers. Always include.');
    }
    
    if (pattern.successFactors.includes('on_brand')) {
      params.strategicGuidance.push('SUCCESS: Brand alignment is excellent. Keep this approach.');
    }
    
    if (pattern.successFactors.includes('great_structure')) {
      params.emphasizePatterns.push('Clear structure');
      params.strategicGuidance.push('USER LOVES: Your structural approach is working. Maintain it.');
    }
    
    if (pattern.successFactors.includes('perfect_emotion')) {
      params.strategicGuidance.push('SUCCESS: Emotional level is just right. Maintain this balance.');
    }
    
    if (pattern.successFactors.includes('great_length')) {
      params.strategicGuidance.push('SUCCESS: Content length is perfect. Keep this balance.');
    }
    
    // Overall rating adjustments
    if (pattern.avgRating < 6) {
      params.strategicGuidance.push('CRITICAL: Recent ratings have been low. Take extra care with voice matching and strategy alignment.');
    }
    
    if (pattern.avgRating >= 8.5) {
      params.strategicGuidance.push('SUCCESS: User loves this style. Maintain current approach.');
    }
    
    // Cap temperature adjustments
    params.temperatureAdjustment = Math.max(-0.2, Math.min(0.2, params.temperatureAdjustment));
    
    return params;
  }
  
  /**
   * Build adaptive system prompt additions based on learned patterns
   */
  static buildAdaptivePromptAdditions(params: AdaptiveParams): string {
    if (params.strategicGuidance.length === 0 && params.avoidPatterns.length === 0 && params.emphasizePatterns.length === 0) {
      return '';
    }
    
    let prompt = '\n\n=== ADAPTIVE LEARNING ADJUSTMENTS ===\n';
    prompt += 'Based on this user\'s past feedback, make these adjustments:\n\n';
    
    if (params.strategicGuidance.length > 0) {
      prompt += 'STRATEGIC ADJUSTMENTS:\n';
      params.strategicGuidance.forEach(guide => {
        prompt += `- ${guide}\n`;
      });
      prompt += '\n';
    }
    
    if (params.avoidPatterns.length > 0) {
      prompt += 'AVOID (user dislikes these):\n';
      params.avoidPatterns.forEach(pattern => {
        prompt += `❌ ${pattern}\n`;
      });
      prompt += '\n';
    }
    
    if (params.emphasizePatterns.length > 0) {
      prompt += 'EMPHASIZE (user loves these):\n';
      params.emphasizePatterns.forEach(pattern => {
        prompt += `✓ ${pattern}\n`;
      });
      prompt += '\n';
    }
    
    if (params.toneShift.formalityShift !== 0 || params.toneShift.energyShift !== 0 || params.toneShift.emotionShift !== 0) {
      prompt += 'TONE ADJUSTMENTS (from voice profile baseline):\n';
      
      if (params.toneShift.formalityShift !== 0) {
        prompt += `- Formality: ${params.toneShift.formalityShift > 0 ? '+' : ''}${params.toneShift.formalityShift} ${params.toneShift.formalityShift > 0 ? '(more professional)' : '(more casual)'}\n`;
      }
      
      if (params.toneShift.energyShift !== 0) {
        prompt += `- Energy: ${params.toneShift.energyShift > 0 ? '+' : ''}${params.toneShift.energyShift} ${params.toneShift.energyShift > 0 ? '(higher energy)' : '(calmer)'}\n`;
      }
      
      if (params.toneShift.emotionShift !== 0) {
        prompt += `- Emotion: ${params.toneShift.emotionShift > 0 ? '+' : ''}${params.toneShift.emotionShift} ${params.toneShift.emotionShift > 0 ? '(more expressive)' : '(more neutral)'}\n`;
      }
      
      prompt += '\n';
    }
    
    prompt += 'CRITICAL: These adjustments take precedence over voice profile defaults. The user has trained you through feedback.\n';
    
    return prompt;
  }
}

export default AdaptiveLearningService;
