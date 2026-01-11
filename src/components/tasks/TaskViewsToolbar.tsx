import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Columns, Clock3, AlertTriangle, 
  CalendarSync, LayoutList, Upload, Table2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewMode } from './types';

interface TaskViewsToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddTask: () => void;
  onImportCSV?: () => void;
  overdueCount: number;
  totalTasks?: number;
  isCalendarConnected?: boolean;
  onConnectCalendar?: () => void;
  showOverdue?: boolean;
  onShowOverdueChange?: (show: boolean) => void;
}

const VIEW_OPTIONS = [
  { id: 'list' as ViewMode, label: 'List', icon: LayoutList },
  { id: 'kanban' as ViewMode, label: 'Board', icon: Columns },
  { id: 'board' as ViewMode, label: 'Table', icon: Table2 },
  { id: 'timeline' as ViewMode, label: 'Timeline', icon: Clock3 },
];

export function TaskViewsToolbar({
  viewMode,
  onViewModeChange,
  onAddTask,
  onImportCSV,
  overdueCount,
  totalTasks = 0,
  isCalendarConnected = false,
  onConnectCalendar,
}: TaskViewsToolbarProps) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 px-4 py-3",
      "border-b border-border/50 bg-background/95 backdrop-blur-sm",
      "sticky top-0 z-10"
    )}>
      {/* Left side - View switcher */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "inline-flex items-center rounded-lg p-1",
          "bg-muted/50 border border-border/50"
        )}>
          {VIEW_OPTIONS.map((view) => {
            const Icon = view.icon;
            const isActive = viewMode === view.id;
            return (
              <Button
                key={view.id}
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange(view.id)}
                className={cn(
                  "h-8 px-3 gap-2 rounded-md transition-all",
                  isActive 
                    ? "bg-background shadow-sm text-foreground font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">{view.label}</span>
              </Button>
            );
          })}
        </div>

        <Separator orientation="vertical" className="h-6 hidden md:block" />

        {/* Stats */}
        <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
          {totalTasks > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" />
              <span>{totalTasks} tasks</span>
            </div>
          )}
          
          {overdueCount > 0 && (
            <Badge 
              variant="destructive" 
              className="gap-1 animate-pulse"
            >
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
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

        {/* Import CSV Button */}
        {onImportCSV && (
          <Button
            variant="outline"
            size="sm"
            onClick={onImportCSV}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
        )}

        {/* Add Task Button */}
        <Button 
          onClick={onAddTask} 
          size="sm" 
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Task</span>
        </Button>
      </div>
    </div>
  );
}
