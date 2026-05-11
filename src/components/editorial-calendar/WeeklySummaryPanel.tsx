import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Battery, BatteryLow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarItem } from '@/lib/calendarConstants';
import { buildWeekSummary } from '@/lib/calendarInsights';

const COLLAPSED_KEY = 'editorial-calendar-summary-collapsed';
const LOW_ENERGY_KEY = 'editorial-calendar-low-energy';

interface WeeklySummaryPanelProps {
  items: CalendarItem[];
  weekStart: Date;
}

export function WeeklySummaryPanel({ items, weekStart }: WeeklySummaryPanelProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  });
  const [lowEnergy, setLowEnergy] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LOW_ENERGY_KEY) === '1';
  });

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);
  useEffect(() => {
    try { localStorage.setItem(LOW_ENERGY_KEY, lowEnergy ? '1' : '0'); } catch {}
  }, [lowEnergy]);

  const summary = useMemo(
    () => buildWeekSummary(items, weekStart, { lowEnergyMode: lowEnergy }),
    [items, weekStart, lowEnergy]
  );

  const topInsight = summary.insights[0];

  return (
    <div className="px-5 py-2 border-b border-border/30 bg-gradient-to-r from-muted/10 via-transparent to-muted/10">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Title + at-a-glance */}
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <Sparkles className="h-3 w-3 text-primary/70" />
          This Week
          {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>

        {!collapsed && (
          <>
            <span className="text-xs text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{summary.totalThisWeek}</span> planned ·
              {' '}<span className="font-semibold text-foreground">{summary.publishedThisWeek}</span> shipped
              {summary.emptyDays.length > 0 && (
                <> · <span className="font-semibold text-foreground">{summary.emptyDays.length}</span> quiet day{summary.emptyDays.length === 1 ? '' : 's'}</>
              )}
            </span>

            {/* Top insight inline */}
            {topInsight && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border',
                  topInsight.tone === 'positive' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
                  topInsight.tone === 'gentle' && 'bg-muted/60 text-foreground border-border/40',
                  topInsight.tone === 'caution' && 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50',
                )}
              >
                <span aria-hidden>{topInsight.icon}</span>
                <span className="leading-tight">{topInsight.message}</span>
              </span>
            )}

            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLowEnergy(v => !v)}
                className={cn(
                  'h-7 gap-1.5 text-[11px] font-semibold rounded-full px-2.5',
                  lowEnergy
                    ? 'bg-amber-100/70 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {lowEnergy ? <BatteryLow className="h-3.5 w-3.5" /> : <Battery className="h-3.5 w-3.5" />}
                {lowEnergy ? 'Low-Energy On' : 'Low-Energy Mode'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Expanded extra insights */}
      {!collapsed && summary.insights.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {summary.insights.slice(1).map(ins => (
            <span
              key={ins.id}
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border',
                ins.tone === 'positive' && 'bg-emerald-50/60 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40',
                ins.tone === 'gentle' && 'bg-muted/40 text-muted-foreground border-border/40',
                ins.tone === 'caution' && 'bg-amber-50/60 text-amber-800 border-amber-200/70 dark:bg-amber-950/20 dark:text-amber-200 dark:border-amber-900/40',
              )}
            >
              <span aria-hidden>{ins.icon}</span>
              <span className="leading-tight">{ins.message}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
