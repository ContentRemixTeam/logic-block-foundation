import { useMemo, useState } from 'react';
import { format, parseISO, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { 
  ListTodo, AlertTriangle, Sun, Sunrise, Calendar, Clock, ArrowUpDown,
  Inbox, CheckCircle2, ChevronRight, PartyPopper, Plus, Layers, Folder,
  Zap, Flag, ArrowUp, ArrowDown, Loader2
} from 'lucide-react';
import { Task, FilterTab, PrimaryTab, EnergyLevel, GroupByOption, SortByOption, SortDirection, GROUP_BY_OPTIONS, SORT_BY_OPTIONS } from '../types';
import { TaskCard } from '../TaskCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskListViewProps {
  tasks: Task[];
  activeFilter: FilterTab | PrimaryTab;
  energyFilter: EnergyLevel[];
  tagsFilter: string[];
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onQuickReschedule: (taskId: string, date: Date | null, status?: string) => void;
  onAddTask?: () => void;
  // Bulk selection props
  selectedTaskIds?: Set<string>;
  onToggleTaskSelection?: (taskId: string) => void;
  onSelectAllInGroup?: (tasks: Task[]) => void;
  showSelectionCheckboxes?: boolean;
  // Pagination props
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

// Group configuration types
interface GroupConfig {
  id: string;
  name: string;
  icon?: React.ReactNode;
  color?: string;
}

const DATE_GROUPS: GroupConfig[] = [
  { id: 'overdue', name: 'Overdue', icon: <AlertTriangle className="h-5 w-5" />, color: 'text-destructive' },
  { id: 'today', name: 'Today', icon: <Sun className="h-5 w-5" />, color: 'text-amber-500' },
  { id: 'tomorrow', name: 'Tomorrow', icon: <Sunrise className="h-5 w-5" />, color: 'text-blue-500' },
  { id: 'thisWeek', name: 'This Week', icon: <Calendar className="h-5 w-5" /> },
  { id: 'later', name: 'Later', icon: <Calendar className="h-5 w-5" /> },
  { id: 'unscheduled', name: 'No Date', icon: <Inbox className="h-5 w-5" /> },
];

const PRIORITY_GROUPS: GroupConfig[] = [
  { id: 'high', name: 'High Priority', icon: <Flag className="h-5 w-5" />, color: 'text-destructive' },
  { id: 'medium', name: 'Medium Priority', icon: <Flag className="h-5 w-5" />, color: 'text-warning' },
  { id: 'low', name: 'Low Priority', icon: <Flag className="h-5 w-5" />, color: 'text-muted-foreground' },
  { id: 'none', name: 'No Priority', icon: <Flag className="h-5 w-5" /> },
];

const ENERGY_GROUPS: GroupConfig[] = [
  { id: 'high_focus', name: 'High Focus', icon: <Zap className="h-5 w-5" />, color: 'text-destructive' },
  { id: 'medium', name: 'Medium Energy', icon: <Zap className="h-5 w-5" />, color: 'text-warning' },
  { id: 'low_energy', name: 'Low Energy', icon: <Zap className="h-5 w-5" />, color: 'text-success' },
  { id: 'none', name: 'No Energy Level', icon: <Zap className="h-5 w-5" /> },
];

// Empty state component
function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description}
      </p>
      {action && action}
    </div>
  );
}

