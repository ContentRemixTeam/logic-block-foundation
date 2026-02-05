import { useState, useCallback } from 'react';
import { useTaskMutations } from '@/hooks/useTasks';
import { useTaskSettings } from '@/hooks/useTaskSettings';
import { TaskCompletionModal } from '@/components/tasks/TaskCompletionModal';

interface Task {
  task_id: string;
  task_text: string;
  estimated_minutes?: number | null;
  is_completed?: boolean | null;
}

/**
 * Centralized hook for handling task completion with time tracking
 * 
 * This hook manages the completion flow:
 * 1. Checks if time tracking is enabled in settings
 * 2. Determines whether to show the completion modal based on settings
 * 3. Handles the actual toggle mutation with optional actual_minutes
 */
export function useTaskCompletion() {
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const { toggleComplete } = useTaskMutations();
  const { settings } = useTaskSettings();

  /**
   * Handle task completion - shows modal or completes immediately based on settings
   */
  const handleTaskComplete = useCallback((task: Task) => {
    // If already completing (unchecking), just toggle without modal
    if (task.is_completed) {
      toggleComplete.mutate({ taskId: task.task_id });
      return;
    }

    // Check if time tracking is enabled
    if (!settings?.enable_time_tracking) {
      toggleComplete.mutate({ taskId: task.task_id });
      return;
    }

    const modalPref = settings?.time_completion_modal || 'when_estimated';

    if (modalPref === 'never') {
      toggleComplete.mutate({ taskId: task.task_id });
    } else if (modalPref === 'always' || (modalPref === 'when_estimated' && task.estimated_minutes)) {
      setPendingTask(task);
    } else {
      toggleComplete.mutate({ taskId: task.task_id });
    }
  }, [settings, toggleComplete]);

  /**
   * Handle saving time from the modal
   */
  const handleSave = useCallback((actualMinutes: number) => {
    if (pendingTask) {
      toggleComplete.mutate({ 
        taskId: pendingTask.task_id, 
        actual_minutes: actualMinutes 
      });
      setPendingTask(null);
    }
  }, [pendingTask, toggleComplete]);

  /**
   * Handle skipping time entry - just complete the task without logging time
   */
  const handleSkip = useCallback(() => {
    if (pendingTask) {
      toggleComplete.mutate({ taskId: pendingTask.task_id });
      setPendingTask(null);
    }
  }, [pendingTask, toggleComplete]);

  /**
   * Close modal without completing
   */
  const handleClose = useCallback(() => {
    setPendingTask(null);
  }, []);

  // Render the modal component
  const CompletionModal = pendingTask ? (
    <TaskCompletionModal
      open={!!pendingTask}
      task={pendingTask}
      onClose={handleClose}
      onSave={handleSave}
      onSkip={handleSkip}
    />
  ) : null;

  return {
    handleTaskComplete,
    CompletionModal,
    isPending: !!pendingTask,
  };
}
