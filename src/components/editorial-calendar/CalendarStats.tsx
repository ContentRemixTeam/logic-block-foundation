import { useMemo } from 'react';
import { CalendarItem } from '@/lib/calendarConstants';
import { FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarStatsProps {
  items: CalendarItem[];
  className?: string;
}

export function CalendarStats({ items, className }: CalendarStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return {
      total: items.length,
      scheduled: items.filter(i => i.publishDate || i.creationDate).length,
      published: items.filter(i => i.status === 'published' || i.status === 'completed').length,
      overdue: items.filter(i => {
        if (!i.publishDate) return false;
        const publishDate = new Date(i.publishDate);
        publishDate.setHours(0, 0, 0, 0);
        return publishDate < now && i.status !== 'published' && i.status !== 'completed';
      }).length,
    };
  }, [items]);

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <StatPill
        icon={<FileText className="h-3 w-3" />}
        label="Total"
        value={stats.total}
        variant="default"
      />
      <StatPill
        icon={<Clock className="h-3 w-3" />}
        label="Scheduled"
        value={stats.scheduled}
        variant="violet"
      />
      <StatPill
        icon={<CheckCircle2 className="h-3 w-3" />}
        label="Published"
        value={stats.published}
        variant="emerald"
      />
      {stats.overdue > 0 && (
        <StatPill
          icon={<AlertCircle className="h-3 w-3" />}
          label="Overdue"
          value={stats.overdue}
          variant="rose"
        />
      )}
    </div>
  );
}

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant: 'default' | 'violet' | 'emerald' | 'rose';
}

const variantStyles: Record<string, string> = {
  default: 'text-foreground/70 bg-muted/40',
  violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20',
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20',
};

function StatPill({ icon, label, value, variant }: StatPillProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
      variantStyles[variant]
    )}>
      {icon}
      <span className="font-bold tabular-nums">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}
