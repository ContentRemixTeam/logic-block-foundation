import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HabitWizardData } from '@/pages/HabitWizardPage';
import { Check, Calendar, ListTodo, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitReviewCompleteProps {
  data: HabitWizardData;
  onChange: (updates: Partial<HabitWizardData>) => void;
}

export function HabitReviewComplete({ data }: HabitReviewCompleteProps) {
  const existingKept = (data.existingHabits || []).filter(h => h.keepExisting);
  const newHabits = data.newHabits || [];
  const totalHabits = existingKept.length + newHabits.length;

  const getScheduleLabel = (habit: typeof newHabits[0]) => {
    if (!habit.autoSchedule) return 'Manual';
    return habit.scheduleMode === 'specific_time' ? 'Auto-scheduled' : 'Added to tasks';
  };

  const getFrequencyLabel = (type: string) => {
    switch (type) {
      case 'daily': return 'Daily';
      case 'weekdays': return 'Weekdays';
      case 'weekly': return 'Weekly';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Review Your Habit Plan</h2>
        <p className="text-muted-foreground">
          You're about to create {totalHabits} habit{totalHabits !== 1 ? 's' : ''}. Let's make sure everything looks good!
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{newHabits.length}</p>
            <p className="text-sm text-muted-foreground">New Habits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{existingKept.length}</p>
            <p className="text-sm text-muted-foreground">Kept</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-foreground">{totalHabits}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* New Habits */}
      {newHabits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              New Habits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {newHabits.map((habit, index) => (
              <div 
                key={index}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{habit.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {habit.category}
                    </Badge>
                  </div>
                  {habit.intention && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      "{habit.intention}"
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {getFrequencyLabel(habit.type)}
                    </span>
                    {habit.preferredTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {habit.preferredTime}
                        {habit.specificTime && ` (${habit.specificTime})`}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ListTodo className="h-3 w-3" />
                      {getScheduleLabel(habit)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Existing Habits Being Kept */}
      {existingKept.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Habits You're Keeping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {existingKept.map((habit, index) => (
                <Badge key={index} variant="outline" className="py-1">
                  {habit.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What Happens Next */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>When you click "Create Habits":</p>
          <ul className="space-y-1 ml-4">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Your habits will be saved to your Habits page
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Auto-scheduled habits will appear in your daily plan
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Task list habits will be added to your weekly tasks
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              You can track your progress in the Habits section
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
