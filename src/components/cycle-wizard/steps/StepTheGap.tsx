import { StepProps } from '../CycleWizardTypes';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, MessageCircle, Users, Lightbulb } from 'lucide-react';

export function StepTheGap({ data, setData }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Critical Warning Card */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-lg text-amber-800 dark:text-amber-200">
              THE GAP: Days 18-28
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-amber-700 dark:text-amber-300 text-sm">
            <strong>This is the #1 reason people quit.</strong> Around weeks 3-4, initial excitement
            fades but results haven't appeared yet. This is THE GAP—the space between starting and
            seeing results.
          </CardDescription>
          
          <div className="bg-amber-100 dark:bg-amber-900/50 rounded-lg p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              What happens in THE GAP:
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
              <li>Energy drops because the "new thing" excitement wears off</li>
              <li>Results aren't visible yet (but they're building)</li>
              <li>Your brain says "this isn't working"</li>
              <li>Temptation to start something new feels strong</li>
            </ul>
          </div>

          <div className="bg-green-100 dark:bg-green-900/50 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              How to get through it:
            </p>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-disc list-inside">
              <li><strong>Expect it.</strong> You're not failing—this is normal.</li>
              <li><strong>Shrink the task.</strong> Do 10% of what you planned if needed.</li>
              <li><strong>Call someone.</strong> One text can change everything.</li>
              <li><strong>Trust the process.</strong> Results come after THE GAP.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gapStrategy" className="text-base font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            What will you do when you feel like quitting in weeks 3-4?
          </Label>
          <Textarea
            id="gapStrategy"
            value={data.gapStrategy}
            onChange={(e) => setData({ gapStrategy: e.target.value })}
            placeholder="e.g., I will re-read my 'why', do the smallest possible action, and text my accountability partner..."
            className="min-h-[100px] text-base resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            Write this to your future self—you'll need it
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountability" className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Who will you text when things get hard?
          </Label>
          <Input
            id="accountability"
            value={data.accountabilityPerson}
            onChange={(e) => setData({ accountabilityPerson: e.target.value })}
            placeholder="e.g., Sarah (business coach), Mom, My mastermind group..."
            className="text-base h-12"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            Having someone to reach out to makes all the difference
          </p>
        </div>
      </div>

      {/* Commitment Card */}
      {data.gapStrategy && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Your GAP Strategy:</p>
                <p className="text-sm text-muted-foreground mt-1 italic">
                  "{data.gapStrategy}"
                </p>
                {data.accountabilityPerson && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Accountability: {data.accountabilityPerson}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
