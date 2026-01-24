import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Target, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface MonthlyGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoal?: number | null;
  suggestedGoal?: number | null;
  onSave: (amount: number, notes?: string) => Promise<boolean>;
}

export function MonthlyGoalModal({
  open,
  onOpenChange,
  currentGoal,
  suggestedGoal,
  onSave,
}: MonthlyGoalModalProps) {
  const [amount, setAmount] = useState(currentGoal?.toString() || '');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSaving(true);
    const success = await onSave(numAmount, notes || undefined);
    setIsSaving(false);
    
    if (success) {
      onOpenChange(false);
      setAmount('');
      setNotes('');
    }
  };

  const handleUseSuggested = () => {
    if (suggestedGoal) {
      setAmount(suggestedGoal.toString());
    }
  };

  const currentMonth = format(new Date(), 'MMMM yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Set Monthly Revenue Goal
          </DialogTitle>
          <DialogDescription>
            Set your revenue target for {currentMonth}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Revenue Goal</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                min="0"
                step="100"
              />
            </div>
          </div>

          {suggestedGoal && suggestedGoal !== parseFloat(amount) && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground mb-2">
                Based on your 90-day goal, we suggest:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseSuggested}
                className="gap-2"
              >
                <DollarSign className="h-3 w-3" />
                ${suggestedGoal.toLocaleString()}/month
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="What's your strategy to hit this goal?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!amount || parseFloat(amount) <= 0 || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            Set Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
