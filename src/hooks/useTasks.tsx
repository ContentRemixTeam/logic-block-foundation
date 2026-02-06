import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
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

// Pagination defaults
const DEFAULT_PAGE_SIZE = 50;
const WARN_THRESHOLD = 500;

// Query key factory for consistent cache management
export const taskQueryKeys = {
  all: ['all-tasks'] as const,
  byDate: (date: string) => ['tasks', 'date', date] as const,
  byWeek: (weekStart: string) => ['tasks', 'week', weekStart] as const,
};

// Response type from edge function with cursor-based pagination
interface TasksMetadata {
  count: number;
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  pageSize: number;
  filters: Record<string, string>;
  useSmartFilter: boolean;
}

interface TasksResponse {
  data: Task[];
  metadata: TasksMetadata;
}

// Options for useTasks hook
interface UseTasksOptions {
  loadAll?: boolean;
  pageSize?: number;
  filters?: { status?: string; project_id?: string };
  enabled?: boolean;
}

// Main hook for fetching all tasks with cursor-based pagination
export function useTasks(options: UseTasksOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { loadAll = false, pageSize = DEFAULT_PAGE_SIZE, filters, enabled = true } = options;
  const fetchStartTime = useRef<number | null>(null);
  
  // Pagination state
  const [cursor, setCursor] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  // Create the full query key including options
  const fullQueryKey = useMemo(() => [
    ...taskQueryKeys.all, 
    { loadAll, cursor, pageSize, filters }
  ], [loadAll, cursor, pageSize, filters]);

  // Main tasks query - uses cursor-based pagination
  const query = useQuery({
    queryKey: fullQueryKey,
    queryFn: async (): Promise<TasksResponse> => {
      fetchStartTime.current = Date.now();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('get-all-tasks', {
        body: { 
          load_all: loadAll,
          page_size: pageSize,
          cursor,
          filters,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      
      const result = response.data as TasksResponse;
      
      // Performance warnings
      const fetchTime = Date.now() - (fetchStartTime.current || Date.now());
      if (fetchTime > 1000) {
        console.warn(`⚠️ [useTasks] Slow query: ${fetchTime}ms for ${result.data.length} tasks`);
      }
      
      return result;
    },
    enabled: !!user && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes - data stays fresh longer
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus (realtime handles updates)
  });

  // Accumulate tasks when data changes
  useEffect(() => {
    if (query.data?.data) {
      if (cursor === null) {
        // First page - replace all tasks
        setAllTasks(query.data.data);
      } else {
        // Subsequent pages - append (avoiding duplicates)
        setAllTasks(prev => {
          const existingIds = new Set(prev.map(t => t.task_id));
          const newTasks = query.data.data.filter(t => !existingIds.has(t.task_id));
          return [...prev, ...newTasks];
        });
      }
    }
  }, [query.data?.data, cursor]);

  // Performance warning for large datasets
  useEffect(() => {
    if (allTasks.length > WARN_THRESHOLD) {
      console.warn(
        `⚠️ [useTasks] Loaded ${allTasks.length} tasks. ` +
        `Consider archiving completed tasks for better performance.`
      );
    }
  }, [allTasks.length]);

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (query.data?.metadata?.hasMore && !query.isFetching) {
      setCursor(query.data.metadata.nextCursor);
    }
  }, [query.data?.metadata, query.isFetching]);

  // Reset function for filter changes
  const reset = useCallback(() => {
    setCursor(null);
    setAllTasks([]);
    queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
  }, [queryClient]);

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
          
          // Update accumulated tasks in-memory
          setAllTasks(prev => {
            switch (payload.eventType) {
              case 'INSERT':
                // Check if task already exists (avoid duplicates)
                const exists = prev.some(t => t.task_id === (payload.new as Task).task_id);
                if (exists) return prev;
                // Add with null project/sop - prepend to start (newest first)
                return [{ ...payload.new as Task, project: null, sop: null }, ...prev];

              case 'UPDATE':
                return prev.map(t => 
                  t.task_id === (payload.new as Task).task_id 
                    ? { ...t, ...(payload.new as Task) }
                    : t
                );

              case 'DELETE':
                return prev.filter(t => t.task_id !== (payload.old as Task).task_id);

              default:
                return prev;
            }
          });

          // Also update cache for backwards compatibility
          const cacheKeys = [
            [...taskQueryKeys.all, { loadAll: false }],
            [...taskQueryKeys.all, { loadAll: true }],
          ];
          
          cacheKeys.forEach((cacheKey) => {
            queryClient.setQueryData<TasksResponse>(cacheKey, (oldData) => {
              if (!oldData) return oldData;

              const updatedData = { ...oldData };
              switch (payload.eventType) {
                case 'INSERT':
                  const exists = oldData.data.some(t => t.task_id === (payload.new as Task).task_id);
                  if (!exists) {
                    updatedData.data = [{ ...payload.new as Task, project: null, sop: null }, ...oldData.data];
                  }
                  break;
                case 'UPDATE':
                  updatedData.data = oldData.data.map(t => 
                    t.task_id === (payload.new as Task).task_id 
                      ? { ...t, ...(payload.new as Task) }
                      : t
                  );
                  break;
                case 'DELETE':
                  updatedData.data = oldData.data.filter(t => t.task_id !== (payload.old as Task).task_id);
                  break;
              }
              return updatedData;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    // Return accumulated tasks for backwards compatibility
    data: allTasks,
    tasks: allTasks,
    isLoading: query.isLoading && cursor === null,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    // Pagination
    hasMore: query.data?.metadata?.hasMore || false,
    loadMore,
    reset,
    refetch: query.refetch,
    // Metadata
    metadata: query.data?.metadata,
  };
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
      
      // Validate section belongs to project if both provided
      if (params.section_id && params.project_id) {
        const { data: section } = await supabase
          .from('project_sections')
          .select('project_id')
          .eq('id', params.section_id)
          .maybeSingle();
        
        if (section && section.project_id !== params.project_id) {
          throw new Error('Section does not belong to this project');
        }
      }
      
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
     // NO optimistic update - rely on real-time subscription for UI update
     // This prevents race conditions between optimistic updates and real-time events
     },
     onError: (err) => {
      showOperationError('create', 'Task', err);
    },
     onSuccess: () => {
       // Backup: If real-time didn't fire within 1 second, invalidate queries
       setTimeout(() => {
         queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
       }, 1000);
       toast.success('Task created');
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

  // Toggle task completion (with optional time tracking)
  const toggleComplete = useMutation({
    mutationFn: async ({ taskId, actual_minutes }: { taskId: string; actual_minutes?: number }) => {
      const session = await getSession();
      const response = await supabase.functions.invoke('manage-task', {
        body: { action: 'toggle', task_id: taskId, actual_minutes },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.error) throw response.error;
      return response.data?.data as Task;
    },
    onMutate: async ({ taskId }) => {
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
    onError: (err, _vars, context) => {
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
       // Check all date fields consistently (matches getTasksForDate utility)
       const isScheduledForDate = task.scheduled_date === dateStr;
       const isPlannedForDate = task.planned_day === dateStr;
       const hasTimeBlockForDate = task.time_block_start?.startsWith(dateStr);
       return isScheduledForDate || isPlannedForDate || hasTimeBlockForDate;
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
