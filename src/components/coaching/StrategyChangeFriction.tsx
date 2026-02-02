import { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { differenceInDays, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StrategyChangeFrictionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  cycleStartDate: string;
  changeType: string;
  onProceed: () => void;
}

export function StrategyChangeFriction({
  open,
  onOpenChange,
  cycleId,
  cycleStartDate,
  changeType,
  onProceed,
}: StrategyChangeFrictionProps) {
  const { user } = useAuth();
  const [dataShowingIssue, setDataShowingIssue] = useState('');
  const [daysExecuted, setDaysExecuted] = useState('');
  const [blockingThought, setBlockingThought] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);

  const cycleDay = differenceInDays(new Date(), parseISO(cycleStartDate)) + 1;

  // Log the decision
  const logDecision = useMutation({
    mutationFn: async (decision: 'changed' | 'stayed') => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('strategy_change_attempts')
        .insert({
          user_id: user.id,
          cycle_id: cycleId,
          cycle_day: cycleDay,
          change_type: changeType,
          data_showing_issue: dataShowingIssue || null,
          days_executed: parseInt(daysExecuted) || null,
          blocking_thought: blockingThought || null,
          decision,
        });
      
      if (error) throw error;
    },
    onError: () => {
      console.error('Failed to log strategy change decision');
    },
  });

  const handleProceed = async () => {
    await logDecision.mutateAsync('changed');
    onOpenChange(false);
    onProceed();
    toast.info('Strategy change logged. Keep tracking your results!');
  };

  const handleStay = async () => {
    await logDecision.mutateAsync('stayed');
    onOpenChange(false);
    toast.success('Great decision! Consistency is key to seeing results.');
  };

  const allAnswered = dataShowingIssue.trim() && daysExecuted.trim() && blockingThought.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl">Wait</DialogTitle>
              <DialogDescription className="text-sm">
                You set this plan {cycleDay} days ago. You committed to 90 days.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            You're trying to change your: <strong className="text-foreground">{changeType}</strong>
          </p>

          <p className="text-sm font-medium">Before you do, answer these:</p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data" className="text-sm">
                1. What DATA shows this isn't working?
              </Label>
              <Textarea
                id="data"
                value={dataShowingIssue}
                onChange={(e) => setDataShowingIssue(e.target.value)}
                placeholder="Be specific about the numbers or evidence..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="days" className="text-sm">
                2. How long have you CONSISTENTLY executed this strategy?
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="days"
                  type="number"
                  value={daysExecuted}
                  onChange={(e) => setDaysExecuted(e.target.value)}
                  placeholder="0"
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thought" className="text-sm">
                3. What THOUGHT is making you want to change?
              </Label>
              <Textarea
                id="thought"
                value={blockingThought}
                onChange={(e) => setBlockingThought(e.target.value)}
                placeholder="The thought that's driving this urge to change..."
                className="min-h-[80px]"
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-sm italic text-muted-foreground">
                4. If you keep changing strategies, when will you collect enough data to know what works?
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">Still want to change?</p>
            
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleStay}
                disabled={logDecision.isPending}
                className="w-full justify-start gap-2 h-12 border-green-500/30 hover:bg-green-500/10"
              >
                <Check className="h-4 w-4 text-green-600" />
                <span>No, I'll give it more time</span>
                <span className="ml-auto text-xs text-green-600 font-medium">← RECOMMENDED</span>
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleProceed}
                disabled={!allAnswered || logDecision.isPending}
                className="w-full justify-start gap-2 h-12 text-muted-foreground"
              >
                <X className="h-4 w-4" />
                <span>Yes, change it anyway</span>
              </Button>
            </div>

            {!allAnswered && (
              <p className="text-xs text-muted-foreground text-center">
                Answer all questions to unlock "change anyway"
              </p>
            )}

            <p className="text-xs text-muted-foreground text-center mt-2">
              We'll log your decision
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
