import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Check, Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FocusTask } from '@/hooks/useFocusTasks';
import { Link } from 'react-router-dom';
import { Task } from '@/components/tasks/types';

interface FocusTaskListProps {
  tasks: FocusTask[];
  availableTasks: Task[];
  emptyPositions: readonly (1 | 2 | 3)[];
  onComplete: (position: 1 | 2 | 3) => Promise<void>;
  onSelectTask: (taskId: string, position: 1 | 2 | 3) => Promise<void>;
  onRemoveTask: (position: 1 | 2 | 3) => Promise<void>;
  onStartTimer: (task: FocusTask) => void;
  activeTaskId?: string;
  className?: string;
}

const POSITION_LABELS = ['First', 'Second', 'Third'];
const POSITION_EMOJIS = ['🥇', '🥈', '🥉'];

export function FocusTaskList({ 
  tasks, 
  availableTasks,
  emptyPositions,
  onComplete, 
  onSelectTask,
  onRemoveTask,
  onStartTimer, 
  activeTaskId,
  className 
}: FocusTaskListProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [selectingPosition, setSelectingPosition] = useState<1 | 2 | 3 | null>(null);

  const handleComplete = async (task: FocusTask) => {
    if (task.isCompleted) return;
    setCompletingId(task.id);
    try {
      await onComplete(task.position);
    } finally {
      setCompletingId(null);
    }
  };

  const handleSelectTask = async (taskId: string) => {
    if (!selectingPosition) return;
    await onSelectTask(taskId, selectingPosition);
    setSelectingPosition(null);
  };

  const getTaskForPosition = (position: 1 | 2 | 3) => {
    return tasks.find(t => t.position === position);
  };

  // Show all 3 slots
  const allPositions: (1 | 2 | 3)[] = [1, 2, 3];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Today's Top 3 Priorities
        </h3>
        <Link to="/daily-plan" className="text-xs text-primary hover:underline">
          Edit in Daily Plan →
        </Link>
      </div>
      
      {allPositions.map((position) => {
        const task = getTaskForPosition(position);
        const positionIndex = position - 1;
        const isActive = task && activeTaskId === task.id;
        const isCompleting = task && completingId === task.id;
        const isSelecting = selectingPosition === position;
        
        return (
          <Card 
            key={position}
            className={cn(
              "p-4 transition-all duration-200",
              task?.isCompleted && "opacity-60 bg-muted/30",
              isActive && "ring-2 ring-primary ring-offset-2",
              !task && "border-dashed"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Position indicator */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg",
                task?.isCompleted 
                  ? "bg-green-500/20" 
                  : task
                    ? "bg-primary/10"
                    : "bg-muted"
              )}>
                {task?.isCompleted ? <Check className="h-4 w-4 text-green-600" /> : POSITION_EMOJIS[positionIndex]}
              </div>

              {/* Task Content or Selector */}
              <div className="flex-1 min-w-0">
                {task ? (
                  <p className={cn(
                    "font-medium",
                    task.isCompleted && "line-through text-muted-foreground"
                  )}>
                    {task.text}
                  </p>
                ) : isSelecting ? (
                  <Select onValueChange={handleSelectTask}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select a task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTasks.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          <p>No tasks available</p>
                          <Link to="/tasks" className="text-primary hover:underline block mt-1">
                            Create tasks →
                          </Link>
                        </div>
                      ) : (
                        availableTasks.slice(0, 20).map((t) => (
                          <SelectItem key={t.task_id} value={t.task_id}>
                            <span className="truncate max-w-[250px] block">
                              {t.task_text}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <button
                    onClick={() => setSelectingPosition(position)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add {POSITION_LABELS[positionIndex].toLowerCase()} priority
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {task && !task.isCompleted && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onStartTimer(task)}
                      className={cn(
                        "rounded-full h-8 w-8 p-0",
                        isActive && "bg-primary text-primary-foreground"
                      )}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    
                    <Checkbox
                      checked={task.isCompleted}
                      disabled={task.isCompleted || !!isCompleting}
                      onCheckedChange={() => handleComplete(task)}
                      className="h-5 w-5"
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveTask(position)}
                      className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {isCompleting && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}

                {isSelecting && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectingPosition(null)}
                    className="rounded-full h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Help text */}
      {tasks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Select tasks from your task manager to focus on today
        </p>
      )}
    </div>
  );
}
