import { useState } from 'react';
import { AlertOctagon, Check, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PlatformCommitment {
  platform: string;
  postsPerWeek: number;
  hoursPerPost: number;
}

interface SimplificationOption {
  id: string;
  title: string;
  description: string;
  platforms: PlatformCommitment[];
  totalHours: number;
}

interface SimplificationAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerType: 'capacity' | 'platforms' | 'time';
  currentPlan: {
    platforms: PlatformCommitment[];
    totalHoursNeeded: number;
    availableHours: number;
    offersPerQuarter?: number;
    hasLaunch?: boolean;
  };
  suggestions: SimplificationOption[];
  onSelectOption: (option: SimplificationOption | null) => void;
}

export function SimplificationAssistant({
  open,
  onOpenChange,
  triggerType,
  currentPlan,
  suggestions,
  onSelectOption,
}: SimplificationAssistantProps) {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Log the choice
  const logChoice = useMutation({
    mutationFn: async (choiceMade: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const insertData = {
        user_id: user.id,
        trigger_type: triggerType,
        suggested_options: suggestions as unknown,
        choice_made: choiceMade,
      };
      
      const { error } = await supabase
        .from('simplification_suggestions')
        .insert([insertData] as any);
      
      if (error) throw error;
    },
    onError: () => {
      console.error('Failed to log simplification choice');
    },
  });

  const handleSelectOption = async (option: SimplificationOption) => {
    await logChoice.mutateAsync(option.id);
    onSelectOption(option);
    onOpenChange(false);
    toast.success(`Applied "${option.title}" plan`);
  };

  const handleManualAdjust = async () => {
    await logChoice.mutateAsync('manual');
    onSelectOption(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertOctagon className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl">Your Plan Is Too Complex</DialogTitle>
              <DialogDescription className="text-sm">
                Let me help you simplify
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Plan Summary */}
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg space-y-3">
            <p className="text-sm font-medium">You're trying to:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {currentPlan.platforms.map(p => (
                <li key={p.platform}>
                  • Post {p.postsPerWeek}x/week on {p.platform}
                </li>
              ))}
              {currentPlan.offersPerQuarter && (
                <li>• Make {currentPlan.offersPerQuarter} offers/quarter</li>
              )}
              {currentPlan.hasLaunch && (
                <li>• Run a launch this quarter</li>
              )}
            </ul>
            <div className="pt-2 border-t border-destructive/20 flex justify-between items-center">
              <span className="text-sm">Total time needed:</span>
              <Badge variant="destructive">{currentPlan.totalHoursNeeded} hours/week</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Your available time:</span>
              <Badge variant="outline">{currentPlan.availableHours} hours/week</Badge>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Simplified Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Let me simplify this:</p>
            </div>

            {suggestions.map((option, index) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all",
                  selectedOption === option.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Option {String.fromCharCode(65 + index)}: {option.title}</span>
                      {selectedOption === option.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                    <ul className="text-sm mt-2 space-y-0.5">
                      {option.platforms.map(p => (
                        <li key={p.platform} className="text-muted-foreground">
                          • {p.postsPerWeek}x/week on {p.platform}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Badge 
                    variant={option.totalHours <= currentPlan.availableHours ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {option.totalHours} hrs/wk {option.totalHours <= currentPlan.availableHours && '✓'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Which sounds doable?
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                const option = suggestions.find(s => s.id === selectedOption);
                if (option) handleSelectOption(option);
              }}
              disabled={!selectedOption || logChoice.isPending}
              className="w-full"
            >
              Apply Selected Option
            </Button>
            <Button
              variant="ghost"
              onClick={handleManualAdjust}
              disabled={logChoice.isPending}
              className="w-full text-muted-foreground"
            >
              Let me adjust manually
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
