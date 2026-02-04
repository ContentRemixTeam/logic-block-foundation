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
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      <StatCard
        icon={<FileText className="h-3.5 w-3.5" />}
        label="Total"
        value={stats.total}
        colorClass="text-blue-600 dark:text-blue-400 bg-blue-500/10"
      />
      <StatCard
        icon={<Clock className="h-3.5 w-3.5" />}
        label="Scheduled"
        value={stats.scheduled}
        colorClass="text-purple-600 dark:text-purple-400 bg-purple-500/10"
      />
      <StatCard
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        label="Published"
        value={stats.published}
        colorClass="text-green-600 dark:text-green-400 bg-green-500/10"
      />
      {stats.overdue > 0 && (
        <StatCard
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          label="Overdue"
          value={stats.overdue}
          colorClass="text-red-600 dark:text-red-400 bg-red-500/10"
        />
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}

function StatCard({ icon, label, value, colorClass }: StatCardProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg",
      colorClass
    )}>
      {icon}
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  );
}
