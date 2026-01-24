import { useMemo } from 'react';
import { useDailyTop3 } from '@/hooks/useDailyTop3';
import { useTasks } from '@/hooks/useTasks';

export interface FocusTask {
  id: string;
  text: string;
  isCompleted: boolean;
  position: 1 | 2 | 3;
  taskId: string | null;
}

export function useFocusTasks() {
  const { top3Tasks, isLoading: top3Loading, completeTask, selectTask, removeTask, refetch } = useDailyTop3();
  const { data: allTasks, isLoading: tasksLoading } = useTasks();

  const today = new Date().toISOString().split('T')[0];

  // Get Top 3 from daily_top3_tasks first, fallback to priority_order tasks
  const focusTasks = useMemo<FocusTask[]>(() => {
    // If we have daily_top3_tasks entries, use those
    if (top3Tasks.length > 0) {
      return top3Tasks.map(t => ({
        id: t.id,
        text: t.task?.task_text || 'Untitled task',
        isCompleted: !!t.completed_at,
        position: t.position as 1 | 2 | 3,
        taskId: t.task_id,
      }));
    }

    // Fallback: get tasks with priority_order 1-3 for today
    if (allTasks) {
      const priorityTasks = allTasks
        .filter(t => 
          t.priority_order && 
          t.priority_order >= 1 && 
          t.priority_order <= 3 &&
          t.scheduled_date === today
        )
        .sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0))
        .slice(0, 3);

      return priorityTasks.map(t => ({
        id: t.task_id,
        text: t.task_text,
        isCompleted: t.is_completed,
        position: t.priority_order as 1 | 2 | 3,
        taskId: t.task_id,
      }));
    }

    return [];
  }, [top3Tasks, allTasks, today]);

  // Get available tasks for selection (not already in top 3, not completed)
  const availableTasks = useMemo(() => {
    if (!allTasks) return [];
    const selectedTaskIds = focusTasks.map(t => t.taskId).filter(Boolean);
    return allTasks.filter(t => 
      !t.is_completed && 
      !selectedTaskIds.includes(t.task_id)
    );
  }, [allTasks, focusTasks]);

  // Get which positions are empty (for adding new tasks)
  const emptyPositions = useMemo(() => {
    const filledPositions = focusTasks.map(t => t.position);
    return ([1, 2, 3] as const).filter(p => !filledPositions.includes(p));
  }, [focusTasks]);

  const completedCount = focusTasks.filter(t => t.isCompleted).length;
  const allComplete = focusTasks.length === 3 && completedCount === 3;
  const hasAnyTasks = focusTasks.length > 0;

  return {
    focusTasks,
    availableTasks,
    emptyPositions,
    isLoading: top3Loading || tasksLoading,
    completedCount,
    allComplete,
    hasAnyTasks,
    completeTask,
    selectTask,
    removeTask,
    refetch,
  };
}
