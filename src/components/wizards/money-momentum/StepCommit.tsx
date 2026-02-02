import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Handshake, Target, Flame, Trophy } from 'lucide-react';
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

const ACCOUNTABILITY_METHODS = [
  { value: 'daily-text', label: 'Daily text check-in' },
  { value: 'weekly-call', label: 'Weekly accountability call' },
  { value: 'shared-doc', label: 'Shared progress document' },
  { value: 'public-commitment', label: 'Public commitment post' },
  { value: 'none', label: 'Solo accountability' },
];

export function StepCommit({ data, onChange }: StepCommitProps) {
  const handleCommitmentToggle = (optionId: string, checked: boolean) => {
    if (checked) {
      onChange({ commitmentOptions: [...data.commitmentOptions, optionId] });
    } else {
      onChange({ commitmentOptions: data.commitmentOptions.filter(c => c !== optionId) });
    }
  };

  const adjustedGap = data.gapToClose - data.estimatedSavings;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Time to commit</h2>
        <p className="text-muted-foreground">
          A sprint without commitment is just a wish. Let's make it real.
        </p>
      </div>

      {/* Sprint Overview */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-semibold">Your Sprint at a Glance</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <span className="text-muted-foreground">Goal:</span>
              <div className="font-medium text-lg">{formatCurrency(adjustedGap)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <div className="font-medium">
                {data.sprintStartDate && data.sprintEndDate 
                  ? `${format(new Date(data.sprintStartDate), 'MMM d')} - ${format(new Date(data.sprintEndDate), 'MMM d')}`
                  : 'Not set'
                }
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Actions:</span>
              <div className="font-medium">{data.selectedActions.length} revenue activities</div>
            </div>
            <div>
              <span className="text-muted-foreground">Daily time:</span>
              <div className="font-medium">{data.dailyTime} for {data.dailyDuration}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accountability Partner */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Accountability</CardTitle>
          </div>
          <CardDescription>
            Who will hold you accountable? (Optional but powerful)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accountability-partner" className="block mb-2">
              Accountability partner name
            </Label>
            <Input
              id="accountability-partner"
              placeholder="Friend, coach, business buddy..."
              value={data.accountabilityPartner}
              onChange={(e) => onChange({ accountabilityPartner: e.target.value })}
            />
          </div>

          <div>
            <Label className="block mb-3">How will you check in?</Label>
            <RadioGroup
              value={data.accountabilityMethod}
              onValueChange={(value) => onChange({ accountabilityMethod: value })}
              className="space-y-2"
            >
              {ACCOUNTABILITY_METHODS.map(({ value, label }) => (
                <Label 
                  key={value}
                  htmlFor={`method-${value}`}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px] [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                >
                  <RadioGroupItem value={value} id={`method-${value}`} />
                  <span>{label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Commitments */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
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

      {/* Consequences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Stakes (Optional)</CardTitle>
          </div>
          <CardDescription>
            What happens if you don't follow through? Adding stakes increases commitment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., 'I'll donate $50 to a cause I don't support', 'I'll tell my accountability partner I failed', 'No Netflix until I complete my daily actions'"
            value={data.consequences}
            onChange={(e) => onChange({ consequences: e.target.value })}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Final Motivation */}
      <Alert className="bg-accent/50">
        <AlertDescription className="text-center py-2">
          <p className="text-lg font-medium mb-1">
            You've got this. 💪
          </p>
          <p className="text-muted-foreground">
            {data.selectedActions.length} actions × {data.daysInSprint} days = momentum.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
