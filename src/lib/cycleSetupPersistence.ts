export interface SupportingProjectDraft {
  id: string;
  name: string;
}

export interface HabitDraft {
  id: string;
  name: string;
  category: string;
}

export const LEGACY_GLOBAL_CYCLE_DRAFT_KEY = 'boss-planner-cycle-setup-draft';
const CYCLE_DRAFT_STORAGE_PREFIX = `${LEGACY_GLOBAL_CYCLE_DRAFT_KEY}:user`;

export function cycleDraftStorageKey(userId: string): string {
  if (!userId) throw new Error('An authenticated user ID is required for draft recovery.');
  return `${CYCLE_DRAFT_STORAGE_PREFIX}:${userId}`;
}

/** Ownerless legacy content is deleted without reading, parsing, or displaying it. */
export function quarantineLegacyGlobalCycleDraft(removeItem: (key: string) => unknown): void {
  removeItem(LEGACY_GLOBAL_CYCLE_DRAFT_KEY);
}

export interface CycleDraftCloudBlockMetadata {
  cloudSyncState?: 'conflict_blocked';
}

export function markCycleDraftConflictBlocked<T extends object>(draft: T): T & CycleDraftCloudBlockMetadata {
  return { ...draft, cloudSyncState: 'conflict_blocked' };
}

export function clearCycleDraftConflictBlock<T extends object>(draft: T): Omit<T, 'cloudSyncState'> {
  const recovery = { ...draft } as T & CycleDraftCloudBlockMetadata;
  delete recovery.cloudSyncState;
  return recovery;
}

export function isCycleDraftConflictBlocked(draft: unknown): boolean {
  return Boolean(draft && typeof draft === 'object'
    && (draft as CycleDraftCloudBlockMetadata).cloudSyncState === 'conflict_blocked');
}

export function cycleDraftRevisionsDiverge(
  localRevision: string | null | undefined,
  cloudRevision: string | null | undefined,
): boolean {
  // A local recovery revision without matching cloud authority is still divergent.
  // This keeps a CAS loser blocked across remount even when the cloud row was deleted
  // and the conflict marker itself could not persist to localStorage.
  return Boolean(localRevision && localRevision !== cloudRevision);
}

export type CycleLocalSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type CycleCloudIssue = 'cloud_error' | 'conflict_blocked' | null;

export interface CycleSaveStatusEvidence {
  localStatus: CycleLocalSaveStatus;
  lastLocalSave: Date | null;
  isCloudSyncing: boolean;
  lastCloudSync: Date | null;
  cloudIssue: CycleCloudIssue;
}

export interface CycleSaveStatusPresentation {
  kind: 'idle' | 'saving' | 'local' | 'syncing' | 'cloud' | 'error' | 'conflict';
  message: string;
  cloudLabel: string;
}

export function getCycleSaveStatusPresentation(
  evidence: CycleSaveStatusEvidence,
): CycleSaveStatusPresentation {
  if (evidence.localStatus === 'error') {
    return {
      kind: 'error',
      message: 'Current changes are not safely saved on this device or cloud. Keep this page open and retry.',
      cloudLabel: 'Not safely saved',
    };
  }
  if (evidence.localStatus === 'saving') {
    return {
      kind: 'saving',
      message: 'Saving on this device…',
      cloudLabel: 'Cloud backup pending',
    };
  }
  if (evidence.cloudIssue === 'conflict_blocked') {
    return {
      kind: 'conflict',
      message: 'Cloud backup is blocked by newer work elsewhere. Your current changes remain saved on this device.',
      cloudLabel: 'Cloud backup blocked',
    };
  }
  if (evidence.cloudIssue === 'cloud_error') {
    return {
      kind: 'error',
      message: evidence.localStatus === 'saved'
        ? 'Current changes are saved on this device, but cloud backup failed.'
        : 'Cloud backup failed.',
      cloudLabel: 'Not backed up to cloud',
    };
  }
  if (evidence.isCloudSyncing) {
    return {
      kind: 'syncing',
      message: 'Syncing recovery to cloud…',
      cloudLabel: 'Cloud backup pending',
    };
  }
  if (evidence.lastCloudSync) {
    return {
      kind: 'cloud',
      message: 'Verified cloud backup',
      cloudLabel: 'Backed up to cloud',
    };
  }
  if (evidence.localStatus === 'saved' && evidence.lastLocalSave) {
    return {
      kind: 'local',
      message: 'Saved on this device; waiting to sync to cloud.',
      cloudLabel: 'Cloud backup pending',
    };
  }
  return {
    kind: 'idle',
    message: 'Recovery is ready on this device.',
    cloudLabel: 'Not backed up to cloud',
  };
}

