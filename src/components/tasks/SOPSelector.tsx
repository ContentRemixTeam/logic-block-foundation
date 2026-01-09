import { useSOPs } from '@/hooks/useSOPs';
import { SOP } from '@/components/tasks/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SOPSelectorProps {
  value: string | null;
  onChange: (sopId: string | null) => void;
  size?: 'sm' | 'default';
  className?: string;
}

export function SOPSelector({ value, onChange, size = 'default', className }: SOPSelectorProps) {
  const { data: sops = [], isLoading } = useSOPs();

  const selectedSop = sops.find(s => s.sop_id === value);

  return (
    <Select
      value={value || ''}
      onValueChange={(val) => onChange(val || null)}
    >
      <SelectTrigger 
        className={cn(
          size === 'sm' ? 'h-7 border-0 shadow-none p-0' : '',
          className
        )}
      >
        {selectedSop ? (
          <div className="flex items-center gap-2 truncate">
            <ClipboardList className="h-3 w-3 text-primary flex-shrink-0" />
            <span className={cn('truncate', size === 'sm' && 'text-sm')}>
              {selectedSop.sop_name}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">
            {isLoading ? 'Loading...' : '—'}
          </span>
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {sops.map(sop => (
          <SelectItem key={sop.sop_id} value={sop.sop_id}>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span>{sop.sop_name}</span>
                {sop.description && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {sop.description}
                  </span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
        {sops.length === 0 && !isLoading && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No SOPs created yet
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
