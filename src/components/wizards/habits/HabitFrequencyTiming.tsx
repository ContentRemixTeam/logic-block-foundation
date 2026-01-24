import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { HabitWizardData, HabitDraft } from '@/pages/HabitWizardPage';
import { Clock, Calendar, Sun, Sunset, Moon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitFrequencyTimingProps {
  data: HabitWizardData;
  onChange: (updates: Partial<HabitWizardData>) => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekdays', label: 'Weekdays', description: 'Mon-Fri' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week' },
  { value: 'custom', label: 'Custom', description: 'Set your own' },
];

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning', icon: Sun, description: '6am - 12pm' },
  { value: 'afternoon', label: 'Afternoon', icon: Sparkles, description: '12pm - 5pm' },
  { value: 'evening', label: 'Evening', icon: Sunset, description: '5pm - 9pm' },
  { value: 'anytime', label: 'Anytime', icon: Clock, description: 'Flexible' },
];

export function HabitFrequencyTiming({ data, onChange }: HabitFrequencyTimingProps) {
  const newHabits = data.newHabits || [];

  const updateHabit = (index: number, updates: Partial<HabitDraft>) => {
    const updated = [...newHabits];
    updated[index] = { ...updated[index], ...updates };
    onChange({ newHabits: updated });
  };

  if (newHabits.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-lg font-medium mb-2">No Habits to Configure</p>
        <p className="text-muted-foreground text-sm">
          Go back and add some habits first
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Set Frequency & Timing</h2>
        <p className="text-muted-foreground">
          How often do you want to do each habit, and when works best for you?
        </p>
      </div>

      <div className="space-y-6">
        {newHabits.map((habit, index) => (
          <Card key={index}>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{habit.name || `Habit ${index + 1}`}</h3>
                <Badge variant="secondary" className="text-xs">{habit.category}</Badge>
              </div>

              {/* Frequency */}
              <div className="space-y-3">
                <Label>How often?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FREQUENCY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateHabit(index, { type: option.value as any })}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        habit.type === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom frequency input */}
              {habit.type === 'custom' && (
                <div className="space-y-2">
                  <Label>Custom frequency</Label>
                  <Input
                    value={habit.frequency || ''}
                    onChange={(e) => updateHabit(index, { frequency: e.target.value })}
                    placeholder="e.g., 3x per week, Mon/Wed/Fri"
                  />
                </div>
              )}

              {/* Preferred Time */}
              <div className="space-y-3">
                <Label>Best time of day?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIME_OPTIONS.map(option => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => updateHabit(index, { preferredTime: option.value as any })}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-all',
                          habit.preferredTime === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <Icon className="h-4 w-4 mb-1 text-muted-foreground" />
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific time (optional) */}
              {habit.preferredTime && habit.preferredTime !== 'anytime' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Specific time (optional)</Label>
                    <Input
                      type="time"
                      value={habit.specificTime || ''}
                      onChange={(e) => updateHabit(index, { specificTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={habit.duration || ''}
                      onChange={(e) => updateHabit(index, { duration: parseInt(e.target.value) || undefined })}
                      placeholder="e.g., 30"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
