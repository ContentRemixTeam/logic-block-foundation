import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface PeriodSelectorProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType, startDate: Date, endDate: Date) => void;
  className?: string;
}

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];

export function getDateRangeForPeriod(period: PeriodType, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom':
      return { 
        start: customStart || subDays(now, 30), 
        end: customEnd || now 
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function PeriodSelector({ selectedPeriod, onPeriodChange, className }: PeriodSelectorProps) {
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePeriodClick = (period: PeriodType) => {
    if (period === 'custom') {
      setCalendarOpen(true);
      return;
    }
    
    const { start, end } = getDateRangeForPeriod(period);
    onPeriodChange(period, start, end);
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      onPeriodChange('custom', range.from, range.to);
      setCalendarOpen(false);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {PERIOD_OPTIONS.map((option) => (
        option.value === 'custom' ? (
          <Popover key={option.value} open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                {selectedPeriod === 'custom' && customRange?.from && customRange?.to
                  ? `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`
                  : 'Custom'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={customRange}
                onSelect={handleCustomRangeSelect}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            key={option.value}
            variant={selectedPeriod === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodClick(option.value)}
          >
            {option.label}
          </Button>
        )
      ))}
    </div>
  );
}
