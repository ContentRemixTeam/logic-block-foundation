import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, CalendarDays, Handshake, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MoneyMomentumData, formatCurrency } from '@/types/moneyMomentum';
import { format, addDays, differenceInDays } from 'date-fns';

interface StepSprintScheduleProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_BLOCKS = [
  { value: 'morning', label: 'Morning (6am-10am)' },
  { value: 'midday', label: 'Midday (10am-2pm)' },
  { value: 'afternoon', label: 'Afternoon (2pm-6pm)' },
  { value: 'evening', label: 'Evening (6pm-9pm)' },
  { value: 'flexible', label: 'Flexible (I\'ll fit it in)' },
];

const DURATION_OPTIONS = [
  { value: '30 minutes', label: '30 minutes' },
  { value: '1 hour', label: '1 hour' },
  { value: '90 minutes', label: '90 minutes' },
  { value: '2 hours', label: '2 hours' },
  { value: '2+ hours', label: '2+ hours' },
];

const ACCOUNTABILITY_METHODS = [
  { id: 'daily-text', label: 'Daily check-in text' },
  { id: 'weekly-call', label: 'Weekly call' },
  { id: 'public-commitment', label: 'Public commitment post' },
  { id: 'money-on-line', label: 'Money on the line' },
  { id: 'other', label: 'Other' },
];

const TELL_PARTNER_OPTIONS = [
  { value: 'right-now', label: 'Right now (before I finish this wizard)' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'not-sure', label: 'Not sure yet' },
];

