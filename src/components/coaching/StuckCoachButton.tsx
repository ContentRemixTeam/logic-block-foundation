/**
 * Stuck? Coach Yourself Button
 * Reusable button that opens the coaching modal
 */

import { Sparkles } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StuckCoachButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => void;
  compact?: boolean;
}

export function StuckCoachButton({ 
  onClick, 
  compact = false, 
  className,
  variant = 'outline',
  size = compact ? 'sm' : 'default',
  ...props 
}: StuckCoachButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={cn(
        'gap-2',
        compact && 'text-xs h-7 px-2',
        className
      )}
      {...props}
    >
      <Sparkles className={cn('text-primary', compact ? 'h-3 w-3' : 'h-4 w-4')} />
      {compact ? 'Coach' : 'Stuck? Coach Yourself'}
    </Button>
  );
}
