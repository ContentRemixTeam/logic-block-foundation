import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, CalendarIcon, Clock, RefreshCw, ChevronDown, 
  ClipboardList, ExternalLink, Unlink, LayoutList, Columns, 
  Clock3, Zap, Battery, BatteryLow, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import new components
import { TaskQuickAdd } from '@/components/tasks/TaskQuickAdd';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { HelpButton } from '@/components/ui/help-button';
import { TaskListView } from '@/components/tasks/views/TaskListView';
import { TaskKanbanView } from '@/components/tasks/views/TaskKanbanView';
import { TaskTimelineView } from '@/components/tasks/views/TaskTimelineView';
import { TaskWeekView } from '@/components/tasks/views/TaskWeekView';
import { TaskMonthView } from '@/components/tasks/views/TaskMonthView';
import { TaskThreeDayView } from '@/components/tasks/views/TaskThreeDayView';
import { TaskMondayBoardView } from '@/components/tasks/views/TaskMondayBoardView';
import { TimelineDayNavigation } from '@/components/tasks/views/TimelineDayNavigation';
import { TimelineViewSelector, TimelineViewType } from '@/components/tasks/views/TimelineViewSelector';
import { TaskPlanningCards } from '@/components/tasks/TaskPlanningCards';
import { TaskViewsToolbar } from '@/components/tasks/TaskViewsToolbar';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { CalendarSelectionModal } from '@/components/google-calendar/CalendarSelectionModal';
import { 
  Task, SOP, ChecklistItem, SOPLink, ChecklistProgress, 
  FilterTab, ViewMode, EnergyLevel, RecurrencePattern, DeleteType,
  DAYS_OF_WEEK, DURATION_OPTIONS, ENERGY_LEVELS, CONTEXT_TAGS
} from '@/components/tasks/types';

