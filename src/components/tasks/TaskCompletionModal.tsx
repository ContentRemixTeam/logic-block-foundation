import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  task_id: string;
  task_text: string;
  estimated_minutes?: number | null;
}

interface TaskCompletionModalProps {
  open: boolean;
  task: Task;
  onClose: () => void;
  onSave: (actualMinutes: number) => void;
  onSkip: () => void;
}

const QUICK_TIME_OPTIONS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
  { label: '1h', value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: '4h', value: 240 },
];

export function TaskCompletionModal({
  open,
  task,
  onClose,
  onSave,
  onSkip,
}: TaskCompletionModalProps) {
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);

  // Reset state when modal opens with new task
  useEffect(() => {
    if (open) {
      setCustomMinutes('');
      setSelectedQuick(null);
    }
  }, [open, task.task_id]);

  const handleQuickSelect = (value: number) => {
    setSelectedQuick(value);
    setCustomMinutes('');
  };

  const handleCustomChange = (value: string) => {
    setCustomMinutes(value);
    setSelectedQuick(null);
  };

  const handleSave = () => {
    const minutes = selectedQuick ?? parseInt(customMinutes, 10);
    if (minutes && minutes > 0) {
      onSave(minutes);
    }
  };

  const handleUseEstimate = () => {
    if (task.estimated_minutes) {
      onSave(task.estimated_minutes);
    }
  };

  const isValid = selectedQuick !== null || (customMinutes && parseInt(customMinutes, 10) > 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Task Completed!
          </DialogTitle>
          <DialogDescription className="text-left">
            <span className="font-medium text-foreground line-clamp-2">
              "{task.task_text}"
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Estimated time display */}
          {task.estimated_minutes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Estimated: {task.estimated_minutes} min</span>
            </div>
          )}

          {/* Question */}
          <p className="text-sm font-medium">How long did it actually take?</p>

          {/* Quick select buttons */}
          <div className="flex flex-wrap gap-2">
            {QUICK_TIME_OPTIONS.map((option) => (
              <Badge
                key={option.value}
                variant={selectedQuick === option.value ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-colors px-3 py-1.5',
                  selectedQuick === option.value && 'bg-primary text-primary-foreground'
                )}
                onClick={() => handleQuickSelect(option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Custom minutes"
              value={customMinutes}
              onChange={(e) => handleCustomChange(e.target.value)}
              min={1}
              max={1440}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-between pt-2">
          <div className="flex gap-2">
            {task.estimated_minutes && (
              <Button variant="outline" size="sm" onClick={handleUseEstimate}>
                Use Estimate
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip
            </Button>
          </div>
          <Button onClick={handleSave} disabled={!isValid} size="sm">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