export type CycleDraftCloudSaveOutcome<Snapshot> =
  | { outcome: 'saved'; snapshot: Snapshot }
  | { outcome: 'conflict' }
  | { outcome: 'blocked' }
  | { outcome: 'unknown_predecessor' };

type CycleDraftCloudWrite<Snapshot> = (
  expected: Snapshot | null,
) => Promise<Exclude<CycleDraftCloudSaveOutcome<Snapshot>, { outcome: 'blocked' | 'unknown_predecessor' }>>;

/**
 * Serializes cloud saves around one authoritative predecessor. A typed CAS
 * conflict permanently blocks already-queued and later writes until an
 * explicit authoritative reload installs a new predecessor.
 */
export class CycleDraftCloudSaveCoordinator<Snapshot> {
  private state: 'unknown' | 'ready' | 'conflict_blocked';
  private predecessor: Snapshot | null;
  private tail: Promise<unknown> = Promise.resolve();
  private generation = 0;

  constructor(initialPredecessor?: Snapshot | null) {
    this.state = arguments.length === 0 ? 'unknown' : 'ready';
    this.predecessor = initialPredecessor ?? null;
  }

  get syncState(): 'unknown' | 'ready' | 'conflict_blocked' {
    return this.state;
  }

  markUnknown(): void {
    if (this.state !== 'conflict_blocked') {
      this.state = 'unknown';
      this.generation += 1;
    }
  }

  reload(snapshot: Snapshot | null): void {
    this.predecessor = snapshot;
    this.state = 'ready';
    this.generation += 1;
  }

  blockConflict(): void {
    this.state = 'conflict_blocked';
    this.generation += 1;
  }

  enqueue(write: CycleDraftCloudWrite<Snapshot>): Promise<CycleDraftCloudSaveOutcome<Snapshot>> {
    const queuedGeneration = this.generation;
    const run = this.tail.catch(() => undefined).then(async () => {
      if (queuedGeneration !== this.generation) return { outcome: 'blocked' } as const;
      if (this.state === 'conflict_blocked') return { outcome: 'blocked' } as const;
      if (this.state === 'unknown') return { outcome: 'unknown_predecessor' } as const;
      const result = await write(this.predecessor);
      if (result.outcome === 'conflict') {
        this.blockConflict();
        return result;
      }
      this.predecessor = result.snapshot;
      return result;
    });
    this.tail = run;
    return run;
  }
}

export type AuthoritativeCycleLoadState = 'loading' | 'load_failed' | 'ready';

export interface AuthoritativeLoadRef {
  current: number;
}

const DURABLE_ITEM_ID = /^(?:slot-[1-9][0-9]*|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function createDurableCycleItemId(): string {
  return crypto.randomUUID();
}

function uniqueDurableId(value: unknown, legacyIndex: number, used: Set<string>): string {
  const candidate = typeof value === 'string' && DURABLE_ITEM_ID.test(value)
    ? value
    : `slot-${legacyIndex + 1}`;
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  const replacement = createDurableCycleItemId();
  used.add(replacement);
  return replacement;
}

/** Migrates legacy string slots once, then preserves each item's identity across ordering changes. */
export function normalizeSupportingProjects(value: unknown): SupportingProjectDraft[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.map((entry, index) => {
    if (typeof entry === 'string') {
      return { id: uniqueDurableId(undefined, index, used), name: entry };
    }
    const row = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
    return {
      id: uniqueDurableId(row.id, index, used),
      name: typeof row.name === 'string' ? row.name : '',
    };
  });
}

/** Duplicate labels remain distinct because identity never derives from member-authored text. */
export function normalizeHabits(value: unknown): HabitDraft[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.map((entry, index) => {
    const row = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
    return {
      id: uniqueDurableId(row.id, index, used),
      name: typeof row.name === 'string' ? row.name : '',
      category: typeof row.category === 'string' ? row.category : '',
    };
  });
}

/** Present arrays are authoritative, including []; omitted legacy fields keep current defaults. */
export function exactArrayOrCurrent<T>(value: unknown, current: T[]): T[] {
  return Array.isArray(value) ? value as T[] : current;
}

export function beginAuthoritativeCycleLoad(ref: AuthoritativeLoadRef): number {
  ref.current += 1;
  return ref.current;
}

/** A stale request cannot replace the state established by a newer request. */
export function settleAuthoritativeCycleLoad(
  ref: AuthoritativeLoadRef,
  requestId: number,
  state: Exclude<AuthoritativeCycleLoadState, 'loading'>,
): Exclude<AuthoritativeCycleLoadState, 'loading'> | null {
  return ref.current === requestId ? state : null;
}
