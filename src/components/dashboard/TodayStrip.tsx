import { format } from 'date-fns';
import { Calendar, Target } from 'lucide-react';
import { OfficeHoursDisplay } from '@/components/OfficeHoursDisplay';

interface TodayStripProps {
  topPriority?: string;
  officeHoursStart?: string | null;
  officeHoursEnd?: string | null;
  officeHoursDays?: string[] | null;
}

export function TodayStrip({ topPriority, officeHoursStart, officeHoursEnd, officeHoursDays }: TodayStripProps) {
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');

  return (
    <div className="bg-card rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-foreground-muted">
              TODAY
            </p>
            <p className="text-lg font-semibold">{formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Office Hours Badge */}
          <OfficeHoursDisplay
            officeHoursStart={officeHoursStart}
            officeHoursEnd={officeHoursEnd}
            officeHoursDays={officeHoursDays}
            variant="compact"
          />
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
    </div>
  );
}
