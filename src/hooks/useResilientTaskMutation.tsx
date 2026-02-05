 /**
  * Resilient Task Mutation Hook
  * Ensures tasks are NEVER lost - saves to localStorage immediately,
  * queues to IndexedDB if offline/failed, auto-syncs when online.
  */
 
 import { useCallback } from 'react';
 import { useTaskMutations } from '@/hooks/useTasks';
 import { useOnlineStatus } from '@/hooks/useOnlineStatus';
 import { useOfflineSync } from '@/hooks/useOfflineSync';
 import { toast } from 'sonner';
 import { format } from 'date-fns';
 
 // Draft storage keys
 const PENDING_TASK_DRAFT_KEY = 'resilient-task-drafts';
 
 interface TaskDraft {
   id: string;
   data: CreateTaskParams;
   timestamp: number;
 }
 
 interface CreateTaskParams {
   task_text: string;
   scheduled_date?: string | null;
   priority?: string | null;
   estimated_minutes?: number | null;
   context_tags?: string[] | null;
   project_id?: string | null;
   section_id?: string | null;
  status?: 'backlog' | 'focus' | 'scheduled' | 'someday' | 'waiting';
   task_description?: string | null;
 }
 
 // Generate a unique ID for drafts
 function generateDraftId(): string {
   return `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
 }
 
 // Save a draft to localStorage
 function savePendingTaskDraft(data: CreateTaskParams): string {
   try {
     const stored = localStorage.getItem(PENDING_TASK_DRAFT_KEY);
     const drafts: TaskDraft[] = stored ? JSON.parse(stored) : [];
     
     const draftId = generateDraftId();
     drafts.push({
       id: draftId,
       data,
       timestamp: Date.now(),
     });
     
     localStorage.setItem(PENDING_TASK_DRAFT_KEY, JSON.stringify(drafts));
     return draftId;
   } catch (e) {
     console.error('Failed to save task draft:', e);
     return '';
   }
 }
 
 // Clear a specific draft from localStorage
 function clearPendingTaskDraft(draftId: string): void {
   try {
     const stored = localStorage.getItem(PENDING_TASK_DRAFT_KEY);
     if (!stored) return;
     
     const drafts: TaskDraft[] = JSON.parse(stored);
     const filtered = drafts.filter(d => d.id !== draftId);
     
     if (filtered.length === 0) {
       localStorage.removeItem(PENDING_TASK_DRAFT_KEY);
     } else {
       localStorage.setItem(PENDING_TASK_DRAFT_KEY, JSON.stringify(filtered));
     }
   } catch (e) {
     console.error('Failed to clear task draft:', e);
   }
 }
 
 // Get all pending drafts
 export function getPendingTaskDrafts(): TaskDraft[] {
   try {
     const stored = localStorage.getItem(PENDING_TASK_DRAFT_KEY);
     if (!stored) return [];
     
     const drafts: TaskDraft[] = JSON.parse(stored);
     // Filter out drafts older than 7 days
     const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
     return drafts.filter(d => d.timestamp > oneWeekAgo);
   } catch (e) {
     console.error('Failed to get task drafts:', e);
     return [];
   }
 }
 
 // Clear all drafts
 export function clearAllTaskDrafts(): void {
   localStorage.removeItem(PENDING_TASK_DRAFT_KEY);
 }
 
 /**
  * Hook that provides resilient task creation with offline fallback
  */
 export function useResilientTaskMutation() {
   const { createTask } = useTaskMutations();
   const isOnline = useOnlineStatus();
   const { queueOfflineMutation, pendingCount, failedCount } = useOfflineSync();
 
   /**
    * Create a task with bulletproof saving:
    * 1. Save to localStorage immediately (survives crash)
    * 2. If online, try API call
    * 3. If offline or API fails, queue to IndexedDB
    * 4. Auto-sync when online via existing infrastructure
    */
   const resilientCreate = useCallback(async (taskData: CreateTaskParams): Promise<{ success: boolean; queued: boolean }> => {
     // Step 1: Save draft to localStorage immediately
     const draftId = savePendingTaskDraft(taskData);
     
     // Step 2: Check if online
     if (!isOnline) {
       // Queue for later sync
       try {
         await queueOfflineMutation('create', 'tasks', {
           action: 'create',
           ...taskData,
         });
         clearPendingTaskDraft(draftId);
         toast.info('Saved offline', {
           description: 'Task will sync when you\'re back online.',
           duration: 3000,
         });
         return { success: true, queued: true };
       } catch (queueError) {
         console.error('Failed to queue task:', queueError);
         // Draft still in localStorage as backup
         toast.warning('Saved locally', {
           description: 'Task saved as draft. Will retry later.',
           duration: 4000,
         });
         return { success: false, queued: false };
       }
     }
     
     // Step 3: Try API call
     try {
       await createTask.mutateAsync(taskData);
       clearPendingTaskDraft(draftId);
       return { success: true, queued: false };
     } catch (error: any) {
       console.error('Task creation failed, queuing for retry:', error);
       
       // Step 4: API failed - queue for retry
       try {
         await queueOfflineMutation('create', 'tasks', {
           action: 'create',
           ...taskData,
         });
         clearPendingTaskDraft(draftId);
         toast.warning('Will retry', {
           description: 'Task saved locally. Will sync automatically.',
           duration: 3000,
         });
         return { success: true, queued: true };
       } catch (queueError) {
         console.error('Failed to queue task after API error:', queueError);
         // Draft still in localStorage as final backup
         toast.error('Save failed', {
           description: 'Task saved as draft. Please try again.',
           duration: 5000,
         });
         return { success: false, queued: false };
       }
     }
   }, [isOnline, createTask, queueOfflineMutation]);
 
   /**
    * Retry saving a draft that was previously saved to localStorage
    */
   const retryDraft = useCallback(async (draft: TaskDraft): Promise<boolean> => {
     const result = await resilientCreate(draft.data);
     if (result.success) {
       clearPendingTaskDraft(draft.id);
     }
     return result.success;
   }, [resilientCreate]);
 
   return {
     resilientCreate,
     retryDraft,
     isOnline,
     pendingCount,
     failedCount,
     hasPendingDrafts: getPendingTaskDrafts().length > 0,
   };
 }
 
 export type { CreateTaskParams, TaskDraft };