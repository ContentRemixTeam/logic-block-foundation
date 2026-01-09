import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Columns, Clock3, AlertTriangle, 
  CalendarSync, LayoutList, Filter
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
}: TaskViewsToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: View Toggles */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className="gap-2"
        >
          <LayoutList className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </Button>
        
        <Button
          variant={viewMode === 'kanban' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('kanban')}
          className="gap-2"
        >
          <Columns className="h-4 w-4" />
          <span className="hidden sm:inline">Board</span>
        </Button>

        <Button
          variant={viewMode === 'timeline' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('timeline')}
          className="gap-2"
        >
          <Clock3 className="h-4 w-4" />
          <span className="hidden sm:inline">Timeline</span>
        </Button>

        {/* Overdue indicator */}
        {overdueCount > 0 && (
          <Badge 
            variant="destructive" 
            className="gap-1 ml-2"
          >
            <AlertTriangle className="h-3 w-3" />
            {overdueCount} overdue
          </Badge>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Google Calendar */}
        {onConnectCalendar && (
          <Button
            variant="outline"
            size="sm"
            onClick={onConnectCalendar}
            className="gap-2"
          >
            <CalendarSync className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isCalendarConnected ? 'Calendar' : 'Connect Calendar'}
            </span>
          </Button>
        )}

        {/* Add Task Button */}
        <Button onClick={onAddTask} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>
    </div>
  );
}
