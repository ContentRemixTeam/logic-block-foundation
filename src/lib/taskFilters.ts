 import { Task } from '@/components/tasks/types';
 
 /**
  * Unified task filtering for a specific date.
  * Checks all date fields consistently across the app:
  * - scheduled_date
  * - planned_day
  * - time_block_start
  * 
  * This is the SINGLE SOURCE OF TRUTH for date-based task filtering.
  */
 export function getTasksForDate(tasks: Task[], dateStr: string): Task[] {
   return tasks.filter(task => {
     if (task.is_recurring_parent) return false;
     
     const isScheduledForDate = task.scheduled_date === dateStr;
     const isPlannedForDate = task.planned_day === dateStr;
     const hasTimeBlockForDate = task.time_block_start?.startsWith(dateStr);
     
     return isScheduledForDate || isPlannedForDate || hasTimeBlockForDate;
   });
 }
 
 /**
  * Get incomplete tasks for a date (most common use case)
  */
 export function getIncompleteTasksForDate(tasks: Task[], dateStr: string): Task[] {
   return getTasksForDate(tasks, dateStr).filter(t => !t.is_completed);
 }
 
 /**
  * Separate tasks into scheduled (has time) and unscheduled (pool)
  * A task is considered "scheduled" if it has either:
  * - time_block_start (for drag-drop scheduling)
  * - scheduled_time (for legacy/quick time assignments)
  */
 export function separateScheduledTasks(tasks: Task[]) {
   const scheduled: Task[] = [];
   const unscheduled: Task[] = [];
 
   tasks.forEach(task => {
     if (task.time_block_start || task.scheduled_time) {
       scheduled.push(task);
     } else {
       unscheduled.push(task);
     }
   });
 
   return { scheduled, unscheduled };
 }
 
 /**
  * Get overdue incomplete tasks (scheduled before a given date)
  */
 export function getOverdueTasks(tasks: Task[], beforeDate: Date): Task[] {
   const beforeStr = beforeDate.toISOString().split('T')[0];
   
   return tasks.filter(task => {
     if (task.is_completed || task.is_recurring_parent) return false;
     
     const scheduledDate = task.scheduled_date || task.planned_day;
     if (!scheduledDate) return false;
     
     return scheduledDate < beforeStr;
   });
 }