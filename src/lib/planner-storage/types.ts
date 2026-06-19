export type PlannerStorageMode = 'supabase' | 'sheets_shadow' | 'sheets_primary';

export type PlannerEntityType =
  | 'task'
  | 'project'
  | 'daily_plan'
  | 'weekly_plan'
  | 'cycle'
  | 'habit'
  | 'idea'
  | 'review'
  | 'brain_dump_item';

export type PlannerWriteAction = 'create' | 'update' | 'complete' | 'soft_delete' | 'restore' | 'import';

export type PlannerWriteStatus =
  | 'saved_locally'
  | 'queued'
  | 'syncing_to_google'
  | 'backed_up_to_google'
  | 'needs_reconnect'
  | 'failed_retryable'
  | 'failed_final';

export interface PlannerStorageConnection {
  userId: string;
  storageMode: PlannerStorageMode;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  schemaVersion: number;
  isHealthy: boolean;
  lastVerifiedAt: string | null;
  lastGoogleBackupAt: string | null;
  lastError: string | null;
}

export interface PlannerWriteMetadata {
  writeId: string;
  entityType: PlannerEntityType;
  entityId: string;
  action: PlannerWriteAction;
  status: PlannerWriteStatus;
  source: 'app' | 'codex' | 'claude' | 'sheet_inbox' | 'import' | 'recovery';
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string | null;
}

export interface PlannerTaskRow {
  id: string;
  user_id_hash: string;
  task_text: string;
  task_description?: string | null;
  status?: string | null;
  priority?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  project_id?: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  version: number;
  last_write_id: string;
  sync_status: PlannerWriteStatus;
  source: PlannerWriteMetadata['source'];
  payload_json?: string | null;
}

export interface PlannerWriteRequest<TPayload = unknown> {
  metadata: PlannerWriteMetadata;
  payload: TPayload;
}

export interface PlannerWriteResult<TPayload = unknown> {
  ok: boolean;
  metadata: PlannerWriteMetadata;
  payload?: TPayload;
  error?: string;
}

export interface PlannerStorageService {
  createTask(input: {
    taskText: string;
    taskDescription?: string | null;
    priority?: string | null;
    scheduledDate?: string | null;
    projectId?: string | null;
    source?: PlannerWriteMetadata['source'];
  }): Promise<PlannerWriteResult<PlannerTaskRow>>;
}
