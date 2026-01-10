import { useState, useEffect, useCallback } from 'react';
import { parseISO } from 'date-fns';

const DRAFT_STORAGE_KEY = 'boss-planner-cycle-setup-draft';

// Secondary platform interface for Step 4
export interface SecondaryPlatform {
  platform: string;
  contentType: string;
  frequency: string;
  goal: 'leads' | 'nurture' | 'sales' | '';
}

// Limited Time Offer interface for Step 6
export interface LimitedTimeOffer {
  id: string;
  name: string;
  offerRef?: string;  // Which core offer this promotes (optional)
  startDate: string;
  endDate: string;
  promoType: 'flash_sale' | 'week_promo' | 'launch_sequence' | 'webinar_cart' | '';
  discount?: string;
  notes?: string;
}

// Recurring Task interface for Step 8.5
export interface RecurringTaskDefinition {
  title: string;
  category: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  dayOfWeek?: string; // For weekly/biweekly (Monday, Tuesday, etc)
  dayOfMonth?: number; // For monthly (1-31)
  time?: string; // Optional time (HH:MM format)
  description?: string;
}

export interface CycleSetupDraft {
  // Step 1: Dates & Goal
  startDate: string;
  goal: string;
  why: string;
  identity: string;
  feeling: string;

  // Step 2: Business Diagnostic
  discoverScore: number;
  nurtureScore: number;
  convertScore: number;
  biggestBottleneck: string;

  // Step 3: Audience & Message
  audienceTarget: string;
  audienceFrustration: string;
  signatureMessage: string;
  keyMessage1: string;
  keyMessage2: string;
  keyMessage3: string;

  // Step 4: Lead Gen Strategy
  leadPlatform: string;
  leadContentType: string;
  leadFrequency: string;
  leadPlatformGoal: string;
  leadCommitted: boolean;
  secondaryPlatforms: SecondaryPlatform[];
  postingDays: string[];
  postingTime: string;
  batchDay: string;
  batchFrequency: string; // 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  leadGenContentAudit: string; // Existing content that can be reused

  // Step 5: Nurture Strategy
  nurtureMethod: string;
  nurtureFrequency: string;
  freeTransformation: string;
  proofMethods: string[];
  nurturePostingDays: string[]; // Days for nurture content
  nurturePostingTime: string; // Time for nurture posts
  nurtureBatchDay: string; // Day to batch nurture content
  nurtureBatchFrequency: string; // 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  nurtureContentAudit: string; // Existing nurture content to reuse

  // Step 6: Offers
  offers: Array<{
    name: string;
    price: string;
    frequency: string;
    transformation: string;
    isPrimary: boolean;
  }>;
  limitedOffers: LimitedTimeOffer[];

  // Step 7: 90-Day Breakdown
  revenueGoal: string;
  pricePerSale: string;
  launchSchedule: string;
  monthPlans: Array<{
    monthName: string;
    projects: string;
    salesPromos: string;
    mainFocus: string;
  }>;

  // Step 8: Success Metrics, Projects, Habits, Reminders, Weekly Routines
  metric1Name: string;
  metric1Start: number | '';
  metric2Name: string;
  metric2Start: number | '';
  metric3Name: string;
  metric3Start: number | '';
  projects: string[];
  habits: Array<{ name: string; category: string }>;
  thingsToRemember: string[];
  
  // Weekly Routines
  weeklyPlanningDay: string;
  weeklyDebriefDay: string;
  officeHoursStart: string;
  officeHoursEnd: string;
  officeHoursDays: string[];
  autoCreateWeeklyTasks: boolean;
  
  // Step 8.5: Recurring Tasks
  recurringTasks: RecurringTaskDefinition[];

  // Step 9: Mindset & First 3 Days
  biggestFear: string;
  whatWillYouDoWhenFearHits: string;
  commitmentStatement: string;
  whoWillHoldYouAccountable: string;
  day1Top3: string[];
  day1Why: string;
  day2Top3: string[];
  day2Why: string;
  day3Top3: string[];
  day3Why: string;

