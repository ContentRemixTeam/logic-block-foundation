import { cn } from '@/lib/utils';

type Energy = 'low' | 'medium' | 'high';

const STYLES: Record<Energy, { label: string; dot: string; bg: string; text: string }> = {
  low:    { label: 'Low energy',    dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300' },
  medium: { label: 'Medium energy', dot: 'bg-amber-500',   bg: 'bg-amber-500/10',   text: 'text-amber-700 dark:text-amber-300' },
  high:   { label: 'High energy',   dot: 'bg-rose-500',    bg: 'bg-rose-500/10',    text: 'text-rose-700 dark:text-rose-300' },
};

interface Props {
  energy?: string | null;
  className?: string;
  compact?: boolean;
}

export function EnergyChip({ energy, className, compact }: Props) {
  if (!energy || !(energy in STYLES)) return null;
  const s = STYLES[energy as Energy];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        s.bg,
        s.text,
        className,
      )}
      aria-label={s.label}
      title={s.label}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {compact ? null : s.label.replace(' energy', '')}
    </span>
  );
}
