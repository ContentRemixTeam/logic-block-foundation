/**
 * Weekly Task Card with Reschedule Loop Detection
 * 
 * QA CHECKLIST:
 * - Move a task 3 times → banner appears
 * - Push a task out by 7+ days → banner appears  
 * - Banner suppressed after dismiss for 24h
 * - Tap banner → micro prompt opens
 */

import { useState, useRef, useCallback, memo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Task } from '@/components/tasks/types';
import { cn } from '@/lib/utils';
import { GripVertical, Clock } from 'lucide-react';
import { RescheduleLoopBanner } from '@/components/coaching/RescheduleLoopBanner';

interface WeeklyTaskCardProps {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  isDragging?: boolean;
  compact?: boolean;
  isHighlighted?: boolean;
}

const WeeklyTaskCardInner = memo(function WeeklyTaskCardInner({ task, onToggle, isDragging, compact = false, isHighlighted = false }: WeeklyTaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      taskId: task.task_id,
      fromPlannedDay: task.planned_day || '',
      sourceType: 'weekly-planner'
    }));
    // Also set plain text for backwards compatibility
    e.dataTransfer.setData('taskId', task.task_id);
    e.dataTransfer.setData('fromPlannedDay', task.planned_day || '');

    setIsDraggingLocal(true);

    // Prevent body scroll during drag
    document.body.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';

    // Create a custom drag image from the card
    if (cardRef.current) {
      const dragImage = cardRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.9';
      dragImage.style.transform = 'rotate(2deg) scale(1.02)';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-9999px';
      dragImage.style.left = '-9999px';
      dragImage.style.width = `${cardRef.current.offsetWidth}px`;
      dragImage.style.pointerEvents = 'none';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 20, 20);
      
      // Clean up drag image after drag starts
      requestAnimationFrame(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      });
    }
  }, [task.task_id, task.planned_day]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    setIsDraggingLocal(false);
    
    // Re-enable body scroll
    document.body.style.overflow = '';
    document.body.style.userSelect = '';
  }, []);

  const priorityColors: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  const isCurrentlyDragging = isDragging || isDraggingLocal;

  return (
    <TooltipProvider>
      <div
        ref={cardRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group flex items-center gap-2 rounded-md border bg-card transition-all",
          compact ? "px-2 py-1.5" : "p-2.5",
          isCurrentlyDragging && "opacity-50 scale-95 shadow-lg ring-2 ring-primary/30",
          isHovered && !isCurrentlyDragging && "shadow-sm border-primary/20",
          task.is_completed && "opacity-60",
          isHighlighted && "ring-2 ring-primary ring-offset-2 animate-pulse"
        )}
        data-task-id={task.task_id}
      >
        {/* Drag handle - THIS IS THE ONLY DRAGGABLE ELEMENT */}
        <div 
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={cn(
            "shrink-0 cursor-grab active:cursor-grabbing touch-none select-none p-0.5 -ml-1 rounded hover:bg-muted transition-colors",
            isHovered || isCurrentlyDragging ? "opacity-100" : "opacity-0",
            compact && "hidden sm:flex"
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
        
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={() => onToggle(task.task_id, task.is_completed)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-4 w-4 shrink-0"
        />
        
        <div className="flex-1 min-w-0 select-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className={cn(
                "truncate leading-tight",
                compact ? "text-sm" : "text-sm",
                task.is_completed && "line-through text-muted-foreground"
              )}>
                {task.task_text}
              </p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {task.task_text}
            </TooltipContent>
          </Tooltip>
          
          {/* Reschedule loop banner */}
          {!compact && task.reschedule_loop_active && (
            <RescheduleLoopBanner task={task} variant="card" className="mt-1" />
          )}
        </div>

        {/* Compact metadata: just time + priority dot */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.estimated_minutes && (
            <span className={cn(
              "text-muted-foreground flex items-center gap-0.5",
              compact ? "text-xs" : "text-xs"
            )}>
              <Clock className="h-3 w-3" />
              {formatDuration(task.estimated_minutes)}
            </span>
          )}

          {task.priority && (
            <div 
              className={cn(
                "rounded-full w-2 h-2",
                priorityColors[task.priority] || 'bg-gray-400'
              )} 
              title={`${task.priority} priority`}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
});

// Export with stable reference comparison
export const WeeklyTaskCard = memo(WeeklyTaskCardInner, (prevProps, nextProps) => {
  // Only re-render if these props changed
  return (
    prevProps.task.task_id === nextProps.task.task_id &&
    prevProps.task.task_text === nextProps.task.task_text &&
    prevProps.task.is_completed === nextProps.task.is_completed &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.estimated_minutes === nextProps.task.estimated_minutes &&
    prevProps.task.reschedule_loop_active === nextProps.task.reschedule_loop_active &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.compact === nextProps.compact &&
    prevProps.isHighlighted === nextProps.isHighlighted
  );
});
