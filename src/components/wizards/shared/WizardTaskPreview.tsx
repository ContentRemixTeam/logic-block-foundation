// Shared Task Preview Component for All Wizards
// Provides toggleable task list with date editing capability

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  ListTodo, 
  AlertTriangle,
  Calendar as CalendarIcon,
  RotateCcw
} from 'lucide-react';
import { WizardTask, TaskDateOverride, getTaskDate, isTaskSelected } from '@/types/wizardTask';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export interface PhaseConfig {
  key: string;
  label: string;
}

interface WizardTaskPreviewProps {
  tasks: WizardTask[];
  excludedTasks: string[];
  dateOverrides: TaskDateOverride[];
  onExcludedTasksChange: (excludedTasks: string[]) => void;
  onDateOverridesChange: (overrides: TaskDateOverride[]) => void;
  phaseOrder: PhaseConfig[];
  defaultExpandedPhases?: string[];
  maxHeight?: string;
}

export function WizardTaskPreview({
  tasks,
  excludedTasks,
  dateOverrides,
  onExcludedTasksChange,
  onDateOverridesChange,
  phaseOrder,
  defaultExpandedPhases = [],
  maxHeight = '400px',
}: WizardTaskPreviewProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(defaultExpandedPhases.length > 0 ? defaultExpandedPhases : phaseOrder.slice(0, 2).map(p => p.key))
  );

  // Group tasks by phase
  const groupedTasks = useMemo(() => {
    const grouped: Record<string, WizardTask[]> = {};
    phaseOrder.forEach(phase => {
      grouped[phase.key] = [];
    });
    tasks.forEach(task => {
      if (grouped[task.phase]) {
        grouped[task.phase].push(task);
      }
    });
    return grouped;
  }, [tasks, phaseOrder]);

  const selectedCount = tasks.filter(t => isTaskSelected(t.id, excludedTasks)).length;
  const totalCount = tasks.length;

  const toggleTask = (taskId: string) => {
    if (excludedTasks.includes(taskId)) {
      onExcludedTasksChange(excludedTasks.filter(id => id !== taskId));
    } else {
      onExcludedTasksChange([...excludedTasks, taskId]);
    }
  };

  const togglePhaseExpanded = (phase: string) => {
    const next = new Set(expandedPhases);
    if (next.has(phase)) {
      next.delete(phase);
    } else {
      next.add(phase);
    }
    setExpandedPhases(next);
  };

  const selectAll = () => {
    onExcludedTasksChange([]);
  };

  const deselectAll = () => {
    onExcludedTasksChange(tasks.map(t => t.id));
  };

  const togglePhase = (phaseKey: string, select: boolean) => {
    const phaseTasks = groupedTasks[phaseKey] || [];
    const phaseIds = phaseTasks.map(t => t.id);
    
    if (select) {
      onExcludedTasksChange(excludedTasks.filter(id => !phaseIds.includes(id)));
    } else {
      const newExcluded = new Set([...excludedTasks, ...phaseIds]);
      onExcludedTasksChange(Array.from(newExcluded));
    }
  };

  const getPhaseSelectedCount = (phaseKey: string) => {
    const phaseTasks = groupedTasks[phaseKey] || [];
    return phaseTasks.filter(t => isTaskSelected(t.id, excludedTasks)).length;
  };

  const updateTaskDate = (taskId: string, newDate: Date | undefined) => {
    if (!newDate) {
      // Remove override
      onDateOverridesChange(dateOverrides.filter(o => o.taskId !== taskId));
    } else {
      const dateStr = format(newDate, 'yyyy-MM-dd');
      const existing = dateOverrides.find(o => o.taskId === taskId);
      if (existing) {
        onDateOverridesChange(dateOverrides.map(o => 
          o.taskId === taskId ? { ...o, newDate: dateStr } : o
        ));
      } else {
        onDateOverridesChange([...dateOverrides, { taskId, newDate: dateStr }]);
      }
    }
  };

  const resetTaskDate = (taskId: string) => {
    onDateOverridesChange(dateOverrides.filter(o => o.taskId !== taskId));
  };

  const hasDateOverride = (taskId: string) => {
    return dateOverrides.some(o => o.taskId === taskId);
  };

  return (
    <div className="space-y-4">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          <span className="font-medium">Tasks to Create</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={selectAll}
            className="text-xs"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            Select All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={deselectAll}
            className="text-xs"
          >
            <Square className="h-3 w-3 mr-1" />
            Deselect All
          </Button>
        </div>
      </div>

      {/* Selected count */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{selectedCount}</strong> of {totalCount} tasks selected
        </span>
        {selectedCount === 0 && (
          <div className="flex items-center gap-1 text-amber-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>No tasks will be created</span>
          </div>
        )}
      </div>

      {/* Task list by phase */}
      <ScrollArea className="pr-4" style={{ height: maxHeight }}>
        <div className="space-y-2">
          {phaseOrder.map(phase => {
            const phaseTasks = groupedTasks[phase.key] || [];
            if (phaseTasks.length === 0) return null;
            
            const phaseSelected = getPhaseSelectedCount(phase.key);
            const isExpanded = expandedPhases.has(phase.key);
            const allSelected = phaseSelected === phaseTasks.length;
            const noneSelected = phaseSelected === 0;
            
            return (
              <Collapsible
                key={phase.key}
                open={isExpanded}
                onOpenChange={() => togglePhaseExpanded(phase.key)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium text-sm">{phase.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {phaseSelected}/{phaseTasks.length}
                        </Badge>
                      </div>
                      <div 
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePhase(phase.key, true)}
                          disabled={allSelected}
                          className="text-xs h-6 px-2"
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePhase(phase.key, false)}
                          disabled={noneSelected}
                          className="text-xs h-6 px-2"
                        >
                          None
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="divide-y">
                      {phaseTasks.map(task => {
                        const isSelected = isTaskSelected(task.id, excludedTasks);
                        const effectiveDate = getTaskDate(task, dateOverrides);
                        const hasOverride = hasDateOverride(task.id);
                        
                        return (
                          <div
                            key={task.id}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 transition-colors',
                              isSelected ? 'hover:bg-accent/50' : 'opacity-50 hover:opacity-75'
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleTask(task.id)}
                            />
                            <span className="text-sm flex-1">{task.task_text}</span>
                            
                            {/* Date picker */}
                            <div className="flex items-center gap-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      'h-7 px-2 text-xs',
                                      hasOverride && 'text-primary'
                                    )}
                                  >
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    {effectiveDate 
                                      ? format(parseISO(effectiveDate), 'MMM d')
                                      : 'No date'
                                    }
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                  <Calendar
                                    mode="single"
                                    selected={effectiveDate ? parseISO(effectiveDate) : undefined}
                                    onSelect={(date) => updateTaskDate(task.id, date)}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                              
                              {hasOverride && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resetTaskDate(task.id)}
                                  className="h-6 w-6 p-0"
                                  title="Reset to original date"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            
                            {task.priority === 'high' && (
                              <Badge variant="outline" className="text-xs">
                                High
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
