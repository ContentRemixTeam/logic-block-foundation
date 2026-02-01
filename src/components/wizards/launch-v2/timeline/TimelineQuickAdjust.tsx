// Quick adjustment buttons for common timeline changes

import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

interface TimelineQuickAdjustProps {
  onAdjust: (days: number) => void;
  label: string;
  days: number; // Positive = add, Negative = shorten
}

export function TimelineQuickAdjust({ onAdjust, label, days }: TimelineQuickAdjustProps) {
  const Icon = days > 0 ? Plus : Minus;

  return (
    <div className="flex justify-center py-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onAdjust(Math.abs(days))}
        className="text-xs text-muted-foreground hover:text-foreground h-8"
      >
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Button>
    </div>
  );
}
