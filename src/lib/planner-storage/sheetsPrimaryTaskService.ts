import {
  removePendingPlannerWrite,
  updatePendingPlannerWriteStatus,
  upsertPendingPlannerWrite,
} from './localPendingWrites';
import type {
  PlannerStorageService,
  PlannerTaskRow,
  PlannerWriteMetadata,
  PlannerWriteRequest,
  PlannerWriteResult,
} from './types';

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function hashUserId(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

function buildMetadata(
  entityId: string,
  source: PlannerWriteMetadata['source'],
): PlannerWriteMetadata {
  const now = new Date().toISOString();

  return {
    writeId: createId('write'),
    entityType: 'task',
    entityId,
    action: 'create',
    status: 'saved_locally',
    source,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    lastError: null,
  };
}

export interface SheetsPrimaryTaskServiceOptions {
  userId: string;
  googleAccessToken?: string | null;
  spreadsheetId?: string | null;
}

export class SheetsPrimaryTaskService implements PlannerStorageService {
  constructor(private readonly options: SheetsPrimaryTaskServiceOptions) {}

  async createTask(input: {
    taskText: string;
    taskDescription?: string | null;
    priority?: string | null;
    scheduledDate?: string | null;
    projectId?: string | null;
    source?: PlannerWriteMetadata['source'];
  }): Promise<PlannerWriteResult<PlannerTaskRow>> {
    const now = new Date().toISOString();
    const taskId = createId('task');
    const metadata = buildMetadata(taskId, input.source || 'app');
    const task: PlannerTaskRow = {
      id: taskId,
      user_id_hash: await hashUserId(this.options.userId),
      task_text: input.taskText,
      task_description: input.taskDescription || null,
      status: 'todo',
      priority: input.priority || null,
      scheduled_date: input.scheduledDate || null,
      scheduled_time: null,
      project_id: input.projectId || null,
      is_completed: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
      last_write_id: metadata.writeId,
      sync_status: 'saved_locally',
      source: metadata.source,
    };

    const request: PlannerWriteRequest<PlannerTaskRow> = {
      metadata,
      payload: task,
    };

    upsertPendingPlannerWrite(request);

    if (!this.options.googleAccessToken || !this.options.spreadsheetId) {
      updatePendingPlannerWriteStatus(metadata.writeId, 'queued');
      return {
        ok: true,
        metadata: {
          ...metadata,
          status: 'queued',
          updatedAt: new Date().toISOString(),
        },
        payload: task,
      };
    }

    return this.writeTaskToGoogle(request);
  }

  private async writeTaskToGoogle(
    request: PlannerWriteRequest<PlannerTaskRow>,
  ): Promise<PlannerWriteResult<PlannerTaskRow>> {
    updatePendingPlannerWriteStatus(request.metadata.writeId, 'syncing_to_google');

    try {
      const task = {
        ...request.payload,
        sync_status: 'backed_up_to_google' as const,
      };

      const taskRow = [
        task.id,
        task.user_id_hash,
        task.task_text,
        task.task_description || '',
        task.status || '',
        task.priority || '',
        task.scheduled_date || '',
        task.scheduled_time || '',
        task.project_id || '',
        String(task.is_completed),
        task.created_at,
        task.updated_at,
        task.deleted_at || '',
        String(task.version),
        task.last_write_id,
        task.sync_status,
        task.source,
        JSON.stringify(task),
      ];

      const changeLogRow = [
        request.metadata.writeId,
        request.metadata.entityType,
        request.metadata.entityId,
        request.metadata.action,
        '',
        '',
        new Date().toISOString(),
        request.metadata.source,
        'verified',
      ];

      await this.appendValues('Tasks!A:R', [taskRow]);
      await this.appendValues('_Change_Log!A:I', [changeLogRow]);

      removePendingPlannerWrite(request.metadata.writeId);

      return {
        ok: true,
        metadata: {
          ...request.metadata,
          status: 'backed_up_to_google',
          updatedAt: new Date().toISOString(),
        },
        payload: task,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not back up to Google Sheets';
      updatePendingPlannerWriteStatus(request.metadata.writeId, 'failed_retryable', message);

      return {
        ok: false,
        metadata: {
          ...request.metadata,
          status: 'failed_retryable',
          lastError: message,
          updatedAt: new Date().toISOString(),
        },
        payload: request.payload,
        error: message,
      };
    }
  }

  private async appendValues(range: string, values: unknown[][]) {
    const encodedRange = encodeURIComponent(range);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.options.spreadsheetId}/values/${encodedRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Google Sheets returned ${response.status}`);
    }
  }
}
