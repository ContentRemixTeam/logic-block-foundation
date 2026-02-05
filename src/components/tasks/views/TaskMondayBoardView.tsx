import { useState, useMemo } from 'react';
import { Task, CONTEXT_TAGS } from '@/components/tasks/types';
import { BOARD_COLUMNS } from '@/types/project';
import { TaskBoardGroup } from './TaskBoardGroup';
import { TaskDetailsDrawer } from '@/components/projects/monday-board/TaskDetailsDrawer';
import { cn } from '@/lib/utils';
import { isToday, isTomorrow, isPast, startOfDay, isThisWeek } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GripVertical, Search, Columns, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskMondayBoardViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onAddTask: () => void;
}

type GroupByOption = 'date' | 'priority' | 'project';

const DATE_GROUPS = [
  { id: 'overdue', name: 'Overdue', color: 'hsl(var(--destructive))' },
  { id: 'today', name: 'Today', color: 'hsl(var(--success))' },
  { id: 'tomorrow', name: 'Tomorrow', color: 'hsl(var(--status-scheduled))' },
  { id: 'this_week', name: 'This Week', color: 'hsl(var(--status-waiting))' },
  { id: 'later', name: 'Later', color: 'hsl(var(--status-someday))' },
  { id: 'no_date', name: 'No Date', color: 'hsl(var(--muted-foreground))' },
];

const PRIORITY_GROUPS = [
  { id: 'high', name: 'High Priority', color: 'hsl(var(--priority-high))' },
  { id: 'medium', name: 'Medium Priority', color: 'hsl(var(--priority-medium))' },
  { id: 'low', name: 'Low Priority', color: 'hsl(var(--priority-low))' },
  { id: 'none', name: 'No Priority', color: 'hsl(var(--muted-foreground))' },
];

const DEFAULT_VISIBLE_COLUMNS = ['task', 'status', 'scheduled_date', 'priority', 'tags', 'estimated_minutes', 'project'];

