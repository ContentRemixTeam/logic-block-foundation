import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Compass, Target, Wrench, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from './types';

interface UnconnectedTasksBannerProps {
  tasks: Task[];
  /** Active 90-day cycle id, used to detect "moves your goal" tasks. */
  activeCycleId?: string | null;
  /** Active 90-day goal text, for the "moves your goal" label. */
  activeGoal?: string | null;
  onOpenSweep: () => void;
  className?: string;
}

/**
 * Mastermind OS — at-a-glance: how many of your tasks actually move the business?
 *
 * Renders 3 stats: Moves your goal / Maintenance / Unconnected.
 * Unconnected click opens the guided sweep modal.
 */
export function UnconnectedTasksBanner({
  tasks,
  activeCycleId,
  activeGoal,
  onOpenSweep,
  className,
}: UnconnectedTasksBannerProps) {
  const counts = useMemo(() => {
    let moves = 0;
    let maintenance = 0;
    let unconnected = 0;
    for (const t of tasks) {
      if (t.is_completed) continue;
      const hasMomentum = !!t.momentum_type;
      const hasGoal = !!t.goal_id || (!!activeCycleId && t.cycle_id === activeCycleId);
      if (t.is_maintenance) maintenance++;
      else if (hasMomentum || hasGoal) moves++;
      else if (!t.connection_swept_at) unconnected++;
    }
    return { moves, maintenance, unconnected };
  }, [tasks, activeCycleId]);

  // Hide the banner entirely if there's nothing meaningful to show
  if (counts.moves === 0 && counts.maintenance === 0 && counts.unconnected === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card/50 backdrop-blur-sm px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground/70 mr-auto">
        <Compass className="h-3.5 w-3.5" />
        <span className="text-xs uppercase tracking-wider">Where your tasks point</span>
      </div>

      <Stat
        icon={<Target className="h-3.5 w-3.5 text-success" />}
        count={counts.moves}
        label={activeGoal ? 'move your 90-day goal' : 'connected'}
        tone="success"
      />

      <Stat
        icon={<Wrench className="h-3.5 w-3.5 text-muted-foreground" />}
        count={counts.maintenance}
        label="maintenance"
        tone="muted"
      />

      <button
        type="button"
        onClick={onOpenSweep}
        disabled={counts.unconnected === 0}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors',
          counts.unconnected > 0
            ? 'bg-warning/10 text-warning hover:bg-warning/20 cursor-pointer'
            : 'text-muted-foreground/50 cursor-default',
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="font-semibold tabular-nums">{counts.unconnected}</span>
        <span>unconnected</span>
        {counts.unconnected > 0 && (
          <span className="ml-1 text-xs underline underline-offset-2">Sweep →</span>
        )}
      </button>
    </div>
  );
}

function Stat({
  icon,
  count,
  label,
  tone,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  tone: 'success' | 'muted';
}) {
  return (
    <div className="inline-flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span
        className={cn(
          'font-semibold tabular-nums',
          tone === 'success' ? 'text-success' : 'text-foreground',
        )}
      >
        {count}
      </span>
      <span>{label}</span>
    </div>
  );
}
