import { StepProps } from '../CycleWizardTypes';
import { DAYS_OF_WEEK } from '../CycleWizardData';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Lightbulb, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepWeeklyRhythm({ data, setData }: StepProps) {
  const toggleDay = (day: string) => {
    const current = data.officeHoursDays;
    if (current.includes(day)) {
      setData({ officeHoursDays: current.filter((d) => d !== day) });
    } else {
      setData({ officeHoursDays: [...current, day] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Teaching Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Consistency Over Intensity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            The best results come from showing up consistently. Set a weekly rhythm for planning and
            reviewing so you never lose momentum.
          </CardDescription>
        </CardContent>
      </Card>

      {/* Planning Days */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Weekly Planning Day
          </Label>
          <Select
            value={data.weeklyPlanningDay}
            onValueChange={(value) => setData({ weeklyPlanningDay: value })}
          >
            <SelectTrigger className="text-base h-12">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            When you'll plan your week ahead
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Weekly Debrief Day
          </Label>
          <Select
            value={data.weeklyDebriefDay}
            onValueChange={(value) => setData({ weeklyDebriefDay: value })}
          >
            <SelectTrigger className="text-base h-12">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            When you'll review what worked
          </p>
        </div>
      </div>

      {/* Office Hours */}
      <div className="space-y-4">
        <Label className="text-base font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Office Hours (optional)
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Start time</Label>
            <input
              type="time"
              value={data.officeHoursStart}
              onChange={(e) => setData({ officeHoursStart: e.target.value })}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">End time</Label>
            <input
              type="time"
              value={data.officeHoursEnd}
              onChange={(e) => setData({ officeHoursEnd: e.target.value })}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Working Days</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <Badge
                key={day}
                variant={data.officeHoursDays.includes(day) ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-colors px-3 py-1.5 text-sm',
                  data.officeHoursDays.includes(day)
                    ? 'bg-primary hover:bg-primary/90'
                    : 'hover:bg-primary/10'
                )}
                onClick={() => toggleDay(day)}
              >
                {data.officeHoursDays.includes(day) && (
                  <Check className="h-3 w-3 mr-1" />
                )}
                {day.slice(0, 3)}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {(data.weeklyPlanningDay || data.weeklyDebriefDay) && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">
              <span className="font-medium">Your rhythm:</span>{' '}
              {data.weeklyPlanningDay && `Plan on ${data.weeklyPlanningDay}s`}
              {data.weeklyPlanningDay && data.weeklyDebriefDay && ' • '}
              {data.weeklyDebriefDay && `Review on ${data.weeklyDebriefDay}s`}
            </p>
            {data.officeHoursStart && data.officeHoursEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                Office hours: {data.officeHoursStart} - {data.officeHoursEnd}{' '}
                {data.officeHoursDays.length > 0 && `(${data.officeHoursDays.map(d => d.slice(0, 3)).join(', ')})`}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
