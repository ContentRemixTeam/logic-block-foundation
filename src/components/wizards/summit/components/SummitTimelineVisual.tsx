import { SummitWizardData } from '@/types/summit';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';

interface Props {
  data: SummitWizardData;
}

export function SummitTimelineVisual({ data }: Props) {
  const { registrationOpens, summitStartDate, summitEndDate, cartCloses } = data;

  // Parse dates
  const dates = {
    regOpens: registrationOpens ? parseISO(registrationOpens) : null,
    start: summitStartDate ? parseISO(summitStartDate) : null,
    end: summitEndDate ? parseISO(summitEndDate) : null,
    cartClose: cartCloses ? parseISO(cartCloses) : null,
  };

  // Check if we have enough dates to show timeline
  const hasMinDates = dates.start && isValid(dates.start);
  
  if (!hasMinDates) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          Set your summit dates below to see the visual timeline
        </p>
      </div>
    );
  }

  // Calculate phase lengths
  const prepDays = dates.regOpens && dates.start 
    ? Math.max(0, differenceInDays(dates.start, dates.regOpens)) 
    : 14;
  
  const liveDays = dates.start && dates.end 
    ? Math.max(1, differenceInDays(dates.end, dates.start) + 1) 
    : 5;

  const replayDays = dates.end && dates.cartClose 
    ? Math.max(0, differenceInDays(dates.cartClose, dates.end)) 
    : 7;

  const totalDays = prepDays + liveDays + replayDays;

  // Calculate widths as percentages
  const prepWidth = Math.max(15, (prepDays / totalDays) * 100);
  const liveWidth = Math.max(20, (liveDays / totalDays) * 100);
  const replayWidth = Math.max(15, (replayDays / totalDays) * 100);

  // Normalize to 100%
  const total = prepWidth + liveWidth + replayWidth;
  const normalizedPrep = (prepWidth / total) * 100;
  const normalizedLive = (liveWidth / total) * 100;
  const normalizedReplay = (replayWidth / total) * 100;

  return (
    <div className="space-y-2">
      {/* Timeline Bar */}
      <div className="flex h-10 rounded-lg overflow-hidden border">
        {/* Prep/Registration Phase */}
        <div 
          className="bg-blue-500/20 border-r border-blue-500/30 flex items-center justify-center"
          style={{ width: `${normalizedPrep}%` }}
        >
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate px-1">
            Registration
          </span>
        </div>

        {/* Summit Live */}
        <div 
          className="bg-green-500/30 border-r border-green-500/40 flex items-center justify-center"
          style={{ width: `${normalizedLive}%` }}
        >
          <span className="text-xs font-medium text-green-700 dark:text-green-300 truncate px-1">
            🎉 Summit Live
          </span>
        </div>

        {/* Replay/Cart Close */}
        <div 
          className="bg-orange-500/20 flex items-center justify-center"
          style={{ width: `${normalizedReplay}%` }}
        >
          <span className="text-xs font-medium text-orange-700 dark:text-orange-300 truncate px-1">
            Replay Period
          </span>
        </div>
      </div>

      {/* Date Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {dates.regOpens && isValid(dates.regOpens) 
            ? format(dates.regOpens, 'MMM d') 
            : 'Reg Opens'}
        </span>
        <span>
          {dates.start && isValid(dates.start) 
            ? format(dates.start, 'MMM d') 
            : 'Start'}
        </span>
        <span>
          {dates.end && isValid(dates.end) 
            ? format(dates.end, 'MMM d') 
            : 'End'}
        </span>
        <span>
          {dates.cartClose && isValid(dates.cartClose) 
            ? format(dates.cartClose, 'MMM d') 
            : 'Cart Close'}
        </span>
      </div>

      {/* Duration Summary */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-1">
        <span>{prepDays} days registration</span>
        <span>•</span>
        <span>{liveDays} days live</span>
        <span>•</span>
        <span>{replayDays} days replay</span>
      </div>
    </div>
  );
}
