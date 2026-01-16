/**
 * Coaching Log Page
 * 
 * Displays all coaching entries with filters for date range, cycle, project, and task.
 * 
 * QA Checklist:
 * - [ ] list view shows all entries
 * - [ ] filters work correctly
 * - [ ] click opens full entry detail drawer
 * - [ ] user can only see their own entries (RLS)
 */

import { useState, useMemo } from 'react';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import { Sparkles, Filter, Calendar as CalendarIcon, X, ChevronDown } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoachingEntries, CoachingEntry } from '@/hooks/useCoachingEntries';
import { useTasks } from '@/hooks/useTasks';
import { useAllCycles } from '@/hooks/useActiveCycle';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';

export default function CoachingLog() {
  const [searchParams] = useSearchParams();
  const initialTaskId = searchParams.get('task') || '';

  const { data: entries = [], isLoading } = useCoachingEntries();
  const { data: tasks = [] } = useTasks();
  const { data: cycles = [] } = useAllCycles();
  const { data: projects = [] } = useProjects();

  // Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [cycleFilter, setCycleFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState(initialTaskId);
  const [showFilters, setShowFilters] = useState(false);

  // Detail drawer
  const [selectedEntry, setSelectedEntry] = useState<CoachingEntry | null>(null);

  // Get unique tasks that have coaching entries
  const tasksWithEntries = useMemo(() => {
    const taskIds = new Set(entries.filter(e => e.task_id).map(e => e.task_id));
    return tasks.filter(t => taskIds.has(t.task_id));
  }, [entries, tasks]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Date range filter
      if (dateFrom && isBefore(parseISO(entry.created_at), dateFrom)) return false;
      if (dateTo && isAfter(parseISO(entry.created_at), dateTo)) return false;

      // Cycle filter
      if (cycleFilter && entry.cycle_id !== cycleFilter) return false;

      // Task filter
      if (taskFilter && entry.task_id !== taskFilter) return false;

      // Project filter - need to find task's project
      if (projectFilter) {
        const task = tasks.find(t => t.task_id === entry.task_id);
        if (!task || task.project_id !== projectFilter) return false;
      }

      return true;
    });
  }, [entries, dateFrom, dateTo, cycleFilter, taskFilter, projectFilter, tasks]);

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setCycleFilter('');
    setProjectFilter('');
    setTaskFilter('');
  };

  const hasActiveFilters = dateFrom || dateTo || cycleFilter || projectFilter || taskFilter;

  const getTaskTitle = (taskId: string | null) => {
    if (!taskId) return 'No task';
    const task = tasks.find(t => t.task_id === taskId);
    return task?.task_text || 'Unknown task';
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Coaching Log</h1>
              <p className="text-muted-foreground">Your self-coaching history</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">Active</Badge>
            )}
          </Button>
        </div>

        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Date From */}
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, 'PP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Date To */}
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, 'PP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Cycle Filter */}
                  <div className="space-y-2">
                    <Label>Cycle</Label>
                    <Select value={cycleFilter || 'all'} onValueChange={(v) => setCycleFilter(v === 'all' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All cycles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All cycles</SelectItem>
                        {cycles.map(cycle => (
                          <SelectItem key={cycle.cycle_id} value={cycle.cycle_id}>
                            {cycle.goal?.slice(0, 30) || format(new Date(cycle.start_date), 'MMM yyyy')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Task Filter */}
                  <div className="space-y-2">
                    <Label>Task</Label>
                    <Select value={taskFilter || 'all'} onValueChange={(v) => setTaskFilter(v === 'all' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All tasks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All tasks</SelectItem>
                        {tasksWithEntries.map(task => (
                          <SelectItem key={task.task_id} value={task.task_id}>
                            {task.task_text.slice(0, 40)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-4 gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          {hasActiveFilters && ' (filtered)'}
        </div>

        {/* Entries list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="py-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No coaching entries yet</h3>
              <p className="text-muted-foreground">
                Use "Stuck? Coach Yourself" from any task to start building your log.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map(entry => (
              <Card 
                key={entry.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedEntry(entry)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {getTaskTitle(entry.task_id)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), 'EEEE, MMMM d, yyyy • h:mm a')}
                      </div>
                    </div>
                    {entry.feeling && (
                      <Badge variant="outline">{entry.feeling}</Badge>
                    )}
                  </div>

                  <div className="grid gap-2 mt-3">
                    {entry.thought && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Thought: </span>
                        <span className="italic">"{entry.thought.slice(0, 100)}{entry.thought.length > 100 ? '...' : ''}"</span>
                      </div>
                    )}
                    {entry.reframe_thought && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Reframe: </span>
                        <span className="text-primary font-medium">"{entry.reframe_thought.slice(0, 100)}{entry.reframe_thought.length > 100 ? '...' : ''}"</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Entry Detail Drawer */}
        <Sheet open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Coaching Entry
              </SheetTitle>
            </SheetHeader>

            {selectedEntry && (
              <div className="mt-6 space-y-6">
                {/* Meta info */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(selectedEntry.created_at), 'EEEE, MMMM d, yyyy • h:mm a')}
                  </div>
                  {selectedEntry.task_id && (
                    <div className="font-medium">{getTaskTitle(selectedEntry.task_id)}</div>
                  )}
                </div>

                {/* Context */}
                {selectedEntry.context_summary && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Context</Label>
                    <p className="text-sm">{selectedEntry.context_summary}</p>
                  </div>
                )}

                {/* Circumstance */}
                {selectedEntry.circumstance && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Circumstance</Label>
                    <p className="text-sm">{selectedEntry.circumstance}</p>
                  </div>
                )}

                {/* Thought & Feeling */}
                <div className="grid gap-4">
                  {selectedEntry.thought && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Thought</Label>
                      <p className="text-sm italic">"{selectedEntry.thought}"</p>
                    </div>
                  )}
                  {selectedEntry.feeling && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Feeling</Label>
                      <Badge variant="outline">{selectedEntry.feeling}</Badge>
                    </div>
                  )}
                </div>

                {/* Action & Result */}
                <div className="grid gap-4">
                  {selectedEntry.action && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Action</Label>
                      <p className="text-sm">{selectedEntry.action}</p>
                    </div>
                  )}
                  {selectedEntry.result && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Result</Label>
                      <p className="text-sm">{selectedEntry.result}</p>
                    </div>
                  )}
                </div>

                {/* Reframe */}
                {selectedEntry.reframe_thought && (
                  <div className="space-y-1 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <Label className="text-primary">Higher-Quality Thought</Label>
                    <p className="text-sm font-medium">"{selectedEntry.reframe_thought}"</p>
                  </div>
                )}

                {/* Tiny Next Action */}
                {selectedEntry.tiny_next_action && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Tiny Next Action</Label>
                    <p className="text-sm">{selectedEntry.tiny_next_action}</p>
                    {selectedEntry.create_tiny_task && (
                      <Badge variant="secondary" className="mt-1">Task created</Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
