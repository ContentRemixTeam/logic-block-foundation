import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow, isThisWeek, isPast, addDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, CalendarIcon, Pencil, Trash2, Clock, CheckCircle2, Circle, ListTodo, RefreshCw, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  task_id: string;
  task_text: string;
  task_description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  scheduled_date: string | null;
  priority: string | null;
  source: string | null;
  created_at: string;
  recurrence_pattern: string | null;
  recurrence_days: string[] | null;
  parent_task_id: string | null;
  is_recurring_parent: boolean;
}

type FilterTab = 'today' | 'week' | 'future' | 'all' | 'completed';
type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';
type DeleteType = 'single' | 'future' | 'all';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Tasks() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteTaskInfo, setDeleteTaskInfo] = useState<{ isRecurring: boolean; hasParent: boolean } | null>(null);
  const [deleteType, setDeleteType] = useState<DeleteType>('single');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [recurringExpanded, setRecurringExpanded] = useState(true);
  
  // Form state for new task
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>();
  const [newTaskPriority, setNewTaskPriority] = useState<string>('');
  const [newRecurrencePattern, setNewRecurrencePattern] = useState<RecurrencePattern>('none');
  const [newRecurrenceDays, setNewRecurrenceDays] = useState<string[]>([]);

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
    mutationFn: async (params: { 
      action: string; 
      task_id?: string; 
      task_text?: string;
      task_description?: string | null;
      scheduled_date?: string | null; 
      priority?: string | null; 
      is_completed?: boolean;
      recurrence_pattern?: string | null;
      recurrence_days?: string[];
      delete_type?: DeleteType;
    }) => {
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
    },
  });

  // Separate recurring parent tasks from regular tasks
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

  // Filter regular tasks based on active tab
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    return regularTasks.filter((task: Task) => {
      const taskDate = task.scheduled_date ? parseISO(task.scheduled_date) : null;

      switch (activeFilter) {
        case 'today':
          return !task.is_completed && taskDate && isToday(taskDate);
        case 'week':
          return !task.is_completed && taskDate && isThisWeek(taskDate, { weekStartsOn: 1 });
        case 'future':
          return !task.is_completed && taskDate && taskDate > weekEnd;
        case 'all':
          return !task.is_completed;
        case 'completed':
          return task.is_completed;
        default:
          return true;
      }
    });
  }, [regularTasks, activeFilter]);

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      unscheduled: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredTasks.forEach((task: Task) => {
      if (task.is_completed && activeFilter === 'completed') {
        if (!groups.completed) groups.completed = [];
        groups.completed.push(task);
        return;
      }

      if (!task.scheduled_date) {
        groups.unscheduled.push(task);
        return;
      }

      const taskDate = parseISO(task.scheduled_date);

      if (isPast(taskDate) && !isToday(taskDate)) {
        groups.overdue.push(task);
      } else if (isToday(taskDate)) {
        groups.today.push(task);
      } else if (isTomorrow(taskDate)) {
        groups.tomorrow.push(task);
      } else if (isThisWeek(taskDate, { weekStartsOn: 1 })) {
        groups.thisWeek.push(task);
      } else {
        groups.later.push(task);
      }
    });

    return groups;
  }, [filteredTasks, activeFilter]);

  const handleToggleComplete = async (taskId: string) => {
    try {
      await manageMutation.mutateAsync({ action: 'toggle', task_id: taskId });
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
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
        recurrence_days: newRecurrencePattern === 'weekly' ? newRecurrenceDays : [],
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
  };

  const handleUpdateTask = async () => {
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
      });
      toast.success('Task updated');
      setIsDetailDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      toast.error('Failed to update task');
    }
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

  const handleQuickReschedule = async (taskId: string, date: Date | null) => {
    try {
      await manageMutation.mutateAsync({
        action: 'update',
        task_id: taskId,
        scheduled_date: date ? format(date, 'yyyy-MM-dd') : null,
      });
      toast.success('Task rescheduled');
    } catch (error) {
      toast.error('Failed to reschedule task');
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

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'medium': return 'bg-warning/20 text-warning border-warning/30';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted/50 text-muted-foreground';
    }
  };

  const getRecurrenceLabel = (pattern: string | null, days: string[] | null) => {
    switch (pattern) {
      case 'daily': return 'Every day';
      case 'weekly': return days?.length ? `Every ${days.join(', ')}` : 'Weekly';
      case 'monthly': return '1st of each month';
      default: return '';
    }
  };

  const toggleRecurrenceDay = (day: string, currentDays: string[], setter: (days: string[]) => void) => {
    if (currentDays.includes(day)) {
      setter(currentDays.filter(d => d !== day));
    } else {
      setter([...currentDays, day]);
    }
  };

  const renderTaskCard = (task: Task) => (
    <Card key={task.task_id} className={cn(
      "transition-all hover:shadow-md cursor-pointer",
      task.is_completed && "opacity-60"
    )} onClick={() => openTaskDetail(task)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={task.is_completed}
              onCheckedChange={() => handleToggleComplete(task.task_id)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-medium",
              task.is_completed && "line-through text-muted-foreground"
            )}>
              {task.task_text}
            </p>
            {task.task_description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {task.task_description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              {task.parent_task_id && (
                <Badge variant="outline" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Recurring
                </Badge>
              )}
              {task.source && task.source !== 'recurring' && (
                <span className="flex items-center gap-1">
                  <ListTodo className="h-3 w-3" />
                  {task.source}
                </span>
              )}
              {task.scheduled_date && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {format(parseISO(task.scheduled_date), 'MMM d')}
                </span>
              )}
              {task.priority && (
                <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 border-b space-y-1">
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleQuickReschedule(task.task_id, new Date())}>
                    Today
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleQuickReschedule(task.task_id, addDays(new Date(), 1))}>
                    Tomorrow
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleQuickReschedule(task.task_id, addDays(new Date(), 7))}>
                    Next Week
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={task.scheduled_date ? parseISO(task.scheduled_date) : undefined}
                  onSelect={(date) => handleQuickReschedule(task.task_id, date || null)}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => initiateDelete(task)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTaskGroup = (title: string, tasks: Task[], showIfEmpty = false) => {
    if (tasks.length === 0 && !showIfEmpty) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm py-2">No tasks</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(renderTaskCard)}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-muted-foreground">Manage everything you've captured</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Recurring Tasks Section */}
        {recurringParentTasks.length > 0 && (
          <Collapsible open={recurringExpanded} onOpenChange={setRecurringExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      Recurring Tasks
                      <Badge variant="secondary">{recurringParentTasks.length}</Badge>
                    </CardTitle>
                    <ChevronDown className={cn("h-5 w-5 transition-transform", recurringExpanded && "rotate-180")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  {recurringParentTasks.map((task) => (
                    <div key={task.task_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer" onClick={() => openTaskDetail(task)}>
                      <div>
                        <p className="font-medium">{task.task_text}</p>
                        <p className="text-sm text-muted-foreground">
                          {getRecurrenceLabel(task.recurrence_pattern, task.recurrence_days)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.priority && (
                          <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                            {task.priority}
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); initiateDelete(task); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Filter Tabs */}
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Circle className="h-3 w-3" />
              Today
            </TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="future">Future</TabsTrigger>
            <TabsTrigger value="all">All Open</TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Task List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {activeFilter === 'completed' ? (
                <>
                  <h3 className="font-medium mb-2">No completed tasks yet</h3>
                  <p className="text-muted-foreground text-sm">Complete some tasks and they'll appear here</p>
                </>
              ) : (
                <>
                  <h3 className="font-medium mb-2">All caught up!</h3>
                  <p className="text-muted-foreground text-sm">Use #task in your scratch pad to capture tasks, or add one manually</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div>
            {activeFilter === 'completed' ? (
              renderTaskGroup('Completed', groupedTasks.completed || filteredTasks, true)
            ) : (
              <>
                {renderTaskGroup('Overdue', groupedTasks.overdue)}
                {renderTaskGroup('Today', groupedTasks.today)}
                {renderTaskGroup('Tomorrow', groupedTasks.tomorrow)}
                {renderTaskGroup('This Week', groupedTasks.thisWeek)}
                {renderTaskGroup('Later', groupedTasks.later)}
                {renderTaskGroup('Unscheduled', groupedTasks.unscheduled)}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
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
            <div>
              <Label htmlFor="task-desc">Description (optional)</Label>
              <Textarea
                id="task-desc"
                placeholder="Add more details..."
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                className="min-h-[80px]"
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
                  <Label htmlFor="r-weekly" className="font-normal">Weekly (select days)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="r-monthly" />
                  <Label htmlFor="r-monthly" className="font-normal">Monthly (1st of each month)</Label>
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
            </div>
          </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
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

              <div>
                <Label>Description</Label>
                <Textarea
                  value={selectedTask.task_description || ''}
                  onChange={(e) => setSelectedTask({ ...selectedTask, task_description: e.target.value })}
                  placeholder="Add more details..."
                  className="min-h-[100px] mt-1"
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
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => selectedTask && initiateDelete(selectedTask)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTask} disabled={manageMutation.isPending}>
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
    </Layout>
  );
}
