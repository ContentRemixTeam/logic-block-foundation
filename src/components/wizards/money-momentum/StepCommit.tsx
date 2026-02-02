import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Handshake, Target, Flame, Trophy, ChevronDown, Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MoneyMomentumData, formatCurrency } from '@/types/moneyMomentum';
import { format } from 'date-fns';

interface StepCommitProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

const COMMITMENT_OPTIONS = [
  { id: 'daily-checkin', label: "I'll check in daily with my progress" },
  { id: 'no-excuses', label: "I'll do the actions even when I don't feel like it" },
  { id: 'full-effort', label: "I'll give 100% effort for the duration of this sprint" },
  { id: 'celebrate-wins', label: "I'll celebrate every win, no matter how small" },
  { id: 'learn-from-fails', label: "I'll learn from what doesn't work instead of quitting" },
  { id: 'ask-for-help', label: "I'll ask for help when I'm stuck" },
];

const INTEGRATION_OPTIONS = [
  { id: 'add-tasks', label: 'Add tasks to my task list', default: true },
  { id: 'add-dashboard', label: 'Add to my dashboard', default: true },
  { id: 'daily-reminders', label: 'Set up daily reminders', default: true },
  { id: 'weekly-planning', label: 'Add to weekly planning', default: false },
];

export function StepCommit({ data, onChange }: StepCommitProps) {
  const [committed, setCommitted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [integrations, setIntegrations] = useState<string[]>(
    INTEGRATION_OPTIONS.filter(o => o.default).map(o => o.id)
  );
  const [reminderMethod, setReminderMethod] = useState<string>('in-app');
  const [showNotReady, setShowNotReady] = useState(false);

  const handleCommitmentToggle = (optionId: string, checked: boolean) => {
    if (checked) {
      onChange({ commitmentOptions: [...data.commitmentOptions, optionId] });
    } else {
      onChange({ commitmentOptions: data.commitmentOptions.filter(c => c !== optionId) });
    }
  };

  const handleIntegrationToggle = (optionId: string, checked: boolean) => {
    if (checked) {
      setIntegrations([...integrations, optionId]);
    } else {
      setIntegrations(integrations.filter(i => i !== optionId));
    }
  };

  const adjustedGap = data.gapToClose - data.estimatedSavings;

  // Calculate total time commitment
  const durationHours: Record<string, number> = {
    '30 minutes': 0.5,
    '1 hour': 1,
    '90 minutes': 1.5,
    '2 hours': 2,
    '2+ hours': 2.5,
  };
  const hoursPerDay = durationHours[data.dailyDuration] || 2;
  const workingDaysCount = data.workingDays.length > 0 
    ? Math.round((data.daysInSprint / 7) * data.workingDays.length)
    : data.daysInSprint;
  const totalHours = hoursPerDay * workingDaysCount;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Stop planning. Start executing.</h2>
        <p className="text-muted-foreground">
          A sprint without commitment is just a wish. Let's make it real.
        </p>
      </div>

      {/* Section 1: Sprint Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">YOUR SPRINT SUMMARY</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Goal */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div className="p-3 bg-background rounded-lg border">
              <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Goal</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(adjustedGap)}</span>
              <span className="text-muted-foreground ml-1">in {data.daysInSprint} days</span>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Daily Target</span>
              <span className="font-bold text-lg">
                {formatCurrency(data.daysInSprint > 0 ? adjustedGap / workingDaysCount : 0)}
              </span>
              <span className="text-muted-foreground">/working day</span>
            </div>
            <div className="p-3 bg-background rounded-lg border sm:col-span-2 lg:col-span-1">
              <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Dates</span>
              <span className="font-bold">
                {data.sprintStartDate && data.sprintEndDate 
                  ? `${format(new Date(data.sprintStartDate), 'MMM d')} - ${format(new Date(data.sprintEndDate), 'MMM d')}`
                  : 'Not set'
                }
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-3 bg-background rounded-lg border">
            <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-2">
              Your Actions ({data.selectedActions.length} selected)
            </span>
            <div className="space-y-1">
              {data.selectedActions.slice(0, 3).map((action, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{action.action}</span>
                </div>
              ))}
              {data.selectedActions.length > 3 && (
                <span className="text-muted-foreground text-sm">
                  +{data.selectedActions.length - 3} more...
                </span>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-3 bg-background rounded-lg border">
              <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Schedule</span>
              <p className="text-sm font-medium">{workingDaysCount} working days</p>
              <p className="text-sm text-muted-foreground">{data.dailyTime} • {data.dailyDuration}/day</p>
              <p className="text-sm text-muted-foreground mt-1">
                Total: {totalHours} hours over {data.daysInSprint} days
              </p>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Accountability</span>
              <p className="text-sm font-medium">{data.accountabilityPartner || 'Not set'}</p>
              <p className="text-sm text-muted-foreground">{data.accountabilityMethod || 'No method set'}</p>
            </div>
          </div>

          {/* Mindset */}
          {data.blockingThought && data.newThought && (
            <div className="p-3 bg-background rounded-lg border">
              <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-2">Mindset Shift</span>
              <p className="text-sm">
                <span className="text-destructive">"{data.blockingThought}"</span>
                <span className="mx-2">→</span>
                <span className="text-primary font-medium">"{data.newThought}"</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Make It Real */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Where should we add this sprint?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {INTEGRATION_OPTIONS.map(({ id, label }) => (
              <Label 
                key={id}
                htmlFor={`integration-${id}`}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px] ${
                  integrations.includes(id) ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <Checkbox
                  id={`integration-${id}`}
                  checked={integrations.includes(id)}
                  onCheckedChange={(checked) => handleIntegrationToggle(id, checked as boolean)}
                />
                <span>{label}</span>
              </Label>
            ))}
          </div>

          {integrations.includes('daily-reminders') && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="block mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Send reminders via:
              </Label>
              <RadioGroup
                value={reminderMethod}
                onValueChange={setReminderMethod}
                className="flex gap-4"
              >
                <Label htmlFor="reminder-inapp" className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="in-app" id="reminder-inapp" />
                  In-app only
                </Label>
                <Label htmlFor="reminder-email" className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="email" id="reminder-email" />
                  Email
                </Label>
              </RadioGroup>
            </div>
          )}

          <div>
            <Label htmlFor="consequences" className="block mb-2">
              If I don't follow through, I will: <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="consequences"
              placeholder="Donate $100 to charity, tell my mastermind, post publicly about it..."
              value={data.consequences}
              onChange={(e) => onChange({ consequences: e.target.value })}
              rows={2}
              maxLength={300}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Commitments */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Commitments</CardTitle>
          </div>
          <CardDescription>
            Check the commitments you're willing to make for this sprint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COMMITMENT_OPTIONS.map(({ id, label }) => (
            <Label 
              key={id}
              htmlFor={`commitment-${id}`}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px] ${
                data.commitmentOptions.includes(id) ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <Checkbox
                id={`commitment-${id}`}
                checked={data.commitmentOptions.includes(id)}
                onCheckedChange={(checked) => handleCommitmentToggle(id, checked as boolean)}
              />
              <span>{label}</span>
            </Label>
          ))}
        </CardContent>
      </Card>

      {/* Section 4: The Big Commit */}
      <Card className="border-2 border-primary">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Label 
              htmlFor="commit-checkbox"
              className="flex items-start gap-3 cursor-pointer"
            >
              <Checkbox
                id="commit-checkbox"
                checked={committed}
                onCheckedChange={(checked) => setCommitted(checked as boolean)}
                className="mt-0.5"
              />
              <span className="text-lg font-semibold">☐ I commit to this sprint.</span>
            </Label>

            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                See what I'm committing to
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-2">
                <p>I understand:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>I will work on revenue for {data.dailyDuration} on my selected days</li>
                  <li>I will track my daily progress</li>
                  <li>I will not quit before the sprint ends ({data.sprintEndDate ? format(new Date(data.sprintEndDate), 'MMM d') : 'end date'})</li>
                  <li>I will complete a sprint review when finished</li>
                </ul>
              </CollapsibleContent>
            </Collapsible>

            {!committed && (
              <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Check the commitment box above to enable "Start My Sprint"
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Not Ready? */}
      <Collapsible open={showNotReady} onOpenChange={setShowNotReady}>
        <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-primary underline">
          Not ready to commit?
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 p-4 border rounded-lg space-y-3">
          <p className="text-sm text-muted-foreground">That's okay. Here are your options:</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">Save as draft</Button>
            <Button variant="outline" size="sm">Start over with shorter sprint</Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">Exit wizard</Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Final Motivation */}
      {committed && (
        <Alert className="bg-primary/10 border-primary/30 text-primary">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="font-medium">
            You're ready! Click "Start My Sprint" to begin your revenue journey. 💪
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
