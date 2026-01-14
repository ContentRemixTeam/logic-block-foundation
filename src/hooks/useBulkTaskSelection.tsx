import { useState, useCallback, useEffect } from 'react';
import { Task } from '@/components/tasks/types';

export function useBulkTaskSelection(tasks: Task[]) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Clear selection when tasks change significantly (e.g., filter changes)
  useEffect(() => {
    // Remove selected IDs that no longer exist in the current task list
    setSelectedTaskIds(prev => {
      const taskIds = new Set(tasks.map(t => t.task_id));
      const filtered = new Set<string>();
      prev.forEach(id => {
        if (taskIds.has(id)) {
          filtered.add(id);
        }
      });
      if (filtered.size !== prev.size) {
        return filtered;
      }
      return prev;
    });
  }, [tasks]);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const selectAllTasks = useCallback((tasksToSelect: Task[]) => {
    const ids = tasksToSelect
      .filter(t => !t.is_recurring_parent && !t.is_completed)
      .map(t => t.task_id);
    setSelectedTaskIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const isSelected = useCallback((taskId: string) => {
    return selectedTaskIds.has(taskId);
  }, [selectedTaskIds]);

  const getSelectedTasks = useCallback(() => {
    return tasks.filter(t => selectedTaskIds.has(t.task_id));
  }, [tasks, selectedTaskIds]);

  // Keyboard shortcut for select all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        // Only trigger if not in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        selectAllTasks(tasks);
      }
      
      // Escape to clear selection
      if (e.key === 'Escape' && selectedTaskIds.size > 0) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tasks, selectAllTasks, clearSelection, selectedTaskIds.size]);

  return {
    selectedTaskIds,
    selectedCount: selectedTaskIds.size,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    isSelected,
    getSelectedTasks,
  };
}
