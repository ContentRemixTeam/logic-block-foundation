import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { Sword, Scroll, Crown, Shield, Star } from 'lucide-react';

interface QuestHeaderProps {
  title: string;
  subtitle?: string;
  icon?: 'sword' | 'scroll' | 'crown' | 'shield' | 'star';
  className?: string;
}

const iconMap = {
  sword: Sword,
  scroll: Scroll,
  crown: Crown,
  shield: Shield,
  star: Star,
};

export function QuestHeader({ 
  title, 
  subtitle, 
  icon = 'sword',
  className 
}: QuestHeaderProps) {
  const { isQuestMode } = useTheme();
  
  if (!isQuestMode) {
    return (
      <div className={cn("mb-6", className)}>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    );
  }

  const IconComponent = iconMap[icon];

  return (
    <div className={cn("relative py-6 mb-6", className)}>
      {/* Decorative Top Border */}
      <div className="quest-divider flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-quest-gold to-transparent" />
        <div className="relative">
          <IconComponent className="h-5 w-5 text-quest-gold rotate-45 drop-shadow-sm" />
          <div className="absolute inset-0 animate-sparkle">
            <Star className="h-5 w-5 text-quest-gold-light opacity-50" />
          </div>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-quest-gold to-transparent" />
      </div>
      
      {/* Title with Fantasy Styling */}
      <h1 className="font-cinzel text-3xl font-bold text-center tracking-wide text-[hsl(30,50%,22%)]">
        {title}
      </h1>
      
      {/* Subtitle */}
      {subtitle && (
        <p className="text-center text-muted-foreground mt-2 italic font-serif">
          "{subtitle}"
        </p>
      )}

      {/* Decorative Bottom Border */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <div className="w-8 h-px bg-gradient-to-r from-transparent to-quest-gold/50" />
        <span className="text-quest-gold text-xs">✦</span>
        <div className="w-16 h-0.5 bg-quest-gold/30 rounded-full" />
        <span className="text-quest-gold text-xs">✦</span>
        <div className="w-8 h-px bg-gradient-to-l from-transparent to-quest-gold/50" />
      </div>
    </div>
  );
}
