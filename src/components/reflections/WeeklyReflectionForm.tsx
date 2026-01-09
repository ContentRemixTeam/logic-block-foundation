import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export interface ReflectionData {
  weekStartDate: Date;
  wins: string;
  wentWell: string;
  learned: string;
  nextWeekFocus: string;
  includePrompts: boolean;
  includeGoal: boolean;
}

interface WeeklyReflectionFormProps {
  data: ReflectionData;
  onChange: (data: ReflectionData) => void;
  hasActiveCycle: boolean;
  cycleGoal?: string;
  focusArea?: string;
}

export function WeeklyReflectionForm({
  data,
  onChange,
  hasActiveCycle,
  cycleGoal,
  focusArea,
}: WeeklyReflectionFormProps) {
  const handleChange = useCallback(
    (field: keyof ReflectionData, value: string | boolean | Date) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  const weekEnd = new Date(data.weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRangeLabel = `${format(data.weekStartDate, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="space-y-6">
      {/* Week Picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Week of</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !data.weekStartDate && 'text-muted-foreground'
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {weekRangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={data.weekStartDate}
              onSelect={(date) => {
                if (date) {
                  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
                  handleChange('weekStartDate', weekStart);
                }
              }}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Wins */}
      <div className="space-y-2">
        <Label htmlFor="wins" className="text-sm font-medium">
          🏆 Wins
        </Label>
        <p className="text-xs text-muted-foreground">
          What wins are you celebrating this week?
        </p>
        <Textarea
          id="wins"
          value={data.wins}
          onChange={(e) => handleChange('wins', e.target.value)}
          placeholder="- Launched my new offer&#10;- Got 3 new leads&#10;- Stayed consistent with content"
          rows={4}
        />
      </div>

      {/* What went well */}
      <div className="space-y-2">
        <Label htmlFor="wentWell" className="text-sm font-medium">
          💪 What went well
        </Label>
        <p className="text-xs text-muted-foreground">What worked well for you?</p>
        <Textarea
          id="wentWell"
          value={data.wentWell}
          onChange={(e) => handleChange('wentWell', e.target.value)}
          placeholder="- Morning routine kept me focused&#10;- Batching content saved time&#10;- My energy was high"
          rows={4}
        />
      </div>

      {/* What I learned */}
      <div className="space-y-2">
        <Label htmlFor="learned" className="text-sm font-medium">
          💡 What I learned
        </Label>
        <p className="text-xs text-muted-foreground">
          What insights or lessons did you discover?
        </p>
        <Textarea
          id="learned"
          value={data.learned}
          onChange={(e) => handleChange('learned', e.target.value)}
          placeholder="- Less is more with my offer&#10;- I need more rest days&#10;- Simplicity sells"
          rows={4}
        />
      </div>

      {/* Next week focus (optional) */}
      <div className="space-y-2">
        <Label htmlFor="nextWeekFocus" className="text-sm font-medium">
          🎯 Next week focus <span className="text-muted-foreground">(optional)</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          What are you focusing on next week?
        </p>
        <Textarea
          id="nextWeekFocus"
          value={data.nextWeekFocus}
          onChange={(e) => handleChange('nextWeekFocus', e.target.value)}
          placeholder="- Finish sales page&#10;- Launch email sequence"
          rows={3}
        />
      </div>

      {/* Toggles */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="include-prompts" className="text-sm font-medium">
              Include prompts in my post
            </Label>
            <p className="text-xs text-muted-foreground">
              Add "Prompts I used: Wins • What went well • What I learned" at the end
            </p>
          </div>
          <Switch
            id="include-prompts"
            checked={data.includePrompts}
            onCheckedChange={(checked) => handleChange('includePrompts', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="include-goal" className="text-sm font-medium">
              Include my 90-day goal + focus area
            </Label>
            {hasActiveCycle ? (
              <p className="text-xs text-muted-foreground">
                Shows: "{cycleGoal?.slice(0, 40)}..." / Focus: {focusArea}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No active cycle - this option is disabled
              </p>
            )}
          </div>
          <Switch
            id="include-goal"
            checked={data.includeGoal && hasActiveCycle}
            onCheckedChange={(checked) => handleChange('includeGoal', checked)}
            disabled={!hasActiveCycle}
          />
        </div>
      </div>
    </div>
  );
}
