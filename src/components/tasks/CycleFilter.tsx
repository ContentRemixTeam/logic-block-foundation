import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, Sparkles, User } from 'lucide-react';
import { useActiveCycle, useAllCycles } from '@/hooks/useActiveCycle';
import { format, parseISO } from 'date-fns';

export type CycleFilterValue = 'active' | 'all' | string; // string for specific cycle_id

interface CycleFilterProps {
  value: CycleFilterValue;
  onChange: (value: CycleFilterValue) => void;
  showSystemFilter?: boolean;
  systemOnly?: boolean;
  onSystemOnlyChange?: (value: boolean) => void;
}

export function CycleFilter({
  value,
  onChange,
  showSystemFilter = false,
  systemOnly = false,
  onSystemOnlyChange,
}: CycleFilterProps) {
  const { data: activeCycle, isLoading: loadingActive } = useActiveCycle();
  const { data: allCycles = [], isLoading: loadingAll } = useAllCycles();

  const isLoading = loadingActive || loadingAll;

  const formatCycleLabel = (cycle: { goal: string; start_date: string; end_date: string }) => {
    const start = parseISO(cycle.start_date);
    const end = parseISO(cycle.end_date);
    const goalPreview = cycle.goal.length > 30 ? cycle.goal.slice(0, 30) + '...' : cycle.goal;
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}: ${goalPreview}`;
  };

  const getCurrentLabel = () => {
    if (value === 'active') {
      return activeCycle ? 'Active Cycle' : 'No Active Cycle';
    }
    if (value === 'all') {
      return 'All Cycles';
    }
    const cycle = allCycles.find(c => c.cycle_id === value);
    return cycle ? formatCycleLabel(cycle) : 'Select Cycle';
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger className="w-[200px] h-9">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Filter by cycle">
              {getCurrentLabel()}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Active Cycle
              {activeCycle && (
                <Badge variant="secondary" className="text-xs">Current</Badge>
              )}
            </div>
          </SelectItem>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              All Cycles
            </div>
          </SelectItem>
          {allCycles.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Past Cycles
              </div>
              {allCycles.map(cycle => (
                <SelectItem key={cycle.cycle_id} value={cycle.cycle_id}>
                  {formatCycleLabel(cycle)}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {showSystemFilter && onSystemOnlyChange && (
        <div className="flex items-center gap-1">
          <Button
            variant={systemOnly ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSystemOnlyChange(!systemOnly)}
            className="gap-1.5 h-9"
          >
            <Sparkles className="h-3.5 w-3.5" />
            System
          </Button>
          <Button
            variant={!systemOnly ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSystemOnlyChange(false)}
            className="gap-1.5 h-9"
          >
            <User className="h-3.5 w-3.5" />
            My Tasks
          </Button>
        </div>
      )}
    </div>
  );
}

// Badge to show in headers
export function CycleBadge() {
  const { data: activeCycle } = useActiveCycle();
  
  if (!activeCycle) return null;

  const start = parseISO(activeCycle.start_date);
  const end = parseISO(activeCycle.end_date);

  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <Target className="h-3 w-3" />
      Planning for: {format(start, 'MMM d')} – {format(end, 'MMM d')}
    </Badge>
  );
}
