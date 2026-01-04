import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarDays, CalendarRange, Grid3X3 } from 'lucide-react';

export type TimelineViewType = 'day' | '3-day' | 'week' | 'month';

interface TimelineViewSelectorProps {
  viewType: TimelineViewType;
  onViewTypeChange: (type: TimelineViewType) => void;
}

export function TimelineViewSelector({
  viewType,
  onViewTypeChange,
}: TimelineViewSelectorProps) {
  const viewOptions = [
    { value: 'day', label: 'Day View', icon: Calendar },
    { value: '3-day', label: '3-Day View', icon: CalendarDays },
    { value: 'week', label: 'Week View', icon: CalendarRange },
    { value: 'month', label: 'Month View', icon: Grid3X3 },
  ];

  return (
    <Select value={viewType} onValueChange={(v) => onViewTypeChange(v as TimelineViewType)}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {viewOptions.map(option => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <option.icon className="h-4 w-4" />
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
