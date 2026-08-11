export type QueueWindowState = 'before' | 'open' | 'closed';

export interface CoachingCallWindow {
  startsAt: string;
  queueOpensAt: string;
  queueClosesAt: string;
}

export interface CoachingQueueCandidate {
  id: string;
  waitingSince: string;
  joinedAt: string | null;
  deadline: string | null;
  blocker: string | null;
  coachedCount: number;
  lastCoachedAt: string | null;
  timesSkipped: number;
  returningSupportNeeded: boolean;
  manualPriority: number | null;
}

export function getQueueWindowState(
  call: CoachingCallWindow,
  now: Date = new Date(),
): QueueWindowState {
  const timestamp = now.getTime();
  if (timestamp < new Date(call.queueOpensAt).getTime()) return 'before';
  if (timestamp > new Date(call.queueClosesAt).getTime()) return 'closed';
  return 'open';
}

export function canJoinQueue(
  call: CoachingCallWindow,
  candidate: Pick<CoachingQueueCandidate, 'joinedAt'>,
  now: Date = new Date(),
): boolean {
  // An idempotent retry remains valid after the window closes because the
  // original join already earned the member a place.
  return Boolean(candidate.joinedAt) || getQueueWindowState(call, now) === 'open';
}

function daysSince(timestamp: string | null, now: Date): number {
  if (!timestamp) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.floor((now.getTime() - new Date(timestamp).getTime()) / 86_400_000));
}

/**
 * Fair, deterministic queue order. The UI never exposes this score.
 * Manual priority is a bounded Faith-only override; otherwise the recovered
 * queue policy is applied in order: never coached, deadline + blocker,
 * longest since coaching, skipped, returning/drifting, original wait time.
 */
export function compareQueueCandidates(
  left: CoachingQueueCandidate,
  right: CoachingQueueCandidate,
  now: Date = new Date(),
): number {
  const leftKey: Array<number | string> = [
    left.manualPriority ?? 10_000,
    left.coachedCount === 0 ? 0 : 1,
    left.deadline && left.blocker?.trim() ? 0 : 1,
    -daysSince(left.lastCoachedAt, now),
    -left.timesSkipped,
    left.returningSupportNeeded ? 0 : 1,
    left.waitingSince,
    left.id,
  ];
  const rightKey: Array<number | string> = [
    right.manualPriority ?? 10_000,
    right.coachedCount === 0 ? 0 : 1,
    right.deadline && right.blocker?.trim() ? 0 : 1,
    -daysSince(right.lastCoachedAt, now),
    -right.timesSkipped,
    right.returningSupportNeeded ? 0 : 1,
    right.waitingSince,
    right.id,
  ];

  for (let index = 0; index < leftKey.length; index += 1) {
    if (leftKey[index] < rightKey[index]) return -1;
    if (leftKey[index] > rightKey[index]) return 1;
  }
  return 0;
}

export function sortCoachingQueue<T extends CoachingQueueCandidate>(
  candidates: T[],
  now: Date = new Date(),
): T[] {
  return [...candidates]
    .filter((candidate) => Boolean(candidate.joinedAt))
    .sort((left, right) => compareQueueCandidates(left, right, now));
}

export function getEstimatedQueueStatus(position: number, total: number): string {
  if (position <= 0 || total <= 0) return 'Not currently in the live queue';
  if (position === 1) return 'Near the front';
  if (position <= 3) return 'In the first group';
  return `In the queue with ${total} people waiting`;
}
