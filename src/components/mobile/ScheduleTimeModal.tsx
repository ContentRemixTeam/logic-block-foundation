import { useState } from 'react';
import { Task } from '@/components/tasks/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleTimeModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (taskId: string, time: string) => void;
  officeHoursStart?: number;
  officeHoursEnd?: number;
}

// Generate time slots based on office hours
function generateTimeSlots(start: number = 9, end: number = 17): string[] {
  const slots: string[] = [];
  for (let hour = start; hour < end; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

// Format time to 12-hour format
function formatTime12(time: string): string {
  const hour = parseInt(time.split(':')[0], 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${period}`;
}

export function ScheduleTimeModal({ 
  task, 
  open, 
  onOpenChange,
  onSchedule,
  officeHoursStart = 9,
  officeHoursEnd = 17,
}: ScheduleTimeModalProps) {
  const isMobile = useIsMobile();
  const availableSlots = generateTimeSlots(officeHoursStart, officeHoursEnd);
  
  const handleSelect = (time: string) => {
    if (task) {
      onSchedule(task.task_id, time);
      onOpenChange(false);
      toast.success(`Scheduled for ${formatTime12(time)}`);
    }
  };
  
  const content = (
    <div className="space-y-4">
      {task && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium text-sm">{task.task_text}</p>
          {task.estimated_minutes && (
            <p className="text-xs text-muted-foreground mt-1">
              Duration: {task.estimated_minutes} min
            </p>
          )}
        </div>
      )}
      
      <div>
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Pick a time:
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {availableSlots.map(time => (
            <Button
              key={time}
              variant="outline"
              className="h-12 text-sm touch-manipulation"
              onClick={() => handleSelect(time)}
            >
              {formatTime12(time)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
  
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="text-left">
            <DrawerTitle>Schedule Task</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Task</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleTimeModal;
