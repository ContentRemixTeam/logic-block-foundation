import { useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, endOfWeek } from 'date-fns';
import { checkAndHandleRateLimit } from '@/lib/rateLimitHandler';
import { Task } from '@/components/tasks/types';
import { mutationLogger } from '@/components/dev/DevDebugPanel';
import { showOperationError } from '@/components/system/ErrorToast';

// Re-export the Task type for convenience
export type { Task } from '@/components/tasks/types';

// Query key factory for consistent cache management
export const taskQueryKeys = {
  all: ['all-tasks'] as const,
  byDate: (date: string) => ['tasks', 'date', date] as const,
  byWeek: (weekStart: string) => ['tasks', 'week', weekStart] as const,
};

// Response type from edge function
interface TasksResponse {
  tasks: Task[];
  hasMore: boolean;
  totalCount: number;
  useSmartFilter: boolean;
}

// Main hook for fetching all tasks with smart filtering
export function useTasks(options: { loadAll?: boolean } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { loadAll = false } = options;

  // Main tasks query - uses smart filtering by default (last 90 days + incomplete)
  const query = useQuery({
    queryKey: [...taskQueryKeys.all, { loadAll }],
    queryFn: async (): Promise<Task[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Smart filtering: fetch last 90 days + all incomplete tasks
      // This prevents the "500 task ceiling" issue while keeping the UI fast
      const response = await supabase.functions.invoke('get-all-tasks', {
        body: { 
          load_all: loadAll,
          // No limit/offset = server uses smart filtering
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      
      // Extract just the tasks array for backwards compatibility
      // The metadata (hasMore, totalCount) is available if needed in the future
      return (response.data?.data || []) as Task[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes - data stays fresh longer
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus (realtime handles updates)
  });

  // Set up real-time subscription for tasks
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Task realtime update:', payload.eventType);
          
          // Update the cache based on the event type
          queryClient.setQueryData<Task[]>(taskQueryKeys.all, (oldTasks) => {
            if (!oldTasks) return oldTasks;

            switch (payload.eventType) {
              case 'INSERT':
                // Check if task already exists (avoid duplicates from optimistic updates)
                const exists = oldTasks.some(t => t.task_id === (payload.new as Task).task_id);
                if (exists) return oldTasks;
                return [payload.new as Task, ...oldTasks];

              case 'UPDATE':
                return oldTasks.map(t => 
                  t.task_id === (payload.new as Task).task_id 
                    ? { ...t, ...(payload.new as Task) }
                    : t
                );

              case 'DELETE':
                return oldTasks.filter(t => t.task_id !== (payload.old as Task).task_id);

              default:
                return oldTasks;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

// Hook for task mutations with optimistic updates
export function useTaskMutations() {
  const queryClient = useQueryClient();

  // Helper to get session
  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    return session;
  };

  // Create task mutation
  const createTask = useMutation({
    mutationFn: async (params: Partial<Task> & { task_text: string }) => {
      const session = await getSession();
      
      // Log mutation start
      const logId = mutationLogger.log({
        type: 'create',
        taskText: params.task_text,
        updates: params,
        status: 'pending',
      });
      const startTime = Date.now();
      
      try {
        const response = await supabase.functions.invoke('manage-task', {
          body: { action: 'create', ...params },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        // Check for rate limiting
        if (checkAndHandleRateLimit(response)) {
          throw new Error('Rate limit exceeded');
        }
        
        if (response.error) throw response.error;
        
        mutationLogger.updateStatus(logId, 'success', undefined, Date.now() - startTime);
        return response.data?.data as Task;
      } catch (error: any) {
        mutationLogger.updateStatus(logId, 'error', error?.message, Date.now() - startTime);
        throw error;
      }
    },
    onMutate: async (newTask) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(taskQueryKeys.all);

      // Optimistically add the new task with a temporary ID
      const optimisticTask: Partial<Task> & { task_id: string; task_text: string } = {
        task_id: `temp-${Date.now()}`,
        task_text: newTask.task_text,
        task_description: null,
        scheduled_date: newTask.scheduled_date || null,
        planned_day: newTask.planned_day || null,
        priority: newTask.priority || null,
        status: (newTask.status as Task['status']) || 'backlog',
        is_completed: false,
        completed_at: null,
        estimated_minutes: newTask.estimated_minutes || null,
        context_tags: newTask.context_tags || null,
        created_at: new Date().toISOString(),
        is_recurring_parent: false,
        recurrence_pattern: null,
        recurrence_days: null,
        parent_task_id: null,
        sop_id: null,
        sop: null,
        checklist_progress: null,
        priority_order: null,
        actual_minutes: null,
        time_block_start: null,
        time_block_end: null,
        energy_level: null,
        goal_id: null,
        waiting_on: null,
        subtasks: null,
        notes: null,
        position_in_column: null,
        day_order: newTask.day_order || null,
        source: newTask.source || null,
        project_id: newTask.project_id || null,
        section_id: newTask.section_id || null,
      };

      queryClient.setQueryData<Task[]>(taskQueryKeys.all, (old) => 
        old ? [optimisticTask as Task, ...old] : [optimisticTask as Task]
      );

      return { previousTasks };
    },
    onError: (err, _newTask, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskQueryKeys.all, context.previousTasks);
      }
      showOperationError('create', 'Task', err);
    },
    onSuccess: (createdTask, _variables, context) => {
      // Replace the optimistic task with the real one
      queryClient.setQueryData<Task[]>(taskQueryKeys.all, (old) => {
        if (!old) return [createdTask];
        // Remove temp task and add the real one
        const withoutTemp = old.filter(t => !t.task_id.startsWith('temp-'));
        // Check if the real task is already there (from realtime)
        const hasReal = withoutTemp.some(t => t.task_id === createdTask.task_id);
        if (hasReal) return withoutTemp;
        return [createdTask, ...withoutTemp];
      });
    },
  });

  // Update task mutation
  const updateTask = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const session = await getSession();
      
      // Get task text for logging
      const currentTasks = queryClient.getQueryData<Task[]>(taskQueryKeys.all);
      const task = currentTasks?.find(t => t.task_id === taskId);
      
      // Log mutation start
      const logId = mutationLogger.log({
        type: 'update',
        taskId,
        taskText: task?.task_text,
        updates,
        status: 'pending',
      });
      const startTime = Date.now();
      
      try {
        const response = await supabase.functions.invoke('manage-task', {
          body: { action: 'update', task_id: taskId, ...updates },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (response.error) throw response.error;
        
        mutationLogger.updateStatus(logId, 'success', undefined, Date.now() - startTime);
        return response.data?.data as Task;
      } catch (error: any) {
        mutationLogger.updateStatus(logId, 'error', error?.message, Date.now() - startTime);
        throw error;
      }
    },
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all });
      const previousTasks = queryClient.getQueryData<Task[]>(taskQueryKeys.all);

      // Optimistically update
      queryClient.setQueryData<Task[]>(taskQueryKeys.all, (old) =>
        old?.map(t => t.task_id === taskId ? { ...t, ...updates } : t)
      );

      return { previousTasks };
    },
    onError: (err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskQueryKeys.all, context.previousTasks);
      }
      showOperationError('update', 'Task', err);
    },
  });

  // Toggle task completion
  const toggleComplete = useMutation({
    mutationFn: async (taskId: string) => {
      const session = await getSession();
      const response = await supabase.functions.invoke('manage-task', {
        body: { action: 'toggle', task_id: taskId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.error) throw response.error;
      return response.data?.data as Task;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all });
      const previousTasks = queryClient.getQueryData<Task[]>(taskQueryKeys.all);

      // Optimistically toggle
      queryClient.setQueryData<Task[]>(taskQueryKeys.all, (old) =>
        old?.map(t => t.task_id === taskId 
          ? { ...t, is_completed: !t.is_completed, completed_at: !t.is_completed ? new Date().toISOString() : null } 
          : t
        )
      );

      return { previousTasks };
    },
    onError: (err, _taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskQueryKeys.all, context.previousTasks);
      }
      showOperationError('update', 'Task', err);
    },
  });

  // Delete task mutation
  const deleteTask = useMutation({
    mutationFn: async ({ taskId, deleteType = 'single' }: { taskId: string; deleteType?: string }) => {
      const session = await getSession();
      const response = await supabase.functions.invoke('manage-task', {
        body: { action: 'delete', task_id: taskId, delete_type: deleteType },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.error) throw response.error;
      return taskId;
    },
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all });
      const previousTasks = queryClient.getQueryData<Task[]>(taskQueryKeys.all);

      // Optimistically remove
      queryClient.setQueryData<Task[]>(taskQueryKeys.all, (old) =>
        old?.filter(t => t.task_id !== taskId)
      );

      return { previousTasks };
    },
    onError: (err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskQueryKeys.all, context.previousTasks);
      }
      showOperationError('delete', 'Task', err);
    },
    onSuccess: () => {
      toast.success('Task deleted');
    },
  });

  // Move task to a specific day (also clears time_block_start)
  const moveToDay = useMutation({
    mutationFn: async ({ taskId, plannedDay, dayOrder }: { taskId: string; plannedDay: string | null; dayOrder?: number }) => {
      const session = await getSession();
      const response = await supabase.functions.invoke('manage-task', {
        body: { 
          action: 'update', 
          task_id: taskId, 
          planned_day: plannedDay,
          day_order: dayOrder ?? 0,
          time_block_start: null, // Clear time block when using moveToDay
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.error) throw response.error;
      return response.data?.data as Task;
    },
    onMutate: async ({ taskId, plannedDay, dayOrder }) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all });
      const previousTasks = queryClient.getQueryData<Task[]>(taskQueryKeys.all);

      queryClient.setQueryData<Task[]>(taskQueryKeys.all, (old) =>
        old?.map(t => t.task_id === taskId 
          ? { ...t, planned_day: plannedDay, day_order: dayOrder ?? 0, time_block_start: null } 
          : t
        )
      );

      return { previousTasks };
    },
    onError: (err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskQueryKeys.all, context.previousTasks);
      }
      showOperationError('update', 'Task', err);
    },
  });

  // Set time block
  const setTimeBlock = useMutation({
    mutationFn: async ({ taskId, start, end }: { taskId: string; start: string | null; end: string | null }) => {
      const session = await getSession();
      const response = await supabase.functions.invoke('manage-task', {
        body: { 
          action: 'update', 
          task_id: taskId, 
          time_block_start: start,
          time_block_end: end,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.error) throw response.error;
      return response.data?.data as Task;
    },
    onMutate: async ({ taskId, start, end }) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all });
      const previousTasks = queryClient.getQueryData<Task[]>(taskQueryKeys.all);

      queryClient.setQueryData<Task[]>(taskQueryKeys.all, (old) =>
        old?.map(t => t.task_id === taskId 
          ? { ...t, time_block_start: start, time_block_end: end } 
          : t
        )
      );

      return { previousTasks };
    },
    onError: (err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskQueryKeys.all, context.previousTasks);
      }
      showOperationError('update', 'Task', err);
    },
  });

  // Toggle checklist item
  const toggleChecklistItem = useMutation({
    mutationFn: async ({ taskId, itemId }: { taskId: string; itemId: string }) => {
      const session = await getSession();
      const response = await supabase.functions.invoke('manage-task', {
        body: { action: 'toggle_checklist_item', task_id: taskId, item_id: itemId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.error) throw response.error;
      return response.data?.data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
    },
  });

  return {
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    moveToDay,
    setTimeBlock,
    toggleChecklistItem,
  };
}

// Helper hook for tasks filtered by date
export function useTasksForDate(date: Date | string) {
  const { data: allTasks = [], ...rest } = useTasks();
  
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  
  const tasksForDate = useMemo(() => {
    return allTasks.filter(task => {
      if (task.is_recurring_parent) return false;
      // Check both scheduled_date and planned_day
      return task.scheduled_date === dateStr || task.planned_day === dateStr;
    });
  }, [allTasks, dateStr]);

  return { data: tasksForDate, allTasks, ...rest };
}

// Helper hook for tasks filtered by week
export function useTasksForWeek(weekStart: Date) {
  const { data: allTasks = [], ...rest } = useTasks();
  
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  
  const tasksForWeek = useMemo(() => {
    return allTasks.filter(task => {
      if (task.is_recurring_parent) return false;
      const plannedDay = task.planned_day;
      if (!plannedDay) return false;
      return plannedDay >= weekStartStr && plannedDay <= weekEndStr;
    });
  }, [allTasks, weekStartStr, weekEndStr]);

  const inboxTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (task.is_recurring_parent) return false;
      if (task.is_completed) return false;
      return !task.planned_day && task.status !== 'someday';
    });
  }, [allTasks]);

  return { data: tasksForWeek, inboxTasks, allTasks, ...rest };
}

// Helper hook for today's top 3 tasks
export function useTop3Tasks() {
  const { data: allTasks = [], ...rest } = useTasks();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const { top3Tasks, otherTasks } = useMemo(() => {
    const todaysTasks = allTasks.filter(task => {
      if (task.is_recurring_parent) return false;
      return task.scheduled_date === today || task.planned_day === today;
    });

    const top3 = todaysTasks
      .filter(t => t.priority_order && t.priority_order >= 1 && t.priority_order <= 3)
      .sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0));

    const others = todaysTasks.filter(
      t => !t.priority_order || t.priority_order < 1 || t.priority_order > 3
    );

    return { top3Tasks: top3, otherTasks: others };
  }, [allTasks, today]);

  return { top3Tasks, otherTasks, allTasks, ...rest };
}

// Invalidation helper for manual refreshes
export function useInvalidateTasks() {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
  }, [queryClient]);
}
