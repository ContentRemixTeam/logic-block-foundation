import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Calculator, TrendingUp } from 'lucide-react';
import { 
  MoneyMomentumData, 
  getDaysRemainingInMonth, 
  formatCurrency,
  calculatePercentageIncrease 
} from '@/types/moneyMomentum';

interface StepTheNumbersProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

export function StepTheNumbers({ data, onChange }: StepTheNumbersProps) {
  const daysRemaining = getDaysRemainingInMonth();
  
  // Calculate gap and daily target when values change
  useEffect(() => {
    const goal = data.adjustedGoal || data.revenueGoal || 0;
    const current = data.currentRevenue || 0;
    const gap = Math.max(0, goal - current);
    const days = data.targetMonth === 'current' ? daysRemaining : 30;
    const daily = days > 0 ? gap / days : 0;
    
    onChange({
      gapToClose: gap,
      dailyTarget: daily,
      daysInSprint: days,
    });
  }, [data.currentRevenue, data.revenueGoal, data.adjustedGoal, data.targetMonth]);

  const percentIncrease = calculatePercentageIncrease(
    data.currentRevenue || 0, 
    data.adjustedGoal || data.revenueGoal || 0
  );
  
  const showRealityCheck = percentIncrease >= 200 && data.currentRevenue !== null && data.revenueGoal !== null;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Face reality. No stories, just numbers.</h2>
        <p className="text-muted-foreground">
          Let's get honest about where you are and where you want to be.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Current Monthly Revenue</CardTitle>
            <CardDescription>Average over last 3 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={data.currentRevenue ?? ''}
                onChange={(e) => onChange({ 
                  currentRevenue: e.target.value ? Number(e.target.value) : null 
                })}
                className="pl-7 text-lg h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Revenue Goal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Revenue Goal This Month</CardTitle>
            <CardDescription>What you want to hit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={data.revenueGoal ?? ''}
                onChange={(e) => onChange({ 
                  revenueGoal: e.target.value ? Number(e.target.value) : null,
                  adjustedGoal: null, // Reset adjusted goal when main goal changes
                  realityCheckAnswer: null,
                })}
                className="pl-7 text-lg h-12"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Month */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">This sprint is for:</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.targetMonth}
            onValueChange={(value) => onChange({ targetMonth: value as 'current' | 'next' })}
            className="grid gap-3 md:grid-cols-2"
          >
            <Label 
              htmlFor="current-month" 
              className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="current" id="current-month" />
              <div>
                <div className="font-medium">Current month</div>
                <div className="text-sm text-muted-foreground">
                  {daysRemaining} days left
                </div>
              </div>
            </Label>
            <Label 
              htmlFor="next-month" 
              className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="next" id="next-month" />
              <div>
                <div className="font-medium">Next month</div>
                <div className="text-sm text-muted-foreground">
                  Fresh start (30 days)
                </div>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Gap Calculations */}
      {data.currentRevenue !== null && data.revenueGoal !== null && data.revenueGoal > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Your Numbers</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-background rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Gap to close</div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(data.gapToClose)}
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Daily target needed</div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(data.dailyTarget)}/day
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reality Check for 200%+ increase */}
      {showRealityCheck && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">REALITY CHECK</AlertTitle>
          <AlertDescription className="space-y-4">
            <div className="text-foreground">
              <p className="mb-2">
                Current: {formatCurrency(data.currentRevenue || 0)}<br />
                Goal: {formatCurrency(data.revenueGoal || 0)}<br />
                <strong>That's a {percentIncrease}% increase in {data.daysInSprint} days.</strong>
              </p>
              <p>Have you grown revenue this fast before?</p>
            </div>

            <RadioGroup
              value={data.realityCheckAnswer || ''}
              onValueChange={(value) => onChange({ 
                realityCheckAnswer: value as 'yes' | 'no-going-for-it' | 'maybe-adjust' 
              })}
              className="space-y-2"
            >
              <Label 
                htmlFor="reality-yes"
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-background/50 [&:has(:checked)]:border-primary"
              >
                <RadioGroupItem value="yes" id="reality-yes" />
                <span>Yes, I've done this before</span>
              </Label>
              <Label 
                htmlFor="reality-no"
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-background/50 [&:has(:checked)]:border-primary"
              >
                <RadioGroupItem value="no-going-for-it" id="reality-no" />
                <span>No, but I'm going for it anyway</span>
              </Label>
              <Label 
                htmlFor="reality-maybe"
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-background/50 [&:has(:checked)]:border-primary"
              >
                <RadioGroupItem value="maybe-adjust" id="reality-maybe" />
                <span>Maybe I should adjust my goal</span>
              </Label>
            </RadioGroup>

            {data.realityCheckAnswer === 'maybe-adjust' && (
              <div className="mt-4 p-4 bg-background rounded-lg">
                <Label htmlFor="adjusted-goal" className="block mb-2">
                  What goal would you believe is possible?
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="adjusted-goal"
                    type="number"
                    min="0"
                    placeholder={String(data.revenueGoal)}
                    value={data.adjustedGoal ?? ''}
                    onChange={(e) => onChange({ 
                      adjustedGoal: e.target.value ? Number(e.target.value) : null 
                    })}
                    className="pl-7"
                  />
                </div>
                {data.adjustedGoal && (
                  <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    New daily target: {formatCurrency((data.adjustedGoal - (data.currentRevenue || 0)) / data.daysInSprint)}/day
                  </p>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
