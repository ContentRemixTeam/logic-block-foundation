import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { HabitWizardData } from '@/pages/HabitWizardPage';
import { Calendar, ListTodo, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitSchedulingProps {
  data: HabitWizardData;
  onChange: (updates: Partial<HabitWizardData>) => void;
}

export function HabitScheduling({ data, onChange }: HabitSchedulingProps) {
  const newHabits = data.newHabits || [];
  const hasHabitsWithTime = newHabits.some(h => h.specificTime);

  const updateHabit = (index: number, updates: Partial<typeof newHabits[0]>) => {
    const updated = [...newHabits];
    updated[index] = { ...updated[index], ...updates };
    onChange({ newHabits: updated });
  };

  const setAllScheduleMode = (mode: 'specific_time' | 'task_list') => {
    const updated = newHabits.map(h => ({ ...h, scheduleMode: mode, autoSchedule: true }));
    onChange({ 
      newHabits: updated, 
      globalSchedulePreference: mode 
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">How Should We Schedule Your Habits?</h2>
        <p className="text-muted-foreground">
          Choose how you want your habits to appear in your planner
        </p>
      </div>

      {/* Global Preference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Scheduling</CardTitle>
          <CardDescription>
            Choose a default for all habits, then customize individual ones below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setAllScheduleMode('task_list')}
              className={cn(
                'p-4 rounded-lg border text-left transition-all',
                data.globalSchedulePreference === 'task_list'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <ListTodo className="h-6 w-6 mb-2 text-primary" />
              <p className="font-medium">Add to Weekly Task List</p>
              <p className="text-sm text-muted-foreground mt-1">
                Habits appear in your task list each week. Drag them onto your calendar when you plan your week.
              </p>
            </button>

            <button
              onClick={() => setAllScheduleMode('specific_time')}
              className={cn(
                'p-4 rounded-lg border text-left transition-all',
                data.globalSchedulePreference === 'specific_time'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
                !hasHabitsWithTime && 'opacity-50'
              )}
              disabled={!hasHabitsWithTime}
            >
              <Calendar className="h-6 w-6 mb-2 text-primary" />
              <p className="font-medium">Auto-Schedule at Specific Times</p>
              <p className="text-sm text-muted-foreground mt-1">
                Habits are automatically added to your daily plan at the times you specified.
              </p>
              {!hasHabitsWithTime && (
                <p className="text-xs text-amber-600 mt-2">
                  Set specific times in the previous step to enable this
                </p>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Per-Habit Customization */}
      {newHabits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Individual Habit Settings</CardTitle>
            <CardDescription>
              Customize scheduling for each habit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {newHabits.map((habit, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{habit.name || `Habit ${index + 1}`}</p>
                  <p className="text-sm text-muted-foreground">
                    {habit.type} • {habit.preferredTime || 'anytime'}
                    {habit.specificTime && ` • ${habit.specificTime}`}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`auto-${index}`} className="text-sm text-muted-foreground">
                      Auto-add
                    </Label>
                    <Switch
                      id={`auto-${index}`}
                      checked={habit.autoSchedule}
                      onCheckedChange={(checked) => updateHabit(index, { autoSchedule: checked })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tip */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm">Pro Tip</p>
          <p className="text-sm text-muted-foreground">
            Most people find it helpful to have habits appear in their weekly task list first. 
            This way, you can place them at times that work with your real schedule each week.
          </p>
        </div>
      </div>
    </div>
  );
}
