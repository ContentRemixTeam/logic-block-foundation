import { useTheme } from '@/hooks/useTheme';
import { Flame, FlaskConical, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StreakDisplayProps {
  compact?: boolean;
}

export function StreakDisplay({ compact = false }: StreakDisplayProps) {
  const { isQuestMode, streak, longestStreak, potions } = useTheme();

  if (!isQuestMode) return null;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-quest-gold/10 to-quest-gold/5 border border-quest-gold/20">
            {/* Animated Flame */}
            <div className="relative">
              <Flame className="h-5 w-5 text-quest-gold quest-flame animate-flame-flicker" />
              {streak >= 7 && (
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-quest-gold animate-sparkle" />
              )}
            </div>
            
            <span className="font-cinzel font-bold text-quest-gold">{streak}</span>
            
            {/* Potion indicator */}
            {potions > 0 && (
              <div className="flex items-center gap-0.5 pl-1 border-l border-quest-gold/30">
                <FlaskConical className="h-3.5 w-3.5 text-quest-emerald quest-potion" />
                <span className="text-xs font-medium text-quest-emerald">{potions}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="font-semibold">🔥 Debrief Streak: {streak} days</p>
          <p className="text-xs text-muted-foreground">Best: {longestStreak} days</p>
          <p className="text-xs text-muted-foreground">Potions: {potions} remaining</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative rounded-xl border-2 border-quest-gold/30 bg-gradient-to-br from-amber-50 to-yellow-50/50 p-4 overflow-hidden">
      {/* Background flame effect */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-t from-quest-gold/10 to-transparent rounded-full blur-xl" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Animated Flame Icon */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-quest-gold to-quest-copper flex items-center justify-center shadow-lg">
              <Flame className="h-7 w-7 text-white animate-flame-flicker" />
            </div>
            {streak >= 7 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-quest-gold flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          
          <div>
            <h3 className="font-cinzel font-semibold text-foreground">Daily Debrief Streak</h3>
            <p className="text-xs text-muted-foreground">Keep the fire burning!</p>
          </div>
        </div>
        
        {/* Streak Number */}
        <div className="text-right">
          <span className="font-cinzel text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-quest-gold to-quest-copper">
            {streak}
          </span>
          <p className="text-xs text-muted-foreground">days</p>
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="mt-4 pt-3 border-t border-quest-gold/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Potions */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "relative transition-all",
                  i < potions ? "opacity-100" : "opacity-30"
                )}
              >
                <FlaskConical 
                  className={cn(
                    "h-5 w-5",
                    i < potions ? "text-quest-emerald quest-potion" : "text-gray-400"
                  )} 
                />
                {i < potions && (
                  <div className="absolute inset-0 bg-quest-emerald/20 rounded-full blur-sm" />
                )}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-1">Potions</span>
          </div>
        </div>
        
        {/* Longest Streak */}
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Longest: </span>
          <span className="text-sm font-semibold text-quest-gold">{longestStreak} days</span>
        </div>
      </div>
      
      {/* Potion Info */}
      {potions > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground text-center">
          ✨ Potions protect your streak for 1 day when you miss a debrief. Resets monthly.
        </p>
      )}
    </div>
  );
}
