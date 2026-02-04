import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, CheckSquare, Square, ListTodo, AlertTriangle } from 'lucide-react';
import { SummitWizardData } from '@/types/summit';
import { generateSummitTasksPreview, groupTasksByPhase, PHASE_LABELS, SummitTask } from '@/lib/summitTaskGenerator';

interface TaskPreviewSectionProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

export function TaskPreviewSection({ data, updateData }: TaskPreviewSectionProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['recruitment', 'content']));
  
  const allTasks = useMemo(() => generateSummitTasksPreview(data), [data]);
  const groupedTasks = useMemo(() => groupTasksByPhase(allTasks), [allTasks]);
  
  const selectedCount = allTasks.filter(t => !data.excludedTasks.includes(t.id)).length;
  const totalCount = allTasks.length;

  const toggleTask = (taskId: string) => {
    const current = data.excludedTasks;
    if (current.includes(taskId)) {
      updateData({ excludedTasks: current.filter(id => id !== taskId) });
    } else {
      updateData({ excludedTasks: [...current, taskId] });
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
    updateData({ excludedTasks: [] });
  };

  const deselectAll = () => {
    updateData({ excludedTasks: allTasks.map(t => t.id) });
  };

  const togglePhase = (phase: SummitTask['phase'], select: boolean) => {
    const phaseTasks = groupedTasks[phase];
    const phaseIds = phaseTasks.map(t => t.id);
    
    if (select) {
      updateData({ 
        excludedTasks: data.excludedTasks.filter(id => !phaseIds.includes(id)) 
      });
    } else {
      const newExcluded = new Set([...data.excludedTasks, ...phaseIds]);
      updateData({ excludedTasks: Array.from(newExcluded) });
    }
  };

  const getPhaseSelectedCount = (phase: SummitTask['phase']) => {
    const phaseTasks = groupedTasks[phase];
    return phaseTasks.filter(t => !data.excludedTasks.includes(t.id)).length;
  };

  const phaseOrder: SummitTask['phase'][] = ['recruitment', 'content', 'promotion', 'live', 'post-summit'];

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
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {phaseOrder.map(phase => {
            const phaseTasks = groupedTasks[phase];
            if (phaseTasks.length === 0) return null;
            
            const phaseSelected = getPhaseSelectedCount(phase);
            const isExpanded = expandedPhases.has(phase);
            const allSelected = phaseSelected === phaseTasks.length;
            const noneSelected = phaseSelected === 0;
            
            return (
              <Collapsible
                key={phase}
                open={isExpanded}
                onOpenChange={() => togglePhaseExpanded(phase)}
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
                        <span className="font-medium text-sm">{PHASE_LABELS[phase]}</span>
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
                          onClick={() => togglePhase(phase, true)}
                          disabled={allSelected}
                          className="text-xs h-6 px-2"
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePhase(phase, false)}
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
                        const isSelected = !data.excludedTasks.includes(task.id);
                        return (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                              isSelected ? 'hover:bg-accent/50' : 'opacity-50 hover:opacity-75'
                            }`}
                            onClick={() => toggleTask(task.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleTask(task.id)}
                            />
                            <span className="text-sm flex-1">{task.task_text}</span>
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
