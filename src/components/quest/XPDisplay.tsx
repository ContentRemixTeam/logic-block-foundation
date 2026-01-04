import { useTheme } from '@/hooks/useTheme';
import { Progress } from '@/components/ui/progress';
import { Sparkles } from 'lucide-react';

interface XPDisplayProps {
  compact?: boolean;
}

export function XPDisplay({ compact = false }: XPDisplayProps) {
  const { isQuestMode, level, levelTitle, currentLevelXP, xpToNextLevel } = useTheme();

  if (!isQuestMode) return null;

  const progressPercent = (currentLevelXP / xpToNextLevel) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium">Lv.{level}</span>
        <div className="w-16">
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold">Level {level}</span>
        </div>
        <span className="text-sm text-muted-foreground">{levelTitle}</span>
      </div>
      <div className="space-y-1">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentLevelXP} XP</span>
          <span>{xpToNextLevel} XP</span>
        </div>
      </div>
    </div>
  );
}
