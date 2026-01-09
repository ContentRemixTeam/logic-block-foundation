import { useState } from 'react';
import { CustomField } from '@/hooks/useProjectCustomFields';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CustomFieldCellProps {
  field: CustomField;
  value: any;
  onUpdate: (value: any) => void;
  className?: string;
}

export function CustomFieldCell({ field, value, onUpdate, className }: CustomFieldCellProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = () => {
    if (localValue !== value) {
      onUpdate(localValue);
    }
  };

  const cellClass = cn('px-3 py-2 border-r flex items-center', className);
  const width = 120;

  switch (field.field_type) {
    case 'text':
      return (
        <div className={cellClass} style={{ width, minWidth: width }} onClick={(e) => e.stopPropagation()}>
          <Input
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            className="h-7 border-0 shadow-none p-0 text-sm"
            placeholder="—"
          />
        </div>
      );

    case 'number':
      return (
        <div className={cellClass} style={{ width, minWidth: width }} onClick={(e) => e.stopPropagation()}>
          <Input
            type="number"
            value={localValue ?? ''}
            onChange={(e) => setLocalValue(e.target.value ? parseFloat(e.target.value) : null)}
            onBlur={handleBlur}
            className="h-7 border-0 shadow-none p-0 text-sm"
            placeholder="—"
          />
        </div>
      );

    case 'select':
      return (
        <div className={cellClass} style={{ width, minWidth: width }} onClick={(e) => e.stopPropagation()}>
          <Select
            value={value || ''}
            onValueChange={(val) => onUpdate(val || null)}
          >
            <SelectTrigger className="h-7 border-0 shadow-none p-0 w-full">
              {value ? (
                <span className="text-sm">{value}</span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {(field.field_options || []).map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'date':
      return (
        <div className={cellClass} style={{ width, minWidth: width }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-7 px-0 w-full justify-start text-left font-normal">
                {value ? (
                  <span className="text-sm">{format(new Date(value), 'MMM d')}</span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => onUpdate(date ? format(date, 'yyyy-MM-dd') : null)}
              />
            </PopoverContent>
          </Popover>
        </div>
      );

    case 'checkbox':
      return (
        <div className={cellClass} style={{ width, minWidth: width }} onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => onUpdate(checked)}
          />
        </div>
      );

    default:
      return (
        <div className={cellClass} style={{ width, minWidth: width }}>
          <span className="text-muted-foreground text-xs">—</span>
        </div>
      );
  }
}
