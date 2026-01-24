import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FocusTask } from '@/hooks/useFocusTasks';
import { Link } from 'react-router-dom';

interface FocusTaskListProps {
  tasks: FocusTask[];
  onComplete: (position: 1 | 2 | 3) => Promise<void>;
  onStartTimer: (task: FocusTask) => void;
  activeTaskId?: string;
  className?: string;
}

export function FocusTaskList({ 
  tasks, 
  onComplete, 
  onStartTimer, 
  activeTaskId,
  className 
}: FocusTaskListProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleComplete = async (task: FocusTask) => {
    if (task.isCompleted) return;
    setCompletingId(task.id);
    try {
      await onComplete(task.position);
    } finally {
      setCompletingId(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium mb-2">No priorities set for today</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Set your Top 3 priorities in your daily plan to get started.
        </p>
        <Button asChild>
          <Link to="/daily-plan">Go to Daily Plan →</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Today's Top 3 Priorities
      </h3>
      
      {tasks.map((task, index) => {
        const isActive = activeTaskId === task.id;
        const isCompleting = completingId === task.id;
        
        return (
          <Card 
            key={task.id}
            className={cn(
              "p-4 transition-all duration-200",
              task.isCompleted && "opacity-60 bg-muted/30",
              isActive && "ring-2 ring-primary ring-offset-2"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Priority Number */}
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                task.isCompleted 
                  ? "bg-green-500/20 text-green-600" 
                  : "bg-primary/10 text-primary"
              )}>
                {task.isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium",
                  task.isCompleted && "line-through text-muted-foreground"
                )}>
                  {task.text}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!task.isCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onStartTimer(task)}
                    className={cn(
                      "rounded-full",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                
                <Checkbox
                  checked={task.isCompleted}
                  disabled={task.isCompleted || isCompleting}
                  onCheckedChange={() => handleComplete(task)}
                  className="h-5 w-5"
                />
                
                {isCompleting && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