export function TaskMondayBoardView({
  tasks,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onOpenDetail,
  onAddTask,
}: TaskMondayBoardViewProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>('date');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Get date group for a task
  const getDateGroup = (task: Task): string => {
    if (!task.scheduled_date) return 'no_date';
    const date = new Date(task.scheduled_date);
    const today = startOfDay(new Date());
    
    if (isPast(date) && !isToday(date)) return 'overdue';
    if (isToday(date)) return 'today';
    if (isTomorrow(date)) return 'tomorrow';
    if (isThisWeek(date, { weekStartsOn: 1 })) return 'this_week';
    return 'later';
  };

  // Filter and sort tasks
  const processedTasks = useMemo(() => {
    let result = [...tasks].filter(t => !t.is_recurring_parent);

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.task_text.toLowerCase().includes(query) ||
        t.task_description?.toLowerCase().includes(query)
      );
    }

    // Filters
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.field as keyof Task];
        const bVal = b[sortConfig.field as keyof Task];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [tasks, searchQuery, filters, sortConfig]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups: Map<string, Task[]> = new Map();

    processedTasks.forEach(task => {
      let groupId: string;

      switch (groupBy) {
        case 'date':
          groupId = getDateGroup(task);
          break;
        case 'priority':
          groupId = task.priority || 'none';
          break;
        case 'project':
          groupId = task.project_id || 'no_project';
          break;
        default:
          groupId = 'none';
      }

      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(task);
    });

    return groups;
  }, [processedTasks, groupBy]);

  // Get groups config based on groupBy
  const getGroups = () => {
    switch (groupBy) {
      case 'date':
        return DATE_GROUPS;
      case 'priority':
        return PRIORITY_GROUPS;
      case 'project':
        // Dynamic project groups
        const projectIds = new Set(tasks.filter(t => t.project_id).map(t => t.project_id));
        const projectGroups = Array.from(projectIds).map(id => {
          const task = tasks.find(t => t.project_id === id);
          return {
            id: id!,
            name: task?.project?.name || 'Unknown Project',
            color: task?.project?.color || '#6B7280',
          };
        });
        projectGroups.push({ id: 'no_project', name: 'No Project', color: '#9CA3AF' });
        return projectGroups;
      default:
        return DATE_GROUPS;
    }
  };

  const groups = getGroups();

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCreateTask = (text: string, groupId?: string) => {
    // This would create a task - for now we'll open the add dialog
    onAddTask();
  };

  const handleColumnToggle = (columnId: string) => {
    const column = BOARD_COLUMNS.find(c => c.id === columnId);
    if (column?.required) return;

    if (visibleColumns.includes(columnId)) {
      setVisibleColumns(visibleColumns.filter(c => c !== columnId));
    } else {
      setVisibleColumns([...visibleColumns, columnId]);
    }
  };

  // Get column width
  const getColumnWidth = (columnId: string) => {
    const col = BOARD_COLUMNS.find(c => c.id === columnId);
    return col?.width || 100;
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Group By Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Group by:</span>
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="project">Project</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Column Customizer */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setShowColumnCustomizer(true)}
        >
          <Columns className="h-4 w-4" />
          Columns
        </Button>

        <div className="flex-1" />

        {/* New Task */}
        <Button size="sm" className="gap-2" onClick={onAddTask}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Table Header */}
      <div className="flex bg-muted/50 border-b text-xs font-medium text-muted-foreground sticky top-0 z-20">
        {BOARD_COLUMNS.filter(col => visibleColumns.includes(col.id)).map((column, index) => (
          <div
            key={column.id}
            className={cn(
              'px-3 py-2 border-r',
              index === 0 && 'sticky left-0 z-10 bg-muted/50'
            )}
            style={{ width: getColumnWidth(column.id), minWidth: getColumnWidth(column.id) }}
          >
            {column.label}
          </div>
        ))}
        <div className="flex-1 min-w-[60px] px-3 py-2">Actions</div>
      </div>

      {/* Groups */}
      <div className="divide-y">
        {groups.map(group => {
          const groupTasks = groupedTasks.get(group.id) || [];
          
          return (
            <TaskBoardGroup
              key={group.id}
              group={{ id: group.id, name: group.name, color: group.color }}
              tasks={groupTasks}
              visibleColumns={visibleColumns}
              onTaskClick={handleTaskClick}
              onToggleComplete={onToggleComplete}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onCreateTask={(groupId, text) => handleCreateTask(text, groupId)}
            />
          );
        })}
      </div>

      {/* Empty state */}
      {processedTasks.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">No tasks found</p>
          <p className="text-sm">Create your first task to get started</p>
        </div>
      )}

      {/* Column Customizer Dialog */}
      <Dialog open={showColumnCustomizer} onOpenChange={setShowColumnCustomizer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Columns</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {BOARD_COLUMNS.map(column => (
              <div key={column.id} className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Checkbox
                  id={column.id}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={() => handleColumnToggle(column.id)}
                  disabled={column.required}
                />
                <Label 
                  htmlFor={column.id} 
                  className="flex-1 cursor-pointer"
                >
                  {column.label}
                  {column.required && (
                    <span className="text-xs text-muted-foreground ml-2">(required)</span>
                  )}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setVisibleColumns(BOARD_COLUMNS.map(c => c.id))}>
              Show All
            </Button>
            <Button variant="outline" size="sm" onClick={() => setVisibleColumns(BOARD_COLUMNS.filter(c => c.required).map(c => c.id))}>
              Minimal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(taskId, updates) => {
          onUpdateTask(taskId, updates);
        }}
        onDelete={(taskId) => {
          const task = tasks.find(t => t.task_id === taskId);
          if (task) {
            onDeleteTask(task);
            setSelectedTask(null);
          }
        }}
      />
    </div>
  );
}