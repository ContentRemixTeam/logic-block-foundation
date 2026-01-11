import { Check, Lock, MapPin, Flag, Trophy, Star, Mountain, TreePine, Castle } from 'lucide-react';
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

  // Get terrain icon based on week
  const getTerrainIcon = (weekNumber: number) => {
    if (weekNumber <= 4) return TreePine;
    if (weekNumber <= 8) return Mountain;
    return Castle;
  };

  // Get terrain name based on week
  const getTerrainName = (weekNumber: number) => {
    if (weekNumber <= 4) return "The Verdant Woods";
    if (weekNumber <= 8) return "The Stone Peaks";
    return "The Summit Kingdom";
  };

  return (
    <div className="relative rounded-xl border-2 border-quest-gold/30 bg-gradient-to-br from-[hsl(40,35%,97%)] to-[hsl(38,25%,93%)] p-6 overflow-hidden">
      {/* Decorative Corners */}
      <div className="absolute top-2 left-3 text-quest-gold text-sm">✦</div>
      <div className="absolute top-2 right-3 text-quest-gold text-sm">✦</div>
      <div className="absolute bottom-2 left-3 text-quest-gold text-sm">✦</div>
      <div className="absolute bottom-2 right-3 text-quest-gold text-sm">✦</div>

      {/* Quest Header */}
      <div className="relative space-y-4 mb-6">
        <div className="text-center">
          <h2 className="font-cinzel text-xl font-bold text-[hsl(30,50%,22%)] tracking-wide">
            ⚔️ THE QUEST ⚔️
          </h2>
          <p className="font-serif italic text-muted-foreground mt-1">"{cycleGoal}"</p>
        </div>
        
        {/* Progress Banner */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-quest-gold/10 via-quest-gold/20 to-quest-gold/10 rounded-lg border border-quest-gold/20">
          <Flag className="h-4 w-4 text-quest-gold" />
          <span className="text-sm font-medium text-[hsl(30,50%,30%)]">
            Day {currentDay} of {totalDays}
          </span>
          <div className="flex-1 h-2.5 bg-[hsl(40,20%,88%)] rounded-full overflow-hidden border border-quest-gold/20">
            <div
              className="h-full bg-gradient-to-r from-quest-gold via-quest-gold-light to-quest-gold transition-all duration-700 rounded-full"
              style={{ 
                width: `${progressPercent}%`,
                boxShadow: '0 0 8px hsl(45 93% 50% / 0.5)'
              }}
            />
          </div>
          <span className="text-sm font-bold text-quest-gold">{progressPercent}%</span>
        </div>
      </div>

      {/* Quest Map - Horizontal Path */}
      <div className="relative">
        {/* Path Background */}
        <div className="absolute top-1/2 left-4 right-4 h-2 bg-[hsl(40,20%,85%)] rounded-full -translate-y-1/2" />
        <div 
          className="absolute top-1/2 left-4 h-2 bg-gradient-to-r from-quest-gold to-quest-gold-light rounded-full -translate-y-1/2 transition-all duration-700"
          style={{ 
            width: `calc(${Math.min(progressPercent, 100)}% - 2rem)`,
            boxShadow: '0 0 6px hsl(45 93% 50% / 0.4)'
          }}
        />

        {/* Week Nodes */}
        <div className="relative flex justify-between items-center py-8 px-2">
          {weeks.slice(0, 13).map((week, index) => {
            const TerrainIcon = getTerrainIcon(week.weekNumber);
            const isCheckpoint = week.weekNumber % 4 === 0;
            
            return (
              <Tooltip key={week.weekNumber}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => week.status !== 'locked' && onWeekClick?.(week.weekNumber)}
                    disabled={week.status === 'locked'}
                    className={cn(
                      "relative flex flex-col items-center gap-1 transition-all quest-map-node",
                      week.status !== 'locked' && "hover:scale-110",
                      week.status === 'current' && "quest-map-node-current"
                    )}
                  >
                    {/* Node Circle */}
                    <div
                      className={cn(
                        "relative flex items-center justify-center rounded-full border-2 transition-all",
                        isCheckpoint ? "w-10 h-10" : "w-7 h-7",
                        week.status === 'completed' && "bg-gradient-to-br from-quest-gold to-quest-copper border-quest-gold text-white shadow-md",
                        week.status === 'current' && "bg-white border-quest-gold shadow-lg animate-quest-pulse-glow",
                        week.status === 'locked' && "bg-[hsl(40,15%,90%)] border-[hsl(40,10%,75%)] opacity-50"
                      )}
                    >
                      {week.status === 'completed' && (
                        isCheckpoint ? <Flag className="h-4 w-4" /> : <Check className="h-3 w-3" />
                      )}
                      {week.status === 'current' && (
                        <MapPin className="h-4 w-4 text-quest-gold" />
                      )}
                      {week.status === 'locked' && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>

                    {/* Week Label */}
                    <span 
                      className={cn(
                        "text-[10px] font-medium whitespace-nowrap",
                        week.status === 'current' && "text-quest-gold font-bold",
                        week.status === 'locked' && "text-muted-foreground"
                      )}
                    >
                      W{week.weekNumber}
                    </span>

                    {/* Current indicator */}
                    {week.status === 'current' && (
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                        <span className="text-quest-gold text-xs font-semibold">▲</span>
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="flex items-center gap-2">
                    <TerrainIcon className="h-4 w-4 text-quest-gold" />
                    <p className="font-cinzel font-semibold">Week {week.weekNumber}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{getTerrainName(week.weekNumber)}</p>
                  {week.status === 'completed' && week.completionPercent && (
                    <p className="text-xs text-quest-gold mt-1">✓ {week.completionPercent}% completed</p>
                  )}
                  {week.status === 'current' && (
                    <p className="text-xs text-quest-gold mt-1">📍 You are here</p>
                  )}
                  {week.status === 'locked' && (
                    <p className="text-xs text-muted-foreground mt-1">🔒 Upcoming</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Final Trophy */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all",
                  progressPercent >= 100 
                    ? "bg-gradient-to-br from-quest-gold to-quest-copper border-quest-gold text-white shadow-lg animate-quest-pulse-glow"
                    : "bg-[hsl(40,15%,90%)] border-[hsl(40,10%,75%)] opacity-50"
                )}
              >
                <Trophy className={cn(
                  "h-6 w-6",
                  progressPercent >= 100 ? "text-white" : "text-muted-foreground"
                )} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-cinzel font-semibold">🏆 Quest Complete!</p>
              <p className="text-xs text-muted-foreground">Achieve 100% to claim victory</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Terrain Legend */}
      <div className="mt-4 pt-4 border-t border-quest-gold/20 flex justify-center gap-6">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TreePine className="h-3.5 w-3.5 text-quest-forest" />
          <span>Weeks 1-4</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mountain className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Weeks 5-8</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Castle className="h-3.5 w-3.5 text-quest-purple" />
          <span>Weeks 9-13</span>
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
    <div className="relative rounded-xl border-2 border-quest-gold/30 bg-gradient-to-br from-[hsl(40,30%,98%)] to-[hsl(38,25%,94%)] p-4 overflow-hidden">
      {/* Decorative corners */}
      <div className="absolute top-1 left-2 text-quest-gold/40 text-xs">✦</div>
      <div className="absolute top-1 right-2 text-quest-gold/40 text-xs">✦</div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cinzel font-semibold text-[hsl(30,50%,22%)] truncate flex-1 mr-2">
          {cycleGoal}
        </h3>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-quest-gold/10 rounded-full border border-quest-gold/20">
          <MapPin className="h-3 w-3 text-quest-gold" />
          <span className="text-xs font-medium text-quest-gold">Week {currentWeek}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-muted-foreground">Day {currentDay}</span>
        <div className="flex-1 h-2 bg-[hsl(40,20%,88%)] rounded-full overflow-hidden border border-quest-gold/20">
          <div
            className="h-full bg-gradient-to-r from-quest-gold via-quest-gold-light to-quest-gold transition-all duration-500 rounded-full"
            style={{ 
              width: `${progressPercent}%`,
              boxShadow: '0 0 6px hsl(45 93% 50% / 0.4)'
            }}
          />
        </div>
        <span className="text-xs font-bold text-quest-gold">{progressPercent}%</span>
      </div>

      {/* Mini week indicators */}
      <div className="flex justify-between gap-0.5">
        {Array.from({ length: 13 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-all",
              i + 1 < currentWeek && "bg-gradient-to-r from-quest-gold to-quest-copper",
              i + 1 === currentWeek && "bg-quest-gold animate-quest-pulse-glow",
              i + 1 > currentWeek && "bg-[hsl(40,15%,85%)]"
            )}
          />
        ))}
      </div>
      
      {/* Terrain markers */}
      <div className="flex justify-between mt-1 px-0.5">
        <TreePine className="h-3 w-3 text-quest-forest/60" />
        <Mountain className="h-3 w-3 text-muted-foreground/40" />
        <Castle className="h-3 w-3 text-quest-purple/60" />
        <Trophy className="h-3 w-3 text-quest-gold/60" />
      </div>
    </div>
  );
}
