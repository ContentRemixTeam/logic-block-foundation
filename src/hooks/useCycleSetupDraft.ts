import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getStorageItem, setStorageItemWithReceipt, removeStorageItem } from '@/lib/storage';
import { beginDraftVersion, ownsDraftVersion, parseValidDraftTimestamp } from '@/lib/draftSyncOwnership';
import type { CyclePlanDraftIdentity } from '@/lib/cyclePlanReconciliation';
import { clearCycleDraftAfterReceipt } from '@/lib/cycleDraftCleanup';
import {
  cycleDraftStorageKey,
  clearCycleDraftConflictBlock,
  CycleDraftCloudSaveCoordinator,
  cycleDraftRevisionsDiverge,
  isCycleDraftConflictBlocked,
  markCycleDraftConflictBlocked,
  quarantineLegacyGlobalCycleDraft,
  type CycleCloudIssue,
  type HabitDraft,
  type SupportingProjectDraft,
} from '@/lib/cycleSetupPersistence';

const DRAFT_MAX_AGE_DAYS = 14; // Drafts expire after 14 days

interface CloudDraftSnapshot {
  draft_id: string;
  expected_updated_at: string;
  draft_revision: string | null;
  logical_plan_key: string | null;
  request_id: string | null;
}

interface LocalDraftSnapshot {
  draft_revision: string | null;
  last_saved: string;
  logical_plan_key: string | null;
  request_id: string | null;
}

interface DraftClearExpectation {
  cloudKnown: boolean;
  cloud: CloudDraftSnapshot | null;
  local: LocalDraftSnapshot | null;
}

const emptyClearExpectation = (): DraftClearExpectation => ({
  cloudKnown: false,
  cloud: null,
  local: null,
});

function localSnapshot(value: CycleSetupDraft): LocalDraftSnapshot | null {
  if (!parseValidDraftTimestamp(value.lastSaved)) return null;
  return {
    draft_revision: value.draftRevision || null,
    last_saved: value.lastSaved,
    logical_plan_key: value.reconciliation?.logical_plan_key || null,
    request_id: value.reconciliation?.request_id || null,
  };
}

function cloudSnapshot(value: Record<string, unknown>): CloudDraftSnapshot | null {
  if (typeof value.id !== 'string' || !parseValidDraftTimestamp(value.updated_at)) return null;
  return {
    draft_id: value.id,
    expected_updated_at: value.updated_at as string,
    draft_revision: typeof value.draft_revision === 'string' ? value.draft_revision : null,
    logical_plan_key: typeof value.logical_plan_key === 'string' ? value.logical_plan_key : null,
    request_id: typeof value.request_id === 'string' ? value.request_id : null,
  };
}

function sameLocalSnapshot(current: CycleSetupDraft, expected: LocalDraftSnapshot): boolean {
  const actual = localSnapshot(current);
  if (!actual) return false;
  if (expected.draft_revision || actual.draft_revision) {
    return expected.draft_revision === actual.draft_revision;
  }
  return expected.last_saved === actual.last_saved
    && expected.logical_plan_key === actual.logical_plan_key
    && expected.request_id === actual.request_id;
}