export function TaskListView({
  tasks,
  activeFilter,
  energyFilter,
  tagsFilter,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onOpenDetail,
  onQuickReschedule,
  onAddTask,
  selectedTaskIds = new Set(),
  onToggleTaskSelection,
  onSelectAllInGroup,
  showSelectionCheckboxes = false,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}: TaskListViewProps) {
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>('date');
  const [sortBy, setSortBy] = useState<SortByOption>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => !task.is_recurring_parent);

    // Apply energy filter
    if (energyFilter.length > 0) {
      result = result.filter(task => 
        task.energy_level && energyFilter.includes(task.energy_level)
      );
    }

    // Apply tags filter
    if (tagsFilter.length > 0) {
      result = result.filter(task => 
        task.context_tags?.some(tag => tagsFilter.includes(tag))
      );
    }

    return result;
  }, [tasks, energyFilter, tagsFilter]);

  // Build dynamic project groups from task data
  const projectGroups = useMemo(() => {
    const projectMap = new Map<string, GroupConfig>();
    
    tasks.forEach(task => {
      if (task.project_id && task.project) {
        projectMap.set(task.project_id, {
          id: task.project_id,
          name: task.project.name,
          icon: <div 
            className="h-4 w-4 rounded-full" 
            style={{ backgroundColor: task.project.color || '#9CA3AF' }}
          />,
        });
      }
    });
    
    return [
      ...Array.from(projectMap.values()),
      { id: 'no_project', name: 'No Project', icon: <Folder className="h-5 w-5 text-muted-foreground" /> },
    ];
  }, [tasks]);

  // Sort tasks within groups
  const sortTasks = (tasksToSort: Task[]): Task[] => {
    return [...tasksToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'scheduled_date':
          const dateA = a.scheduled_date || a.planned_day || '';
          const dateB = b.scheduled_date || b.planned_day || '';
          comparison = dateA.localeCompare(dateB);
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const pA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const pB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          comparison = pB - pA; // Default: high first
          break;
        case 'created_at':
          comparison = (b.created_at || '').localeCompare(a.created_at || '');
          break;
        case 'task_text':
          comparison = (a.task_text || '').localeCompare(b.task_text || '');
          break;
      }
      
      return sortDirection === 'asc' ? -comparison : comparison;
    });
  };

  // Get date group for a task
  const getDateGroupId = (task: Task): string => {
    if (!task.scheduled_date && !task.planned_day) return 'unscheduled';
    
    const dateStr = task.scheduled_date || task.planned_day;
    if (!dateStr) return 'unscheduled';
    
    const taskDate = parseISO(dateStr);
    
    if (isPast(taskDate) && !isToday(taskDate)) return 'overdue';
    if (isToday(taskDate)) return 'today';
    if (isTomorrow(taskDate)) return 'tomorrow';
    if (isThisWeek(taskDate, { weekStartsOn: 1 })) return 'thisWeek';
    return 'later';
  };

  // Group tasks dynamically based on groupBy selection
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, Task[]>();
    const completedTasks: Task[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredTasks.forEach(task => {
      if (task.is_completed) {
        completedTasks.push(task);
        return;
      }

      let groupId: string;
      
      switch (groupBy) {
        case 'date':
          groupId = getDateGroupId(task);
          break;
        case 'priority':
          groupId = task.priority || 'none';
          break;
        case 'project':
          groupId = task.project_id || 'no_project';
          break;
        case 'energy':
          groupId = task.energy_level || 'none';
          break;
        default:
          groupId = 'unscheduled';
      }
      
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(task);
    });

    // Sort tasks within each group
    groups.forEach((tasksInGroup, key) => {
      groups.set(key, sortTasks(tasksInGroup));
    });

    return { groups, completed: sortTasks(completedTasks) };
  }, [filteredTasks, groupBy, sortBy, sortDirection]);

  // Get group config based on current groupBy
  const getGroupConfigs = (): GroupConfig[] => {
    switch (groupBy) {
      case 'date':
        return DATE_GROUPS;
      case 'priority':
        return PRIORITY_GROUPS;
      case 'project':
        return projectGroups;
      case 'energy':
        return ENERGY_GROUPS;
      default:
        return DATE_GROUPS;
    }
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const renderGroup = (
    config: GroupConfig,
    groupTasks: Task[],
    showRescheduleAll: boolean = false
  ) => {
    if (groupTasks.length === 0) return null;

    // Calculate selection state for this group
    const selectableTasks = groupTasks.filter(t => !t.is_completed);
    const selectedInGroup = selectableTasks.filter(t => selectedTaskIds.has(t.task_id)).length;
    const allSelected = selectableTasks.length > 0 && selectedInGroup === selectableTasks.length;
    const someSelected = selectedInGroup > 0 && !allSelected;

    return (
      <div key={config.id} className="space-y-3">
        <div className={cn("flex items-center justify-between", config.color)}>
          <div className="flex items-center gap-2">
            {/* Group selection checkbox */}
            {showSelectionCheckboxes && selectableTasks.length > 0 && (
              <Checkbox
                checked={allSelected}
                className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                onCheckedChange={() => {
                  if (allSelected) {
                    // Deselect all in group
                    selectableTasks.forEach(t => {
                      if (selectedTaskIds.has(t.task_id)) {
                        onToggleTaskSelection?.(t.task_id);
                      }
                    });
                  } else {
                    // Select all in group
                    onSelectAllInGroup?.(selectableTasks);
                  }
                }}
              />
            )}
            <span className={config.color}>{config.icon}</span>
            <h2 className="text-lg font-semibold">{config.name}</h2>
            <Badge variant="secondary">{groupTasks.length}</Badge>
          </div>
          {showRescheduleAll && groupTasks.length > 1 && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs"
              onClick={() => {
                groupTasks.forEach(task => {
                  onQuickReschedule(task.task_id, new Date(), 'scheduled');
                });
              }}
            >
              Reschedule All to Today
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {groupTasks.map(task => (
            <TaskCard
              key={task.task_id}
              task={task}
              onToggleComplete={onToggleComplete}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onOpenDetail={onOpenDetail}
              onQuickReschedule={onQuickReschedule}
              isSelected={selectedTaskIds.has(task.task_id)}
              onToggleSelection={onToggleTaskSelection}
              showSelectionCheckbox={showSelectionCheckboxes && !task.is_completed}
            />
          ))}
        </div>
      </div>
    );
  };

  // Render the sort/group controls toolbar
  const renderControls = () => (
    <div className="flex flex-wrap items-center gap-3 pb-4 border-b mb-6">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground hidden sm:inline">Group by:</span>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_BY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortByOption)}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_BY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={toggleSortDirection}
          title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  // Check if showing completed filter
  if (activeFilter === 'completed' as string) {
    if (groupedTasks.completed.length === 0) {
      return (
        <EmptyState
          icon={CheckCircle2}
          title="No completed tasks yet"
          description="Complete some tasks and they'll appear here for review"
        />
      );
    }
    return (
      <div className="space-y-6">
        {renderControls()}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Completed</h2>
            <Badge variant="outline">{groupedTasks.completed.length}</Badge>
          </div>
          <div className="space-y-2">
            {groupedTasks.completed.map(task => (
              <TaskCard
                key={task.task_id}
                task={task}
                onToggleComplete={onToggleComplete}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
                onOpenDetail={onOpenDetail}
                onQuickReschedule={onQuickReschedule}
                isSelected={selectedTaskIds.has(task.task_id)}
                onToggleSelection={onToggleTaskSelection}
                showSelectionCheckbox={false}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Check for completely empty state
  const hasOpenTasks = groupedTasks.groups.size > 0;

  if (!hasOpenTasks && groupedTasks.completed.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No tasks yet"
        description="Create your first task to start organizing your work"
        action={onAddTask && (
          <Button onClick={onAddTask}>
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        )}
      />
    );
  }

  // Get appropriate group configs based on groupBy selection
  const groupConfigs = getGroupConfigs();
  
  // Check for empty state in Today filter
  if (activeFilter === 'today' && !groupedTasks.groups.has('today') && !groupedTasks.groups.has('overdue')) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="All caught up!"
        description="No tasks due today. Great work! 🎉"
      />
    );
  }
  
  // Check for empty state in Week filter
  if (activeFilter === 'week') {
    const hasWeekTasks = groupedTasks.groups.has('today') || 
      groupedTasks.groups.has('tomorrow') || 
      groupedTasks.groups.has('thisWeek') ||
      groupedTasks.groups.has('overdue');
    
    if (!hasWeekTasks) {
      return (
        <EmptyState
          icon={Calendar}
          title="Week looks clear!"
          description="No tasks scheduled for this week"
        />
      );
    }
  }

  // Render grouped tasks dynamically
  return (
    <div className="space-y-6">
      {renderControls()}
      
      <div className="space-y-8">
        {/* Render groups in order defined by groupConfigs */}
        {groupConfigs.map(config => {
          const tasksInGroup = groupedTasks.groups.get(config.id) || [];
          const isOverdue = config.id === 'overdue';
          return renderGroup(config, tasksInGroup, isOverdue);
        })}

        {/* Completed Section - Collapsible at bottom */}
        {groupedTasks.completed.length > 0 && (activeFilter as string) !== 'completed' && (
          <Collapsible open={completedExpanded} onOpenChange={setCompletedExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded-lg px-2 transition-colors">
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                completedExpanded && "rotate-90"
              )} />
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold text-muted-foreground">
                Completed
              </span>
              <Badge variant="outline">{groupedTasks.completed.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-3">
              {groupedTasks.completed.slice(0, 10).map(task => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onUpdate={onUpdateTask}
                  onDelete={onDeleteTask}
                  onOpenDetail={onOpenDetail}
                  onQuickReschedule={onQuickReschedule}
                  isSelected={selectedTaskIds.has(task.task_id)}
                  onToggleSelection={onToggleTaskSelection}
                  showSelectionCheckbox={false}
                />
              ))}
              {groupedTasks.completed.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  And {groupedTasks.completed.length - 10} more completed tasks...
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Load More Button */}
        {hasMore && !isLoadingMore && (
          <Button 
            onClick={onLoadMore} 
            variant="outline" 
            className="w-full mt-4"
          >
            Load More Tasks
          </Button>
        )}
        
        {/* Loading More Indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading more tasks...</span>
          </div>
        )}
      </div>
    </div>
  );
}
