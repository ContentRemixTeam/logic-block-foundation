import { cn } from '@/lib/utils';

interface HabitProgressRingProps {
  completed: number;
  total: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function HabitProgressRing({
  completed,
  total,
  size = 'md',
  showLabel = true,
  className,
}: HabitProgressRingProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sizeConfig = {
    sm: { dimension: 40, strokeWidth: 4, fontSize: 'text-xs' },
    md: { dimension: 56, strokeWidth: 5, fontSize: 'text-sm' },
    lg: { dimension: 72, strokeWidth: 6, fontSize: 'text-base' },
  };

  const config = sizeConfig[size];
  const radius = (config.dimension - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 100) return 'text-green-500';
    if (percentage >= 70) return 'text-primary';
    if (percentage >= 40) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={config.dimension}
        height={config.dimension}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn('transition-all duration-500', getColor())}
        />
      </svg>
      {showLabel && (
        <div className={cn('absolute inset-0 flex flex-col items-center justify-center', config.fontSize)}>
          <span className="font-semibold">{completed}/{total}</span>
        </div>
      )}
    </div>
  );
}
