import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Scissors, AlertTriangle, CheckCircle, Heart } from 'lucide-react';
import { MoneyMomentumData, formatCurrency } from '@/types/moneyMomentum';

interface StepRealityCheckProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

export function StepRealityCheck({ data, onChange }: StepRealityCheckProps) {
  const adjustedGap = data.gapToClose - data.estimatedSavings;
  const adjustedDailyTarget = data.daysInSprint > 0 ? adjustedGap / data.daysInSprint : 0;

  const expenseOptions = [
    { key: 'unusedSoftware', label: 'Unused software subscriptions' },
    { key: 'marketingTools', label: 'Marketing tools you\'re not using' },
    { key: 'diyServices', label: 'Services you can DIY temporarily' },
    { key: 'memberships', label: 'Memberships you can pause' },
    { key: 'other', label: 'Other expenses' },
  ] as const;

  const handleExpenseCutChange = (key: keyof typeof data.expenseCuts, checked: boolean) => {
    onChange({
      expenseCuts: {
        ...data.expenseCuts,
        [key]: checked,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Be honest about where you are.</h2>
        <p className="text-muted-foreground">
          Business building requires focus, not panic.
        </p>
      </div>

      {/* Section 1: Expense Audit */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Expense Audit</CardTitle>
          </div>
          <CardDescription>
            Can you cut any expenses THIS MONTH? Quick audit - what can you pause or cancel temporarily?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {expenseOptions.map(({ key, label }) => (
              <Label 
                key={key}
                htmlFor={`expense-${key}`}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px]"
              >
                <Checkbox
                  id={`expense-${key}`}
                  checked={data.expenseCuts[key]}
                  onCheckedChange={(checked) => handleExpenseCutChange(key, checked as boolean)}
                />
                <span>{label}</span>
              </Label>
            ))}
          </div>

          <div className="pt-4 border-t">
            <Label htmlFor="estimated-savings" className="block mb-2">
              Estimated savings this month:
            </Label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="estimated-savings"
                type="number"
                min="0"
                placeholder="0"
                value={data.estimatedSavings || ''}
                onChange={(e) => onChange({ 
                  estimatedSavings: e.target.value ? Number(e.target.value) : 0 
                })}
                className="pl-7"
              />
            </div>
          </div>

          {data.estimatedSavings > 0 && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <AlertTitle className="text-green-600 dark:text-green-400">Gap reduced!</AlertTitle>
              <AlertDescription>
                <div className="grid gap-2 sm:grid-cols-2 mt-2">
                  <div>
                    <span className="text-muted-foreground">New gap:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(adjustedGap)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">New daily target:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(adjustedDailyTarget)}/day</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Survival Mode Check */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Survival Mode Check</CardTitle>
          </div>
          <CardDescription>
            Are you in survival mode right now? Be honest. There's no shame in taking care of yourself first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.survivalMode === null ? '' : data.survivalMode ? 'yes' : 'no'}
            onValueChange={(value) => onChange({ survivalMode: value === 'yes' })}
            className="space-y-3"
          >
            <Label 
              htmlFor="survival-no"
              className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="no" id="survival-no" />
              <div>
                <div className="font-medium">No - I can focus on building business revenue</div>
              </div>
            </Label>
            <Label 
              htmlFor="survival-yes"
              className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-destructive [&:has(:checked)]:bg-destructive/5"
            >
              <RadioGroupItem value="yes" id="survival-yes" />
              <div>
                <div className="font-medium">Yes - I need to handle immediate survival needs first</div>
              </div>
            </Label>
          </RadioGroup>

          {data.survivalMode === true && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Take care of yourself first</AlertTitle>
              <AlertDescription>
                <p className="mb-3">
                  This wizard is for building business revenue. Handle your immediate situation 
                  first, then come back when you're ready to focus on your business.
                </p>
                <p className="text-sm">
                  You can save this as a draft and return later, or exit now.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {data.survivalMode === false && (
            <Alert className="mt-4 bg-primary/5 border-primary/20">
              <CheckCircle className="h-5 w-5 text-primary" />
              <AlertDescription>
                Good. Business building requires focus and a clear head. Let's get you some momentum.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
