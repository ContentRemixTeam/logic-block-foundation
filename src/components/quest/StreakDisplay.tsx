import { useTheme } from '@/hooks/useTheme';
import { Flame, FlaskConical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
          <div className="flex items-center gap-1.5 text-sm">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="font-medium">{streak}</span>
            {potions > 0 && (
              <div className="flex items-center gap-0.5 text-muted-foreground">
                <FlaskConical className="h-3 w-3" />
                <span className="text-xs">{potions}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Debrief Streak: {streak} days</p>
          <p className="text-xs text-muted-foreground">Potions: {potions} left this month</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="font-semibold">Daily Debrief Streak</span>
        </div>
        <span className="text-2xl font-bold">{streak}</span>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FlaskConical className="h-4 w-4" />
          <span>Streak Potions: {potions} left</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Longest: {longestStreak} days
        </span>
      </div>
      
      {potions > 0 && (
        <p className="text-xs text-muted-foreground">
          Potions protect your streak for 1 day. Reset monthly.
        </p>
      )}
    </div>
  );
}
