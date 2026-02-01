// Reusable component for bonus items with status tracking and deadlines
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Gift, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { BonusItem } from '@/types/launchV2';
import { format, parseISO, isAfter } from 'date-fns';

interface BonusItemCardProps {
  bonus: BonusItem;
  onUpdate: (updates: Partial<BonusItem>) => void;
  onRemove: () => void;
  maxDeadline?: string; // Cart opens date for validation
}

export function BonusItemCard({ bonus, onUpdate, onRemove, maxDeadline }: BonusItemCardProps) {
  const isDeadlineAfterMax = maxDeadline && bonus.deadline && bonus.status === 'needs-creation'
    ? isAfter(parseISO(bonus.deadline), parseISO(maxDeadline))
    : false;

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 rounded-lg border space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <span className="font-medium">{bonus.name}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <RadioGroup
        value={bonus.status}
        onValueChange={(v) => onUpdate({ 
          status: v as 'existing' | 'needs-creation',
          // Clear deadline if switching to existing
          ...(v === 'existing' ? { deadline: undefined } : {}),
        })}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="existing" id={`${bonus.id}-existing`} />
          <Label htmlFor={`${bonus.id}-existing`} className="cursor-pointer text-sm">
            Already created
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="needs-creation" id={`${bonus.id}-needs-creation`} />
          <Label htmlFor={`${bonus.id}-needs-creation`} className="cursor-pointer text-sm">
            Need to create
          </Label>
        </div>
      </RadioGroup>
      
      {bonus.status === 'needs-creation' && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">When will it be ready?</Label>
          <Input
            type="date"
            value={bonus.deadline || ''}
            onChange={(e) => onUpdate({ deadline: e.target.value })}
            max={maxDeadline}
            className="w-auto"
          />
          {isDeadlineAfterMax && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>Deadline is after cart opens</span>
            </div>
          )}
        </div>
      )}

      {bonus.status === 'existing' && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>Ready to use</span>
        </div>
      )}

      {bonus.status === 'needs-creation' && bonus.deadline && !isDeadlineAfterMax && (
        <div className="text-sm text-muted-foreground">
          📅 Due: {formatDisplayDate(bonus.deadline)}
        </div>
      )}
    </div>
  );
}
