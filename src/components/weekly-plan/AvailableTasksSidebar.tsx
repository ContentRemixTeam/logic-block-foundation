import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, ENERGY_LEVELS } from '@/components/tasks/types';
import { WeeklyTaskCard } from './WeeklyTaskCard';
import { InlineTaskAdd } from './InlineTaskAdd';
import { Search, RotateCcw, Loader2, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AvailableTasksSidebarProps {
  tasks: Task[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onPullUnfinished: () => Promise<void>;
  onAddTask: (text: string) => Promise<void>;
  onMoveToInbox: (taskId: string) => void;
  isPulling: boolean;
  highlightTaskId?: string | null;
}

function AvailableTasksSidebarInner({
  tasks,
  onTaskToggle,
  onPullUnfinished,
  onAddTask,
  onMoveToInbox,
  isPulling,
  highlightTaskId,
}: AvailableTasksSidebarProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [energyFilter, setEnergyFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const hasActiveFilters = energyFilter !== 'all' || priorityFilter !== 'all' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setEnergyFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
  };

  // Filter tasks: unscheduled (planned_day is null) and not completed
  const inboxTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.planned_day !== null) return false;
      if (t.is_completed) return false;
      // Show all unscheduled, incomplete tasks
      // Note: Blocked tasks are identified by waiting_on field, not status

      // Search filter
      if (searchQuery.trim() && !t.task_text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (energyFilter !== 'all' && t.energy_level !== energyFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      return true;
    });
  }, [tasks, searchQuery, energyFilter, priorityFilter]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set to false if we're actually leaving the container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Try to get data from JSON format first, then fall back to plain text
    let taskId: string | null = null;

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const parsed = JSON.parse(jsonData);
        taskId = parsed.taskId;
      }
    } catch {
      // Fall back to plain text format
      taskId = e.dataTransfer.getData('taskId');
    }

    if (taskId) {
      onMoveToInbox(taskId);
    }
  }, [onMoveToInbox]);

  // Reset drag state when drag ends globally
  useEffect(() => {
    const handleDragEnd = () => {
      setIsDragOver(false);
    };

    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border w-full">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Available Tasks</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPullUnfinished}
            disabled={isPulling}
            title="Pull unfinished tasks"
          >
            {isPulling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/30"
          />
        </div>

        {/* Collapsible Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md hover:bg-muted/50 transition-colors',
                hasActiveFilters && 'bg-primary/5'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Filters</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                    Active
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn('h-3 w-3 text-muted-foreground transition-transform', filtersOpen && 'rotate-180')}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select value={energyFilter} onValueChange={setEnergyFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Energy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Energy</SelectItem>
                    {ENERGY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Task list / drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex-1 overflow-y-auto p-3 space-y-2 min-h-[300px] transition-all duration-150',
          isDragOver && 'bg-primary/10 ring-2 ring-primary/30 ring-inset scale-[1.01]'
        )}
      >
        {/* Drop indicator */}
        {isDragOver && (
          <div className="text-xs text-primary text-center py-2 font-medium animate-pulse border-2 border-dashed border-primary/30 rounded-md mb-2">
            Drop to move to inbox
          </div>
        )}
        
        {inboxTasks.length === 0 && !isDragOver ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <p className="text-sm text-muted-foreground">All tasks are scheduled!</p>
          </div>
        ) : (
          inboxTasks.map((task) => (
            <WeeklyTaskCard
              key={task.task_id}
              task={task}
              onToggle={onTaskToggle}
              isHighlighted={highlightTaskId === task.task_id}
            />
          ))
        )}
      </div>

      {/* Inline Add at bottom */}
      <div className="border-t p-3">
        <InlineTaskAdd onAdd={onAddTask} placeholder="Add task..." />
      </div>
    </div>
  );
}

export const AvailableTasksSidebar = memo(AvailableTasksSidebarInner);
