import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface CapacityIndicatorProps {
  plannedMinutes: number;
  capacityMinutes: number;
  completedMinutes?: number;
  className?: string;
}

export function CapacityIndicator({ 
  plannedMinutes, 
  capacityMinutes, 
  completedMinutes = 0,
  className 
}: CapacityIndicatorProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const usagePercent = Math.min((plannedMinutes / capacityMinutes) * 100, 100);
  const overCapacity = plannedMinutes > capacityMinutes;
  const overAmount = plannedMinutes - capacityMinutes;

  const getStatusColor = () => {
    if (overCapacity) return 'text-destructive';
    if (usagePercent > 80) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = () => {
    if (overCapacity) return 'bg-destructive';
    if (usagePercent > 80) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Daily Capacity</span>
        </div>
        <div className={cn("flex items-center gap-1.5 font-medium", getStatusColor())}>
          {overCapacity ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              <span>{formatTime(overAmount)} over</span>
            </>
          ) : usagePercent > 80 ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              <span>Almost full</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>{formatTime(capacityMinutes - plannedMinutes)} available</span>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Progress 
          value={usagePercent} 
          className="h-2"
        />
        {/* Completed overlay */}
        {completedMinutes > 0 && (
          <div 
            className="absolute top-0 left-0 h-2 rounded-full bg-primary/30"
            style={{ width: `${Math.min((completedMinutes / capacityMinutes) * 100, 100)}%` }}
          />
        )}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {formatTime(plannedMinutes)} planned
          {completedMinutes > 0 && ` • ${formatTime(completedMinutes)} done`}
        </span>
        <span>{formatTime(capacityMinutes)} capacity</span>
      </div>
    </div>
  );
}
