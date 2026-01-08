import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Columns, Calendar, Clock3, AlertTriangle, 
  CalendarSync, LayoutList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewMode } from './types';

interface TaskViewsToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddTask: () => void;
  overdueCount: number;
  isCalendarConnected?: boolean;
  onConnectCalendar?: () => void;
  showOverdue?: boolean;
  onShowOverdueChange?: (show: boolean) => void;
}

export function TaskViewsToolbar({
  viewMode,
  onViewModeChange,
  onAddTask,
  overdueCount,
  isCalendarConnected = false,
  onConnectCalendar,
  showOverdue = false,
  onShowOverdueChange,
}: TaskViewsToolbarProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Views
      </h2>
      
      <div className="flex flex-wrap gap-2">
        {/* Add Task - Primary */}
        <Button onClick={onAddTask} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>

        {/* View Mode Buttons */}
        <Button
          variant={viewMode === 'kanban' ? 'secondary' : 'outline'}
          onClick={() => onViewModeChange('kanban')}
          className="gap-2"
        >
          <Columns className="h-4 w-4" />
          Kanban Board
        </Button>

        <Button
          variant={viewMode === 'list' ? 'secondary' : 'outline'}
          onClick={() => onViewModeChange('list')}
          className="gap-2"
        >
          <LayoutList className="h-4 w-4" />
          List View
        </Button>

        <Button
          variant={viewMode === 'timeline' ? 'secondary' : 'outline'}
          onClick={() => onViewModeChange('timeline')}
          className="gap-2"
        >
          <Clock3 className="h-4 w-4" />
          Timeline View
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Overdue Tasks */}
        {overdueCount > 0 && (
          <Button
            variant={showOverdue ? 'secondary' : 'outline'}
            onClick={() => onShowOverdueChange?.(!showOverdue)}
            className={cn(
              "gap-2",
              overdueCount > 0 && "border-destructive/50 text-destructive hover:bg-destructive/10"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            Overdue Tasks
            <Badge variant="destructive" className="ml-1">
              {overdueCount}
            </Badge>
          </Button>
        )}

        {/* Google Calendar */}
        {onConnectCalendar && (
          <Button
            variant="outline"
            onClick={onConnectCalendar}
            className="gap-2"
          >
            <CalendarSync className="h-4 w-4" />
            {isCalendarConnected ? 'Google Calendar' : 'Connect Calendar'}
          </Button>
        )}
      </div>
    </div>
  );
}
