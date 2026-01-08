import { Button } from '@/components/ui/button';
import { Plus, Columns, Calendar, LayoutList, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewMode } from './types';

interface TaskViewsToolbarNewProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddTask: () => void;
}

export function TaskViewsToolbarNew({
  viewMode,
  onViewModeChange,
  onAddTask,
}: TaskViewsToolbarNewProps) {
  const views = [
    { id: 'kanban' as ViewMode, label: 'Kanban Board', icon: Columns },
    { id: 'list' as ViewMode, label: 'Weekly Planner', icon: Calendar },
    { id: 'database' as ViewMode, label: 'List View', icon: Table2 },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {views.map((view) => (
        <Button
          key={view.id}
          variant={viewMode === view.id ? 'secondary' : 'outline'}
          onClick={() => onViewModeChange(view.id)}
          className="gap-2"
        >
          <view.icon className="h-4 w-4" />
          {view.label}
        </Button>
      ))}
    </div>
  );
}
