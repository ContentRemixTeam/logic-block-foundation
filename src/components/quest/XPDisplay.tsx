import { useTheme } from '@/hooks/useTheme';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface XPDisplayProps {
  compact?: boolean;
}

export function XPDisplay({ compact = false }: XPDisplayProps) {
  const { isQuestMode, level, levelTitle, currentLevelXP, xpToNextLevel } = useTheme();

  if (!isQuestMode) return null;

  const progressPercent = xpToNextLevel > 0 ? (currentLevelXP / xpToNextLevel) * 100 : 0;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-quest-gold/10 to-quest-gold/5 border border-quest-gold/20">
            {/* Mini Shield */}
            <div className="relative">
              <div className="w-7 h-8 bg-gradient-to-b from-quest-gold to-quest-copper rounded-t-sm"
                   style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}>
                <div className="absolute inset-0.5 bg-gradient-to-b from-[hsl(30,40%,22%)] to-[hsl(25,35%,15%)] flex items-center justify-center"
                     style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}>
                  <span className="text-xs font-bold text-quest-gold font-cinzel">{level}</span>
                </div>
              </div>
            </div>
            
            {/* XP Bar */}
            <div className="flex-1 min-w-[60px]">
              <div className="h-1.5 bg-[hsl(40,20%,88%)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-quest-gold via-quest-gold-light to-quest-gold rounded-full transition-all duration-500"
                  style={{ 
                    width: `${progressPercent}%`,
                    boxShadow: '0 0 6px hsl(45 93% 50% / 0.5)'
                  }}
                />
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-cinzel">
          <p className="font-semibold">{levelTitle}</p>
          <p className="text-xs text-muted-foreground">{currentLevelXP} / {xpToNextLevel} XP to Level {level + 1}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative rounded-xl border-2 border-quest-gold/30 bg-gradient-to-br from-[hsl(40,30%,98%)] to-[hsl(38,25%,94%)] p-4 overflow-hidden">
      {/* Decorative corners */}
      <div className="absolute top-1 left-2 text-quest-gold/40 text-xs">✦</div>
      <div className="absolute top-1 right-2 text-quest-gold/40 text-xs">✦</div>
      
      <div className="flex items-start gap-4">
        {/* Shield Level Display */}
        <div className="quest-shield flex flex-col items-center">
          <div className="quest-shield-body">
            <div className="quest-shield-inner">
              <span className="font-cinzel text-xl font-bold text-quest-gold">{level}</span>
            </div>
          </div>
          <div className="mt-1 px-3 py-0.5 bg-quest-copper/80 rounded-sm">
            <span className="text-[10px] font-semibold text-white uppercase tracking-wider">
              Level
            </span>
          </div>
        </div>
        
        {/* XP Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-cinzel font-semibold text-[hsl(30,50%,25%)]">{levelTitle}</span>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-quest-gold" />
              <span className="text-xs font-medium text-quest-gold">{progressPercent.toFixed(0)}%</span>
            </div>
          </div>
          
          {/* XP Progress Bar */}
          <div className="relative h-3 bg-[hsl(40,20%,88%)] rounded-full overflow-hidden border border-quest-gold/20">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-quest-gold via-quest-gold-light to-quest-gold rounded-full transition-all duration-500"
              style={{ 
                width: `${progressPercent}%`,
                boxShadow: '0 0 8px hsl(45 93% 50% / 0.5), inset 0 1px 0 hsl(45 100% 80%)'
              }}
            />
            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{currentLevelXP} XP</span>
            <span className="text-muted-foreground">{xpToNextLevel} XP</span>
          </div>
        </div>
      </div>
      
      {/* Next level preview */}
      <div className="mt-3 pt-3 border-t border-quest-gold/20 flex items-center justify-center gap-2">
        <Star className="h-3 w-3 text-quest-gold/60" />
        <span className="text-xs text-muted-foreground">
          {xpToNextLevel - currentLevelXP} XP until next level
        </span>
        <Star className="h-3 w-3 text-quest-gold/60" />
      </div>
    </div>
  );
}
