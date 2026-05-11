import { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sunrise, Sun, Moon, Quote } from 'lucide-react';
import { NextBestAction } from './NextBestAction';
import { BusinessSeasonSelector } from './BusinessSeasonSelector';
import { useBusinessSeason } from '@/hooks/useBusinessSeason';
import { useAuth } from '@/hooks/useAuth';
import { format as formatDate } from 'date-fns';
import { pickPrompt } from '@/lib/coachingPrompts';

interface Top3Task {
  task_id?: string;
  is_completed?: boolean;
  priority_order?: number;
}

interface TodayCommandCenterProps {
  top3Tasks?: Top3Task[];
  lowEnergyDay?: boolean;
}

/**
 * Today Command Center — unifies the daily snapshot:
 * greeting, date, Top 3 progress, and the deterministic Next Best Action.
 * Pure presentation; reads only from props + existing hooks inside NextBestAction.
 */
export function TodayCommandCenter({ top3Tasks = [], lowEnergyDay }: TodayCommandCenterProps) {
  const { user } = useAuth();
  const { seasonMeta } = useBusinessSeason();

  const { greeting, Icon } = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { greeting: 'Good morning', Icon: Sunrise };
    if (h < 18) return { greeting: 'Good afternoon', Icon: Sun };
    return { greeting: 'Good evening', Icon: Moon };
  }, []);

  const firstName =
    (user?.user_metadata?.first_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    (user?.email as string | undefined)?.split('@')[0] ||
    '';

  const total = top3Tasks.length;
  const completed = top3Tasks.filter(t => t.is_completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;

  return (
    <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-card to-muted/30">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold leading-tight truncate">
                {greeting}{firstName ? `, ${firstName}` : ''}
              </h2>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d')}
                {seasonMeta && <span className="ml-2">· {seasonMeta.emoji} {seasonMeta.todayPrompt}</span>}
              </p>
            </div>
          </div>

          {/* Top 3 progress */}
          <div className="flex items-center gap-3 min-w-[160px]">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium uppercase tracking-wider text-[10px]">Top 3</span>
                {allDone && (
                  <Badge variant="secondary" className="h-4 rounded-full px-1.5 text-[9px] gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Done
                  </Badge>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {completed}/{Math.max(total, 3)}
              </span>
            </div>
            <div className="w-24">
              <Progress value={pct} className="h-2" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <BusinessSeasonSelector />
        </div>

        {/* Next best action */}
        <NextBestAction lowEnergyDay={lowEnergyDay} className="border-dashed bg-background/60" />

        {/* Mastermind coaching prompt — rotates daily, gentle interrupt */}
        <div className="flex items-start gap-2 rounded-md border border-dashed border-primary/20 bg-primary/5 px-3 py-2">
          <Quote className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs italic text-foreground/80 leading-snug">
            {pickPrompt(
              top3Tasks.length === 0 ? 'today_no_brave_move' : 'tasks_unconnected',
              formatDate(new Date(), 'yyyy-MM-dd')
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
