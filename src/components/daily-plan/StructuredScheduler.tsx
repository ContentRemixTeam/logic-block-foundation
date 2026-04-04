import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parseISO, startOfDay, isToday } from 'date-fns';
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
import { GripVertical, Clock, Calendar, Check, Loader2, Settings2, RefreshCw, MapPin, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/components/tasks/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPriorityBadgeClasses } from '@/lib/themeColors';
import { OfficeHoursEditorModal } from '@/components/office-hours/OfficeHoursEditorModal';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { CalendarEvent } from '@/components/tasks/views/CalendarEventBlock';
import { ScheduleTimeModal } from '@/components/mobile/ScheduleTimeModal';
import { useIsMobile } from '@/hooks/use-mobile';

interface StructuredSchedulerProps {
  officeHoursStart?: number;
  officeHoursEnd?: number;
  onTaskUpdate?: () => void;
}

const HOUR_HEIGHT = 72; // px per hour
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;

// Task color palette (Structured-style)
const TASK_COLORS = [
  { bg: 'hsl(var(--primary) / 0.15)', border: 'hsl(var(--primary) / 0.4)', text: 'hsl(var(--primary))' },
  { bg: 'hsl(173 80% 40% / 0.15)', border: 'hsl(173 80% 40% / 0.4)', text: 'hsl(173 80% 40%)' },
  { bg: 'hsl(262 80% 55% / 0.15)', border: 'hsl(262 80% 55% / 0.4)', text: 'hsl(262 80% 55%)' },
  { bg: 'hsl(35 90% 55% / 0.15)', border: 'hsl(35 90% 55% / 0.4)', text: 'hsl(35 90% 55%)' },
  { bg: 'hsl(200 80% 50% / 0.15)', border: 'hsl(200 80% 50% / 0.4)', text: 'hsl(200 80% 50%)' },
];

function getTaskColor(index: number) {
  return TASK_COLORS[index % TASK_COLORS.length];
}

