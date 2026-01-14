/**
 * Offline-aware task operations
 * Wraps task mutations to work offline with automatic sync
 */

import { useCallback } from 'react';
import { useOfflineSync } from './useOfflineSync';
import { 
  updateCachedTask, 
  deleteCachedTask,
  cacheTasks,
  getCachedTasks,
} from '@/lib/offlineDb';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface TaskData {
  task_id?: string;
  title: string;
  [key: string]: any;
}

export function useOfflineTasks() {
  const { isOnline, queueOfflineMutation } = useOfflineSync();
  const { toast } = useToast();

  /**
   * Create a task - works offline
   */
  const createTask = useCallback(async (taskData: TaskData): Promise<string | null> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const taskWithId = {
      ...taskData,
      task_id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to local cache immediately
    await updateCachedTask(taskWithId);

    if (isOnline) {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) throw new Error('Not authenticated');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-task`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({
              action: 'create',
              ...taskData,
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to create task');
        
        const result = await response.json();
        
        // Update cache with real ID
        await deleteCachedTask(tempId);
        await updateCachedTask({ ...taskWithId, task_id: result.task_id });
        
        return result.task_id;
      } catch (error) {
        console.error('Online create failed, queuing:', error);
        await queueOfflineMutation('create', 'tasks', taskData);
        toast({
          title: 'Saved locally',
          description: 'Task will sync when you\'re back online.',
        });
        return tempId;
      }
    } else {
      // Queue for later sync
      await queueOfflineMutation('create', 'tasks', taskData);
      toast({
        title: 'Saved locally',
        description: 'Task will sync when you\'re back online.',
      });
      return tempId;
    }
  }, [isOnline, queueOfflineMutation, toast]);

  /**
   * Update a task - works offline
   */
  const updateTask = useCallback(async (taskId: string, updates: Partial<TaskData>): Promise<boolean> => {
    // Update local cache immediately
    const cachedData = {
      task_id: taskId,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await updateCachedTask(cachedData);

    if (isOnline) {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) throw new Error('Not authenticated');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-task`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({
              action: 'update',
              task_id: taskId,
              ...updates,
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to update task');
        return true;
      } catch (error) {
        console.error('Online update failed, queuing:', error);
        await queueOfflineMutation('update', 'tasks', { task_id: taskId, ...updates });
        return true; // Still return true since local cache is updated
      }
    } else {
      await queueOfflineMutation('update', 'tasks', { task_id: taskId, ...updates });
      return true;
    }
  }, [isOnline, queueOfflineMutation]);

  /**
   * Delete a task - works offline
   */
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    // Remove from local cache immediately
    await deleteCachedTask(taskId);

    if (isOnline) {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) throw new Error('Not authenticated');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-task`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({
              action: 'delete',
              task_id: taskId,
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to delete task');
        return true;
      } catch (error) {
        console.error('Online delete failed, queuing:', error);
        await queueOfflineMutation('delete', 'tasks', { task_id: taskId });
        return true;
      }
    } else {
      await queueOfflineMutation('delete', 'tasks', { task_id: taskId });
      return true;
    }
  }, [isOnline, queueOfflineMutation]);

  /**
   * Get tasks - uses cache when offline
   */
  const getTasks = useCallback(async (userId: string): Promise<any[]> => {
    if (!isOnline) {
      // Return cached tasks when offline
      return getCachedTasks(userId);
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-tasks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const result = await response.json();
      const tasks = result.tasks || [];
      
      // Update cache
      await cacheTasks(tasks);
      
      return tasks;
    } catch (error) {
      console.error('Failed to fetch tasks, using cache:', error);
      return getCachedTasks(userId);
    }
  }, [isOnline]);

  return {
    createTask,
    updateTask,
    deleteTask,
    getTasks,
    isOnline,
  };
}
