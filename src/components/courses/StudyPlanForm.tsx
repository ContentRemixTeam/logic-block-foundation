import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { CourseStudyPlan, StudyPlanFormData } from '@/types/course';
import { DAY_LABELS } from '@/types/course';
import { useCourseStudyPlan, useStudyPlanMutations } from '@/hooks/useCourses';

interface StudyPlanFormProps {
  courseId: string;
}

export function StudyPlanForm({ courseId }: StudyPlanFormProps) {
  const { data: existingPlan, isLoading } = useCourseStudyPlan(courseId);
  const { savePlan, generateSessions, regenerateFutureSessions } = useStudyPlanMutations();

  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 3, 5]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [targetFinishDate, setTargetFinishDate] = useState<Date | undefined>();

  useEffect(() => {
    if (existingPlan) {
      setSessionsPerWeek(existingPlan.sessions_per_week);
      setSessionMinutes(existingPlan.session_minutes);
      setPreferredDays(existingPlan.preferred_days);
      setStartDate(new Date(existingPlan.start_date));
      setTargetFinishDate(existingPlan.target_finish_date ? new Date(existingPlan.target_finish_date) : undefined);
    } else {
      // Default to today
      setStartDate(new Date());
    }
  }, [existingPlan]);

  const toggleDay = (day: number) => {
    setPreferredDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (!startDate) return;

    await savePlan.mutateAsync({
      courseId,
      sessions_per_week: sessionsPerWeek,
      session_minutes: sessionMinutes,
      preferred_days: preferredDays,
      start_date: format(startDate, 'yyyy-MM-dd'),
      target_finish_date: targetFinishDate ? format(targetFinishDate, 'yyyy-MM-dd') : undefined,
    });
  };

  const handleGenerate = async () => {
    if (!existingPlan) return;
    await generateSessions.mutateAsync({
      courseId,
      planId: existingPlan.id,
    });
  };

  const handleRegenerate = async () => {
    if (!existingPlan) return;
    await regenerateFutureSessions.mutateAsync({
      courseId,
      planId: existingPlan.id,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Study Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Schedule Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sessions per week</Label>
            <Select
              value={String(sessionsPerWeek)}
              onValueChange={(v) => setSessionsPerWeek(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}x / week</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Session length</Label>
            <Select
              value={String(sessionMinutes)}
              onValueChange={(v) => setSessionMinutes(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 90, 120].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preferred Days */}
        <div className="space-y-2">
          <Label>Preferred days</Label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, index) => (
              <label
                key={index}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                  preferredDays.includes(index)
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-muted/50 border-border hover:bg-muted'
                )}
              >
                <Checkbox
                  checked={preferredDays.includes(index)}
                  onCheckedChange={() => toggleDay(index)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Target finish (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !targetFinishDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetFinishDate ? format(targetFinishDate, 'PPP') : 'No deadline'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetFinishDate}
                  onSelect={setTargetFinishDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={!startDate || preferredDays.length === 0 || savePlan.isPending}
          className="w-full"
        >
          {savePlan.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Plan'
          )}
        </Button>

        {existingPlan && (
          <>
            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Session Generation</h4>
              <p className="text-sm text-muted-foreground">
                Generate study session tasks for the next 6 weeks based on your plan.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  onClick={handleGenerate}
                  disabled={generateSessions.isPending}
                  className="flex-1"
                >
                  {generateSessions.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Sessions
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={regenerateFutureSessions.isPending}
                  className="flex-1"
                >
                  {regenerateFutureSessions.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate Future
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
