import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Energy = 'low' | 'medium' | 'high';
const OPTIONS: Energy[] = ['low', 'medium', 'high'];
const LABELS: Record<Energy, string> = { low: 'Low', medium: 'Medium', high: 'High' };

interface Props {
  value?: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

/** Optional energy tag for a task. Tap the current option again to clear. */
export function EnergySelector({ value, onChange, className }: Props) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="text-xs text-muted-foreground">
        Energy cost <span className="opacity-60">(optional)</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((opt) => {
          const active = value === opt;
          return (
            <Button
              key={opt}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => onChange(active ? null : opt)}
            >
              {LABELS[opt]}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
