import { getStorageItem, removeStorageItem, setStorageItem } from '@/lib/storage';
import type { PlannerWriteRequest, PlannerWriteStatus } from './types';

const QUEUE_KEY = 'planner_storage_pending_writes_v1';

function readQueue(): PlannerWriteRequest[] {
  const raw = getStorageItem(QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[PlannerStorage] Could not parse pending write queue:', error);
    return [];
  }
}

function writeQueue(queue: PlannerWriteRequest[]): boolean {
  if (queue.length === 0) {
    removeStorageItem(QUEUE_KEY);
    return true;
  }

  return setStorageItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getPendingPlannerWrites(): PlannerWriteRequest[] {
  return readQueue().sort((a, b) => (
    new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime()
  ));
}

export function upsertPendingPlannerWrite(request: PlannerWriteRequest): boolean {
  const queue = readQueue();
  const now = new Date().toISOString();
  const next = {
    ...request,
    metadata: {
      ...request.metadata,
      updatedAt: now,
    },
  };

  const index = queue.findIndex(item => item.metadata.writeId === request.metadata.writeId);
  if (index >= 0) {
    queue[index] = next;
  } else {
    queue.push(next);
  }

  return writeQueue(queue);
}

export function updatePendingPlannerWriteStatus(
  writeId: string,
  status: PlannerWriteStatus,
  error?: string | null,
): boolean {
  const queue = readQueue();
  const index = queue.findIndex(item => item.metadata.writeId === writeId);
  if (index < 0) return false;

  queue[index] = {
    ...queue[index],
    metadata: {
      ...queue[index].metadata,
      status,
      attempts: status === 'syncing_to_google'
        ? queue[index].metadata.attempts + 1
        : queue[index].metadata.attempts,
      lastError: error ?? null,
      updatedAt: new Date().toISOString(),
    },
  };

  return writeQueue(queue);
}

export function removePendingPlannerWrite(writeId: string): boolean {
  const queue = readQueue().filter(item => item.metadata.writeId !== writeId);
  return writeQueue(queue);
}

export function getPendingPlannerWriteCount(): number {
  return readQueue().length;
}
