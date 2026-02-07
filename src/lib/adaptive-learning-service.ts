// Adaptive Learning Service
// Analyzes user feedback patterns and dynamically adjusts AI generation

import { supabase } from '@/integrations/supabase/client';
import { ContentType } from '@/types/aiCopywriting';

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

export class AdaptiveLearningService {
  
  /**
   * Analyze user's feedback patterns for a specific content type
   */
  static async analyzeFeedbackPatterns(
    userId: string, 
    contentType: ContentType
  ): Promise<FeedbackPattern | null> {
    // Get all rated generations for this content type
    const { data: generations, error } = await supabase
      .from('ai_copy_generations')
      .select('user_rating, feedback_tags, feedback_text, created_at')
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .not('user_rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20); // Last 20 generations
    
    if (error || !generations || generations.length === 0) {
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
    
    if (pattern.commonIssues.includes('wrong_tone')) {
      params.strategicGuidance.push('USER PREFERENCE: Voice match is off. Study the writing samples more carefully and match the exact tone, not just the words.');
    }
    
    if (pattern.commonIssues.includes('missing_cta')) {
      params.strategicGuidance.push('USER PREFERENCE: Always include a CLEAR call-to-action. Tell them exactly what to do next.');
    }
    
    // Success factors (emphasize what works)
    if (pattern.successFactors.includes('great_hook')) {
      params.emphasizePatterns.push('Strong hooks');
      params.strategicGuidance.push('USER LOVES: Strong, attention-grabbing hooks. Prioritize this.');
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