// Check if draft is expired
const isDraftExpired = (updatedAt: string): boolean => {
  const draftDate = parseValidDraftTimestamp(updatedAt);
  if (!draftDate) return true;
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
  /** Durable cloud-backed save identities; browser storage is only a cache. */
  reconciliation?: CyclePlanDraftIdentity;
  /** Changes on every browser save and makes cross-tab cleanup conditional. */
  draftRevision?: string;
  /** Persists a typed CAS conflict across remount until authoritative reload. */
  cloudSyncState?: 'conflict_blocked';
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
  projects: SupportingProjectDraft[];
  habits: HabitDraft[];
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
  projects: [{ id: 'slot-1', name: '' }],
  habits: [{ id: 'slot-1', name: '', category: '' }],
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
  const userId = user?.id ?? null;
  const storageKey = userId ? cycleDraftStorageKey(userId) : null;
  const [hasDraft, setHasDraft] = useState(false);
  const [draftOwnerId, setDraftOwnerId] = useState<string | null>(null);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastServerSync, setLastServerSync] = useState<Date | null>(null);
  const [cloudIssue, setCloudIssue] = useState<CycleCloudIssue>(null);
  const [draftDiscoveryState, setDraftDiscoveryState] = useState<'checking' | 'ready' | 'failed'>('checking');
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const cloudSaveCoordinatorRef = useRef(new CycleDraftCloudSaveCoordinator<CloudDraftSnapshot>());
  const draftVersionRef = useRef(0);
  const activeUserIdRef = useRef<string | null>(userId);
  activeUserIdRef.current = userId;
  const clearExpectationRef = useRef<DraftClearExpectation>(emptyClearExpectation());

  // Check for existing draft on mount (both localStorage and server)
  useEffect(() => {
    const checkDrafts = async () => {
      quarantineLegacyGlobalCycleDraft(removeStorageItem);
      setDraftOwnerId(userId);
      setHasDraft(false);
      setDraftTimestamp(null);
      setLastServerSync(null);
      setIsSyncing(false);
      setCloudIssue(null);
      cloudSaveCoordinatorRef.current = new CycleDraftCloudSaveCoordinator<CloudDraftSnapshot>();
      clearExpectationRef.current = emptyClearExpectation();
      setDraftDiscoveryState('checking');
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      const checkedVersion = beginDraftVersion(draftVersionRef);
      let localTimestamp: Date | null = null;
      let localDraft: CycleSetupDraft | null = null;
      // Check localStorage first
      try {
        const stored = storageKey ? getStorageItem(storageKey) : null;
        if (stored) {
          const draft = JSON.parse(stored) as CycleSetupDraft;
          localDraft = draft;
          localTimestamp = parseValidDraftTimestamp(draft.lastSaved);
          if (localTimestamp) {
            clearExpectationRef.current.local = localSnapshot(draft);
            setHasDraft(true);
            setDraftTimestamp(draft.lastSaved);
          } else {
            if (storageKey) removeStorageItem(storageKey);
          }
        }
      } catch (e) {
        console.error('Error checking localStorage draft:', e);
      }

      // Then check server if user is logged in
      if (userId) {
        try {
          const { data, error } = await supabase.functions.invoke('get-cycle-draft');
          if (error) throw error;
          if (!ownsDraftVersion(draftVersionRef, checkedVersion)) return;
          clearExpectationRef.current.cloudKnown = true;
          if (data?.draft) {
            const serverTimestamp = parseValidDraftTimestamp(data.draft.updated_at);
            if (!serverTimestamp) throw new Error('Cloud draft returned an invalid timestamp.');
            const snapshot = cloudSnapshot(data.draft as Record<string, unknown>);
            if (!snapshot) throw new Error('Cloud draft returned no conditional deletion receipt.');
            clearExpectationRef.current.cloud = snapshot;
            const conflictBlocked = isCycleDraftConflictBlocked(localDraft)
              || cycleDraftRevisionsDiverge(localDraft?.draftRevision, snapshot.draft_revision);
            if (conflictBlocked) {
              cloudSaveCoordinatorRef.current.blockConflict();
              clearExpectationRef.current.cloudKnown = false;
              setCloudIssue('conflict_blocked');
            } else {
              cloudSaveCoordinatorRef.current.reload(snapshot);
            }
            if (!conflictBlocked && (!localTimestamp || serverTimestamp > localTimestamp)) {
              setHasDraft(true);
              setDraftTimestamp(data.draft.updated_at);
              setLastServerSync(serverTimestamp);
            }
          } else {
            clearExpectationRef.current.cloud = null;
            if (isCycleDraftConflictBlocked(localDraft)) {
              cloudSaveCoordinatorRef.current.blockConflict();
              clearExpectationRef.current.cloudKnown = false;
              setCloudIssue('conflict_blocked');
            } else {
              cloudSaveCoordinatorRef.current.reload(null);
            }
          }
          if (ownsDraftVersion(draftVersionRef, checkedVersion)) setDraftDiscoveryState('ready');
        } catch (e) {
          if (!ownsDraftVersion(draftVersionRef, checkedVersion)) return;
          clearExpectationRef.current.cloudKnown = false;
          if (ownsDraftVersion(draftVersionRef, checkedVersion)) {
            setDraftDiscoveryState('failed');
            setCloudIssue(isCycleDraftConflictBlocked(localDraft) ? 'conflict_blocked' : 'cloud_error');
          }
          console.error('Error checking server draft:', e);
        }
      } else if (ownsDraftVersion(draftVersionRef, checkedVersion)) {
        clearExpectationRef.current.cloudKnown = false;
        setDraftDiscoveryState('ready');
      }
    };

    checkDrafts();
  }, [storageKey, userId]);

  const writeServerDraft = useCallback(async (data: Partial<CycleSetupDraft>, version: number) => {
    if (!user || !ownsDraftVersion(draftVersionRef, version)) return;
    const writeUserId = user.id;
    setIsSyncing(true);
    try {
      const outcome = await cloudSaveCoordinatorRef.current.enqueue(async (expected) => {
        const { data: result, error } = await supabase.functions.invoke('save-cycle-draft', {
          body: {
            draft_data: data,
            current_step: data.currentStep || 1,
            logical_plan_key: data.reconciliation?.logical_plan_key,
            request_id: data.reconciliation?.request_id,
            draft_revision: data.draftRevision,
            expected_draft_id: expected?.draft_id ?? null,
            expected_updated_at: expected?.expected_updated_at ?? null,
            expected_draft_revision: expected?.draft_revision ?? null,
            expect_absent: expected === null,
          },
        });
        if (result?.conflict === true) return { outcome: 'conflict' } as const;
        if (error) {
          const context = (error as { context?: Response }).context;
          if (context?.status === 409) return { outcome: 'conflict' } as const;
          throw error;
        }
        if (result?.success !== true) throw new Error('Cloud draft save returned no success receipt.');
        const snapshot = cloudSnapshot(result as Record<string, unknown>);
        if (!snapshot || snapshot.draft_revision !== data.draftRevision) {
          throw new Error('Cloud draft save returned no exact conditional receipt.');
        }
        return { outcome: 'saved', snapshot } as const;
      });
      if (activeUserIdRef.current !== writeUserId) return;
      if (outcome.outcome === 'conflict' || outcome.outcome === 'blocked') {
        clearExpectationRef.current.cloudKnown = false;
        setCloudIssue('conflict_blocked');
        const storedRecovery = storageKey ? getStorageItem(storageKey) : null;
        if (storedRecovery && storageKey) {
          try {
            const recovery = JSON.parse(storedRecovery) as CycleSetupDraft;
            const markerReceipt = setStorageItemWithReceipt(
              storageKey,
              JSON.stringify(markCycleDraftConflictBlocked(recovery)),
            );
            if (!markerReceipt.persistent) {
              console.warn('Cloud conflict marker did not persist across refresh; revision divergence remains the remount safety boundary.');
            }
          } catch (markerError) {
            console.error('Error persisting cloud conflict marker:', markerError);
          }
        }
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }
        throw new Error('Cloud backup is blocked by newer work elsewhere. Your recovery remains saved on this device; reload the cloud draft to continue syncing.');
      }
      if (outcome.outcome === 'unknown_predecessor') {
        throw new Error('Cloud draft state is not authoritative. Recovery remains on this device; reconnect and reload before syncing.');
      }
      const confirmedAt = parseValidDraftTimestamp(outcome.snapshot.expected_updated_at);
      if (!confirmedAt) throw new Error('Cloud draft save returned no valid confirmation.');
      clearExpectationRef.current = {
        ...clearExpectationRef.current,
        cloudKnown: true,
        cloud: outcome.snapshot,
      };
      if (ownsDraftVersion(draftVersionRef, version)) {
        setLastServerSync(confirmedAt);
        setCloudIssue(null);
      }
    } catch (error) {
      console.error('Error syncing to server:', error);
      if (activeUserIdRef.current !== writeUserId) throw error;
      if (cloudSaveCoordinatorRef.current.syncState !== 'conflict_blocked') {
        cloudSaveCoordinatorRef.current.markUnknown();
        clearExpectationRef.current.cloudKnown = false;
        if (ownsDraftVersion(draftVersionRef, version)) setCloudIssue('cloud_error');
      }
      throw error;
    } finally {
      if (ownsDraftVersion(draftVersionRef, version)) setIsSyncing(false);
    }
  }, [storageKey, user]);

  const queueServerSync = useCallback((data: Partial<CycleSetupDraft>, version: number): Promise<void> => {
    const syncPromise = writeServerDraft(data, version);
    syncInFlightRef.current = syncPromise;
    void syncPromise.finally(() => {
      if (syncInFlightRef.current === syncPromise) syncInFlightRef.current = null;
    }).catch(() => undefined);
    return syncPromise;
  }, [writeServerDraft]);

  // Every response is owned by the exact draft version that scheduled it.
  const syncToServer = useCallback((data: Partial<CycleSetupDraft>, version: number) => {
    if (!user) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null;
      if (ownsDraftVersion(draftVersionRef, version)) {
        void queueServerSync(data, version).catch(() => undefined);
      }
    }, 3000);
  }, [queueServerSync, user]);

  const saveDraft = useCallback(async (
    data: Partial<CycleSetupDraft>,
    immediateCloud = false,
  ): Promise<void> => {
    if (!user || !storageKey) {
      throw new Error('Sign in before saving cycle recovery. No ownerless browser draft was created.');
    }
    const version = beginDraftVersion(draftVersionRef);
    setLastServerSync(null);
    setIsSyncing(false);
    if (cloudSaveCoordinatorRef.current.syncState === 'ready') setCloudIssue(null);
    try {
      const existingDraft = getStorageItem(storageKey);
      const existing = existingDraft ? JSON.parse(existingDraft) : DEFAULT_DRAFT;
      const updated = {
        ...existing,
        ...data,
        draftRevision: crypto.randomUUID(),
        lastSaved: new Date().toISOString(),
      };
      const storageReceipt = setStorageItemWithReceipt(storageKey, JSON.stringify(updated));
      if (!storageReceipt.persistent) {
        throw new Error('This browser could not persist the draft across a refresh. Keep this page open.');
      }
      setHasDraft(true);
      setDraftTimestamp(updated.lastSaved);
      clearExpectationRef.current.local = localSnapshot(updated as CycleSetupDraft);
      if (immediateCloud && user) {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }
        await queueServerSync(updated, version);
      } else {
        syncToServer(updated, version);
      }
    } catch (e) {
      console.error('Error saving draft:', e);
      throw e;
    }
  }, [queueServerSync, storageKey, syncToServer, user]);

  const loadDraft = useCallback(async (authoritativeCloud = false): Promise<CycleSetupDraft | null> => {
    if (!user || !storageKey) return null;
    const loadVersion = draftVersionRef.current;
    // First try server if user is logged in
    if (user) {
      try {
        const { data, error } = await supabase.functions.invoke('get-cycle-draft');
        if (error) throw error;
        if (!ownsDraftVersion(draftVersionRef, loadVersion)) return null;
        clearExpectationRef.current.cloudKnown = true;
        clearExpectationRef.current.cloud = data?.draft
          ? cloudSnapshot(data.draft as Record<string, unknown>)
          : null;
        if (data?.draft && !clearExpectationRef.current.cloud) {
          throw new Error('Cloud draft returned no conditional deletion receipt.');
        }
        const cachedLocalStored = getStorageItem(storageKey);
        let cachedLocalDraft: CycleSetupDraft | null = null;
        if (cachedLocalStored) {
          const parsed = JSON.parse(cachedLocalStored) as CycleSetupDraft;
          if (!isDraftExpired(parsed.lastSaved)) cachedLocalDraft = parsed;
        }
        const cloudRevision = clearExpectationRef.current.cloud?.draft_revision;
        const remainsConflictBlocked = !authoritativeCloud && Boolean(cachedLocalDraft)
          && (isCycleDraftConflictBlocked(cachedLocalDraft)
            || cycleDraftRevisionsDiverge(cachedLocalDraft?.draftRevision, cloudRevision));
        if (remainsConflictBlocked) {
          cloudSaveCoordinatorRef.current.blockConflict();
          clearExpectationRef.current.cloudKnown = false;
          setCloudIssue('conflict_blocked');
          clearExpectationRef.current.local = localSnapshot(cachedLocalDraft as CycleSetupDraft);
          return cachedLocalDraft;
        }
        cloudSaveCoordinatorRef.current.reload(clearExpectationRef.current.cloud);
        setCloudIssue(null);
        if (data?.draft?.draft_data) {
          if (!ownsDraftVersion(draftVersionRef, loadVersion)) return null;
          const rawServerDraft = data.draft.draft_data as CycleSetupDraft;
          const serverDraft = rawServerDraft.reconciliation
            ? rawServerDraft
            : {
                ...rawServerDraft,
                reconciliation: data.draft.logical_plan_key && data.draft.request_id
                  ? {
                      logical_plan_key: data.draft.logical_plan_key,
                      request_id: data.draft.request_id,
                    }
                  : undefined,
              };
          const serverTimestamp = data.draft.updated_at;
          const serverDate = parseValidDraftTimestamp(serverTimestamp);
          if (!serverDate || isDraftExpired(serverTimestamp)) {
            console.log('Server draft expired after', DRAFT_MAX_AGE_DAYS, 'days, will clear it');
            // Don't clear yet, check local first
          } else {
            // Check localStorage for potentially newer data
            if (cachedLocalDraft) {
              const localDraft = cachedLocalDraft;
              const localTimestamp = parseValidDraftTimestamp(localDraft.lastSaved);
              
              // Check if local draft is expired
              if (isDraftExpired(localDraft.lastSaved)) {
                console.log('Local draft expired, clearing...');
                removeStorageItem(storageKey);
              } else if (!authoritativeCloud && localTimestamp && localTimestamp > serverDate) {
                return localDraft;
              }
            }
            
            // Server is newer or no local, save server draft to localStorage
            const reloadedDraft = clearCycleDraftConflictBlock({
              ...serverDraft,
              draftRevision: clearExpectationRef.current.cloud?.draft_revision ?? serverDraft.draftRevision,
              lastSaved: serverTimestamp,
            });
            const storageReceipt = setStorageItemWithReceipt(storageKey, JSON.stringify(reloadedDraft));
            if (!storageReceipt.persistent) {
              throw new Error('The authoritative cloud draft loaded, but this browser could not persist it safely.');
            }
            setLastServerSync(serverDate);
            clearExpectationRef.current.local = localSnapshot(reloadedDraft as CycleSetupDraft);
            return reloadedDraft as CycleSetupDraft;
          }
        } else if (authoritativeCloud && cachedLocalDraft) {
          const unblockedLocalDraft = clearCycleDraftConflictBlock(cachedLocalDraft) as CycleSetupDraft;
          const storageReceipt = setStorageItemWithReceipt(storageKey, JSON.stringify(unblockedLocalDraft));
          if (!storageReceipt.persistent) {
            throw new Error('Cloud state reloaded, but this browser could not persist recovery safely.');
          }
          clearExpectationRef.current.local = localSnapshot(unblockedLocalDraft);
          return null;
        }
      } catch (e) {
        if (!ownsDraftVersion(draftVersionRef, loadVersion)) return null;
        clearExpectationRef.current.cloudKnown = false;
        cloudSaveCoordinatorRef.current.markUnknown();
        console.error('Error loading server draft:', e);
        if (authoritativeCloud) {
          setCloudIssue(cloudSaveCoordinatorRef.current.syncState === 'conflict_blocked'
            ? 'conflict_blocked'
            : 'cloud_error');
          throw e;
        }
      }
    }

    if (!ownsDraftVersion(draftVersionRef, loadVersion)) return null;
    try {
      const stored = getStorageItem(storageKey);
      if (stored) {
        const localDraft = JSON.parse(stored) as CycleSetupDraft;
        
        // Check if local draft is expired
        if (isDraftExpired(localDraft.lastSaved)) {
          console.log('Local draft expired after', DRAFT_MAX_AGE_DAYS, 'days, clearing...');
          removeStorageItem(storageKey);
          setHasDraft(false);
          setDraftTimestamp(null);
          return null;
        }
        
        clearExpectationRef.current.local = localSnapshot(localDraft);
        return localDraft;
      }
    } catch (e) {
      console.error('Error loading localStorage draft:', e);
    }
    return null;
  }, [storageKey, user]);

  const clearDraft = useCallback(async (expectedIdentity?: CyclePlanDraftIdentity) => {
    if (!user || !storageKey) {
      throw new Error('Sign in before clearing cycle recovery. No ownerless browser draft was touched.');
    }
    const expected = {
      ...clearExpectationRef.current,
      cloud: clearExpectationRef.current.cloud ? { ...clearExpectationRef.current.cloud } : null,
      local: clearExpectationRef.current.local ? { ...clearExpectationRef.current.local } : null,
    };
    if (user && !expected.cloudKnown) {
      throw new Error('Cloud draft state is unknown. Recovery was preserved; reconnect and retry.');
    }
    if (expectedIdentity) {
      const identityMatches = [expected.cloud, expected.local]
        .filter((snapshot): snapshot is CloudDraftSnapshot | LocalDraftSnapshot => snapshot !== null)
        .every((snapshot) => snapshot.logical_plan_key === expectedIdentity.logical_plan_key
          && snapshot.request_id === expectedIdentity.request_id);
      if (!identityMatches) {
        throw new Error('The loaded draft no longer matches this save receipt. Recovery was preserved; reload before retrying.');
      }
    }
    beginDraftVersion(draftVersionRef);
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    if (syncInFlightRef.current) {
      await syncInFlightRef.current.catch(() => undefined);
    }
    if (user) {
      try {
        await clearCycleDraftAfterReceipt(
          () => {
            if (!expected.cloud) {
              return supabase.functions.invoke('delete-cycle-draft', { body: { expect_absent: true } });
            }
            return supabase.functions.invoke('delete-cycle-draft', { body: expected.cloud });
          },
          (data) => {
            if (!expected.cloud) {
              return Boolean((data as { verified_absent?: boolean } | null)?.verified_absent);
            }
            const receipt = data as Record<string, unknown> | null;
            return receipt?.success === true
              && receipt.deleted === true
              && receipt.draft_id === expected.cloud.draft_id
              && receipt.expected_updated_at === expected.cloud.expected_updated_at
              && (receipt.draft_revision ?? null) === expected.cloud.draft_revision;
          },
          () => {
            const stored = getStorageItem(storageKey);
            if (!expected.local) return stored === null;
            if (!stored) return true;
            let current: CycleSetupDraft;
            try {
              current = JSON.parse(stored) as CycleSetupDraft;
            } catch {
              return false;
            }
            if (!sameLocalSnapshot(current, expected.local)) return false;
            removeStorageItem(storageKey);
            return getStorageItem(storageKey) === null;
          },
        );
      } catch (error) {
        setCloudIssue('cloud_error');
        throw error;
      }
      setLastServerSync(null);
    } else {
      const stored = getStorageItem(storageKey);
      if (expected.local && stored) {
        let current: CycleSetupDraft;
        try {
          current = JSON.parse(stored) as CycleSetupDraft;
        } catch {
          throw new Error('Browser recovery could not be verified and was preserved. Reload before trying again.');
        }
        if (!sameLocalSnapshot(current, expected.local)) {
          throw new Error('A newer browser draft appeared. Recovery was preserved; reload before trying again.');
        }
        removeStorageItem(storageKey);
      } else if (!expected.local && stored) {
        throw new Error('A newer browser draft appeared. Recovery was preserved; reload before trying again.');
      }
    }
    setHasDraft(false);
    setDraftTimestamp(null);
    setCloudIssue(null);
    clearExpectationRef.current = { cloudKnown: Boolean(user), cloud: null, local: null };
  }, [storageKey, user]);

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
    hasDraft: draftOwnerId === userId ? hasDraft : false,
    draftTimestamp: draftOwnerId === userId ? draftTimestamp : null,
    saveDraft,
    loadDraft,
    clearDraft,
    getDraftAge,
    // New server sync properties
    isSyncing,
    lastServerSync,
    cloudIssue,
    draftDiscoveryState,
  };
}
