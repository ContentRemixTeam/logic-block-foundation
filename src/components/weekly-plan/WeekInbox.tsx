import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, ENERGY_LEVELS, CONTEXT_TAGS } from '@/components/tasks/types';
import { WeeklyTaskCard } from './WeeklyTaskCard';
import { Plus, RotateCcw, Loader2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeekInboxProps {
  tasks: Task[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onPullUnfinished: () => Promise<void>;
  onAddTask: () => void;
  onMoveToInbox: (taskId: string) => void;
  isPulling: boolean;
}

export function WeekInbox({ 
  tasks, 
  onTaskToggle, 
  onPullUnfinished,
  onAddTask,
  onMoveToInbox,
  isPulling
}: WeekInboxProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [energyFilter, setEnergyFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [contextFilter, setContextFilter] = useState<string>('all');

  // Filter tasks: unscheduled (planned_day is null) and not completed
  const inboxTasks = tasks.filter(t => {
    if (t.planned_day !== null) return false;
    if (t.is_completed) return false;
    // Filter by status - show backlog, waiting, scheduled, or null status
    if (t.status && !['backlog', 'waiting', 'scheduled'].includes(t.status)) return false;
    
    // Apply filters
    if (energyFilter !== 'all' && t.energy_level !== energyFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (contextFilter !== 'all' && !t.context_tags?.includes(contextFilter)) return false;
    
    return true;
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onMoveToInbox(taskId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Inbox className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Week Inbox</h3>
        <span className="text-xs text-muted-foreground">({inboxTasks.length})</span>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-3">
        <Select value={energyFilter} onValueChange={setEnergyFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Energy level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Energy</SelectItem>
            {ENERGY_LEVELS.map(level => (
              <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={contextFilter} onValueChange={setContextFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Context" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contexts</SelectItem>
            {CONTEXT_TAGS.map(tag => (
              <SelectItem key={tag.value} value={tag.value}>
                {tag.icon} {tag.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs h-8"
          onClick={onPullUnfinished}
          disabled={isPulling}
        >
          {isPulling ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3 mr-1" />
          )}
          Pull Last Week
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8"
          onClick={onAddTask}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Task list / drop zone for returning tasks */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex-1 overflow-y-auto space-y-1 p-2 rounded-lg border min-h-[200px] transition-colors",
          isDragOver ? "bg-primary/10 border-primary/50" : "bg-muted/30"
        )}
      >
        {inboxTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No unscheduled tasks
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a task or pull from last week
            </p>
          </div>
        ) : (
          inboxTasks.map((task) => (
            <WeeklyTaskCard
              key={task.task_id}
              task={task}
              onToggle={onTaskToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
