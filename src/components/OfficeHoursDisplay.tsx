import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OfficeHoursDisplayProps {
  officeHoursStart?: string | null;
  officeHoursEnd?: string | null;
  officeHoursDays?: string[] | null;
  variant?: 'compact' | 'full' | 'inline';
  className?: string;
}

const DAY_ABBREV: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

// Convert 24h time to 12h format
function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  
  // Handle HH:MM format
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours)) return time;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  // Only show minutes if not :00
  if (minutes === 0) {
    return `${displayHours}${period}`;
  }
  return `${displayHours}:${String(minutes).padStart(2, '0')}${period}`;
}

export function OfficeHoursDisplay({
  officeHoursStart,
  officeHoursEnd,
  officeHoursDays,
  variant = 'compact',
  className,
}: OfficeHoursDisplayProps) {
  // Don't render if no office hours set
  if (!officeHoursStart && !officeHoursEnd) {
    return null;
  }

  const startFormatted = formatTime(officeHoursStart);
  const endFormatted = formatTime(officeHoursEnd);
  const timeRange = startFormatted && endFormatted 
    ? `${startFormatted} – ${endFormatted}` 
    : startFormatted || endFormatted || 'Not set';

  // Format days
  const daysArray = Array.isArray(officeHoursDays) ? officeHoursDays : [];
  const daysAbbrev = daysArray.map(d => DAY_ABBREV[d] || d.slice(0, 3)).join(', ');
  
  // Check if it's a standard work week (M-F)
  const isStandardWeek = daysArray.length === 5 && 
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].every(d => daysArray.includes(d));

  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Clock className="h-3 w-3" />
        <span>{timeRange}</span>
        {!isStandardWeek && daysArray.length > 0 && (
          <span className="text-foreground-muted">({daysAbbrev})</span>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Badge 
        variant="outline" 
        className={cn("text-xs font-normal gap-1.5", className)}
      >
        <Clock className="h-3 w-3" />
        {timeRange}
      </Badge>
    );
  }

  // Full variant
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/30 border", className)}>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Clock className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Office Hours
          </span>
        </div>
        <p className="text-sm font-medium">{timeRange}</p>
        {daysArray.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {isStandardWeek ? 'Monday – Friday' : daysAbbrev}
          </p>
        )}
      </div>
    </div>
  );
}
