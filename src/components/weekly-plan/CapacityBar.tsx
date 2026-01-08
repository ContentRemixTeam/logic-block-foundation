import { cn } from '@/lib/utils';

interface CapacityBarProps {
  usedMinutes: number;
  capacityMinutes: number;
  showLabel?: boolean;
}

export function CapacityBar({ usedMinutes, capacityMinutes, showLabel = true }: CapacityBarProps) {
  const percentage = capacityMinutes > 0 ? Math.min((usedMinutes / capacityMinutes) * 100, 150) : 0;
  
  const getColor = () => {
    if (percentage > 100) return 'bg-destructive';
    if (percentage > 80) return 'bg-warning';
    return 'bg-success';
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300", getColor())}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground text-center">
          {formatDuration(usedMinutes)} / {formatDuration(capacityMinutes)}
        </p>
      )}
    </div>
  );
}