  // Metadata
  currentStep: number;
  lastSaved: string;
}

const DEFAULT_DRAFT: CycleSetupDraft = {
  startDate: new Date().toISOString(),
  goal: '',
  why: '',
  identity: '',
  feeling: '',
  discoverScore: 5,
  nurtureScore: 5,
  convertScore: 5,
  biggestBottleneck: '',
  audienceTarget: '',
  audienceFrustration: '',
  signatureMessage: '',
  keyMessage1: '',
  keyMessage2: '',
  keyMessage3: '',
  leadPlatform: '',
  leadContentType: '',
  leadFrequency: '',
  leadPlatformGoal: 'leads',
  leadCommitted: false,
  secondaryPlatforms: [],
  postingDays: [],
  postingTime: '',
  batchDay: '',
  batchFrequency: 'weekly',
  leadGenContentAudit: '',
  nurtureMethod: '',
  nurtureFrequency: '',
  freeTransformation: '',
  proofMethods: [],
  nurturePostingDays: [],
  nurturePostingTime: '',
  nurtureBatchDay: '',
  nurtureBatchFrequency: 'weekly',
  nurtureContentAudit: '',
  offers: [{ name: '', price: '', frequency: '', transformation: '', isPrimary: true }],
  limitedOffers: [],
  revenueGoal: '',
  pricePerSale: '',
  launchSchedule: '',
  monthPlans: [
    { monthName: 'Month 1', projects: '', salesPromos: '', mainFocus: '' },
    { monthName: 'Month 2', projects: '', salesPromos: '', mainFocus: '' },
    { monthName: 'Month 3', projects: '', salesPromos: '', mainFocus: '' },
  ],
  metric1Name: '',
  metric1Start: '',
  metric2Name: '',
  metric2Start: '',
  metric3Name: '',
  metric3Start: '',
  projects: [''],
  habits: [{ name: '', category: '' }],
  thingsToRemember: ['', '', ''],
  weeklyPlanningDay: '',
  weeklyDebriefDay: '',
  officeHoursStart: '09:00',
  officeHoursEnd: '17:00',
  officeHoursDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  autoCreateWeeklyTasks: true,
  // Step 8.5: Recurring Tasks
  recurringTasks: [],
  // Step 9: Mindset & First 3 Days
  biggestFear: '',
  whatWillYouDoWhenFearHits: '',
  commitmentStatement: '',
  whoWillHoldYouAccountable: '',
  day1Top3: ['', '', ''],
  day1Why: '',
  day2Top3: ['', '', ''],
  day2Why: '',
  day3Top3: ['', '', ''],
  day3Why: '',
  currentStep: 1,
  lastSaved: new Date().toISOString(),
};

export function useCycleSetupDraft() {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        const draft = JSON.parse(stored) as CycleSetupDraft;
        setHasDraft(true);
        setDraftTimestamp(draft.lastSaved);
      }
    } catch (e) {
      console.error('Error checking draft:', e);
    }
  }, []);

  const saveDraft = useCallback((data: Partial<CycleSetupDraft>) => {
    try {
      const existingDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      const existing = existingDraft ? JSON.parse(existingDraft) : DEFAULT_DRAFT;
      const updated = {
        ...existing,
        ...data,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updated));
      setHasDraft(true);
      setDraftTimestamp(updated.lastSaved);
    } catch (e) {
      console.error('Error saving draft:', e);
    }
  }, []);

  const loadDraft = useCallback((): CycleSetupDraft | null => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as CycleSetupDraft;
      }
    } catch (e) {
      console.error('Error loading draft:', e);
    }
    return null;
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
      setDraftTimestamp(null);
    } catch (e) {
      console.error('Error clearing draft:', e);
    }
  }, []);

  const getDraftAge = useCallback((): string | null => {
    if (!draftTimestamp) return null;
    
    const saved = new Date(draftTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - saved.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'just now';
  }, [draftTimestamp]);

  return {
    hasDraft,
    draftTimestamp,
    saveDraft,
    loadDraft,
    clearDraft,
    getDraftAge,
  };
}
