import { useState } from 'react';
import { useDailyTop3 } from '@/hooks/useDailyTop3';
import { useTasks } from '@/hooks/useTasks';
import { useArcade } from '@/hooks/useArcade';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Target, 
  CheckCircle2, 
  Circle, 
  Plus, 
  X, 
  Coins,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const POSITION_LABELS = ['First', 'Second', 'Third'];
const POSITION_EMOJIS = ['🥇', '🥈', '🥉'];

export function DailyTop3Card() {
  const { top3Tasks, isLoading, selectTask, removeTask, completeTask, completedCount, allComplete } = useDailyTop3();
  const { pet } = useArcade();
  const { data: tasks = [] } = useTasks();
  const [selectingPosition, setSelectingPosition] = useState<1 | 2 | 3 | null>(null);

  // Filter out already selected tasks and completed tasks
  const selectedTaskIds = top3Tasks.map(t => t.task_id).filter(Boolean);
  const availableTasks = tasks.filter(t => 
    !t.is_completed && 
    !selectedTaskIds.includes(t.task_id)
  );

  const getTaskForPosition = (position: number) => {
    return top3Tasks.find(t => t.position === position);
  };

  const handleSelectTask = async (taskId: string) => {
    if (!selectingPosition) return;
    await selectTask(taskId, selectingPosition);
    setSelectingPosition(null);
  };

  const progress = (completedCount / 3) * 100;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      allComplete && "ring-2 ring-primary/50 bg-primary/5"
    )}>
      {/* Celebration overlay when all complete */}
      {allComplete && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Today's Top 3
          </CardTitle>
          <Badge variant={allComplete ? "default" : "secondary"} className="text-xs">
            {completedCount}/3 complete
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>

      <CardContent className="space-y-3">
        {[1, 2, 3].map((position) => {
          const taskEntry = getTaskForPosition(position);
          const isComplete = !!taskEntry?.completed_at;
          const positionIndex = position - 1;

          return (
            <div 
              key={position}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                isComplete 
                  ? "bg-primary/5 border-primary/30" 
                  : taskEntry?.task 
                    ? "bg-muted/30 border-border"
                    : "border-dashed border-muted-foreground/30"
              )}
            >
              {/* Position indicator */}
              <div className="flex-shrink-0 text-lg">
                {POSITION_EMOJIS[positionIndex]}
              </div>

              {/* Task content or selector */}
              <div className="flex-1 min-w-0">
                {taskEntry?.task ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => !isComplete && completeTask(position as 1 | 2 | 3)}
                      disabled={isComplete}
                      className="flex-shrink-0"
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>
                    <span className={cn(
                      "text-sm truncate",
                      isComplete && "line-through text-muted-foreground"
                    )}>
                      {taskEntry.task.task_text}
                    </span>
                  </div>
                ) : selectingPosition === position ? (
                  <Select onValueChange={handleSelectTask}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select a task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTasks.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No tasks available
                        </SelectItem>
                      ) : (
                        availableTasks.slice(0, 20).map((task) => (
                          <SelectItem key={task.task_id} value={task.task_id}>
                            <span className="truncate max-w-[200px] block">
                              {task.task_text}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <button
                    onClick={() => setSelectingPosition(position as 1 | 2 | 3)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add {POSITION_LABELS[positionIndex].toLowerCase()} task
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-1">
                {isComplete && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Coins className="h-3 w-3" />
                    +5
                  </Badge>
                )}
                {taskEntry?.task && !isComplete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeTask(position as 1 | 2 | 3)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                {selectingPosition === position && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectingPosition(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Pet progress indicator */}
        {pet && (
          <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
            <span className="text-lg">
              {pet.stage === 'adult' ? '🎉' : '🥚'}
            </span>
            <span>
              {pet.stage === 'adult' 
                ? 'Your pet is fully grown!' 
                : `${pet.tasks_completed_today}/3 to grow`
              }
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
