import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Task, ENERGY_LEVELS, CONTEXT_TAGS } from '@/components/tasks/types';
import { WeeklyTaskCard } from './WeeklyTaskCard';
import { Plus, RotateCcw, Loader2, Inbox, X } from 'lucide-react';
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

  const hasActiveFilters = energyFilter !== 'all' || priorityFilter !== 'all' || contextFilter !== 'all';

  const clearFilters = () => {
    setEnergyFilter('all');
    setPriorityFilter('all');
    setContextFilter('all');
  };

  // Filter tasks: unscheduled (planned_day is null) and not completed
  const inboxTasks = tasks.filter(t => {
    if (t.planned_day !== null) return false;
    if (t.is_completed) return false;
    if (t.status && !['backlog', 'waiting', 'scheduled'].includes(t.status)) return false;
    
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
    <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Week Inbox</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            {inboxTasks.length}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          <Select value={energyFilter} onValueChange={setEnergyFilter}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Energy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Energy</SelectItem>
              {ENERGY_LEVELS.map(level => (
                <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={contextFilter} onValueChange={setContextFilter}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Context</SelectItem>
              {CONTEXT_TAGS.map(tag => (
                <SelectItem key={tag.value} value={tag.value}>
                  {tag.icon} {tag.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 p-3 border-b">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs h-8"
          onClick={onPullUnfinished}
          disabled={isPulling}
        >
          {isPulling ? (
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3 mr-1.5" />
          )}
          Pull Last Week
        </Button>
        <Button 
          size="sm"
          className="h-8 text-xs"
          onClick={onAddTask}
        >
          <Plus className="h-3 w-3 mr-1" />
          New Task
        </Button>
      </div>

      {/* Task list / drop zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex-1 overflow-y-auto p-2 space-y-1 min-h-[180px] transition-all",
          isDragOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset"
        )}
      >
        {inboxTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Inbox clear 🎉
            </p>
            <p className="text-xs text-muted-foreground">
              Pull from last week or add a new task
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