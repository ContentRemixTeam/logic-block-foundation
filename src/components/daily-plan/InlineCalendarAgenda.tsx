import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, X, Clock, Calendar, Check, Loader2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/components/tasks/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPriorityBadgeClasses } from '@/lib/themeColors';
import { OfficeHoursEditorModal } from '@/components/office-hours/OfficeHoursEditorModal';

interface InlineCalendarAgendaProps {
  officeHoursStart?: number;
  officeHoursEnd?: number;
  onTaskUpdate?: () => void;
}

interface TimeSlotProps {
  time: string;
  tasks: Task[];
  onTaskRemove: (taskId: string) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
}

// Format time to 12-hour format
function formatTime(time: string): string {
  const hour = parseInt(time.split(':')[0], 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${period}`;
}

// Draggable task in pool
function DraggablePoolTask({ task, onToggle }: { task: Task; onToggle: (taskId: string, completed: boolean) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.task_id,
    data: { type: 'task', task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityLabel = task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Med' : task.priority === 'low' ? 'Low' : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 bg-card border border-border rounded-lg min-h-[44px]",
        "hover:border-primary/30 transition-colors group touch-manipulation",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/20"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        aria-label="Drag to schedule"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Checkbox
        checked={task.is_completed}
        onCheckedChange={(checked) => onToggle(task.task_id, checked as boolean)}
        className="h-5 w-5"
      />

      <span className={cn(
        "flex-1 text-sm truncate",
        task.is_completed && "line-through text-muted-foreground"
      )}>
        {task.task_text}
      </span>

      {priorityLabel && (
        <Badge 
          variant="outline" 
          className={cn("text-xs px-1.5 py-0", getPriorityBadgeClasses(task.priority))}
        >
          {priorityLabel}
        </Badge>
      )}

      {task.estimated_minutes && (
        <span className="text-xs text-muted-foreground">
          {task.estimated_minutes}m
        </span>
      )}
    </div>
  );
}

// Time slot component
function TimeSlot({ time, tasks, onTaskRemove, onTaskToggle }: TimeSlotProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `time-slot-${time}`,
    data: { type: 'time-slot', time }
  });

  const hasTasks = tasks.length > 0;
  const isDragging = !!active;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[60px] p-2 rounded-lg border transition-all",
        hasTasks ? "border-solid border-border bg-card" : "border-dashed border-muted-foreground/30",
        isOver && "ring-2 ring-primary/30 bg-primary/5 border-primary/30",
        isDragging && !isOver && !hasTasks && "bg-muted/30"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs font-medium text-muted-foreground w-16 shrink-0 pt-1">
          {formatTime(time)}
        </span>
        
        <div className="flex-1 space-y-1.5">
          {hasTasks ? (
            tasks.map((task) => (
              <div
                key={task.task_id}
                className="flex items-center gap-2 p-1.5 bg-muted/50 rounded border border-border/50 min-h-[40px]"
              >
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={(checked) => onTaskToggle(task.task_id, checked as boolean)}
                  className="h-4 w-4"
                />
                <span className={cn(
                  "flex-1 text-sm truncate",
                  task.is_completed && "line-through text-muted-foreground"
                )}>
                  {task.task_text}
                </span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {task.estimated_minutes || 60}m
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onTaskRemove(task.task_id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          ) : (
            isDragging && (
              <div className="text-xs text-muted-foreground py-2 text-center">
                Drop task here
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Drag overlay for smooth dragging visual
function DragOverlayContent({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border-2 border-primary rounded-lg shadow-lg opacity-90 max-w-[250px]">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium truncate">{task.task_text}</span>
      {task.estimated_minutes && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {task.estimated_minutes}m
        </Badge>
      )}
    </div>
  );
}

export function InlineCalendarAgenda({
  officeHoursStart = 9,
  officeHoursEnd = 17,
  onTaskUpdate,
}: InlineCalendarAgendaProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showOfficeHoursModal, setShowOfficeHoursModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  // Generate time slots based on office hours
  const timeSlots = [];
  for (let hour = officeHoursStart; hour < officeHoursEnd; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  // Fetch tasks for today
  const fetchTasks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-all-tasks');
      if (error) throw error;

      const allTasks = (data?.data || []).filter((t: Task) => !t.is_recurring_parent);
      const todayTasks = allTasks.filter((t: Task) => 
        t.scheduled_date === todayStr && !t.is_completed
      );
      
      setTasks(todayTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Get tasks for a specific time slot
  const getTasksForSlot = (time: string) => {
    return tasks.filter(t => t.scheduled_time?.startsWith(time));
  };

  // Get unscheduled tasks (pool)
  const poolTasks = tasks.filter(t => !t.scheduled_time);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.task_id === event.active.id);
    if (task) setActiveTask(task);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const dropId = over.id as string;
    const task = tasks.find(t => t.task_id === taskId);
    
    if (!task) return;

    if (dropId === 'tasks-pool') {
      // Dropped on pool - clear scheduled_time
      if (task.scheduled_time) {
        setTasks(prev => prev.map(t => 
          t.task_id === taskId ? { ...t, scheduled_time: null } : t
        ));

        try {
          await supabase.functions.invoke('manage-task', {
            body: { action: 'update', task_id: taskId, scheduled_time: null },
          });
          toast.success('Task moved to pool');
          onTaskUpdate?.();
        } catch (error) {
          setTasks(prev => prev.map(t => 
            t.task_id === taskId ? { ...t, scheduled_time: task.scheduled_time } : t
          ));
          toast.error('Failed to update task');
        }
      }
    } else if (dropId.startsWith('time-slot-')) {
      // Dropped on a time slot
      const time = dropId.replace('time-slot-', '');
      
      if (task.scheduled_time?.startsWith(time)) return;

      const previousTime = task.scheduled_time;
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, scheduled_time: time } : t
      ));

      try {
        await supabase.functions.invoke('manage-task', {
          body: { action: 'update', task_id: taskId, scheduled_time: time, scheduled_date: todayStr },
        });
        
        const hour = parseInt(time.split(':')[0], 10);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        toast.success(`Scheduled for ${hour12}:00 ${period}`);
        onTaskUpdate?.();
      } catch (error) {
        setTasks(prev => prev.map(t => 
          t.task_id === taskId ? { ...t, scheduled_time: previousTime } : t
        ));
        toast.error('Failed to schedule task');
      }
    }
  };

  // Handle task removal from time slot
  const handleTaskRemove = async (taskId: string) => {
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;

    setTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, scheduled_time: null } : t
    ));

    try {
      await supabase.functions.invoke('manage-task', {
        body: { action: 'update', task_id: taskId, scheduled_time: null },
      });
      toast.success('Task moved to pool');
      onTaskUpdate?.();
    } catch (error) {
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, scheduled_time: task.scheduled_time } : t
      ));
      toast.error('Failed to update task');
    }
  };

  // Handle task toggle
  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;

    setTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, is_completed: completed } : t
    ));

    try {
      await supabase.functions.invoke('manage-task', {
        body: { action: 'update', task_id: taskId, is_completed: completed },
      });
      onTaskUpdate?.();
    } catch (error) {
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, is_completed: task.is_completed } : t
      ));
      toast.error('Failed to update task');
    }
  };

  const poolTaskIds = poolTasks.map(t => t.task_id);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Daily Agenda & Tasks
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOfficeHoursModal(true)}
              className="text-muted-foreground hover:text-foreground h-8 gap-1.5"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Hours</span>
            </Button>
          </div>
          <CardDescription>
            Drag tasks to schedule them. Office hours: {formatTime(`${officeHoursStart}:00`)} - {formatTime(`${officeHoursEnd}:00`)}
          </CardDescription>
        </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Time Slots - Calendar View */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-3">
                  <Clock className="h-4 w-4" />
                  Schedule
                </h4>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {timeSlots.map((time) => (
                    <TimeSlot
                      key={time}
                      time={time}
                      tasks={getTasksForSlot(time)}
                      onTaskRemove={handleTaskRemove}
                      onTaskToggle={handleTaskToggle}
                    />
                  ))}
                </div>
              </div>

              {/* Tasks Pool */}
              <div 
                className={cn(
                  "space-y-2 p-3 rounded-lg border transition-colors",
                  activeTask && "ring-2 ring-primary/20 bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Unscheduled Tasks
                  </h4>
                  {poolTasks.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {poolTasks.length}
                    </Badge>
                  )}
                </div>
                
                <TasksPoolDropZone>
                  {poolTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                        <Check className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No unscheduled tasks for today
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add tasks from Top 3 or scratch pad
                      </p>
                    </div>
                  ) : (
                    <SortableContext items={poolTaskIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {poolTasks.map((task) => (
                          <DraggablePoolTask
                            key={task.task_id}
                            task={task}
                            onToggle={handleTaskToggle}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </TasksPoolDropZone>
              </div>
            </div>

            <DragOverlay>
              {activeTask && <DragOverlayContent task={activeTask} />}
            </DragOverlay>
          </DndContext>
        )}
      </CardContent>
    </Card>
    
    <OfficeHoursEditorModal
      open={showOfficeHoursModal}
      onOpenChange={setShowOfficeHoursModal}
    />
  </>
  );
}

// Tasks pool drop zone wrapper
function TasksPoolDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'tasks-pool',
    data: { type: 'pool' }
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] transition-colors rounded-lg",
        isOver && "bg-primary/10"
      )}
    >
      {children}
    </div>
  );
}

export default InlineCalendarAgenda;
