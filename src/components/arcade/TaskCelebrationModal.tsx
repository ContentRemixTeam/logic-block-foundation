import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trophy, Sparkles, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  onCelebrate: (reflection: string) => void;
  petEmoji: string;
  completedCount: number;
  isAllComplete: boolean;
}

export function TaskCelebrationModal({
  open,
  onClose,
  onCelebrate,
  petEmoji,
  completedCount,
  isAllComplete,
}: TaskCelebrationModalProps) {
  const [reflection, setReflection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCelebrate = async () => {
    setIsSubmitting(true);
    await onCelebrate(reflection);
    setReflection('');
    setIsSubmitting(false);
  };

  const handleSkip = () => {
    setReflection('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
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

          {/* Reflection Input */}
          <div className="w-full space-y-2">
            <p className="text-sm text-center">
              Celebrate your micro win to earn a trophy! 🏆
            </p>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What are you celebrating? (e.g., Made progress, Focused well)"
              className="min-h-[80px] resize-none"
            />
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
              Celebrate & Earn
            </Button>
          </div>

          {/* Coins indicator */}
          <p className="text-xs text-muted-foreground text-center">
            +5 coins earned • +2 bonus for celebrating
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
