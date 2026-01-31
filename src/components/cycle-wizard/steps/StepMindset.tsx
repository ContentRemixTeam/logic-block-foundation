import { useState } from 'react';
import { StepProps } from '../CycleWizardTypes';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, ArrowRight, Plus, X, Lightbulb, BookOpen } from 'lucide-react';

export function StepMindset({ data, setData }: StepProps) {
  const [newReminder, setNewReminder] = useState('');

  const addReminder = () => {
    if (newReminder.trim() && data.thingsToRemember.length < 5) {
      setData({ thingsToRemember: [...data.thingsToRemember, newReminder.trim()] });
      setNewReminder('');
    }
  };

  const removeReminder = (index: number) => {
    const updated = data.thingsToRemember.filter((_, i) => i !== index);
    setData({ thingsToRemember: updated });
  };

  return (
    <div className="space-y-6">
      {/* Teaching Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Mindset Anchors</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            Your thoughts create your results. Set up beliefs and thought patterns now that will
            support you throughout the quarter.
          </CardDescription>
        </CardContent>
      </Card>

      {/* Belief Input */}
      <div className="space-y-2">
        <Label htmlFor="belief" className="text-base font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          What belief will serve you this quarter?
        </Label>
        <Textarea
          id="belief"
          value={data.usefulBelief}
          onChange={(e) => setData({ usefulBelief: e.target.value })}
          placeholder="e.g., I create value with everything I share. People want what I have to offer..."
          className="min-h-[80px] text-base resize-none"
          maxLength={300}
        />
      </div>

      {/* Thought Work Section */}
      <div className="space-y-4 p-4 rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Thought Upgrade</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="limiting" className="text-sm text-muted-foreground">
            What unhelpful thought might come up?
          </Label>
          <Input
            id="limiting"
            value={data.limitingThought}
            onChange={(e) => setData({ limitingThought: e.target.value })}
            placeholder="e.g., I'm not ready yet, I don't know enough..."
            className="text-base"
            maxLength={200}
          />
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="h-4 w-4 text-primary rotate-90" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="useful" className="text-sm text-muted-foreground">
            What will you think instead?
          </Label>
          <Input
            id="useful"
            value={data.usefulThought}
            onChange={(e) => setData({ usefulThought: e.target.value })}
            placeholder="e.g., I learn by doing, not by waiting..."
            className="text-base"
            maxLength={200}
          />
        </div>
      </div>

      {/* Things to Remember */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Things to Remember
        </Label>
        <p className="text-xs text-muted-foreground">
          Mantras, quotes, or reminders you want to see regularly
        </p>

        {data.thingsToRemember.length > 0 && (
          <div className="space-y-2">
            {data.thingsToRemember.map((reminder, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
              >
                <span className="flex-1 text-sm">"{reminder}"</span>
                <button
                  onClick={() => removeReminder(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {data.thingsToRemember.length < 5 && (
          <div className="flex gap-2">
            <Input
              value={newReminder}
              onChange={(e) => setNewReminder(e.target.value)}
              placeholder="Add a reminder..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addReminder()}
              maxLength={150}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addReminder}
              disabled={!newReminder.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Preview */}
      {(data.limitingThought && data.usefulThought) && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">
              <span className="font-medium">When I think:</span>{' '}
              <span className="text-muted-foreground line-through">{data.limitingThought}</span>
            </p>
            <p className="text-sm mt-1">
              <span className="font-medium">I'll switch to:</span>{' '}
              <span className="text-primary">{data.usefulThought}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
