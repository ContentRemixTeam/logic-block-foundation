import { Flame, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function StreakBadge({ streak, size = 'md', showLabel = false, className }: StreakBadgeProps) {
  if (streak === 0) return null;

  const getStreakLevel = () => {
    if (streak >= 30) return 'legendary';
    if (streak >= 14) return 'epic';
    if (streak >= 7) return 'great';
    return 'starter';
  };

  const level = getStreakLevel();

  const sizeClasses = {
    sm: 'text-xs gap-0.5',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1.5',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  };

  const levelStyles = {
    starter: 'text-orange-500',
    great: 'text-amber-500',
    epic: 'text-yellow-400',
    legendary: 'text-purple-500',
  };

  const getMessage = () => {
    if (streak >= 30) return '30-day warrior!';
    if (streak >= 14) return 'On fire!';
    if (streak >= 7) return 'One week strong!';
    if (streak >= 3) return 'Building momentum!';
    return 'Keep going!';
  };

  return (
    <div
      className={cn(
        'inline-flex items-center font-semibold',
        sizeClasses[size],
        levelStyles[level],
        className
      )}
    >
      {level === 'legendary' && (
        <Trophy size={iconSizes[size]} className="animate-pulse" />
      )}
      <Flame
        size={iconSizes[size]}
        className={cn(
          'transition-transform',
          streak >= 7 && 'animate-flame-pulse'
        )}
      />
      {level === 'epic' && (
        <Sparkles size={iconSizes[size] - 2} className="animate-pulse" />
      )}
      <span>{streak}</span>
      {showLabel && (
        <span className="text-muted-foreground font-normal ml-1">
          {getMessage()}
        </span>
      )}
    </div>
  );
}
