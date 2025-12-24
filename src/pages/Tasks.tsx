import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow, isThisWeek, isPast, addDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, CalendarIcon, Pencil, Trash2, Clock, CheckCircle2, Circle, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  task_id: string;
  task_text: string;
  is_completed: boolean;
  completed_at: string | null;
  scheduled_date: string | null;
  priority: string | null;
  source: string | null;
  created_at: string;
}

type FilterTab = 'today' | 'week' | 'future' | 'all' | 'completed';

export default function Tasks() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>();
  const [newTaskPriority, setNewTaskPriority] = useState<string>('');

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

  // Manage task mutation
  const manageMutation = useMutation({
    mutationFn: async (params: { action: string; task_id?: string; task_text?: string; scheduled_date?: string | null; priority?: string | null; is_completed?: boolean }) => {
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

  // Filter tasks based on active tab
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    return tasks.filter((task: Task) => {
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
  }, [tasks, activeFilter]);

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
        // For completed, just show them all
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
        scheduled_date: newTaskDate ? format(newTaskDate, 'yyyy-MM-dd') : null,
        priority: newTaskPriority || null,
      });
      toast.success('Task added');
      setIsAddDialogOpen(false);
      setNewTaskText('');
      setNewTaskDate(undefined);
      setNewTaskPriority('');
    } catch (error) {
      toast.error('Failed to add task');
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      await manageMutation.mutateAsync({
        action: 'update',
        task_id: editingTask.task_id,
        task_text: editingTask.task_text,
        scheduled_date: editingTask.scheduled_date,
        priority: editingTask.priority,
      });
      toast.success('Task updated');
      setIsEditDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;

    try {
      await manageMutation.mutateAsync({ action: 'delete', task_id: deleteTaskId });
      toast.success('Task deleted');
      setDeleteTaskId(null);
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

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'medium': return 'bg-warning/20 text-warning border-warning/30';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted/50 text-muted-foreground';
    }
  };

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
            {tasks.map((task) => (
              <Card key={task.task_id} className={cn(
                "transition-all hover:shadow-md",
                task.is_completed && "opacity-60"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => handleToggleComplete(task.task_id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium",
                        task.is_completed && "line-through text-muted-foreground"
                      )}>
                        {task.task_text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {task.source && (
                          <span className="flex items-center gap-1">
                            <ListTodo className="h-3 w-3" />
                            {task.source}
                          </span>
                        )}
                        {task.created_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(task.created_at), 'MMM d')}
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
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <div className="p-2 border-b space-y-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => handleQuickReschedule(task.task_id, new Date())}
                            >
                              Today
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => handleQuickReschedule(task.task_id, addDays(new Date(), 1))}
                            >
                              Tomorrow
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => handleQuickReschedule(task.task_id, addDays(new Date(), 7))}
                            >
                              Next Week
                            </Button>
                          </div>
                          <Calendar
                            mode="single"
                            selected={task.scheduled_date ? parseISO(task.scheduled_date) : undefined}
                            onSelect={(date) => handleQuickReschedule(task.task_id, date || null)}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingTask(task);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTaskId(task.task_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Input
                placeholder="What do you need to do?"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
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
                  <Calendar
                    mode="single"
                    selected={newTaskDate}
                    onSelect={setNewTaskDate}
                  />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={manageMutation.isPending}>
              {manageMutation.isPending ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-4">
              <div>
                <Input
                  placeholder="Task description"
                  value={editingTask.task_text}
                  onChange={(e) => setEditingTask({ ...editingTask, task_text: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {editingTask.scheduled_date 
                        ? format(parseISO(editingTask.scheduled_date), 'MMM d, yyyy') 
                        : 'Schedule for...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editingTask.scheduled_date ? parseISO(editingTask.scheduled_date) : undefined}
                      onSelect={(date) => setEditingTask({ 
                        ...editingTask, 
                        scheduled_date: date ? format(date, 'yyyy-MM-dd') : null 
                      })}
                    />
                  </PopoverContent>
                </Popover>
                <Select 
                  value={editingTask.priority || ''} 
                  onValueChange={(v) => setEditingTask({ ...editingTask, priority: v || null })}
                >
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTask} disabled={manageMutation.isPending}>
              {manageMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task will be permanently deleted.
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
