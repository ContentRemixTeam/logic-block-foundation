import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HabitWizardData, HabitDraft } from '@/pages/HabitWizardPage';
import { Plus, Trash2, Lightbulb } from 'lucide-react';

interface HabitDefineNewProps {
  data: HabitWizardData;
  onChange: (updates: Partial<HabitWizardData>) => void;
}

const HABIT_SUGGESTIONS: Record<string, string[]> = {
  'health': ['Morning workout', 'Drink 8 glasses of water', 'Take a walk', 'Stretch for 10 minutes', 'Sleep by 10pm'],
  'self-care': ['Skincare routine', 'Take a relaxing bath', 'Digital detox hour', 'Read before bed', 'Practice deep breathing'],
  'mindset': ['Morning meditation', 'Gratitude journaling', 'Daily affirmations', 'Mindful eating', 'Evening reflection'],
  'relationships': ['Call a loved one', 'Send an appreciation text', 'Plan a date night', 'Family dinner together', 'Catch up with a friend'],
  'learning': ['Read for 20 minutes', 'Listen to a podcast', 'Take online course lesson', 'Practice a new skill', 'Watch educational content'],
  'creativity': ['Write for 15 minutes', 'Sketch or draw', 'Practice an instrument', 'Work on a craft project', 'Try something new'],
  'finances': ['Track daily expenses', 'Review budget weekly', 'Save first, spend later', 'Check investment portfolio', 'Plan purchases ahead'],
  'home': ['10-minute tidy up', 'Make the bed', 'Meal prep on Sunday', 'Declutter one area', 'Water the plants'],
  'business': ['Morning planning session', 'Inbox zero', 'Network with one person', 'Review goals weekly', 'Learn industry news'],
};

const CATEGORY_LABELS: Record<string, string> = {
  'health': 'Health & Fitness',
  'self-care': 'Self-Care',
  'mindset': 'Mindset',
  'relationships': 'Relationships',
  'learning': 'Learning',
  'creativity': 'Creativity',
  'finances': 'Finances',
  'home': 'Home',
  'business': 'Business',
};

export function HabitDefineNew({ data, onChange }: HabitDefineNewProps) {
  const newHabits = data.newHabits || [];

  const addHabit = (category: string, name?: string) => {
    const newHabit: HabitDraft = {
      name: name || '',
      category: CATEGORY_LABELS[category] || category,
      intention: '',
      type: 'daily',
      preferredTime: 'morning',
      autoSchedule: false,
      scheduleMode: 'task_list',
    };
    onChange({ newHabits: [...newHabits, newHabit] });
  };

  const updateHabit = (index: number, updates: Partial<HabitDraft>) => {
    const updated = [...newHabits];
    updated[index] = { ...updated[index], ...updates };
    onChange({ newHabits: updated });
  };

  const removeHabit = (index: number) => {
    onChange({ newHabits: newHabits.filter((_, i) => i !== index) });
  };

  const getSuggestionsForAreas = () => {
    return (data.selectedAreas || []).flatMap(area => 
      (HABIT_SUGGESTIONS[area] || []).map(name => ({ name, category: area }))
    );
  };

  const suggestions = getSuggestionsForAreas();
  const usedNames = newHabits.map(h => h.name.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Define Your New Habits</h2>
        <p className="text-muted-foreground">
          What habits do you want to build? Think about small, consistent actions.
        </p>
      </div>

      {/* Quick Add Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Quick Add Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestions
                .filter(s => !usedNames.includes(s.name.toLowerCase()))
                .slice(0, 10)
                .map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => addHabit(suggestion.category, suggestion.name)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {suggestion.name}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Habit Forms */}
      <div className="space-y-4">
        {newHabits.map((habit, index) => (
          <Card key={index}>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Habit Name *</Label>
                      <Input
                        value={habit.name}
                        onChange={(e) => updateHabit(index, { name: e.target.value })}
                        placeholder="e.g., Morning workout"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select 
                        value={habit.category} 
                        onValueChange={(v) => updateHabit(index, { category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(CATEGORY_LABELS).map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Why is this important to you?</Label>
                    <Textarea
                      value={habit.intention}
                      onChange={(e) => updateHabit(index, { intention: e.target.value })}
                      placeholder="This helps me stay motivated because..."
                      className="min-h-[60px]"
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeHabit(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Button */}
      <Button
        variant="outline"
        onClick={() => addHabit(data.selectedAreas?.[0] || 'health')}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Habit
      </Button>

      {newHabits.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Add at least one habit to continue. Click a suggestion above or add your own!
        </p>
      )}
    </div>
  );
}
