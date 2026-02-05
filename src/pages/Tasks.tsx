import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCounter } from '@/components/ui/character-counter';
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
  Clock3, Zap, Battery, BatteryLow, Trash2, CalendarRange, Search, X, CheckSquare,
  AlertTriangle, Calendar as CalendarDays, Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { TaskImportModal } from '@/components/tasks/TaskImportModal';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useBulkTaskSelection } from '@/hooks/useBulkTaskSelection';
import { CalendarSelectionModal } from '@/components/google-calendar/CalendarSelectionModal';
import { 
  Task, SOP, ChecklistItem, SOPLink, ChecklistProgress, 
  FilterTab, ViewMode, EnergyLevel, RecurrencePattern, DeleteType,
  DAYS_OF_WEEK, DURATION_OPTIONS, ENERGY_LEVELS
} from '@/components/tasks/types';
import { CycleFilter, CycleFilterValue, CycleBadge } from '@/components/tasks/CycleFilter';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { CycleTimeline } from '@/components/CycleTimeline';
import { SOPSelector } from '@/components/tasks/SOPSelector';
import { TagManager } from '@/components/tasks/TagManager';
import { TaskRecoveryBanner } from '@/components/tasks/TaskRecoveryBanner';

export default function Tasks() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Google Calendar integration
  const { 
    status: calendarStatus, 
    connect: connectCalendar,
    calendars,
    showCalendarModal,
    setShowCalendarModal,
    selectCalendars,
    handleOAuthReturn 
  } = useGoogleCalendar();

  // Handle OAuth return on mount - only once
  useEffect(() => {
    handleOAuthReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('database');
  const [timelineViewType, setTimelineViewType] = useState<TimelineViewType>('day');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [energyFilter, setEnergyFilter] = useState<EnergyLevel[]>([]);
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [cycleFilter, setCycleFilter] = useState<CycleFilterValue>('all');
  const [systemOnly, setSystemOnly] = useState(false);
  
  // Get active cycle for filtering
  const { data: activeCycle } = useActiveCycle();
  
  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteTaskInfo, setDeleteTaskInfo] = useState<{ isRecurring: boolean; hasParent: boolean } | null>(null);
  const [deleteType, setDeleteType] = useState<DeleteType>('single');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [recurringExpanded, setRecurringExpanded] = useState(false);
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [isProcessingOverdue, setIsProcessingOverdue] = useState(false);
  const [detailDatePopoverOpen, setDetailDatePopoverOpen] = useState(false);
  
  // Form state for new task
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>();
  const [newTaskPriority, setNewTaskPriority] = useState<string>('');
  const [newRecurrencePattern, setNewRecurrencePattern] = useState<RecurrencePattern>('none');
  const [newRecurrenceDays, setNewRecurrenceDays] = useState<string[]>([]);
  const [newMonthlyDay, setNewMonthlyDay] = useState<number>(1);
  const [newRecurrenceInterval, setNewRecurrenceInterval] = useState<number>(1);
  const [newRecurrenceUnit, setNewRecurrenceUnit] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [newRecurrenceEndDate, setNewRecurrenceEndDate] = useState<Date | undefined>();
  const [selectedSopId, setSelectedSopId] = useState<string>('');
  const [newChecklistProgress, setNewChecklistProgress] = useState<ChecklistProgress[]>([]);
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState<number | null>(null);
  const [newEnergyLevel, setNewEnergyLevel] = useState<EnergyLevel | null>(null);
  const [newContextTags, setNewContextTags] = useState<string[]>([]);

  // Fetch all tasks with optimistic updates
  const { data: tasks = [], isLoading } = useTasks();
  
  // Task mutations with optimistic updates for instant UI feedback
  const { toggleComplete, updateTask: optimisticUpdateTask, deleteTask: optimisticDeleteTask, createTask: optimisticCreateTask } = useTaskMutations();

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
      return response.data?.sops || [];
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

  // Calculate overdue tasks
  const overdueTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return tasks.filter((t: Task) => {
      if (t.is_completed || t.is_recurring_parent) return false;
      if (!t.scheduled_date) return false;
      return isBefore(parseISO(t.scheduled_date), today);
    });
  }, [tasks]);

  const overdueCount = overdueTasks.length;

  // Separate recurring parent tasks and apply cycle filter + search
  const { regularTasks, recurringParentTasks, totalTaskCount } = useMemo(() => {
    const regular: Task[] = [];
    const recurring: Task[] = [];
    let totalBeforeSearch = 0;
    
    const searchLower = searchQuery.toLowerCase().trim();
    
    tasks.forEach((task: Task) => {
      // Apply cycle filter
      if (cycleFilter === 'active' && activeCycle) {
        if (task.cycle_id !== activeCycle.cycle_id) return;
      } else if (cycleFilter !== 'all' && cycleFilter !== 'active') {
        if (task.cycle_id !== cycleFilter) return;
      }
      
      // Apply system-generated filter
      if (systemOnly && !task.is_system_generated) return;
      
      // Count tasks before search filter
      totalBeforeSearch++;
      
      // Apply search filter
      if (searchLower) {
        const matchesText = task.task_text?.toLowerCase().includes(searchLower);
        const matchesDescription = task.task_description?.toLowerCase().includes(searchLower);
        const matchesSop = task.sop?.sop_name?.toLowerCase().includes(searchLower);
        const matchesNotes = task.notes?.toLowerCase().includes(searchLower);
        
        if (!matchesText && !matchesDescription && !matchesSop && !matchesNotes) {
          return;
        }
      }
      
      if (task.is_recurring_parent) {
        recurring.push(task);
      } else {
        regular.push(task);
      }
    });
    
    return { 
      regularTasks: regular, 
      recurringParentTasks: recurring,
      totalTaskCount: totalBeforeSearch
    };
  }, [tasks, cycleFilter, activeCycle, systemOnly, searchQuery]);

  // Bulk selection hook
  const {
    selectedTaskIds,
    selectedCount,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    isSelected,
    getSelectedTasks,
  } = useBulkTaskSelection(regularTasks);

  // Bulk action handlers
  const handleBulkReschedule = async (date: Date) => {
    setIsBulkActionLoading(true);
    try {
      const selectedTasks = getSelectedTasks();
      for (const task of selectedTasks) {
        await manageMutation.mutateAsync({
          action: 'update',
          task_id: task.task_id,
          scheduled_date: format(date, 'yyyy-MM-dd'),
          status: 'scheduled',
        });
      }
      toast.success(`${selectedTasks.length} tasks rescheduled`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to reschedule tasks');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkActionLoading(true);
    try {
      const selectedTasks = getSelectedTasks();
      for (const task of selectedTasks) {
        await manageMutation.mutateAsync({ action: 'delete', task_id: task.task_id });
      }
      toast.success(`${selectedTasks.length} tasks deleted`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to delete tasks');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkComplete = async () => {
    setIsBulkActionLoading(true);
    try {
      const selectedTasks = getSelectedTasks().filter(t => !t.is_completed);
      for (const task of selectedTasks) {
        await manageMutation.mutateAsync({ action: 'toggle', task_id: task.task_id });
      }
      toast.success(`${selectedTasks.length} tasks completed`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to complete tasks');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkChangePriority = async (priority: string | null) => {
    setIsBulkActionLoading(true);
    try {
      const selectedTasks = getSelectedTasks();
      for (const task of selectedTasks) {
        await manageMutation.mutateAsync({
          action: 'update',
          task_id: task.task_id,
          priority,
        });
      }
      toast.success(`Priority updated for ${selectedTasks.length} tasks`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to update priority');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleSelectAllInGroup = (tasksToSelect: Task[]) => {
    tasksToSelect.forEach(t => {
      if (!selectedTaskIds.has(t.task_id)) {
        toggleTaskSelection(t.task_id);
      }
    });
  };

  // Overdue tasks handlers
  const handleRescheduleOverdue = async (action: 'today' | 'tomorrow' | 'someday') => {
    setIsProcessingOverdue(true);
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      for (const task of overdueTasks) {
        if (action === 'someday') {
          // Move to someday/backlog by clearing schedule
          await manageMutation.mutateAsync({
            action: 'update',
            task_id: task.task_id,
            scheduled_date: null,
            status: 'someday',
          });
        } else {
          const targetDate = action === 'today' ? today : tomorrow;
          await manageMutation.mutateAsync({
            action: 'update',
            task_id: task.task_id,
            scheduled_date: format(targetDate, 'yyyy-MM-dd'),
            status: 'scheduled',
          });
        }
      }
      
      const actionLabels = {
        today: 'rescheduled to today',
        tomorrow: 'rescheduled to tomorrow',
        someday: 'moved to Someday'
      };
      
      toast.success(`${overdueTasks.length} overdue tasks ${actionLabels[action]}`);
      setIsOverdueModalOpen(false);
    } catch (error) {
      toast.error('Failed to process overdue tasks');
    } finally {
      setIsProcessingOverdue(false);
    }
  };

  // Handlers - Use optimistic mutations for instant UI feedback
  const handleToggleComplete = useCallback((taskId: string) => {
    // Uses optimistic update - UI updates immediately before server confirms
    toggleComplete.mutate(taskId);
  }, [toggleComplete]);

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    // Uses optimistic update for instant feedback
    optimisticUpdateTask.mutate({ taskId, updates });
  }, [optimisticUpdateTask]);

  const handleQuickReschedule = useCallback((taskId: string, date: Date | null, status?: string) => {
    // Use optimistic update for instant feedback
    const updates: Partial<Task> = {
      scheduled_date: date ? format(date, 'yyyy-MM-dd') : null,
    };
    
    if (status) {
      updates.status = status as Task['status'];
    }
    
    optimisticUpdateTask.mutate({ taskId, updates });
    toast.success(status === 'someday' ? 'Task moved to Someday' : 'Task rescheduled');
  }, [optimisticUpdateTask]);

  const handleQuickAdd = useCallback((parsed: {
    text: string;
    date?: Date;
    time?: string;
    tags: string[];
    priority?: 'high' | 'medium' | 'low';
    duration?: number;
  }) => {
    // Use optimistic create for instant feedback
    optimisticCreateTask.mutate({
      task_text: parsed.text,
      scheduled_date: parsed.date ? format(parsed.date, 'yyyy-MM-dd') : null,
      priority: parsed.priority || null,
      estimated_minutes: parsed.duration || null,
      context_tags: parsed.tags.length > 0 ? parsed.tags : null,
      status: 'backlog',
    });
    toast.success('Task added');
  }, [optimisticCreateTask]);

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
            : newRecurrencePattern === 'weekdays'
              ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
              : [],
        recurrence_interval: newRecurrencePattern === 'custom' ? newRecurrenceInterval : null,
        recurrence_unit: newRecurrencePattern === 'custom' ? newRecurrenceUnit : null,
        recurrence_end_date: newRecurrenceEndDate ? format(newRecurrenceEndDate, 'yyyy-MM-dd') : null,
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
    setNewRecurrenceInterval(1);
    setNewRecurrenceUnit('weeks');
    setNewRecurrenceEndDate(undefined);
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

  const handleDeleteTask = useCallback(() => {
    if (!deleteTaskId) return;

    // Use optimistic delete for instant feedback
    optimisticDeleteTask.mutate({ taskId: deleteTaskId, deleteType });
    setDeleteTaskId(null);
    setDeleteTaskInfo(null);
    setDeleteType('single');
    setIsDetailDialogOpen(false);
  }, [deleteTaskId, deleteType, optimisticDeleteTask]);

  const handleSaveTaskDetail = useCallback(() => {
    if (!selectedTask) return;

    // Use optimistic update for instant feedback
    optimisticUpdateTask.mutate({
      taskId: selectedTask.task_id,
      updates: {
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
      } as Partial<Task>,
    });
    toast.success('Task updated');
    setIsDetailDialogOpen(false);
    setSelectedTask(null);
  }, [selectedTask, optimisticUpdateTask]);

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

  const getRecurrenceLabel = (pattern: string | null, days: string[] | null, task?: Task) => {
    switch (pattern) {
      case 'daily': return 'Every day';
      case 'weekdays': return 'Every weekday (Mon-Fri)';
      case 'weekly': return days?.length ? `Every ${days.join(', ')}` : 'Weekly';
      case 'biweekly': return days?.length ? `Every 2 weeks on ${days.join(', ')}` : 'Every 2 weeks';
      case 'monthly': 
        const day = days?.length ? parseInt(days[0], 10) : 1;
        return `${getOrdinalSuffix(day)} of each month`;
      case 'quarterly': return 'Every 3 months';
      case 'custom':
        if (task?.recurrence_interval && task?.recurrence_unit) {
          return `Every ${task.recurrence_interval} ${task.recurrence_unit}`;
        }
        return 'Custom';
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

        {/* Overdue Tasks Banner */}
        {overdueCount > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">
                  You have {overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  Clear your backlog to stay on track
                </p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setIsOverdueModalOpen(true)}
              className="shrink-0"
            >
              Handle Overdue Tasks
            </Button>
          </div>
        )}

        {/* Cycle Progress */}
        {activeCycle && (
          <CycleTimeline 
            startDate={activeCycle.start_date} 
            endDate={activeCycle.end_date} 
          />
        )}

        {/* Task Planning Cards */}
        <TaskPlanningCards />

        {/* Views Toolbar */}
        <TaskViewsToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddTask={() => setIsAddDialogOpen(true)}
          onImportCSV={() => setIsImportModalOpen(true)}
          overdueCount={overdueCount}
          isCalendarConnected={calendarStatus.connected && calendarStatus.calendarSelected}
          onConnectCalendar={() => connectCalendar()}
        />

        {/* Import Modal */}
        <TaskImportModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
        />

        {/* Timeline view type selector */}
        {viewMode === 'timeline' && (
          <div className="flex items-center gap-3">
            <TimelineViewSelector
              viewType={timelineViewType}
              onViewTypeChange={setTimelineViewType}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/weekly-plan')}
              className="gap-2"
            >
              <CalendarRange className="h-4 w-4" />
              Weekly Planner
            </Button>
          </div>
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

        {/* Search and Filters */}
        <div className="flex flex-col gap-4">
          {/* Recovery banner for pending syncs/drafts */}
          <TaskRecoveryBanner />
          
          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {searchQuery && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Showing {regularTasks.length + recurringParentTasks.length} of {totalTaskCount} tasks
              </span>
            )}
          </div>

          {/* Cycle filter */}
          <div className="flex flex-wrap items-center gap-3">
            <CycleFilter
              value={cycleFilter}
              onChange={setCycleFilter}
              showSystemFilter={true}
              systemOnly={systemOnly}
              onSystemOnlyChange={setSystemOnly}
            />
            <CycleBadge />
          </div>
          
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
                setSearchQuery('');
                setEnergyFilter([]);
                setTagsFilter([]);
                setCycleFilter('all');
                setSystemOnly(false);
              }}
            />
          </div>
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
            selectedTaskIds={selectedTaskIds}
            onToggleTaskSelection={toggleTaskSelection}
            onSelectAllInGroup={handleSelectAllInGroup}
            showSelectionCheckboxes={true}
          />
        ) : viewMode === 'kanban' ? (
          <TaskKanbanView
            tasks={regularTasks}
            onToggleComplete={handleToggleComplete}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={initiateDelete}
            onOpenDetail={openTaskDetail}
            onQuickReschedule={handleQuickReschedule}
            onAddTask={() => setIsAddDialogOpen(true)}
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
                  maxLength={200}
                />
                <CharacterCounter current={newTaskText.length} max={200} className="mt-1" />
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
                <div className="mt-2">
                  <TagManager
                    selectedTags={newContextTags}
                    onTagsChange={setNewContextTags}
                  />
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
                  maxLength={1000}
                />
                <CharacterCounter current={newTaskDescription.length} max={1000} className="mt-1" />
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
                    <RadioGroupItem value="weekdays" id="r-weekdays" />
                    <Label htmlFor="r-weekdays" className="font-normal">Every weekday (Mon-Fri)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="r-weekly" />
                    <Label htmlFor="r-weekly" className="font-normal">Weekly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="biweekly" id="r-biweekly" />
                    <Label htmlFor="r-biweekly" className="font-normal">Bi-weekly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="r-monthly" />
                    <Label htmlFor="r-monthly" className="font-normal">Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="quarterly" id="r-quarterly" />
                    <Label htmlFor="r-quarterly" className="font-normal">Quarterly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="r-custom" />
                    <Label htmlFor="r-custom" className="font-normal">Custom</Label>
                  </div>
                </RadioGroup>

                {(newRecurrencePattern === 'weekly' || newRecurrencePattern === 'biweekly') && (
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

                {newRecurrencePattern === 'custom' && (
                  <div className="flex items-center gap-2 pl-6 flex-wrap">
                    <Label className="font-normal">Repeat every</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={newRecurrenceInterval}
                      onChange={(e) => setNewRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16"
                    />
                    <Select value={newRecurrenceUnit} onValueChange={(v) => setNewRecurrenceUnit(v as 'days' | 'weeks' | 'months')}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">days</SelectItem>
                        <SelectItem value="weeks">weeks</SelectItem>
                        <SelectItem value="months">months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {newRecurrencePattern !== 'none' && (
                  <div className="flex items-center gap-2 pl-6">
                    <Label className="font-normal">End date (optional):</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-40 justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newRecurrenceEndDate ? format(newRecurrenceEndDate, 'MMM d, yyyy') : 'No end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newRecurrenceEndDate}
                          onSelect={setNewRecurrenceEndDate}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                        {newRecurrenceEndDate && (
                          <div className="p-2 border-t">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full"
                              onClick={() => setNewRecurrenceEndDate(undefined)}
                            >
                              Clear end date
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
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
                      maxLength={200}
                    />
                    <CharacterCounter current={selectedTask.task_text.length} max={200} className="mt-1" />
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
                  <div className="mt-2">
                    <TagManager
                      selectedTags={selectedTask.context_tags || []}
                      onTagsChange={(tags) => setSelectedTask({ ...selectedTask, context_tags: tags })}
                    />
                  </div>
                </div>

                {/* SOP Selector */}
                <div>
                  <Label>Standard Operating Procedure</Label>
                  <SOPSelector
                    value={selectedTask.sop_id}
                    onChange={(sopId) => {
                      if (sopId) {
                        const sop = sops.find((s: SOP) => s.sop_id === sopId);
                        setSelectedTask({ 
                          ...selectedTask, 
                          sop_id: sopId,
                          sop: sop || null,
                          checklist_progress: sop?.checklist_items?.map((item: ChecklistItem) => ({
                            item_id: item.id,
                            completed: false
                          })) || []
                        });
                      } else {
                        setSelectedTask({ 
                          ...selectedTask, 
                          sop_id: null, 
                          sop: null,
                          checklist_progress: []
                        });
                      }
                    }}
                    className="mt-1"
                  />
                </div>

                {/* SOP Info */}
                {selectedTask.sop && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        <span className="font-medium text-primary">{selectedTask.sop.sop_name}</span>
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
                    maxLength={500}
                  />
                  <CharacterCounter current={(selectedTask.notes || '').length} max={500} className="mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scheduled For</Label>
                    <Popover open={detailDatePopoverOpen} onOpenChange={setDetailDatePopoverOpen}>
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
                          onSelect={(date) => {
                            setSelectedTask({ ...selectedTask, scheduled_date: date ? format(date, 'yyyy-MM-dd') : null });
                            setDetailDatePopoverOpen(false);
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                        {selectedTask.scheduled_date && (
                          <div className="p-2 border-t">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full text-sm"
                              onClick={() => {
                                setSelectedTask({ ...selectedTask, scheduled_date: null });
                                setDetailDatePopoverOpen(false);
                              }}
                            >
                              Clear date
                            </Button>
                          </div>
                        )}
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
        onSelect={selectCalendars}
        initialSelected={calendarStatus.selectedCalendars}
      />

      {/* Overdue Tasks Modal */}
      <Dialog open={isOverdueModalOpen} onOpenChange={setIsOverdueModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Handle {overdueCount} Overdue Task{overdueCount !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Choose how to handle your overdue tasks. This will update all {overdueCount} overdue tasks at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="default"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleRescheduleOverdue('today')}
              disabled={isProcessingOverdue}
            >
              <CalendarDays className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Reschedule all to today</div>
                <div className="text-sm text-primary-foreground/70">Tackle them now and get back on track</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleRescheduleOverdue('tomorrow')}
              disabled={isProcessingOverdue}
            >
              <CalendarIcon className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Reschedule all to tomorrow</div>
                <div className="text-sm text-muted-foreground">Give yourself a fresh start tomorrow</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleRescheduleOverdue('someday')}
              disabled={isProcessingOverdue}
            >
              <Inbox className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Move all to Someday</div>
                <div className="text-sm text-muted-foreground">Unschedule and revisit later</div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOverdueModalOpen(false)} disabled={isProcessingOverdue}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCount}
        onReschedule={handleBulkReschedule}
        onDelete={handleBulkDelete}
        onComplete={handleBulkComplete}
        onChangePriority={handleBulkChangePriority}
        onCancelSelection={clearSelection}
        isLoading={isBulkActionLoading}
      />
    </Layout>
  );
}
