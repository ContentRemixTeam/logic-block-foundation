import { useState } from 'react';
import { Check, Lock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface WeekData {
  weekNumber: number;
  status: 'completed' | 'current' | 'locked';
  completionPercent?: number;
  objectives?: string[];
}

interface QuestMapProps {
  cycleGoal: string;
  startDate: string;
  endDate: string;
  currentDay: number;
  totalDays: number;
  weeks: WeekData[];
  onWeekClick?: (weekNumber: number) => void;
}

export function QuestMap({
  cycleGoal,
  currentDay,
  totalDays,
  weeks,
  onWeekClick,
}: QuestMapProps) {
  const progressPercent = Math.round((currentDay / totalDays) * 100);

  // Calculate terrain gradient based on progress
  const getTerrainClass = (weekNumber: number) => {
    if (weekNumber <= 4) return 'from-success/20 to-success/5'; // Forest
    if (weekNumber <= 8) return 'from-muted/30 to-muted/10'; // Rocky
    if (weekNumber <= 12) return 'from-accent/20 to-accent/5'; // Mountain
    return 'from-primary/30 to-primary/10'; // Summit
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      {/* Quest Header */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          QUEST: {cycleGoal}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Day {currentDay} of {totalDays}
          </span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium">{progressPercent}%</span>
        </div>
      </div>

      {/* Week Nodes */}
      <div className="relative flex flex-col items-center gap-2">
        {weeks.map((week, index) => (
          <div key={week.weekNumber} className="relative">
            {/* Connecting Line */}
            {index < weeks.length - 1 && (
              <div
                className={cn(
                  "absolute left-1/2 top-full w-0.5 h-6 -translate-x-1/2",
                  week.status === 'completed' ? 'bg-primary' : 'bg-border'
                )}
              />
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => week.status !== 'locked' && onWeekClick?.(week.weekNumber)}
                  disabled={week.status === 'locked'}
                  className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all",
                    week.status === 'completed' && "bg-primary border-primary text-primary-foreground hover:scale-105",
                    week.status === 'current' && "border-primary bg-primary/10 animate-pulse-glow",
                    week.status === 'locked' && "border-border bg-muted/50 opacity-50 cursor-not-allowed"
                  )}
                >
                  {week.status === 'completed' && <Check className="h-5 w-5" />}
                  {week.status === 'current' && <MapPin className="h-5 w-5 text-primary" />}
                  {week.status === 'locked' && <Lock className="h-4 w-4 text-muted-foreground" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-semibold">Week {week.weekNumber}</p>
                {week.status === 'completed' && (
                  <p className="text-xs text-muted-foreground">
                    {week.completionPercent}% completed
                  </p>
                )}
                {week.status === 'current' && (
                  <p className="text-xs text-primary">You are here</p>
                )}
                {week.status === 'locked' && (
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                )}
              </TooltipContent>
            </Tooltip>

            {/* Week Label */}
            <span
              className={cn(
                "absolute left-16 top-1/2 -translate-y-1/2 text-sm whitespace-nowrap",
                week.status === 'current' && "font-semibold text-primary",
                week.status === 'locked' && "text-muted-foreground"
              )}
            >
              Week {week.weekNumber}
              {week.status === 'current' && (
                <span className="ml-2 text-xs">← YOU ARE HERE</span>
              )}
            </span>
          </div>
        ))}

        {/* Quest Complete Node */}
        <div className="relative mt-2">
          <div
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-full border-2",
              progressPercent >= 100
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border bg-muted/50 opacity-50"
            )}
          >
            <span className="text-xl">★</span>
          </div>
          <span className="absolute left-20 top-1/2 -translate-y-1/2 text-sm font-semibold whitespace-nowrap">
            QUEST COMPLETE
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact version for dashboard
export function QuestMapCompact({
  cycleGoal,
  currentDay,
  totalDays,
  currentWeek,
}: {
  cycleGoal: string;
  currentDay: number;
  totalDays: number;
  currentWeek: number;
}) {
  const progressPercent = Math.round((currentDay / totalDays) * 100);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
          {cycleGoal}
        </h3>
        <span className="text-sm text-muted-foreground">Week {currentWeek}</span>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Day {currentDay}</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs font-medium">{progressPercent}%</span>
      </div>

      {/* Mini week indicators */}
      <div className="flex justify-between gap-1">
        {Array.from({ length: 13 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i + 1 < currentWeek && "bg-primary",
              i + 1 === currentWeek && "bg-primary/50 animate-pulse",
              i + 1 > currentWeek && "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
