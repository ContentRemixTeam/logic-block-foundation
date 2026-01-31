import { Inbox, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyAgendaStateProps {
  type: 'no-tasks' | 'no-office-hours';
  onAddTask?: () => void;
  onConfigureHours?: () => void;
}

export function EmptyAgendaState({ type, onAddTask, onConfigureHours }: EmptyAgendaStateProps) {
  if (type === 'no-tasks') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-2">No tasks today</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
          Add a task or drag from your inbox to get started
        </p>
        {onAddTask && (
          <Button onClick={onAddTask} className="touch-manipulation min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />
            Add a task
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Settings className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg mb-2">Set your office hours</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
        Configure your working hours to see your daily schedule
      </p>
      {onConfigureHours && (
        <Button onClick={onConfigureHours} variant="outline" className="touch-manipulation min-h-[44px]">
          <Settings className="h-4 w-4 mr-2" />
          Configure Hours
        </Button>
      )}
    </div>
  );
}

export default EmptyAgendaState;
