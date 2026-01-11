import { useMemo } from 'react';
import { Sparkles, Rocket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from '@/components/ui/premium-card';
import { getStorageItem, setStorageItem } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface First3DaysData {
  startDate: string | null;
  day1Top3: string[];
  day2Top3: string[];
  day3Top3: string[];
}

interface First3DaysChecklistProps {
  data: First3DaysData;
  daysRemaining: number;
  checkedState: Record<string, boolean>;
  onCheckChange: (key: string, checked: boolean) => void;
}

export function First3DaysChecklist({ 
  data, 
  daysRemaining, 
  checkedState, 
  onCheckChange 
}: First3DaysChecklistProps) {
  const currentDay = 90 - daysRemaining;

  // Calculate if we should show the card
  const shouldShow = useMemo(() => {
    // Only show in first 5 days (daysRemaining >= 85 means day 1-5)
    if (daysRemaining < 85) return false;

    // Check if any tasks exist
    const allTasks = [
      ...data.day1Top3,
      ...data.day2Top3,
      ...data.day3Top3
    ];
    if (allTasks.length === 0) return false;

    // Check if all are completed
    const totalTasks = allTasks.length;
    const completedTasks = Object.values(checkedState).filter(Boolean).length;
    if (completedTasks >= totalTasks && totalTasks > 0) return false;

    return true;
  }, [daysRemaining, data, checkedState]);

  if (!shouldShow) return null;

  const renderDayTasks = (dayLabel: string, tasks: string[], dayPrefix: string) => {
    if (tasks.length === 0) return null;

    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{dayLabel}</p>
        {tasks.map((task, idx) => {
          const key = `${dayPrefix}-${idx}`;
          const isChecked = checkedState[key] || false;
          return (
            <div 
              key={key} 
              className={cn(
                "flex items-start gap-3 p-2.5 rounded-lg transition-colors",
                isChecked ? "bg-muted/20" : "bg-muted/40"
              )}
            >
              <Checkbox
                id={key}
                checked={isChecked}
                onCheckedChange={(checked) => onCheckChange(key, checked === true)}
                className="mt-0.5"
              />
              <label 
                htmlFor={key}
                className={cn(
                  "text-sm leading-relaxed cursor-pointer flex-1",
                  isChecked && "line-through text-muted-foreground"
                )}
              >
                {task}
              </label>
            </div>
          );
        })}
      </div>
    );
  };

  // Calculate completion progress
  const allTasks = [...data.day1Top3, ...data.day2Top3, ...data.day3Top3];
  const completedCount = Object.values(checkedState).filter(Boolean).length;
  const totalCount = allTasks.length;

  return (
    <PremiumCard category="do">
      <PremiumCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            <PremiumCardTitle>Your First 3 Days</PremiumCardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Day {currentDay} of 90
            </Badge>
            {completedCount > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                {completedCount}/{totalCount}
              </Badge>
            )}
          </div>
        </div>
      </PremiumCardHeader>
      <PremiumCardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Start strong! Complete your planned tasks for the first 3 days.
        </p>
        <div className="space-y-4">
          {renderDayTasks('Day 1', data.day1Top3, 'd1')}
          {renderDayTasks('Day 2', data.day2Top3, 'd2')}
          {renderDayTasks('Day 3', data.day3Top3, 'd3')}
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}

// Storage key for the checklist
const FIRST_3_DAYS_STORAGE_KEY = 'first3DaysChecked';

export function getFirst3DaysCheckedState(): Record<string, boolean> {
  const stored = getStorageItem(FIRST_3_DAYS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
}

export function saveFirst3DaysCheckedState(state: Record<string, boolean>): void {
  setStorageItem(FIRST_3_DAYS_STORAGE_KEY, JSON.stringify(state));
}
