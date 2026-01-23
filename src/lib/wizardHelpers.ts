import { CycleWizardData, FocusArea, DiagnosticScores } from '@/types/wizard';

/**
 * Determines the focus area based on the lowest diagnostic score
 */
export function determineFocusArea(scores: DiagnosticScores): FocusArea {
  const { discover, nurture, convert } = scores;
  
  if (discover <= nurture && discover <= convert) {
    return 'discover';
  }
  if (nurture <= discover && nurture <= convert) {
    return 'nurture';
  }
  return 'convert';
}

/**
 * Validates each step of the cycle wizard
 */
export function validateCycleWizardStep(step: number, data: CycleWizardData): boolean {
  switch (step) {
    case 1: // Big Goal
      return data.goal.trim().length > 0 && data.goal.length <= 200;
    
    case 2: // Business Diagnostic
      return (
        data.diagnosticScores.discover >= 1 &&
        data.diagnosticScores.discover <= 10 &&
        data.diagnosticScores.nurture >= 1 &&
        data.diagnosticScores.nurture <= 10 &&
        data.diagnosticScores.convert >= 1 &&
        data.diagnosticScores.convert <= 10
      );
    
    case 3: // Content Foundation
      return true; // Optional step
    
    case 4: // Revenue & Metrics
      return data.offersGoal > 0;
    
    case 5: // Weekly Rhythm
      return !!data.weeklyPlanningDay && !!data.weeklyReviewDay;
    
    case 6: // Thought Work
      return true; // Encouraged but not required
    
    case 7: // Review
      return true;
    
    default:
      return true;
  }
}

/**
 * Gets step title for progress display
 */
export function getCycleWizardStepTitle(step: number): string {
  const titles: Record<number, string> = {
    1: 'Big Goal',
    2: 'Business Diagnostic',
    3: 'Content Foundation',
    4: 'Revenue & Metrics',
    5: 'Weekly Rhythm',
    6: 'Thought Work',
    7: 'Review & Create',
  };
  return titles[step] || `Step ${step}`;
}

/**
 * Extracts keywords from goal text for content search
 */
export function extractKeywordsFromGoal(goal: string): string[] {
  // Remove common words and extract meaningful keywords
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'want', 'my',
    'your', 'our', 'their', 'this', 'that', 'these', 'those', 'i', 'you',
    'we', 'they', 'it', 'more', 'most', 'some', 'any', 'no', 'not', 'only',
  ]);

  return goal
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}

/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Gets suggested daily offer count based on total goal
 */
export function getSuggestedDailyOffers(totalOffers: number): number {
  return Math.ceil(totalOffers / 90);
}

/**
 * Calculates progress percentage
 */
export function calculateProgress(currentStep: number, totalSteps: number): number {
  return Math.round((currentStep / totalSteps) * 100);
}
