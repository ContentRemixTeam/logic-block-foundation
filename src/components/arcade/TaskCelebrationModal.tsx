import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trophy, Sparkles, PartyPopper, Heart, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  onCelebrate: (wentWell: string, couldImprove: string) => void;
  petEmoji: string;
  completedCount: number;
  isAllComplete: boolean;
  taskText?: string;
}

export function TaskCelebrationModal({
  open,
  onClose,
  onCelebrate,
  petEmoji,
  completedCount,
  isAllComplete,
  taskText,
}: TaskCelebrationModalProps) {
  const [wentWell, setWentWell] = useState('');
  const [couldImprove, setCouldImprove] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCelebrate = async () => {
    setIsSubmitting(true);
    await onCelebrate(wentWell, couldImprove);
    setWentWell('');
    setCouldImprove('');
    setIsSubmitting(false);
  };

  const handleSkip = () => {
    setWentWell('');
    setCouldImprove('');
    onClose();
  };

  const hasContent = wentWell.trim() || couldImprove.trim();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center sr-only">Task Complete</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Pet Emoji */}
          <div 
            className={cn(
              "text-7xl transition-all",
              isAllComplete ? "animate-bounce" : "animate-pulse"
            )}
            style={{ animationDuration: '1s' }}
          >
            {petEmoji}
          </div>

          {/* Celebration Text */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
              {isAllComplete ? (
                <>
                  <PartyPopper className="h-5 w-5 text-primary" />
                  All Tasks Complete!
                  <PartyPopper className="h-5 w-5 text-primary" />
                </>
              ) : (
                <>
                  Task Complete!
                  <Sparkles className="h-5 w-5 text-primary" />
                </>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAllComplete 
                ? "Your pet is fully grown! Amazing work! 🎉"
                : `${completedCount}/3 tasks done - keep going!`
              }
            </p>
          </div>

          {/* Two Reflection Questions */}
          <div className="w-full space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Quick reflection (optional)
            </p>
            
            {/* What went well? */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-success" />
                What went well?
              </Label>
              <Textarea
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
                placeholder="e.g., Stayed focused, made good progress..."
                className="min-h-[60px] resize-none"
              />
            </div>

            {/* What could have been better? */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-warning" />
                What could have been better?
              </Label>
              <Textarea
                value={couldImprove}
                onChange={(e) => setCouldImprove(e.target.value)}
                placeholder="e.g., Started earlier, fewer distractions..."
                className="min-h-[60px] resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button
              onClick={handleCelebrate}
              className="flex-1 gap-2"
              disabled={isSubmitting}
            >
              <Trophy className="h-4 w-4" />
              {hasContent ? 'Save & Continue' : 'Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
