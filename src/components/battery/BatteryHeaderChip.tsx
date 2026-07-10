import { useState } from 'react';
import { useTodayBattery, BATTERY_LEVELS } from '@/hooks/useBatteryCheckin';
import { BatteryCheckinPrompt } from './BatteryCheckinPrompt';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  size?: 'sm' | 'md';
}

/** Small always-available pill: tap to open the check-in sheet. */
export function BatteryHeaderChip({ className, size = 'md' }: Props) {
  const { level } = useTodayBattery();
  const [open, setOpen] = useState(false);
  const meta = BATTERY_LEVELS.find((b) => b.level === level);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border bg-background/70 backdrop-blur transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
          className,
        )}
        title="Update your battery check-in"
        aria-label={meta ? `Battery: ${meta.label}` : 'Set your battery'}
      >
        <span aria-hidden>{meta?.emoji ?? '🔌'}</span>
        <span className="font-medium">
          {meta ? meta.label : 'Set battery'}
        </span>
      </button>
      <BatteryCheckinPrompt force open={open} onOpenChange={setOpen} />
    </>
  );
}
