import { addDays, endOfWeek, isSameDay, isWithinInterval, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ParsedTask } from './useCaptureTypeDetection';

interface QuickChipsProps {
  parsedTask: ParsedTask | null;
  onUpdate: (updates: Partial<ParsedTask>) => void;
  recentTags: string[];
  recentProjects: Array<{ id: string; name: string; color?: string }>;
}

export function QuickChips({ parsedTask, onUpdate, recentTags, recentProjects }: QuickChipsProps) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const currentDate = parsedTask?.date;
  const currentDuration = parsedTask?.duration;
  const currentPriority = parsedTask?.priority;
  const currentTags = parsedTask?.tags || [];
  const currentProjectId = parsedTask?.projectId;

  return (
    <div className="space-y-2">
      {/* Date row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <QuickChip 
          active={currentDate ? isSameDay(currentDate, today) : false}
          onClick={() => onUpdate({ date: today })}
        >
          📅 Today
        </QuickChip>
        <QuickChip 
          active={currentDate ? isSameDay(currentDate, tomorrow) : false}
          onClick={() => onUpdate({ date: tomorrow })}
        >
          📅 Tomorrow
        </QuickChip>
        <QuickChip 
          active={currentDate ? isWithinInterval(currentDate, { start: addDays(tomorrow, 1), end: thisWeekEnd }) : false}
          onClick={() => onUpdate({ date: thisWeekEnd })}
        >
          📅 This Week
        </QuickChip>
      </div>

      {/* Duration row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {[15, 30, 60].map(mins => (
          <QuickChip 
            key={mins}
            active={currentDuration === mins}
            onClick={() => onUpdate({ duration: currentDuration === mins ? undefined : mins })}
          >
            ⏱️ {mins}m
          </QuickChip>
        ))}
      </div>

      {/* Priority row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {(['high', 'medium', 'low'] as const).map(p => (
          <QuickChip 
            key={p}
            active={currentPriority === p}
            onClick={() => onUpdate({ priority: currentPriority === p ? undefined : p })}
            variant={p === 'high' ? 'destructive' : p === 'medium' ? 'warning' : 'default'}
          >
            {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {p.charAt(0).toUpperCase() + p.slice(1)}
          </QuickChip>
        ))}
      </div>

      {/* Recent tags row */}
      {recentTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {recentTags.slice(0, 5).map(tag => (
            <QuickChip 
              key={tag}
              active={currentTags.includes(tag)}
              onClick={() => {
                const newTags = currentTags.includes(tag)
                  ? currentTags.filter(t => t !== tag)
                  : [...currentTags, tag];
                onUpdate({ tags: newTags });
              }}
            >
              #{tag}
            </QuickChip>
          ))}
        </div>
      )}

      {/* Recent projects row */}
      {recentProjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {recentProjects.slice(0, 5).map(proj => (
            <QuickChip 
              key={proj.id}
              active={currentProjectId === proj.id}
              onClick={() => onUpdate({ projectId: currentProjectId === proj.id ? undefined : proj.id })}
            >
              <span 
                className="w-2 h-2 rounded-full mr-1 flex-shrink-0" 
                style={{ backgroundColor: proj.color || 'hsl(var(--primary))' }} 
              />
              {proj.name}
            </QuickChip>
          ))}
        </div>
      )}
    </div>
  );
}

// Individual chip component
function QuickChip({ 
  children, 
  active, 
  onClick, 
  variant = 'default' 
}: { 
  children: React.ReactNode; 
  active?: boolean; 
  onClick: () => void; 
  variant?: 'default' | 'destructive' | 'warning';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
        "border min-h-[36px] flex-shrink-0",
        active 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-muted/50 text-foreground border-border hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
