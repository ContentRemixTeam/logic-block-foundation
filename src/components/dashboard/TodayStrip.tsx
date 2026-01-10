import { format } from 'date-fns';
import { Calendar, Target } from 'lucide-react';

interface TodayStripProps {
  topPriority?: string;
}

export function TodayStrip({ topPriority }: TodayStripProps) {
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');

  return (
    <div className="bg-card rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(330,81%,54%)]/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-[hsl(330,81%,54%)]" />
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-foreground-muted">
              TODAY
            </p>
            <p className="text-lg font-semibold">{formattedDate}</p>
          </div>
        </div>
        {topPriority && (
          <div className="text-right max-w-[50%]">
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-foreground-muted flex items-center gap-1 justify-end">
              <Target className="h-3 w-3" />
              YOUR FOCUS
            </p>
            <p className="text-sm text-foreground-muted truncate">{topPriority}</p>
          </div>
        )}
      </div>
    </div>
  );
}