function getPriorityColor(priority: string | null) {
  switch (priority) {
    case 'high': return { bg: 'hsl(var(--destructive) / 0.12)', border: 'hsl(var(--destructive) / 0.35)', text: 'hsl(var(--destructive))' };
    case 'medium': return { bg: 'hsl(35 90% 55% / 0.12)', border: 'hsl(35 90% 55% / 0.35)', text: 'hsl(35 90% 55%)' };
    case 'low': return { bg: 'hsl(var(--success) / 0.12)', border: 'hsl(var(--success) / 0.35)', text: 'hsl(var(--success))' };
    default: return null;
  }
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12} ${period}`;
}

// Current time red line
function NowLine({ startHour }: { startHour: number }) {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      if (!isToday(now)) { setTop(null); return; }
      const h = now.getHours();
      const m = now.getMinutes();
      if (h < startHour) { setTop(null); return; }
      setTop((h - startHour) * HOUR_HEIGHT + m * MINUTE_HEIGHT);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [startHour]);

  if (top === null) return null;

  return (
    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top }}>
      <div className="relative flex items-center">
        <div className="w-3 h-3 rounded-full bg-destructive shadow-lg flex-shrink-0 -ml-1.5 animate-pulse" />
        <div className="flex-1 h-[2px] bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
      </div>
    </div>
  );
}

// Scheduled task block on the timeline
function ScheduledTaskBlock({
  task,
  color,
  startHour,
  onRemove,
  onToggle,
}: {
  task: Task;
  color: { bg: string; border: string; text: string };
  startHour: number;
  onRemove: () => void;
  onToggle: (completed: boolean) => void;
}) {
  const scheduledHour = task.scheduled_time
    ? parseInt(task.scheduled_time.split(':')[0], 10)
    : 0;
  const scheduledMinute = task.scheduled_time
    ? parseInt(task.scheduled_time.split(':')[1] || '0', 10)
    : 0;

  const duration = task.time_slot_duration || task.estimated_minutes || 30;
  const top = (scheduledHour - startHour) * HOUR_HEIGHT + scheduledMinute * MINUTE_HEIGHT;
  const height = Math.max(duration * MINUTE_HEIGHT, 28); // min 28px

  return (
    <div
      className={cn(
        "absolute left-[68px] right-2 rounded-xl px-3 py-1.5 transition-all cursor-pointer group",
        "border-l-4 hover:shadow-md",
        task.is_completed && "opacity-50"
      )}
      style={{
        top,
        height,
        backgroundColor: color.bg,
        borderLeftColor: color.border,
      }}
    >
      <div className="flex items-center gap-2 h-full min-h-0">
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={(checked) => onToggle(checked as boolean)}
          className="h-4 w-4 shrink-0"
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className={cn(
            "text-sm font-semibold truncate leading-tight",
            task.is_completed && "line-through"
          )} style={{ color: color.text }}>
            {task.task_text}
          </p>
          {height > 36 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formatHour(scheduledHour)} · {duration}m
            </p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-xs px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Calendar event block on timeline
function CalendarEventOnTimeline({ event, startHour }: { event: CalendarEvent; startHour: number }) {
  if (!event.start.dateTime) return null;
  const start = parseISO(event.start.dateTime);
  const end = event.end.dateTime ? parseISO(event.end.dateTime) : null;
  
  const hour = start.getHours();
  const minute = start.getMinutes();
  const duration = end ? (end.getTime() - start.getTime()) / 60000 : 60;
  const top = (hour - startHour) * HOUR_HEIGHT + minute * MINUTE_HEIGHT;
  const height = Math.max(duration * MINUTE_HEIGHT, 28);

  return (
    <div
      className="absolute left-[68px] right-2 rounded-xl px-3 py-1.5 border-l-4 overflow-hidden"
      style={{
        top,
        height,
        backgroundColor: 'hsl(200 80% 50% / 0.1)',
        borderLeftColor: 'hsl(200 80% 50% / 0.5)',
      }}
    >
      <div className="flex items-center gap-2 h-full">
        <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate leading-tight">
            {event.summary}
          </p>
          {height > 36 && (
            <p className="text-[11px] text-muted-foreground">
              {format(start, 'h:mm a')}{end ? ` – ${format(end, 'h:mm a')}` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Pool task (draggable)
function PoolTask({
  task,
  onToggle,
  isMobile,
  onScheduleClick,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  isMobile: boolean;
  onScheduleClick?: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.task_id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColor = getPriorityColor(task.priority);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-xl border transition-all group",
        isMobile ? "p-3" : "p-2.5",
        isDragging && "opacity-40 shadow-lg ring-2 ring-primary/20",
        "hover:shadow-sm"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none p-1"
        aria-label="Drag to schedule"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Checkbox
        checked={task.is_completed}
        onCheckedChange={(checked) => onToggle(task.task_id, checked as boolean)}
        className="h-4 w-4"
      />

      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm font-medium truncate block",
          task.is_completed && "line-through text-muted-foreground"
        )}>
          {task.task_text}
        </span>
      </div>

      {task.estimated_minutes && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {task.estimated_minutes}m
        </span>
      )}

      {priorityColor && (
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: priorityColor.border }}
          title={task.priority || ''}
        />
      )}

      {isMobile && onScheduleClick && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 shrink-0"
          onClick={(e) => { e.stopPropagation(); onScheduleClick(task); }}
        >
          <Clock className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// Drag overlay
function DragOverlayContent({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-2 p-2.5 bg-card border-2 border-primary rounded-xl shadow-xl opacity-90 max-w-[260px]">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-semibold truncate">{task.task_text}</span>
      {task.estimated_minutes && (
        <span className="text-xs text-muted-foreground">{task.estimated_minutes}m</span>
      )}
    </div>
  );
}

// Drop zone wrapper for the pool
function PoolDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'tasks-pool',
    data: { type: 'pool' },
  });

  return (
    <div ref={setNodeRef} className={cn("min-h-[80px] transition-colors rounded-xl", isOver && "bg-primary/10")}>
      {children}
    </div>
  );
}

export function StructuredScheduler({
  officeHoursStart = 9,
  officeHoursEnd = 17,
  onTaskUpdate,
}: StructuredSchedulerProps) {
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
  const [selectedTaskForSchedule, setSelectedTaskForSchedule] = useState<Task | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = format(today, 'yyyy-MM-dd');
  const isConnected = calendarStatus.connected;
  const isCalendarSelected = calendarStatus.calendarSelected;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const totalHours = officeHoursEnd - officeHoursStart;

  // Fetch calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!isConnected || !isCalendarSelected) { setLoadingEvents(false); return; }
      try {
        const { data, error } = await supabase.functions.invoke('get-calendar-events', {
          body: { startDate: todayStr, endDate: todayStr },
        });
        if (error) throw error;
        setCalendarEvents(data?.events || []);
      } catch { /* ignore */ } finally { setLoadingEvents(false); }
    };
    fetchEvents();
  }, [isConnected, isCalendarSelected, todayStr]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('get-all-tasks');
      if (error) throw error;
      const allTasks = (data?.data || []).filter((t: Task) => !t.is_recurring_parent);
      setTasks(allTasks.filter((t: Task) => t.scheduled_date === todayStr && !t.is_completed));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user, todayStr]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Auto-scroll to now
  useEffect(() => {
    if (scheduleRef.current && !loading) {
      const h = new Date().getHours();
      if (h >= officeHoursStart && h < officeHoursEnd) {
        const pos = (h - officeHoursStart) * HOUR_HEIGHT;
        setTimeout(() => scheduleRef.current?.scrollTo({ top: Math.max(0, pos - 60), behavior: 'smooth' }), 150);
      }
    }
  }, [loading, officeHoursStart, officeHoursEnd]);

  const scheduledTasks = tasks.filter(t => t.scheduled_time);
  const poolTasks = tasks.filter(t => !t.scheduled_time);
  const poolTaskIds = poolTasks.map(t => t.task_id);

  const allDayEvents = useMemo(() => calendarEvents.filter(e => e.start.date && !e.start.dateTime), [calendarEvents]);
  const timedEvents = useMemo(() => calendarEvents.filter(e => !!e.start.dateTime), [calendarEvents]);

  // Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find(t => t.task_id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const dropId = over.id as string;
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;

    if (dropId === 'tasks-pool') {
      if (!task.scheduled_time) return;
      const prev = task.scheduled_time;
      setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, scheduled_time: null } : t));
      try {
        await supabase.functions.invoke('manage-task', { body: { action: 'update', task_id: taskId, scheduled_time: null } });
        toast.success('Moved to pool');
        onTaskUpdate?.();
      } catch {
        setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, scheduled_time: prev } : t));
        toast.error('Failed');
      }
    } else if (dropId.startsWith('time-slot-')) {
      const time = dropId.replace('time-slot-', '');
      if (task.scheduled_time?.startsWith(time)) return;
      const prev = task.scheduled_time;
      setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, scheduled_time: time } : t));
      try {
        await supabase.functions.invoke('manage-task', {
          body: { action: 'update', task_id: taskId, scheduled_time: time, scheduled_date: todayStr },
        });
        const h = parseInt(time.split(':')[0], 10);
        toast.success(`Scheduled for ${formatHour(h)}`);
        onTaskUpdate?.();
      } catch {
        setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, scheduled_time: prev } : t));
        toast.error('Failed');
      }
    }
  };

  const handleRemove = async (taskId: string) => {
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;
    setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, scheduled_time: null } : t));
    try {
      await supabase.functions.invoke('manage-task', { body: { action: 'update', task_id: taskId, scheduled_time: null } });
      onTaskUpdate?.();
    } catch {
      setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, scheduled_time: task.scheduled_time } : t));
    }
  };

  const handleToggle = async (taskId: string, completed: boolean) => {
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;
    setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, is_completed: completed } : t));
    try {
      await supabase.functions.invoke('manage-task', { body: { action: 'update', task_id: taskId, is_completed: completed } });
      onTaskUpdate?.();
    } catch {
      setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, is_completed: task.is_completed } : t));
    }
  };

  const handleMobileSchedule = async (taskId: string, time: string) => {
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return;
    const prev = task.scheduled_time;
    setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, scheduled_time: time } : t));
    try {
      await supabase.functions.invoke('manage-task', {
        body: { action: 'update', task_id: taskId, scheduled_time: time, scheduled_date: todayStr },
      });
      onTaskUpdate?.();
    } catch {
      setTasks(ts => ts.map(t => t.task_id === taskId ? { ...t, scheduled_time: prev } : t));
      toast.error('Failed');
    }
  };

  const isLoading = loading || loadingEvents;

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              Today's Schedule
            </CardTitle>
            <div className="flex items-center gap-1.5">
              {isConnected && (
                <Button size="sm" variant="ghost" onClick={syncNow} disabled={syncing} className="h-8 w-8 p-0">
                  <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowOfficeHoursModal(true)} className="h-8 gap-1.5">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            {formatHour(officeHoursStart)} – {formatHour(officeHoursEnd)} · Drag tasks to time slots
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {/* All-day events */}
              {allDayEvents.length > 0 && (
                <div className="px-4 pt-3 pb-1 space-y-1">
                  {allDayEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{event.summary}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Connect Calendar CTA */}
              {!isConnected && (
                <div className="mx-4 mt-3 p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 text-center">
                  <p className="text-sm font-medium mb-1">Connect Google Calendar</p>
                  <p className="text-xs text-muted-foreground mb-2">See your meetings alongside tasks</p>
                  <Button size="sm" variant="outline" onClick={() => connect()}>
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    Connect
                  </Button>
                </div>
              )}

              <div className={cn("gap-0", isMobile ? "flex flex-col" : "grid grid-cols-[1fr_280px]")}>
                {/* ─── VISUAL TIMELINE ─── */}
                <div className="border-r border-border/30">
                  <ScrollArea className={cn(isMobile ? "max-h-[400px]" : "max-h-[500px]")}>
                    <div
                      ref={scheduleRef}
                      className="relative"
                      style={{ height: totalHours * HOUR_HEIGHT }}
                    >
                      {/* Hour grid lines + labels */}
                      {Array.from({ length: totalHours }, (_, i) => {
                        const hour = officeHoursStart + i;
                        const currentHour = new Date().getHours();
                        return (
                          <div
                            key={hour}
                            className="absolute left-0 right-0 flex"
                            style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                          >
                            {/* Time label */}
                            <div className={cn(
                              "w-[60px] shrink-0 text-right pr-2 pt-0.5 text-[11px] font-medium select-none",
                              hour === currentHour ? "text-destructive font-semibold" : "text-muted-foreground/60"
                            )}>
                              {formatHour(hour)}
                            </div>
                            {/* Hour grid line + drop zone */}
                            <TimelineDropZone time={`${hour.toString().padStart(2, '0')}:00`} hourHeight={HOUR_HEIGHT}>
                              <div className="border-t border-border/20 h-full" />
                            </TimelineDropZone>
                          </div>
                        );
                      })}

                      {/* Calendar events */}
                      {timedEvents.map(event => (
                        <CalendarEventOnTimeline key={event.id} event={event} startHour={officeHoursStart} />
                      ))}

                      {/* Scheduled task blocks */}
                      {scheduledTasks.map((task, i) => (
                        <ScheduledTaskBlock
                          key={task.task_id}
                          task={task}
                          color={getPriorityColor(task.priority) || getTaskColor(i)}
                          startHour={officeHoursStart}
                          onRemove={() => handleRemove(task.task_id)}
                          onToggle={(completed) => handleToggle(task.task_id, completed)}
                        />
                      ))}

                      {/* Current time line */}
                      <NowLine startHour={officeHoursStart} />
                    </div>
                  </ScrollArea>
                </div>

                {/* ─── TASK POOL ─── */}
                <div className={cn("p-3 space-y-2", isMobile && "border-t border-border/30")}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Unscheduled
                    </h4>
                    {poolTasks.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{poolTasks.length}</Badge>
                    )}
                  </div>

                  <PoolDropZone>
                    {poolTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                          <Check className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">All tasks scheduled</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">or add tasks from Top 3</p>
                      </div>
                    ) : (
                      <SortableContext items={poolTaskIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                          {poolTasks.map(task => (
                            <PoolTask
                              key={task.task_id}
                              task={task}
                              onToggle={handleToggle}
                              isMobile={isMobile}
                              onScheduleClick={isMobile ? (t) => { setSelectedTaskForSchedule(t); setScheduleModalOpen(true); } : undefined}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </PoolDropZone>
                </div>
              </div>

              <DragOverlay>
                {activeTask && <DragOverlayContent task={activeTask} />}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <OfficeHoursEditorModal open={showOfficeHoursModal} onOpenChange={setShowOfficeHoursModal} />
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

// Drop zone for each hour row on the timeline
function TimelineDropZone({ time, hourHeight, children }: { time: string; hourHeight: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `time-slot-${time}`,
    data: { type: 'time-slot', time },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 transition-colors",
        isOver && "bg-primary/10 ring-1 ring-primary/20 rounded-lg"
      )}
      style={{ height: hourHeight }}
    >
      {children}
    </div>
  );
}
