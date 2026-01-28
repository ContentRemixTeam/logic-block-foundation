import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { X, Clock } from 'lucide-react';
import { Task } from '@/components/tasks/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimeSlotProps {
  time: string; // e.g., "09:00"
  tasks: Task[];
  onTaskDrop: (taskId: string, time: string) => void;
  onTaskRemove: (taskId: string) => void;
  isCurrentHour?: boolean;
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function ScheduledTask({ 
  task, 
  onRemove 
}: { 
  task: Task; 
  onRemove: () => void;
}) {
  const duration = task.time_slot_duration || task.estimated_minutes || 60;

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-md",
      "group hover:bg-primary/15 transition-colors"
    )}>
      <span className="flex-1 text-sm truncate font-medium">
        {task.task_text}
      </span>
      
      <Badge variant="secondary" className="text-xs shrink-0">
        {duration}m
      </Badge>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove from time slot"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function TimeSlot({ 
  time, 
  tasks, 
  onTaskDrop, 
  onTaskRemove,
  isCurrentHour = false
}: TimeSlotProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `time-slot-${time}`,
    data: {
      type: 'time-slot',
      time,
    }
  });

  const hasTasks = tasks.length > 0;
  const isDragging = !!active;

  return (
    <div className="flex gap-2">
      {/* Time Label */}
      <div className={cn(
        "w-16 shrink-0 text-xs font-medium pt-2 text-right pr-2",
        isCurrentHour ? "text-primary" : "text-muted-foreground"
      )}>
        {formatTime(time)}
      </div>

      {/* Droppable Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[80px] rounded-lg p-2 transition-all",
          // Border styles
          hasTasks 
            ? "border border-border" 
            : "border border-dashed border-border/50",
          // Hover/drag states
          isOver && "border-primary bg-primary/5 ring-2 ring-primary/20",
          isDragging && !isOver && "border-primary/30",
          // Current hour indicator
          isCurrentHour && "bg-primary/5"
        )}
      >
        {hasTasks ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <ScheduledTask
                key={task.task_id}
                task={task}
                onRemove={() => onTaskRemove(task.task_id)}
              />
            ))}
          </div>
        ) : isDragging ? (
          <div className={cn(
            "h-full min-h-[60px] flex items-center justify-center",
            "text-sm text-muted-foreground",
            isOver && "text-primary"
          )}>
            <Clock className="h-4 w-4 mr-2" />
            Drop task here
          </div>
        ) : (
          <div className="h-full min-h-[60px]" />
        )}
      </div>
    </div>
  );
}

export default TimeSlot;