export function StepSprintSchedule({ data, onChange }: StepSprintScheduleProps) {
  const [timeBlock, setTimeBlock] = useState<string>('morning');
  const [tellPartnerWhen, setTellPartnerWhen] = useState<string>('right-now');
  const [accountabilityMethods, setAccountabilityMethods] = useState<string[]>(
    data.accountabilityMethod ? data.accountabilityMethod.split(',') : []
  );
  const [otherMethod, setOtherMethod] = useState('');

  // Set default dates if not set
  useEffect(() => {
    if (!data.sprintStartDate) {
      const tomorrow = addDays(new Date(), 1);
      onChange({ 
        sprintStartDate: format(tomorrow, 'yyyy-MM-dd'),
        sprintEndDate: format(addDays(tomorrow, 13), 'yyyy-MM-dd'), // 14 days
      });
    }
  }, []);

  const handleDayToggle = (dayValue: number, checked: boolean) => {
    if (checked) {
      onChange({ workingDays: [...data.workingDays, dayValue].sort() });
    } else {
      onChange({ workingDays: data.workingDays.filter(d => d !== dayValue) });
    }
  };

  const handleMethodToggle = (methodId: string, checked: boolean) => {
    const newMethods = checked 
      ? [...accountabilityMethods, methodId]
      : accountabilityMethods.filter(m => m !== methodId);
    setAccountabilityMethods(newMethods);
    onChange({ accountabilityMethod: newMethods.join(',') });
  };

  const sprintDays = data.sprintStartDate && data.sprintEndDate 
    ? differenceInDays(new Date(data.sprintEndDate), new Date(data.sprintStartDate)) + 1
    : 14;

  const workingDaysInSprint = data.workingDays.length > 0 
    ? Math.round((sprintDays / 7) * data.workingDays.length)
    : sprintDays;

  const restDays = sprintDays - workingDaysInSprint;

  const adjustedGap = data.gapToClose - data.estimatedSavings;
  const dailyTargetAdjusted = workingDaysInSprint > 0 ? adjustedGap / workingDaysInSprint : 0;

  const isFlexible = timeBlock === 'flexible';

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Lock it in. Vague plans = no action.</h2>
        <p className="text-muted-foreground">
          Specific = doable. Flexible = it won't happen. Let's get precise about when you'll work on revenue.
        </p>
      </div>

      {/* Section 1: Sprint Dates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">When does your sprint start and end?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="start-date" className="block mb-2">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={data.sprintStartDate}
                onChange={(e) => onChange({ sprintStartDate: e.target.value })}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="block mb-2">End Date (max 14 days)</Label>
              <Input
                id="end-date"
                type="date"
                value={data.sprintEndDate}
                onChange={(e) => onChange({ sprintEndDate: e.target.value })}
                min={data.sprintStartDate || format(new Date(), 'yyyy-MM-dd')}
                max={data.sprintStartDate ? format(addDays(new Date(data.sprintStartDate), 13), 'yyyy-MM-dd') : undefined}
              />
            </div>
          </div>
          
          {sprintDays > 0 && (
            <p className="text-sm text-muted-foreground">
              Sprint duration: <strong>{sprintDays} days</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Working Days */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Which days will you work on revenue actions?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map(({ value, label, short }) => (
              <Label 
                key={value}
                htmlFor={`day-${value}`}
                className={`flex flex-col items-center gap-1 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[60px] ${
                  data.workingDays.includes(value) ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <Checkbox
                  id={`day-${value}`}
                  checked={data.workingDays.includes(value)}
                  onCheckedChange={(checked) => handleDayToggle(value, checked as boolean)}
                />
                <span className="text-xs font-medium hidden sm:block">{label}</span>
                <span className="text-xs font-medium sm:hidden">{short}</span>
              </Label>
            ))}
          </div>
          
          {data.workingDays.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              <span>Working days selected: <strong>{workingDaysInSprint}</strong></span>
              <span>Rest days: <strong>{restDays}</strong></span>
            </div>
          )}

          {restDays === 0 && data.workingDays.length > 0 && (
            <Alert className="mt-4 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No rest days? Consider adding 1-2 to prevent burnout.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Time Blocking */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">What time will you work on revenue actions?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={timeBlock}
            onValueChange={setTimeBlock}
            className="grid gap-2 sm:grid-cols-2"
          >
            {TIME_BLOCKS.map(({ value, label }) => (
              <Label 
                key={value}
                htmlFor={`time-${value}`}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px] ${
                  timeBlock === value ? 'border-primary bg-primary/5' : ''
                } ${value === 'flexible' ? 'border-amber-500/50' : ''}`}
              >
                <RadioGroupItem value={value} id={`time-${value}`} />
                <span>{label}</span>
              </Label>
            ))}
          </RadioGroup>

          {isFlexible && (
            <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ 'Flexible' = it won't happen. Pick a specific time.
              </AlertDescription>
            </Alert>
          )}

          {!isFlexible && (
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div>
                <Label htmlFor="daily-time" className="block mb-2">Specific time</Label>
                <Input
                  id="daily-time"
                  type="time"
                  value={data.dailyTime}
                  onChange={(e) => onChange({ dailyTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="daily-duration" className="block mb-2">How long each day?</Label>
                <Select
                  value={data.dailyDuration}
                  onValueChange={(value) => onChange({ dailyDuration: value })}
                >
                  <SelectTrigger id="daily-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Accountability */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Who's holding you accountable?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accountability-partner" className="block mb-2">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="accountability-partner"
              placeholder="Friend, coach, business buddy..."
              value={data.accountabilityPartner}
              onChange={(e) => onChange({ accountabilityPartner: e.target.value })}
            />
          </div>

          <div>
            <Label className="block mb-3">How will they hold you accountable?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACCOUNTABILITY_METHODS.map(({ id, label }) => (
                <Label 
                  key={id}
                  htmlFor={`method-${id}`}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px] ${
                    accountabilityMethods.includes(id) ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <Checkbox
                    id={`method-${id}`}
                    checked={accountabilityMethods.includes(id)}
                    onCheckedChange={(checked) => handleMethodToggle(id, checked as boolean)}
                  />
                  <span>{label}</span>
                </Label>
              ))}
            </div>
            {accountabilityMethods.includes('other') && (
              <Input
                className="mt-2"
                placeholder="Describe your method..."
                value={otherMethod}
                onChange={(e) => setOtherMethod(e.target.value)}
              />
            )}
          </div>

          <div>
            <Label className="block mb-3">When will you tell them about this sprint? <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={tellPartnerWhen}
              onValueChange={setTellPartnerWhen}
              className="space-y-2"
            >
              {TELL_PARTNER_OPTIONS.map(({ value, label }) => (
                <Label 
                  key={value}
                  htmlFor={`tell-${value}`}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px] ${
                    tellPartnerWhen === value ? 'border-primary bg-primary/5' : ''
                  } ${value === 'not-sure' ? 'border-amber-500/50' : ''}`}
                >
                  <RadioGroupItem value={value} id={`tell-${value}`} />
                  <span>{label}</span>
                </Label>
              ))}
            </RadioGroup>

            {tellPartnerWhen === 'not-sure' && (
              <Alert className="mt-3 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ If not 'right now,' there's a 70% chance you won't follow through. Tell them NOW.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {data.workingDays.length > 0 && workingDaysInSprint > 0 && !isFlexible && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Your Sprint Summary</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <span className="text-muted-foreground">Working days:</span>
                <span className="ml-2 font-medium">{workingDaysInSprint} days</span>
              </div>
              <div>
                <span className="text-muted-foreground">Gap to close:</span>
                <span className="ml-2 font-medium">{formatCurrency(adjustedGap)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Daily target:</span>
                <span className="ml-2 font-medium text-primary">{formatCurrency(dailyTargetAdjusted)}/day</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
