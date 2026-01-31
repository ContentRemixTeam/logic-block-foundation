import { StepProps } from '../CycleWizardTypes';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Lightbulb } from 'lucide-react';

export function StepBigGoal({ data, setData }: StepProps) {
  const charCount = data.goal.length;
  const maxChars = 200;

  return (
    <div className="space-y-6">
      {/* Teaching Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Why ONE Goal?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-muted-foreground">
            The most successful quarters have ONE clear priority. When you try to achieve everything,
            you achieve nothing. Pick the goal that would make the biggest difference in the next 90 days.
          </CardDescription>
        </CardContent>
      </Card>

      {/* Main Input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="goal" className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            What is your ONE big goal for the next 90 days?
          </Label>
          <Textarea
            id="goal"
            value={data.goal}
            onChange={(e) => setData({ goal: e.target.value })}
            placeholder="e.g., Launch my signature course and enroll 20 founding members"
            className="min-h-[120px] text-base resize-none"
            maxLength={maxChars}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Be specific and measurable</span>
            <span className={charCount > maxChars - 20 ? 'text-destructive' : ''}>
              {charCount}/{maxChars}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="why" className="text-base font-medium">
            Why does this goal matter to you?
          </Label>
          <Textarea
            id="why"
            value={data.why}
            onChange={(e) => setData({ why: e.target.value })}
            placeholder="e.g., This will create recurring income so I can work less and spend more time with my family..."
            className="min-h-[100px] text-base resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            Your "why" will keep you going when things get hard
          </p>
        </div>
      </div>

      {/* Examples */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Examples of good 90-day goals:</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Launch my group coaching program and enroll 10 clients at $2,000</li>
          <li>Grow my email list to 5,000 subscribers with a 40% open rate</li>
          <li>Create and sell 50 copies of my digital course at $497</li>
          <li>Book 3 discovery calls per week consistently</li>
        </ul>
      </div>
    </div>
  );
}
