import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const DRAFT_STORAGE_KEY = 'boss-planner-cycle-setup-draft';
const DRAFT_MAX_AGE_DAYS = 14; // Drafts expire after 14 days

// Check if draft is expired
const isDraftExpired = (updatedAt: string): boolean => {
  const draftDate = new Date(updatedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - draftDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff > DRAFT_MAX_AGE_DAYS;
};

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

// Promotion interface for Step 6.5
export interface PromotionDefinition {
  name: string;
  offer: string; // Which offer they're promoting
  startDate: string;
  endDate: string;
  goal: string; // Sales goal or number of sales
  launchType: 'open-close' | 'evergreen' | 'flash-sale' | 'webinar' | 'challenge' | '';
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

// Nurture Platform interface for Step 5
export interface NurturePlatformDefinition {
  method: string;           // email, community, youtube, podcast, etc.
  methodCustom?: string;    // for "other" option
  postingDays: string[];    // ['Monday', 'Wednesday', 'Friday']
  postingTime: string;      // '09:00' or ''
  batchDay?: string;        // 'Sunday' or ''
  batchFrequency?: string;  // weekly, biweekly, monthly
  isPrimary: boolean;       // first one is always primary
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
  
  // NEW: Array of all nurture platforms (replaces primary/secondary)
  nurturePlatforms: NurturePlatformDefinition[];

  // Step 6: Offers
  // Step 6.5: Promotions & Launches
  promotions: PromotionDefinition[];

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
  metric1Goal: number | '';
  metric2Name: string;
  metric2Start: number | '';
  metric2Goal: number | '';
  metric3Name: string;
  metric3Start: number | '';
  metric3Goal: number | '';
  metric4Name: string;
  metric4Start: number | '';
  metric4Goal: number | '';
  metric5Name: string;
  metric5Start: number | '';
  metric5Goal: number | '';
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
  day1Date: string; // ISO date string for Day 1
  day1Top3: string[];
  day1Why: string;
  day2Date: string; // ISO date string for Day 2
  day2Top3: string[];
  day2Why: string;
  day3Date: string; // ISO date string for Day 3
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
  nurturePlatforms: [],
  offers: [{ name: '', price: '', frequency: '', transformation: '', isPrimary: true }],
  promotions: [],
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
  metric1Goal: '',
  metric2Name: '',
  metric2Start: '',
  metric2Goal: '',
  metric3Name: '',
  metric3Start: '',
  metric3Goal: '',
  metric4Name: '',
  metric4Start: '',
  metric4Goal: '',
  metric5Name: '',
  metric5Start: '',
  metric5Goal: '',
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
  day1Date: '', // Will be initialized from start date
  day1Top3: ['', '', ''],
  day1Why: '',
  day2Date: '',
  day2Top3: ['', '', ''],
  day2Why: '',
  day3Date: '',
  day3Top3: ['', '', ''],
  day3Why: '',
  currentStep: 1,
  lastSaved: new Date().toISOString(),
};

export function useCycleSetupDraft() {
  const { user } = useAuth();
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastServerSync, setLastServerSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing draft on mount (both localStorage and server)
  useEffect(() => {
    const checkDrafts = async () => {
      // Check localStorage first
      try {
        const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (stored) {
          const draft = JSON.parse(stored) as CycleSetupDraft;
          setHasDraft(true);
          setDraftTimestamp(draft.lastSaved);
        }
      } catch (e) {
        console.error('Error checking localStorage draft:', e);
      }

      // Then check server if user is logged in
      if (user) {
        try {
          const { data, error } = await supabase.functions.invoke('get-cycle-draft');
          if (!error && data?.draft) {
            const serverTimestamp = new Date(data.draft.updated_at);
            const localTimestamp = draftTimestamp ? new Date(draftTimestamp) : null;
            
            // If server draft is newer, update state
            if (!localTimestamp || serverTimestamp > localTimestamp) {
              setHasDraft(true);
              setDraftTimestamp(data.draft.updated_at);
              setLastServerSync(serverTimestamp);
            }
          }
        } catch (e) {
          console.error('Error checking server draft:', e);
        }
      }
    };

    checkDrafts();
  }, [user]);

  // Sync draft to server (debounced)
  const syncToServer = useCallback(async (data: Partial<CycleSetupDraft>) => {
    if (!user) return;

    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Debounce server sync to 3 seconds
    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        const { data: result, error } = await supabase.functions.invoke('save-cycle-draft', {
          body: {
            draft_data: data,
            current_step: data.currentStep || 1,
          },
        });

        if (error) {
          console.error('Error syncing to server:', error);
          setSyncError('Failed to save to cloud');
        } else {
          setLastServerSync(new Date(result.updated_at));
          setSyncError(null);
        }
      } catch (e) {
        console.error('Error syncing to server:', e);
        setSyncError('Failed to save to cloud');
      } finally {
        setIsSyncing(false);
      }
    }, 3000);
  }, [user]);

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

      // Also sync to server
      syncToServer(updated);
    } catch (e) {
      console.error('Error saving draft:', e);
    }
  }, [syncToServer]);

  const loadDraft = useCallback(async (): Promise<CycleSetupDraft | null> => {
    // First try server if user is logged in
    if (user) {
      try {
        const { data, error } = await supabase.functions.invoke('get-cycle-draft');
        if (!error && data?.draft?.draft_data) {
          const serverDraft = data.draft.draft_data as CycleSetupDraft;
          const serverTimestamp = data.draft.updated_at;
          
          // Check if server draft is expired
          if (isDraftExpired(serverTimestamp)) {
            console.log('Server draft expired after', DRAFT_MAX_AGE_DAYS, 'days, will clear it');
            // Don't clear yet, check local first
          } else {
            // Check localStorage for potentially newer data
            const localStored = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (localStored) {
              const localDraft = JSON.parse(localStored) as CycleSetupDraft;
              const localTimestamp = new Date(localDraft.lastSaved);
              
              // Check if local draft is expired
              if (isDraftExpired(localDraft.lastSaved)) {
                console.log('Local draft expired, clearing...');
                localStorage.removeItem(DRAFT_STORAGE_KEY);
              } else if (localTimestamp > new Date(serverTimestamp)) {
                return localDraft;
              }
            }
            
            // Server is newer or no local, save server draft to localStorage
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
              ...serverDraft,
              lastSaved: serverTimestamp,
            }));
            setLastServerSync(new Date(serverTimestamp));
            return serverDraft;
          }
        }
      } catch (e) {
        console.error('Error loading server draft:', e);
      }
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        const localDraft = JSON.parse(stored) as CycleSetupDraft;
        
        // Check if local draft is expired
        if (isDraftExpired(localDraft.lastSaved)) {
          console.log('Local draft expired after', DRAFT_MAX_AGE_DAYS, 'days, clearing...');
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          setHasDraft(false);
          setDraftTimestamp(null);
          return null;
        }
        
        return localDraft;
      }
    } catch (e) {
      console.error('Error loading localStorage draft:', e);
    }
    return null;
  }, [user]);

  const clearDraft = useCallback(async () => {
    // Clear localStorage
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
      setDraftTimestamp(null);
    } catch (e) {
      console.error('Error clearing localStorage draft:', e);
    }

    // Clear server draft
    if (user) {
      try {
        await supabase.functions.invoke('delete-cycle-draft');
        setLastServerSync(null);
      } catch (e) {
        console.error('Error clearing server draft:', e);
      }
    }
  }, [user]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasDraft,
    draftTimestamp,
    saveDraft,
    loadDraft,
    clearDraft,
    getDraftAge,
    // New server sync properties
    isSyncing,
    lastServerSync,
    syncError,
  };
}
