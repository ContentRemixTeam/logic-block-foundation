import { CalendarDays, List, KanbanSquare, LayoutGrid, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type CalendarViewMode = 'calendar' | 'list' | 'pipeline' | 'gallery' | 'campaign';

const MODES: { value: CalendarViewMode; label: string; icon: typeof CalendarDays }[] = [
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
  { value: 'list', label: 'List', icon: List },
  { value: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { value: 'gallery', label: 'Gallery', icon: LayoutGrid },
  { value: 'campaign', label: 'Campaign', icon: Rocket },
];

interface Props {
  mode: CalendarViewMode;
  onChange: (mode: CalendarViewMode) => void;
}

export function CalendarViewModeSwitcher({ mode, onChange }: Props) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="inline-flex items-center rounded-lg bg-muted/40 p-0.5 border border-border/30">
        {MODES.map(({ value, label, icon: Icon }) => {
          const active = mode === value;
          return (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(value)}
                  className={cn(
                    'h-8 px-2.5 gap-1.5 text-xs font-semibold transition-colors',
                    active
                      ? 'bg-card text-primary shadow-sm hover:bg-card hover:text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="md:hidden">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
