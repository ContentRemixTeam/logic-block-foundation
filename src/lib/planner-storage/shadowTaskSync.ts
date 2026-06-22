import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/components/tasks/types';
import {
  getPendingPlannerWrites,
  removePendingPlannerWrite,
  updatePendingPlannerWriteStatus,
  upsertPendingPlannerWrite,
} from './localPendingWrites';
import type { PlannerWriteMetadata, PlannerWriteRequest } from './types';

export interface PlannerTaskSyncResult {
  ok: boolean;
  skipped?: boolean;
  reused?: boolean;
  reason?: string;
  write_id?: string;
  spreadsheet_url?: string;
}

function buildMetadata(task: Task): PlannerWriteMetadata {
  const now = new Date().toISOString();

  return {
    writeId: task.task_id,
    entityType: 'task',
    entityId: task.task_id,
    action: 'create',
    status: 'saved_locally',
    source: 'app',
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    lastError: null,
  };
}

function buildRequest(task: Task): PlannerWriteRequest<Task> {
  return {
    metadata: buildMetadata(task),
    payload: task,
  };
}

async function invokeTaskSync(task: Task): Promise<PlannerTaskSyncResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('planner-task-sync', {
    body: {
      action: 'sync_task_create',
      task,
    },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as PlannerTaskSyncResult;
}

export async function syncCreatedTaskToPlannerSheet(task: Task): Promise<PlannerTaskSyncResult> {
  const request = buildRequest(task);
  upsertPendingPlannerWrite(request);
  updatePendingPlannerWriteStatus(request.metadata.writeId, 'syncing_to_google');

  try {
    const result = await invokeTaskSync(task);

    if (result.ok) {
      removePendingPlannerWrite(request.metadata.writeId);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not back up task to Google Sheets';
    updatePendingPlannerWriteStatus(request.metadata.writeId, 'failed_retryable', message);
    throw error;
  }
}

export async function retryPendingPlannerSheetWrites(): Promise<{
  attempted: number;
  synced: number;
  failed: number;
}> {
  const pendingTaskWrites = getPendingPlannerWrites()
    .filter(write => write.metadata.entityType === 'task' && write.metadata.action === 'create');

  let synced = 0;
  let failed = 0;

  for (const write of pendingTaskWrites) {
    try {
      updatePendingPlannerWriteStatus(write.metadata.writeId, 'syncing_to_google');
      const result = await invokeTaskSync(write.payload as Task);
      if (result.ok) {
        removePendingPlannerWrite(write.metadata.writeId);
        synced += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not back up task to Google Sheets';
      updatePendingPlannerWriteStatus(write.metadata.writeId, 'failed_retryable', message);
      failed += 1;
    }
  }

  return {
    attempted: pendingTaskWrites.length,
    synced,
    failed,
  };
}
