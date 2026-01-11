import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { Sword, Star, Sparkles } from 'lucide-react';

interface QuestDividerProps {
  className?: string;
  variant?: 'sword' | 'star' | 'sparkle' | 'simple';
}

export function QuestDivider({ 
  className,
  variant = 'star'
}: QuestDividerProps) {
  const { isQuestMode } = useTheme();
  
  if (!isQuestMode) {
    return <div className={cn("h-px bg-border my-4", className)} />;
  }

  const renderIcon = () => {
    switch (variant) {
      case 'sword':
        return (
          <div className="flex items-center gap-1">
            <Sword className="h-3 w-3 text-quest-gold rotate-45" />
            <Sword className="h-3 w-3 text-quest-gold -rotate-45 -scale-x-100" />
          </div>
        );
      case 'sparkle':
        return <Sparkles className="h-4 w-4 text-quest-gold" />;
      case 'simple':
        return <span className="text-quest-gold">◆</span>;
      case 'star':
      default:
        return (
          <div className="flex items-center gap-1">
            <span className="text-quest-gold/60 text-xs">✦</span>
            <Star className="h-3 w-3 text-quest-gold fill-quest-gold" />
            <span className="text-quest-gold/60 text-xs">✦</span>
          </div>
        );
    }
  };

  return (
    <div className={cn("flex items-center gap-3 my-6", className)}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-quest-gold/40 to-quest-gold/60" />
      {renderIcon()}
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-quest-gold/40 to-quest-gold/60" />
    </div>
  );
}
