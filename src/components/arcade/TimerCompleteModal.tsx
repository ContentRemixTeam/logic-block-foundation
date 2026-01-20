import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw, SkipForward } from 'lucide-react';

interface TimerCompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskText: string;
  onTaskComplete: () => void;
  onNeedMoreTime: () => void;
  onSkip: () => void;
}

export function TimerCompleteModal({
  open,
  onOpenChange,
  taskText,
  onTaskComplete,
  onNeedMoreTime,
  onSkip,
}: TimerCompleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="text-5xl animate-bounce">⏱️ 🔔</div>
          </div>
          <DialogTitle className="text-2xl text-center">Time's Up!</DialogTitle>
          <DialogDescription className="text-center pt-2">
            You were working on:
            <span className="block font-medium text-foreground mt-2 text-base">
              "{taskText || 'Your task'}"
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <p className="text-center text-muted-foreground">
            Did you finish this task?
          </p>

          <Button
            onClick={onTaskComplete}
            className="w-full h-12 text-base"
            size="lg"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Yes, I finished it!
          </Button>

          <Button
            onClick={onNeedMoreTime}
            variant="outline"
            className="w-full h-12 text-base"
            size="lg"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Not yet, need more time
          </Button>

          <Button
            onClick={onSkip}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Skip and move on
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
