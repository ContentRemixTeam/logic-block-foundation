import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Task, ENERGY_LEVELS, CONTEXT_TAGS } from '@/components/tasks/types';
import { WeeklyTaskCard } from './WeeklyTaskCard';
import { InlineTaskAdd } from './InlineTaskAdd';
import { RotateCcw, Loader2, Inbox, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeekInboxProps {
  tasks: Task[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onPullUnfinished: () => Promise<void>;
  onAddTask: (text: string) => Promise<void>;
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Inbox</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            {inboxTasks.length}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs px-2"
          onClick={onPullUnfinished}
          disabled={isPulling}
        >
          {isPulling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <button className={cn(
            "w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors border-b",
            hasActiveFilters && "bg-primary/5"
          )}>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Filters</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  Active
                </Badge>
              )}
            </div>
            <ChevronDown className={cn(
              "h-3 w-3 text-muted-foreground transition-transform",
              filtersOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 py-2 border-b space-y-2">
            <div className="grid grid-cols-1 gap-1.5">
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
                className="text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Task list / drop zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[180px] transition-all",
          isDragOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset"
        )}
      >
        {inboxTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-6">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Inbox clear 🎉
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add a task below
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

      {/* Inline Add at bottom */}
      <div className="border-t p-2">
        <InlineTaskAdd 
          onAdd={onAddTask}
          placeholder="Add to inbox..."
        />
      </div>
    </div>
  );
}