export default function Tasks() {
  const queryClient = useQueryClient();
  
  // Google Calendar integration
  const { 
    status: calendarStatus, 
    connect: connectCalendar,
    calendars,
    showCalendarModal,
    setShowCalendarModal,
    selectCalendar,
    handleOAuthReturn 
  } = useGoogleCalendar();

  // Handle OAuth return on mount
  useEffect(() => {
    handleOAuthReturn();
  }, [handleOAuthReturn]);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('database');
  const [timelineViewType, setTimelineViewType] = useState<TimelineViewType>('day');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Filter state
  const [energyFilter, setEnergyFilter] = useState<EnergyLevel[]>([]);
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  
  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteTaskInfo, setDeleteTaskInfo] = useState<{ isRecurring: boolean; hasParent: boolean } | null>(null);
  const [deleteType, setDeleteType] = useState<DeleteType>('single');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [recurringExpanded, setRecurringExpanded] = useState(false);
  
  // Form state for new task
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>();
  const [newTaskPriority, setNewTaskPriority] = useState<string>('');
  const [newRecurrencePattern, setNewRecurrencePattern] = useState<RecurrencePattern>('none');
  const [newRecurrenceDays, setNewRecurrenceDays] = useState<string[]>([]);
  const [newMonthlyDay, setNewMonthlyDay] = useState<number>(1);
  const [selectedSopId, setSelectedSopId] = useState<string>('');
  const [newChecklistProgress, setNewChecklistProgress] = useState<ChecklistProgress[]>([]);
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState<number | null>(null);
  const [newEnergyLevel, setNewEnergyLevel] = useState<EnergyLevel | null>(null);
  const [newContextTags, setNewContextTags] = useState<string[]>([]);

  // Fetch all tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('get-all-tasks', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data?.data || [];
    },
  });

  // Fetch SOPs for dropdown
  const { data: sops = [] } = useQuery({
    queryKey: ['sops'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('get-sops', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data?.data || [];
    },
  });

  // Generate recurring tasks on page load
  useEffect(() => {
    const generateRecurring = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        await supabase.functions.invoke('generate-recurring-tasks', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      } catch (error) {
        console.error('Failed to generate recurring tasks:', error);
      }
    };

    generateRecurring();
  }, []);

  // Manage task mutation
  const manageMutation = useMutation({
    mutationFn: async (params: Record<string, any>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('manage-task', {
        body: params,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sops'] });
    },
  });

  // Calculate overdue tasks count
  const overdueCount = useMemo(() => {
    const today = startOfDay(new Date());
    return tasks.filter((t: Task) => {
      if (t.is_completed || t.is_recurring_parent) return false;
      if (!t.scheduled_date) return false;
      return isBefore(parseISO(t.scheduled_date), today);
    }).length;
  }, [tasks]);

  // Separate recurring parent tasks
  const { regularTasks, recurringParentTasks } = useMemo(() => {
    const regular: Task[] = [];
    const recurring: Task[] = [];
    
    tasks.forEach((task: Task) => {
      if (task.is_recurring_parent) {
        recurring.push(task);
      } else {
        regular.push(task);
      }
    });
    
    return { regularTasks: regular, recurringParentTasks: recurring };
  }, [tasks]);

  // Handlers
  const handleToggleComplete = async (taskId: string) => {
    try {
      await manageMutation.mutateAsync({ action: 'toggle', task_id: taskId });
      // Celebration animation could be added here
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await manageMutation.mutateAsync({ 
        action: 'update', 
        task_id: taskId,
        ...updates 
      });
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleQuickReschedule = async (taskId: string, date: Date | null, status?: string) => {
    try {
      const updates: Record<string, unknown> = {
        action: 'update',
        task_id: taskId,
        scheduled_date: date ? format(date, 'yyyy-MM-dd') : null,
      };
      
      if (status) {
        updates.status = status;
      }
      
      await manageMutation.mutateAsync(updates);
      toast.success(status === 'someday' ? 'Task moved to Someday' : 'Task rescheduled');
    } catch (error) {
      toast.error('Failed to reschedule task');
    }
  };

  const handleQuickAdd = async (parsed: {
    text: string;
    date?: Date;
    time?: string;
    tags: string[];
    priority?: 'high' | 'medium' | 'low';
    duration?: number;
  }) => {
    try {
      await manageMutation.mutateAsync({
        action: 'create',
        task_text: parsed.text,
        scheduled_date: parsed.date ? format(parsed.date, 'yyyy-MM-dd') : null,
        priority: parsed.priority || null,
        estimated_minutes: parsed.duration || null,
        context_tags: parsed.tags.length > 0 ? parsed.tags : null,
        status: 'backlog',
      });
      toast.success('Task added');
    } catch (error) {
      toast.error('Failed to add task');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskText.trim()) {
      toast.error('Please enter a task');
      return;
    }

    try {
      await manageMutation.mutateAsync({
        action: 'create',
        task_text: newTaskText,
        task_description: newTaskDescription || null,
        scheduled_date: newTaskDate ? format(newTaskDate, 'yyyy-MM-dd') : null,
        priority: newTaskPriority || null,
        recurrence_pattern: newRecurrencePattern !== 'none' ? newRecurrencePattern : null,
        recurrence_days: newRecurrencePattern === 'weekly' 
          ? newRecurrenceDays 
          : newRecurrencePattern === 'monthly' 
            ? [String(newMonthlyDay)] 
            : [],
        sop_id: selectedSopId && selectedSopId !== 'none' ? selectedSopId : null,
        checklist_progress: newChecklistProgress,
        estimated_minutes: newEstimatedMinutes,
        energy_level: newEnergyLevel,
        context_tags: newContextTags,
        status: 'backlog',
      });
      toast.success('Task added');
      resetAddForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add task');
    }
  };

  const resetAddForm = () => {
    setNewTaskText('');
    setNewTaskDescription('');
    setNewTaskDate(undefined);
    setNewTaskPriority('');
    setNewRecurrencePattern('none');
    setNewRecurrenceDays([]);
    setNewMonthlyDay(1);
    setSelectedSopId('');
    setNewChecklistProgress([]);
    setNewEstimatedMinutes(null);
    setNewEnergyLevel(null);
    setNewContextTags([]);
  };

  const handleSopSelect = (sopId: string) => {
    setSelectedSopId(sopId);
    
    if (sopId && sopId !== 'none') {
      const sop = sops.find((s: SOP) => s.sop_id === sopId);
      if (sop) {
        let description = '';
        
        if (sop.checklist_items && sop.checklist_items.length > 0) {
          description += 'CHECKLIST:\n';
          const sortedItems = [...sop.checklist_items].sort((a: ChecklistItem, b: ChecklistItem) => a.order - b.order);
          sortedItems.forEach((item: ChecklistItem) => {
            description += `☐ ${item.text}\n`;
          });
          
          setNewChecklistProgress(sortedItems.map((item: ChecklistItem) => ({
            item_id: item.id,
            completed: false
          })));
        }
        
        if (sop.links && sop.links.length > 0) {
          description += '\nUSEFUL LINKS:\n';
          sop.links.forEach((link: SOPLink) => {
            description += `• ${link.title}: ${link.url}\n`;
          });
        }
        
        if (sop.notes) {
          description += '\nNOTES:\n';
          description += sop.notes;
        }
        
        setNewTaskDescription(description.trim());
      }
    } else {
      setNewChecklistProgress([]);
    }
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask({ ...task });
    setIsDetailDialogOpen(true);
  };

  const initiateDelete = (task: Task) => {
    setDeleteTaskId(task.task_id);
    setDeleteTaskInfo({
      isRecurring: task.is_recurring_parent,
      hasParent: !!task.parent_task_id
    });
    setDeleteType('single');
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;

    try {
      await manageMutation.mutateAsync({ 
        action: 'delete', 
        task_id: deleteTaskId,
        delete_type: deleteType
      });
      toast.success('Task deleted');
      setDeleteTaskId(null);
      setDeleteTaskInfo(null);
      setDeleteType('single');
      setIsDetailDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleSaveTaskDetail = async () => {
    if (!selectedTask) return;

    try {
      await manageMutation.mutateAsync({
        action: 'update',
        task_id: selectedTask.task_id,
        task_text: selectedTask.task_text,
        task_description: selectedTask.task_description,
        scheduled_date: selectedTask.scheduled_date,
        priority: selectedTask.priority,
        recurrence_pattern: selectedTask.recurrence_pattern,
        recurrence_days: selectedTask.recurrence_days || [],
        estimated_minutes: selectedTask.estimated_minutes,
        energy_level: selectedTask.energy_level,
        context_tags: selectedTask.context_tags,
        status: selectedTask.status,
        waiting_on: selectedTask.waiting_on,
        notes: selectedTask.notes,
      });
      toast.success('Task updated');
      setIsDetailDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleToggleChecklistItem = async (taskId: string, itemId: string) => {
    try {
      await manageMutation.mutateAsync({ 
        action: 'toggle_checklist_item', 
        task_id: taskId,
        item_id: itemId
      });
    } catch (error) {
      toast.error('Failed to update checklist');
    }
  };

  const handleDetachSop = async (taskId: string) => {
    try {
      await manageMutation.mutateAsync({ action: 'detach_sop', task_id: taskId });
      toast.success('SOP detached');
      if (selectedTask) {
        setSelectedTask({ ...selectedTask, sop_id: null, sop: null });
      }
    } catch (error) {
      toast.error('Failed to detach SOP');
    }
  };

  const handleAddTaskAtTime = (hour: number, date?: Date) => {
    setNewTaskDate(date || selectedDate);
    setIsAddDialogOpen(true);
  };

  const getRecurrenceLabel = (pattern: string | null, days: string[] | null) => {
    switch (pattern) {
      case 'daily': return 'Every day';
      case 'weekly': return days?.length ? `Every ${days.join(', ')}` : 'Weekly';
      case 'monthly': 
        const day = days?.length ? parseInt(days[0], 10) : 1;
        return `${getOrdinalSuffix(day)} of each month`;
      default: return '';
    }
  };

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const toggleRecurrenceDay = (day: string, currentDays: string[], setter: (days: string[]) => void) => {
    if (currentDays.includes(day)) {
      setter(currentDays.filter(d => d !== day));
    } else {
      setter([...currentDays, day]);
    }
  };

  const isChecklistItemCompleted = (task: Task, itemId: string) => {
    return (task.checklist_progress || []).some(p => p.item_id === itemId && p.completed);
  };

  const getChecklistStats = (task: Task) => {
    if (!task.sop?.checklist_items || task.sop.checklist_items.length === 0) {
      return null;
    }
    const total = task.sop.checklist_items.length;
    const completed = (task.checklist_progress || []).filter(p => p.completed).length;
    return { total, completed };
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-muted-foreground">Your workflow command center</p>
          </div>
        </div>

        {/* Task Planning Cards */}
        <TaskPlanningCards />

        {/* Views Toolbar */}
        <TaskViewsToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddTask={() => setIsAddDialogOpen(true)}
          overdueCount={overdueCount}
          isCalendarConnected={calendarStatus.connected && calendarStatus.calendarSelected}
          onConnectCalendar={() => connectCalendar()}
        />

        {/* Timeline view type selector */}
        {viewMode === 'timeline' && (
          <TimelineViewSelector
            viewType={timelineViewType}
            onViewTypeChange={setTimelineViewType}
          />
        )}

        {/* Quick Add Bar */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Quick Add</span>
            <HelpButton
              title="Quick Add Syntax"
              description="Add tasks faster using natural language shortcuts."
              tips={[
                "Type 'today' or 'tomorrow' to set the date",
                "Use #tag for context (e.g., #calls, #deep-work)",
                "Add !high, !med, or !low for priority",
                "Include '30m' or '2h' to set duration"
              ]}
              learnMoreHref="/support"
              side="right"
            />
          </div>
          <TaskQuickAdd onAddTask={handleQuickAdd} />
        </div>

        {/* Recurring Tasks (collapsed by default) */}
        {recurringParentTasks.length > 0 && (
          <Collapsible open={recurringExpanded} onOpenChange={setRecurringExpanded}>
            <Card className="border-dashed">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4" />
                      Recurring Tasks
                      <Badge variant="secondary">{recurringParentTasks.length}</Badge>
                    </CardTitle>
                    <ChevronDown className={cn("h-4 w-4 transition-transform text-muted-foreground", recurringExpanded && "rotate-180")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  {recurringParentTasks.map((task: Task) => (
                    <div 
                      key={task.task_id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer" 
                      onClick={() => openTaskDetail(task)}
                    >
                      <div>
                        <p className="font-medium text-sm">{task.task_text}</p>
                        <p className="text-xs text-muted-foreground">
                          {getRecurrenceLabel(task.recurrence_pattern, task.recurrence_days)}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive" 
                        onClick={(e) => { e.stopPropagation(); initiateDelete(task); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Filters row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {viewMode === 'list' && (
            <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
              <TabsList>
                <TabsTrigger value="today" className="text-xs sm:text-sm">Today</TabsTrigger>
                <TabsTrigger value="week" className="text-xs sm:text-sm">This Week</TabsTrigger>
                <TabsTrigger value="all" className="text-xs sm:text-sm">All Open</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          
          <TaskFilters
            selectedEnergy={energyFilter}
            onEnergyChange={setEnergyFilter}
            selectedTags={tagsFilter}
            onTagsChange={setTagsFilter}
            onClearFilters={() => {
              setEnergyFilter([]);
              setTagsFilter([]);
            }}
          />
        </div>

        {/* Main content */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
        ) : viewMode === 'list' ? (
          <TaskListView
            tasks={regularTasks}
            activeFilter={activeFilter}
            energyFilter={energyFilter}
            tagsFilter={tagsFilter}
            onToggleComplete={handleToggleComplete}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={initiateDelete}
            onOpenDetail={openTaskDetail}
            onQuickReschedule={handleQuickReschedule}
            onAddTask={() => setIsAddDialogOpen(true)}
          />
        ) : viewMode === 'kanban' ? (
          <TaskKanbanView
            tasks={regularTasks}
            onToggleComplete={handleToggleComplete}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={initiateDelete}
            onOpenDetail={openTaskDetail}
            onQuickReschedule={handleQuickReschedule}
          />
        ) : viewMode === 'board' ? (
          <TaskMondayBoardView
            tasks={regularTasks}
            onToggleComplete={handleToggleComplete}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={initiateDelete}
            onOpenDetail={openTaskDetail}
            onAddTask={() => setIsAddDialogOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {/* Day Navigation for day and 3-day views */}
            {(timelineViewType === 'day' || timelineViewType === '3-day') && (
              <TimelineDayNavigation
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}
            
            {/* Render appropriate timeline view */}
            {timelineViewType === 'day' && (
              <TaskTimelineView
                tasks={regularTasks}
                selectedDate={selectedDate}
                onUpdateTask={handleUpdateTask}
                onOpenDetail={openTaskDetail}
                onAddTaskAtTime={handleAddTaskAtTime}
              />
            )}
            
            {timelineViewType === '3-day' && (
              <TaskThreeDayView
                tasks={regularTasks}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onUpdateTask={handleUpdateTask}
                onOpenDetail={openTaskDetail}
                onAddTaskAtTime={handleAddTaskAtTime}
              />
            )}
            
            {timelineViewType === 'week' && (
              <TaskWeekView
                tasks={regularTasks}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onUpdateTask={handleUpdateTask}
                onOpenDetail={openTaskDetail}
              />
            )}
            
            {timelineViewType === 'month' && (
              <TaskMonthView
                tasks={regularTasks}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onOpenDetail={openTaskDetail}
              />
            )}
          </div>
        )}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="task-text">Task</Label>
                <Input
                  id="task-text"
                  placeholder="What do you need to do?"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddTask()}
                />
              </div>

              {/* Duration & Energy */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimated Time</Label>
                  <Select 
                    value={newEstimatedMinutes?.toString() || ''} 
                    onValueChange={(v) => setNewEstimatedMinutes(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          <span className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Energy Required</Label>
                  <Select 
                    value={newEnergyLevel || ''} 
                    onValueChange={(v) => setNewEnergyLevel(v as EnergyLevel || null)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Energy level" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENERGY_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          <span className="flex items-center gap-2">
                            {level.value === 'high_focus' && <Zap className="h-3 w-3" />}
                            {level.value === 'medium' && <Battery className="h-3 w-3" />}
                            {level.value === 'low_energy' && <BatteryLow className="h-3 w-3" />}
                            {level.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Context Tags */}
              <div>
                <Label>Context Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CONTEXT_TAGS.map(tag => (
                    <Badge
                      key={tag.value}
                      variant={newContextTags.includes(tag.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (newContextTags.includes(tag.value)) {
                          setNewContextTags(newContextTags.filter(t => t !== tag.value));
                        } else {
                          setNewContextTags([...newContextTags, tag.value]);
                        }
                      }}
                    >
                      {tag.icon} {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* SOP Selector */}
              <div>
                <Label>Use SOP (optional)</Label>
                <Select value={selectedSopId} onValueChange={handleSopSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select an SOP to load checklist..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {sops.map((sop: SOP) => (
                      <SelectItem key={sop.sop_id} value={sop.sop_id}>
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          {sop.sop_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="task-desc">Description</Label>
                <Textarea
                  id="task-desc"
                  placeholder="Add more details..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="min-h-[100px] mt-1"
                />
              </div>

              <div className="flex gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {newTaskDate ? format(newTaskDate, 'MMM d, yyyy') : 'Schedule for...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newTaskDate} onSelect={setNewTaskDate} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recurrence Options */}
              <div className="space-y-3">
                <Label>Recurring</Label>
                <RadioGroup value={newRecurrencePattern} onValueChange={(v) => setNewRecurrencePattern(v as RecurrencePattern)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="r-none" />
                    <Label htmlFor="r-none" className="font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="r-daily" />
                    <Label htmlFor="r-daily" className="font-normal">Daily</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="r-weekly" />
                    <Label htmlFor="r-weekly" className="font-normal">Weekly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="r-monthly" />
                    <Label htmlFor="r-monthly" className="font-normal">Monthly</Label>
                  </div>
                </RadioGroup>

                {newRecurrencePattern === 'weekly' && (
                  <div className="flex flex-wrap gap-2 pl-6">
                    {DAYS_OF_WEEK.map((day) => (
                      <Badge
                        key={day}
                        variant={newRecurrenceDays.includes(day) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleRecurrenceDay(day, newRecurrenceDays, setNewRecurrenceDays)}
                      >
                        {day.slice(0, 3)}
                      </Badge>
                    ))}
                  </div>
                )}

                {newRecurrencePattern === 'monthly' && (
                  <div className="flex items-center gap-2 pl-6">
                    <Label className="font-normal">Repeat on the</Label>
                    <Select value={String(newMonthlyDay)} onValueChange={(v) => setNewMonthlyDay(parseInt(v, 10))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {getOrdinalSuffix(day)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Label className="font-normal">of each month</Label>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={manageMutation.isPending}>
              {manageMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedTask.is_completed}
                    onCheckedChange={(checked) => setSelectedTask({ ...selectedTask, is_completed: !!checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Input
                      value={selectedTask.task_text}
                      onChange={(e) => setSelectedTask({ ...selectedTask, task_text: e.target.value })}
                      className="text-lg font-medium"
                    />
                  </div>
                </div>

                {/* Duration & Energy */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estimated Time</Label>
                    <Select 
                      value={selectedTask.estimated_minutes?.toString() || ''} 
                      onValueChange={(v) => setSelectedTask({ ...selectedTask, estimated_minutes: v ? parseInt(v) : null })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Energy Required</Label>
                    <Select 
                      value={selectedTask.energy_level || ''} 
                      onValueChange={(v) => setSelectedTask({ ...selectedTask, energy_level: v as EnergyLevel || null })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Energy level" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENERGY_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Context Tags */}
                <div>
                  <Label>Context Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CONTEXT_TAGS.map(tag => (
                      <Badge
                        key={tag.value}
                        variant={(selectedTask.context_tags || []).includes(tag.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const current = selectedTask.context_tags || [];
                          if (current.includes(tag.value)) {
                            setSelectedTask({ ...selectedTask, context_tags: current.filter(t => t !== tag.value) });
                          } else {
                            setSelectedTask({ ...selectedTask, context_tags: [...current, tag.value] });
                          }
                        }}
                      >
                        {tag.icon} {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* SOP Info */}
                {selectedTask.sop && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        <span className="font-medium text-primary">Using SOP: {selectedTask.sop.sop_name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDetachSop(selectedTask.task_id)}>
                        <Unlink className="h-4 w-4 mr-1" />
                        Detach
                      </Button>
                    </div>

                    {/* Interactive Checklist */}
                    {selectedTask.sop.checklist_items && selectedTask.sop.checklist_items.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">CHECKLIST</span>
                          {(() => {
                            const stats = getChecklistStats(selectedTask);
                            return stats ? (
                              <Badge variant="secondary" className="text-xs">
                                {stats.completed} of {stats.total} completed
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                        <div className="space-y-2">
                          {[...selectedTask.sop.checklist_items]
                            .sort((a, b) => a.order - b.order)
                            .map((item) => {
                              const isCompleted = isChecklistItemCompleted(selectedTask, item.id);
                              return (
                                <div 
                                  key={item.id} 
                                  className={cn(
                                    "flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors",
                                    isCompleted && "bg-muted/30"
                                  )}
                                  onClick={() => handleToggleChecklistItem(selectedTask.task_id, item.id)}
                                >
                                  <Checkbox checked={isCompleted} className="pointer-events-none" />
                                  <span className={cn(isCompleted && "line-through text-muted-foreground")}>
                                    {item.text}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Useful Links */}
                    {selectedTask.sop.links && selectedTask.sop.links.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">USEFUL LINKS</span>
                        <div className="space-y-1 mt-2">
                          {selectedTask.sop.links.map((link) => (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                              {link.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedTask.sop.notes && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">NOTES</span>
                        <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/30 p-2 rounded-md">
                          {selectedTask.sop.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={selectedTask.notes || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, notes: e.target.value })}
                    placeholder="Add notes..."
                    className="min-h-[80px] mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scheduled For</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start mt-1">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {selectedTask.scheduled_date ? format(parseISO(selectedTask.scheduled_date), 'MMM d, yyyy') : 'Not scheduled'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedTask.scheduled_date ? parseISO(selectedTask.scheduled_date) : undefined}
                          onSelect={(date) => setSelectedTask({ ...selectedTask, scheduled_date: date ? format(date, 'yyyy-MM-dd') : null })}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={selectedTask.priority || ''} onValueChange={(v) => setSelectedTask({ ...selectedTask, priority: v || null })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Waiting On */}
                <div>
                  <Label>Waiting On</Label>
                  <Input
                    value={selectedTask.waiting_on || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, waiting_on: e.target.value })}
                    placeholder="Who or what are you waiting on?"
                    className="mt-1"
                  />
                </div>

                {/* Recurrence Options for parent tasks */}
                {selectedTask.is_recurring_parent && (
                  <div className="space-y-3">
                    <Label>Recurring</Label>
                    <RadioGroup 
                      value={selectedTask.recurrence_pattern || 'none'} 
                      onValueChange={(v) => setSelectedTask({ ...selectedTask, recurrence_pattern: v as RecurrencePattern })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="d-daily" />
                        <Label htmlFor="d-daily" className="font-normal">Daily</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="weekly" id="d-weekly" />
                        <Label htmlFor="d-weekly" className="font-normal">Weekly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="d-monthly" />
                        <Label htmlFor="d-monthly" className="font-normal">Monthly</Label>
                      </div>
                    </RadioGroup>

                    {selectedTask.recurrence_pattern === 'weekly' && (
                      <div className="flex flex-wrap gap-2 pl-6">
                        {DAYS_OF_WEEK.map((day) => (
                          <Badge
                            key={day}
                            variant={(selectedTask.recurrence_days || []).includes(day) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => setSelectedTask({ 
                              ...selectedTask, 
                              recurrence_days: (selectedTask.recurrence_days || []).includes(day) 
                                ? (selectedTask.recurrence_days || []).filter(d => d !== day)
                                : [...(selectedTask.recurrence_days || []), day]
                            })}
                          >
                            {day.slice(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {selectedTask.recurrence_pattern === 'monthly' && (
                      <div className="flex items-center gap-2 pl-6">
                        <Label className="font-normal">Repeat on the</Label>
                        <Select 
                          value={String((selectedTask.recurrence_days || [])[0] || '1')} 
                          onValueChange={(v) => setSelectedTask({ ...selectedTask, recurrence_days: [v] })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={String(day)}>
                                {getOrdinalSuffix(day)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Label className="font-normal">of each month</Label>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                  {selectedTask.created_at && (
                    <span>Created: {format(parseISO(selectedTask.created_at), 'MMM d, yyyy h:mm a')}</span>
                  )}
                  {selectedTask.source && <span>Source: {selectedTask.source}</span>}
                  {selectedTask.parent_task_id && <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Recurring instance</span>}
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => selectedTask && initiateDelete(selectedTask)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTaskDetail} disabled={manageMutation.isPending}>
              {manageMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => { setDeleteTaskId(null); setDeleteTaskInfo(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTaskInfo?.isRecurring ? (
                <div className="space-y-3">
                  <p>This is a recurring task. How would you like to delete it?</p>
                  <RadioGroup value={deleteType} onValueChange={(v) => setDeleteType(v as DeleteType)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="del-all" />
                      <Label htmlFor="del-all" className="font-normal">Delete this task and all instances</Label>
                    </div>
                  </RadioGroup>
                </div>
              ) : deleteTaskInfo?.hasParent ? (
                <div className="space-y-3">
                  <p>This is an instance of a recurring task. How would you like to delete it?</p>
                  <RadioGroup value={deleteType} onValueChange={(v) => setDeleteType(v as DeleteType)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="single" id="del-single" />
                      <Label htmlFor="del-single" className="font-normal">Delete just this instance</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="future" id="del-future" />
                      <Label htmlFor="del-future" className="font-normal">Stop recurring (delete future instances)</Label>
                    </div>
                  </RadioGroup>
                </div>
              ) : (
                <p>This action cannot be undone. The task will be permanently deleted.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Google Calendar Selection Modal */}
      <CalendarSelectionModal
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
        calendars={calendars}
        onSelect={selectCalendar}
      />
    </Layout>
  );
}
