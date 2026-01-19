import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { StreakBadge } from './StreakBadge';
import { WeeklyHabitGrid } from './WeeklyHabitGrid';
import { cn } from '@/lib/utils';

interface HabitRowProps {
  habit: {
    habit_id: string;
    habit_name: string;
    category?: string | null;
    type?: string | null;
  };
  isCompleted: boolean;
  streak: number;
  weekLogs: Array<{ date: string; completed: boolean }>;
  onToggle: (habitId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function HabitRow({
  habit,
  isCompleted,
  streak,
  weekLogs,
  onToggle,
  disabled = false,
  compact = false,
}: HabitRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all',
        'hover:bg-accent/50',
        isCompleted && 'bg-green-500/10',
        compact && 'p-2'
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => onToggle(habit.habit_id)}
        disabled={disabled}
        className="h-5 w-5"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium truncate',
              isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {habit.habit_name}
          </span>
          {habit.category && !compact && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {habit.category}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StreakBadge streak={streak} size="sm" />
        {!compact && <WeeklyHabitGrid logs={weekLogs} />}
      </div>
    </div>
  );
}
