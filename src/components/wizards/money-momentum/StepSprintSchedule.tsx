import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, CalendarDays } from 'lucide-react';
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

const DURATION_OPTIONS = [
  { value: '30 minutes', label: '30 minutes' },
  { value: '1 hour', label: '1 hour' },
  { value: '2 hours', label: '2 hours' },
  { value: '3 hours', label: '3 hours' },
  { value: '4+ hours', label: '4+ hours' },
];

export function StepSprintSchedule({ data, onChange }: StepSprintScheduleProps) {
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

  const sprintDays = data.sprintStartDate && data.sprintEndDate 
    ? differenceInDays(new Date(data.sprintEndDate), new Date(data.sprintStartDate)) + 1
    : 14;

  const workingDaysInSprint = data.workingDays.length > 0 
    ? Math.round((sprintDays / 7) * data.workingDays.length)
    : sprintDays;

  const adjustedGap = data.gapToClose - data.estimatedSavings;
  const dailyTargetAdjusted = workingDaysInSprint > 0 ? adjustedGap / workingDaysInSprint : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Schedule your sprint</h2>
        <p className="text-muted-foreground">
          When will you work on your revenue actions?
        </p>
      </div>

      {/* Sprint Dates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Sprint Duration</CardTitle>
          </div>
          <CardDescription>
            A typical Money Momentum sprint is 7-14 days. Short enough to stay focused, long enough to see results.
          </CardDescription>
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
              <Label htmlFor="end-date" className="block mb-2">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={data.sprintEndDate}
                onChange={(e) => onChange({ sprintEndDate: e.target.value })}
                min={data.sprintStartDate || format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          
          {sprintDays > 0 && (
            <p className="text-sm text-muted-foreground">
              Sprint length: <strong>{sprintDays} days</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Working Days */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Working Days</CardTitle>
          </div>
          <CardDescription>
            Which days will you dedicate to revenue-generating activities?
          </CardDescription>
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
            <p className="text-sm text-muted-foreground mt-4">
              Approximately <strong>{workingDaysInSprint} working days</strong> in your sprint
            </p>
          )}
        </CardContent>
      </Card>

      {/* Daily Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Daily Time Block</CardTitle>
          </div>
          <CardDescription>
            When will you work on revenue activities each day?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="daily-time" className="block mb-2">Start Time</Label>
              <Input
                id="daily-time"
                type="time"
                value={data.dailyTime}
                onChange={(e) => onChange({ dailyTime: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="daily-duration" className="block mb-2">Duration</Label>
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
        </CardContent>
      </Card>

      {/* Summary */}
      {data.workingDays.length > 0 && workingDaysInSprint > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Your Sprint Summary</h3>
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
