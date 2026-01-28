import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check } from 'lucide-react';
import { Task } from '@/components/tasks/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getPriorityBadgeClasses } from '@/lib/themeColors';

interface TasksPoolProps {
  tasks: Task[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

interface DraggableTaskProps {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
}

function DraggableTask({ task, onToggle }: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.task_id,
    data: {
      type: 'task',
      task,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityLabel = task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Med' : task.priority === 'low' ? 'Low' : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 bg-card border border-border rounded-lg",
        "hover:border-primary/30 transition-colors group",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/20"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={(checked) => onToggle(task.task_id, checked as boolean)}
        className="h-4 w-4"
      />

      {/* Task Text */}
      <span className={cn(
        "flex-1 text-sm truncate",
        task.is_completed && "line-through text-muted-foreground"
      )}>
        {task.task_text}
      </span>

      {/* Priority Badge */}
      {priorityLabel && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs px-1.5 py-0",
            getPriorityBadgeClasses(task.priority)
          )}
        >
          {priorityLabel}
        </Badge>
      )}

      {/* Duration indicator */}
      {task.estimated_minutes && (
        <span className="text-xs text-muted-foreground">
          {task.estimated_minutes}m
        </span>
      )}
    </div>
  );
}

export function TasksPool({ tasks, onTaskToggle, onTaskUpdate }: TasksPoolProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'tasks-pool',
    data: {
      type: 'pool',
    }
  });

  const taskIds = tasks.map(t => t.task_id);

  return (
    <Card className={cn(
      "transition-colors",
      isOver && "ring-2 ring-primary/30 bg-primary/5"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Unscheduled Tasks
          {tasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={setNodeRef}
          className="min-h-[100px] space-y-2"
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Check className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No unscheduled tasks.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create tasks in Top 3 or from scratch pad tags.
              </p>
            </div>
          ) : (
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <DraggableTask
                  key={task.task_id}
                  task={task}
                  onToggle={onTaskToggle}
                />
              ))}
            </SortableContext>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TasksPool;
