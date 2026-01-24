import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { HabitWizardData, HabitDraft } from '@/pages/HabitWizardPage';
import { Check, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitExistingReviewProps {
  data: HabitWizardData;
  onChange: (updates: Partial<HabitWizardData>) => void;
}

export function HabitExistingReview({ data, onChange }: HabitExistingReviewProps) {
  const existingHabits = data.existingHabits || [];

  const toggleKeep = (index: number) => {
    const updated = [...existingHabits];
    updated[index] = { ...updated[index], keepExisting: !updated[index].keepExisting };
    onChange({ existingHabits: updated });
  };

  const keepAll = () => {
    const updated = existingHabits.map(h => ({ ...h, keepExisting: true }));
    onChange({ existingHabits: updated });
  };

  const removeAll = () => {
    const updated = existingHabits.map(h => ({ ...h, keepExisting: false }));
    onChange({ existingHabits: updated });
  };

  const keptCount = existingHabits.filter(h => h.keepExisting).length;

  if (existingHabits.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Review Your Current Habits</h2>
          <p className="text-muted-foreground">
            You don't have any habits set up yet. Let's create some new ones!
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium mb-2">No Existing Habits</p>
            <p className="text-muted-foreground text-sm">
              Click "Next" to start creating your first habits
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Review Your Current Habits</h2>
        <p className="text-muted-foreground">
          Decide which habits you want to keep, modify, or remove as you build your new routine.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {keptCount} of {existingHabits.length} habits will be kept
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={keepAll}>
            <Check className="h-4 w-4 mr-1" />
            Keep All
          </Button>
          <Button variant="outline" size="sm" onClick={removeAll}>
            <X className="h-4 w-4 mr-1" />
            Remove All
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {existingHabits.map((habit, index) => (
          <Card 
            key={habit.id || index}
            className={cn(
              'transition-all',
              !habit.keepExisting && 'opacity-50'
            )}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn(
                      'font-medium truncate',
                      !habit.keepExisting && 'line-through text-muted-foreground'
                    )}>
                      {habit.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {habit.type}
                    </Badge>
                  </div>
                  {habit.category && (
                    <p className="text-sm text-muted-foreground truncate">
                      {habit.category}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Label 
                    htmlFor={`keep-${index}`}
                    className={cn(
                      'text-sm',
                      habit.keepExisting ? 'text-green-600' : 'text-muted-foreground'
                    )}
                  >
                    {habit.keepExisting ? 'Keep' : 'Remove'}
                  </Label>
                  <Switch
                    id={`keep-${index}`}
                    checked={habit.keepExisting}
                    onCheckedChange={() => toggleKeep(index)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Removed habits won't be deleted—they'll just be deactivated and can be restored later.
      </p>
    </div>
  );
}
