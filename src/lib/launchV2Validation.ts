// Launch Planner V2 Validation
import { LaunchWizardV2Data } from '@/types/launchV2';

/**
 * Validates a specific step of the Launch Wizard V2
 * Returns true if the step has enough data to proceed
 */
export function validateLaunchV2Step(step: number, data: Record<string, unknown>): boolean {
  const d = data as LaunchWizardV2Data;
  
  switch (step) {
    case 1: // Launch Context
      // Require experience level and offer type
      if (!d.launchExperience) return false;
      if (!d.offerType) return false;
      if (d.offerType === 'other' && !d.otherOfferType?.trim()) return false;
      if (!d.emailListStatus) return false;
      return true;
      
    case 2: // Goal & Timeline
      // Require timeline selection and cart open date
      if (!d.launchTimeline) return false;
      if (!d.cartOpensDate) return false;
      if (!d.revenueGoalTier) return false;
      return true;
      
    case 3: // Offer Details
      // Require name and price
      if (!d.name?.trim() || d.name.trim().length < 3) return false;
      if (!d.pricePoint || d.pricePoint <= 0) return false;
      // If limited spots, require the number
      if (d.hasLimitations === 'limited-spots' && (!d.spotLimit || d.spotLimit <= 0)) return false;
      return true;
      
    case 4: // Pre-Launch Strategy
      // Require reach method and content status
      if (!d.mainReachMethod) return false;
      if (d.mainReachMethod === 'social' && !d.socialPlatform?.trim()) return false;
      if (!d.contentCreationStatus) return false;
      if (!d.contentVolume) return false;
      return true;
      
    case 5: // Launch Week Strategy
      // Require launch method and offer frequency
      if (!d.launchMethod) return false;
      if (!d.offerFrequency) return false;
      if (!d.liveComponent) return false;
      return true;
      
    case 6: // Post-Launch Strategy
      // Require promotion duration and follow-up selection
      if (!d.promotionDuration) return false;
      if (!d.followUpWillingness) return false;
      return true;
      
    case 7: // Contingency Planning
      // Require at least acknowledging the fear question
      if (d.biggestFears.length === 0) return false;
      // If they didn't select "no-fear", require meaning and plan
      if (!d.biggestFears.includes('no-fear')) {
        if (!d.zeroSalesMeaning) return false;
        if (!d.zeroSalesPlan) return false;
      }
      return true;
      
    case 8: // THE GAP Check (conditional step)
      // If GAP overlap detected, require acknowledgment
      if (d.gapOverlapDetected && !d.gapAcknowledged) return false;
      if (d.gapOverlapDetected && d.gapAcknowledged && !d.gapSupportType) return false;
      // If no GAP overlap, always valid
      return true;
      
    case 9: // Review & Complete
      // Require readiness score and what they need
      if (d.readinessScore < 1 || d.readinessScore > 10) return false;
      if (!d.whatYouNeed) return false;
      return true;
      
    default:
      return true;
  }
}

/**
 * Gets validation errors for a specific step (for inline feedback)
 */
export function getStepValidationErrors(step: number, data: LaunchWizardV2Data): string[] {
  const errors: string[] = [];
  
  switch (step) {
    case 1:
      if (!data.launchExperience) errors.push('Select your launch experience level');
      if (!data.offerType) errors.push('Select what type of offer you\'re launching');
      if (data.offerType === 'other' && !data.otherOfferType?.trim()) {
        errors.push('Please describe your offer type');
      }
      if (!data.emailListStatus) errors.push('Select your email list status');
      break;
      
    case 2:
      if (!data.launchTimeline) errors.push('Select your launch timeline');
      if (!data.cartOpensDate) errors.push('Select when your cart opens');
      if (!data.revenueGoalTier) errors.push('Select your revenue goal tier');
      break;
      
    case 3:
      if (!data.name?.trim() || data.name.trim().length < 3) {
        errors.push('Enter a launch name (at least 3 characters)');
      }
      if (!data.pricePoint || data.pricePoint <= 0) {
        errors.push('Enter your price point');
      }
      if (data.hasLimitations === 'limited-spots' && (!data.spotLimit || data.spotLimit <= 0)) {
        errors.push('Enter the number of available spots');
      }
      break;
      
    case 4:
      if (!data.mainReachMethod) errors.push('Select your main way to reach people');
      if (data.mainReachMethod === 'social' && !data.socialPlatform?.trim()) {
        errors.push('Specify which social platform');
      }
      if (!data.contentCreationStatus) errors.push('Select your content creation status');
      if (!data.contentVolume) errors.push('Select your content volume');
      break;
      
    case 5:
      if (!data.launchMethod) errors.push('Select how you\'ll launch');
      if (!data.offerFrequency) errors.push('Select how often you\'ll make offers');
      if (!data.liveComponent) errors.push('Select if you\'re doing a live component');
      break;
      
    case 6:
      if (!data.promotionDuration) errors.push('Select how long your promotion will run');
      if (!data.followUpWillingness) errors.push('Select your follow-up approach');
      break;
      
    case 7:
      if (data.biggestFears.length === 0) {
        errors.push('Select at least one fear (or "I have no fear")');
      }
      if (!data.biggestFears.includes('no-fear')) {
        if (!data.zeroSalesMeaning) errors.push('Select what zero sales would mean to you');
        if (!data.zeroSalesPlan) errors.push('Select what you\'ll do if nobody buys');
      }
      break;
      
    case 8:
      if (data.gapOverlapDetected && !data.gapAcknowledged) {
        errors.push('Acknowledge THE GAP overlap to continue');
      }
      if (data.gapOverlapDetected && data.gapAcknowledged && !data.gapSupportType) {
        errors.push('Select what support would help during THE GAP');
      }
      break;
      
    case 9:
      if (data.readinessScore < 1 || data.readinessScore > 10) {
        errors.push('Rate your readiness from 1-10');
      }
      if (!data.whatYouNeed) errors.push('Select what you need most');
      break;
  }
  
  return errors;
}

/**
 * Calculate cart close date based on timeline selection
 */
export function calculateCartCloseDate(cartOpens: string, timeline: string): string {
  if (!cartOpens || !timeline) return '';
  
  const openDate = new Date(cartOpens);
  if (isNaN(openDate.getTime())) return '';
  
  let daysToAdd = 7; // default
  switch (timeline) {
    case '2-weeks':
      daysToAdd = 7; // 1 week cart open is typical for 2-week launch
      break;
    case '3-4-weeks':
      daysToAdd = 7;
      break;
    case '5-6-weeks':
      daysToAdd = 10;
      break;
  }
  
  const closeDate = new Date(openDate);
  closeDate.setDate(closeDate.getDate() + daysToAdd);
  
  return closeDate.toISOString().split('T')[0];
}

/**
 * Calculate revenue goal from tier
 */
export function getRevenueFromTier(tier: string): number | null {
  switch (tier) {
    case 'first-sale': return 500;
    case '500-1000': return 750;
    case '1000-2500': return 1750;
    case '2500-plus': return 5000;
    case 'testing': return null;
    default: return null;
  }
}

/**
 * Calculate sales needed based on revenue goal and price
 */
export function calculateSalesNeeded(revenueGoal: number | null, pricePoint: number | null): number {
  if (!revenueGoal || !pricePoint || pricePoint <= 0) return 0;
  return Math.ceil(revenueGoal / pricePoint);
}
