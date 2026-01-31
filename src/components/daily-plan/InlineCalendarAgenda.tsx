import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripVertical, X, Clock, Calendar, Check, Loader2, Settings2, RefreshCw, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/components/tasks/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPriorityBadgeClasses } from '@/lib/themeColors';
import { OfficeHoursEditorModal } from '@/components/office-hours/OfficeHoursEditorModal';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { CalendarEventBlock, CalendarEvent } from '@/components/tasks/views/CalendarEventBlock';
import { CurrentTimeIndicator } from '@/components/tasks/views/CurrentTimeIndicator';
import { ScheduleTimeModal } from '@/components/mobile/ScheduleTimeModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, parseISO, startOfDay } from 'date-fns';

interface InlineCalendarAgendaProps {
  officeHoursStart?: number;
  officeHoursEnd?: number;
  onTaskUpdate?: () => void;
}

interface TimeSlotProps {
  time: string;
  hour: number;
  tasks: Task[];
  events: CalendarEvent[];
  onTaskRemove: (taskId: string) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  isMobile?: boolean;
}

// Format time to 12-hour format
function formatTime(time: string): string {
  const hour = parseInt(time.split(':')[0], 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${period}`;
}

// Draggable task in pool with mobile Schedule button
function DraggablePoolTask({ 
  task, 
  onToggle, 
  isMobile = false,
  onScheduleClick 
}: { 
  task: Task; 
  onToggle: (taskId: string, completed: boolean) => void;
  isMobile?: boolean;
  onScheduleClick?: (task: Task) => void;
}) {
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
        "flex items-center gap-2 bg-card border border-border rounded-lg",
        isMobile ? "p-3 min-h-[56px]" : "p-2 min-h-[44px]",
        "hover:border-primary/30 transition-colors group touch-manipulation",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/20"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none",
          isMobile ? "p-2" : "p-1"
        )}
        aria-label="Drag to schedule"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Checkbox
        checked={task.is_completed}
        onCheckedChange={(checked) => onToggle(task.task_id, checked as boolean)}
        className={isMobile ? "h-5 w-5" : "h-5 w-5"}
      />

      <div className="flex-1 min-w-0">
        <span className={cn(
          "truncate block",
          isMobile ? "text-base" : "text-sm",
          task.is_completed && "line-through text-muted-foreground"
        )}>
          {task.task_text}
        </span>
        {task.estimated_minutes && (
          <span className="text-xs text-muted-foreground">
            {task.estimated_minutes}m
          </span>
        )}
      </div>

      {priorityLabel && (
        <Badge 
          variant="outline" 
          className={cn("text-xs px-1.5 py-0", getPriorityBadgeClasses(task.priority))}
        >
          {priorityLabel}
        </Badge>
      )}

      {/* Mobile: Show Schedule button instead of just drag */}
      {isMobile && onScheduleClick && (
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 shrink-0 touch-manipulation"
          onClick={(e) => {
            e.stopPropagation();
            onScheduleClick(task);
          }}
        >
          <Clock className="h-4 w-4 mr-1" />
          Schedule
        </Button>
      )}
    </div>
  );
}

// Time slot component with calendar events
function TimeSlot({ time, hour, tasks, events, onTaskRemove, onTaskToggle, isMobile = false }: TimeSlotProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `time-slot-${time}`,
    data: { type: 'time-slot', time }
  });

  const hasTasks = tasks.length > 0;
  const hasEvents = events.length > 0;
  const hasContent = hasTasks || hasEvents;
  const isDragging = !!active;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-2 rounded-lg border transition-all flex",
        // Larger touch targets on mobile
        isMobile ? "min-h-[80px]" : "min-h-[48px]",
        hasContent ? "border-solid border-border bg-card" : "border-dashed border-muted-foreground/20",
        isOver && "ring-2 ring-primary/30 bg-primary/5 border-primary/30",
        isDragging && !isOver && !hasContent && "bg-muted/20"
      )}
    >
      <span className={cn(
        "font-medium text-muted-foreground shrink-0 pt-1",
        isMobile ? "text-sm w-16" : "text-xs w-14"
      )}>
        {format(new Date().setHours(hour, 0), 'h a')}
      </span>
      
      <div className="flex-1 space-y-1">
        {/* Calendar Events */}
        {events.map((event) => (
          <CalendarEventBlock key={event.id} event={event} compact />
        ))}
        
        {/* Tasks */}
        {tasks.map((task) => (
          <div
            key={task.task_id}
            className={cn(
              "flex items-center gap-2 bg-muted/50 rounded border border-border/50",
              isMobile ? "p-2 min-h-[44px]" : "p-1.5 min-h-[36px]"
            )}
          >
            <Checkbox
              checked={task.is_completed}
              onCheckedChange={(checked) => onTaskToggle(task.task_id, checked as boolean)}
              className={isMobile ? "h-5 w-5" : "h-4 w-4"}
            />
            <span className={cn(
              "flex-1 truncate",
              isMobile ? "text-base" : "text-sm",
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
              className={cn(
                "text-muted-foreground hover:text-destructive",
                isMobile ? "h-8 w-8" : "h-6 w-6"
              )}
              onClick={() => onTaskRemove(task.task_id)}
            >
              <X className={isMobile ? "h-4 w-4" : "h-3 w-3"} />
            </Button>
          </div>
        ))}
        
        {/* Drop hint when dragging */}
        {isDragging && !hasContent && (
          <div className={cn(
            "text-muted-foreground text-center",
            isMobile ? "text-sm py-4" : "text-xs py-2"
          )}>
            Drop here
          </div>
        )}
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
  const isMobile = useIsMobile();
  const scheduleRef = useRef<HTMLDivElement>(null);
  const { status: calendarStatus, syncing, syncNow, connect } = useGoogleCalendar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showOfficeHoursModal, setShowOfficeHoursModal] = useState(false);
  
  // Mobile scheduling state
  const [selectedTaskForSchedule, setSelectedTaskForSchedule] = useState<Task | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Calculate time slot height based on device
  const TIME_SLOT_HEIGHT = isMobile ? 80 : 48;

  // Extract primitive values to avoid re-render loops
  const isConnected = calendarStatus.connected;
  const isCalendarSelected = calendarStatus.calendarSelected;

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
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = officeHoursStart; hour < officeHoursEnd; hour++) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, hour });
    }
    return slots;
  }, [officeHoursStart, officeHoursEnd]);

  // Fetch Google Calendar events
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!isConnected || !isCalendarSelected) {
        setLoadingEvents(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-calendar-events', {
          body: {
            startDate: todayStr,
            endDate: todayStr,
          },
        });

        if (error) throw error;
        setCalendarEvents(data?.events || []);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchCalendarEvents();
  }, [isConnected, isCalendarSelected, todayStr]);

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

  // Auto-scroll to current time on mobile
  useEffect(() => {
    if (isMobile && scheduleRef.current && !loading) {
      const currentHour = new Date().getHours();
      if (currentHour >= officeHoursStart && currentHour < officeHoursEnd) {
        const scrollPosition = (currentHour - officeHoursStart) * TIME_SLOT_HEIGHT;
        setTimeout(() => {
          scheduleRef.current?.scrollTo({ top: Math.max(0, scrollPosition - 40), behavior: 'smooth' });
        }, 100);
      }
    }
  }, [isMobile, loading, officeHoursStart, officeHoursEnd, TIME_SLOT_HEIGHT]);

  // Handle mobile schedule from modal
  const handleMobileSchedule = async (taskId: string, time: string) => {
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;

    const previousTime = task.scheduled_time;
    setTasks(prev => prev.map(t => 
      t.task_id === taskId ? { ...t, scheduled_time: time } : t
    ));

    try {
      await supabase.functions.invoke('manage-task', {
        body: { action: 'update', task_id: taskId, scheduled_time: time, scheduled_date: todayStr },
      });
      onTaskUpdate?.();
    } catch (error) {
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, scheduled_time: previousTime } : t
      ));
      toast.error('Failed to schedule task');
    }
  };

  // Get tasks for a specific time slot
  const getTasksForSlot = (time: string) => {
    return tasks.filter(t => t.scheduled_time?.startsWith(time));
  };

  // Get events for a specific hour
  const getEventsForHour = (hour: number) => {
    return calendarEvents.filter(event => {
      if (event.start.dateTime) {
        const eventHour = parseISO(event.start.dateTime).getHours();
        return eventHour === hour;
      }
      return false;
    });
  };

  // All-day events
  const allDayEvents = useMemo(() => {
    return calendarEvents.filter(event => event.start.date && !event.start.dateTime);
  }, [calendarEvents]);

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
  const isLoading = loading || loadingEvents;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              📅 Today's Agenda
            </CardTitle>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={syncNow}
                  disabled={syncing}
                  className="h-8 w-8 p-0"
                  title="Sync calendar"
                >
                  <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                </Button>
              )}
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
          </div>
          <CardDescription className="flex items-center justify-between">
            <span>
              Drag tasks to schedule. Office hours: {formatTime(`${officeHoursStart}:00`)} - {formatTime(`${officeHoursEnd}:00`)}
            </span>
            {isConnected && calendarStatus.calendarName && (
              <span className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {calendarStatus.calendarName}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* All-day events */}
              {allDayEvents.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All Day</p>
                  {allDayEvents.map(event => (
                    <div 
                      key={event.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
                    >
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {event.summary}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Connect Calendar CTA */}
              {!isConnected && (
                <div className="mb-4 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-primary/60 mb-2" />
                  <p className="text-sm font-medium mb-1">Connect Google Calendar</p>
                  <p className="text-xs text-muted-foreground mb-3">See your meetings alongside tasks</p>
                  <Button size="sm" onClick={() => connect()}>
                    Connect Calendar
                  </Button>
                </div>
              )}

              {/* Mobile: stacked layout, Desktop: grid */}
              <div className={cn(
                "gap-4",
                isMobile ? "flex flex-col" : "grid grid-cols-1 lg:grid-cols-2"
              )}>
                {/* Time Slots - Calendar View */}
                <div className="space-y-2">
                  <h4 className={cn(
                    "font-medium text-muted-foreground flex items-center gap-1.5 mb-3",
                    isMobile ? "text-base" : "text-sm"
                  )}>
                    <Clock className="h-4 w-4" />
                    Schedule
                  </h4>
                  <ScrollArea className={cn("pr-2", isMobile ? "max-h-[350px]" : "max-h-[400px]")}>
                    <div ref={scheduleRef} className="space-y-1 relative">
                      <CurrentTimeIndicator
                        selectedDate={today}
                        startHour={officeHoursStart}
                        hourHeight={TIME_SLOT_HEIGHT}
                      />
                      {timeSlots.map(({ time, hour }) => (
                        <TimeSlot
                          key={time}
                          time={time}
                          hour={hour}
                          tasks={getTasksForSlot(time)}
                          events={getEventsForHour(hour)}
                          onTaskRemove={handleTaskRemove}
                          onTaskToggle={handleTaskToggle}
                          isMobile={isMobile}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Tasks Pool */}
                <div 
                  className={cn(
                    "space-y-2 rounded-lg border transition-colors",
                    isMobile ? "p-4" : "p-3",
                    activeTask && "ring-2 ring-primary/20 bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h4 className={cn(
                      "font-medium text-muted-foreground",
                      isMobile ? "text-base" : "text-sm"
                    )}>
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
                        <div className={cn(
                          "rounded-full bg-muted flex items-center justify-center mb-2",
                          isMobile ? "w-12 h-12" : "w-10 h-10"
                        )}>
                          <Check className={isMobile ? "h-6 w-6 text-muted-foreground" : "h-5 w-5 text-muted-foreground"} />
                        </div>
                        <p className={cn("text-muted-foreground", isMobile ? "text-base" : "text-sm")}>
                          No unscheduled tasks for today
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add tasks from Top 3 or scratch pad
                        </p>
                      </div>
                    ) : (
                      <SortableContext items={poolTaskIds} strategy={verticalListSortingStrategy}>
                        <div className={cn("space-y-2 overflow-y-auto", isMobile ? "max-h-[300px]" : "max-h-[400px]")}>
                          {poolTasks.map((task) => (
                            <DraggablePoolTask
                              key={task.task_id}
                              task={task}
                              onToggle={handleTaskToggle}
                              isMobile={isMobile}
                              onScheduleClick={isMobile ? (t) => {
                                setSelectedTaskForSchedule(t);
                                setScheduleModalOpen(true);
                              } : undefined}
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
      
      {/* Mobile Schedule Modal */}
      <ScheduleTimeModal
        task={selectedTaskForSchedule}
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        onSchedule={handleMobileSchedule}
        officeHoursStart={officeHoursStart}
        officeHoursEnd={officeHoursEnd}
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
