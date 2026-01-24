import { useState, useEffect, useMemo } from 'react';
import { format, addWeeks, differenceInWeeks, addMonths, differenceInMonths } from 'date-fns';
import { CalendarIcon, Clock, BookOpen, Sparkles, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';
import { DAY_LABELS } from '@/types/course';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface StudyPlanData {
  createStudyPlan: boolean;
  studyMode: 'sessions' | 'hours_weekly' | 'hours_monthly';
  hoursPerWeek: number;
  hoursPerMonth: number;
  sessionsPerWeek: number;
  sessionMinutes: number;
  preferredDays: number[];
  startDate: Date;
  targetFinishDate?: Date;
  projectId: string | null;
  createNewProject: boolean;
}

interface CourseStudyPlanStepProps {
  courseTitle: string;
  courseStartDate?: Date;
  courseTargetFinish?: Date;
  onComplete: (data: StudyPlanData | null) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const HOURS_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
const MONTHLY_HOURS_OPTIONS = [4, 8, 10, 15, 20, 30, 40, 50, 60];

export function CourseStudyPlanStep({
  courseTitle,
  courseStartDate,
  courseTargetFinish,
  onComplete,
  onBack,
  isSubmitting,
}: CourseStudyPlanStepProps) {
  const [createStudyPlan, setCreateStudyPlan] = useState(true);
  const [studyMode, setStudyMode] = useState<'sessions' | 'hours_weekly' | 'hours_monthly'>('hours_weekly');
  const [hoursPerWeek, setHoursPerWeek] = useState(3);
  const [hoursPerMonth, setHoursPerMonth] = useState(12);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [startDate, setStartDate] = useState<Date>(courseStartDate || new Date());
  const [targetFinishDate, setTargetFinishDate] = useState<Date | undefined>(courseTargetFinish);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [createNewProject, setCreateNewProject] = useState(true);

  // Suggested project name based on course
  const suggestedProjectName = useMemo(() => {
    return `Study: ${courseTitle}`;
  }, [courseTitle]);

  // Calculate study commitment summary
  const commitmentSummary = useMemo(() => {
    if (!createStudyPlan) return null;

    if (studyMode === 'hours_weekly') {
      const sessionsNeeded = Math.ceil((hoursPerWeek * 60) / sessionMinutes);
      return {
        label: `${hoursPerWeek} hours/week`,
        detail: `~${sessionsNeeded} sessions of ${sessionMinutes} minutes each`,
      };
    } else if (studyMode === 'hours_monthly') {
      const weeklyHours = hoursPerMonth / 4;
      const sessionsPerWeek = Math.ceil((weeklyHours * 60) / sessionMinutes);
      return {
        label: `${hoursPerMonth} hours/month`,
        detail: `~${sessionsPerWeek} sessions/week of ${sessionMinutes} minutes`,
      };
    } else {
      const totalMinutes = sessionsPerWeek * sessionMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return {
        label: `${sessionsPerWeek} sessions/week`,
        detail: `${hours}h ${mins > 0 ? `${mins}m` : ''} of study time per week`,
      };
    }
  }, [createStudyPlan, studyMode, hoursPerWeek, hoursPerMonth, sessionsPerWeek, sessionMinutes]);

  // Calculate completion estimate
  const completionEstimate = useMemo(() => {
    if (!targetFinishDate || !startDate) return null;

    const weeks = differenceInWeeks(targetFinishDate, startDate);
    if (weeks <= 0) return null;

    let totalHours = 0;
    if (studyMode === 'hours_weekly') {
      totalHours = weeks * hoursPerWeek;
    } else if (studyMode === 'hours_monthly') {
      const months = differenceInMonths(targetFinishDate, startDate) || 1;
      totalHours = months * hoursPerMonth;
    } else {
      totalHours = weeks * sessionsPerWeek * (sessionMinutes / 60);
    }

    return {
      weeks,
      totalHours: Math.round(totalHours),
    };
  }, [targetFinishDate, startDate, studyMode, hoursPerWeek, hoursPerMonth, sessionsPerWeek, sessionMinutes]);

  const toggleDay = (day: number) => {
    setPreferredDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = () => {
    if (!createStudyPlan) {
      onComplete(null);
      return;
    }

    onComplete({
      createStudyPlan,
      studyMode,
      hoursPerWeek,
      hoursPerMonth,
      sessionsPerWeek,
      sessionMinutes,
      preferredDays,
      startDate,
      targetFinishDate,
      projectId: createNewProject ? null : projectId,
      createNewProject,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Create Study Plan</h3>
        </div>
        <Switch
          checked={createStudyPlan}
          onCheckedChange={setCreateStudyPlan}
        />
      </div>

      {!createStudyPlan && (
        <p className="text-sm text-muted-foreground">
          You can always create a study plan later from the course detail page.
        </p>
      )}

      {createStudyPlan && (
        <div className="space-y-6">
          {/* Study Mode Selection */}
          <div className="space-y-3">
            <Label>How would you like to track your study time?</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={studyMode === 'hours_weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStudyMode('hours_weekly')}
                className="h-auto py-3 flex-col"
              >
                <span className="font-medium">Hours/Week</span>
                <span className="text-xs opacity-70">e.g., 3 hours/week</span>
              </Button>
              <Button
                type="button"
                variant={studyMode === 'hours_monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStudyMode('hours_monthly')}
                className="h-auto py-3 flex-col"
              >
                <span className="font-medium">Hours/Month</span>
                <span className="text-xs opacity-70">e.g., 12 hours/month</span>
              </Button>
              <Button
                type="button"
                variant={studyMode === 'sessions' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStudyMode('sessions')}
                className="h-auto py-3 flex-col"
              >
                <span className="font-medium">Sessions</span>
                <span className="text-xs opacity-70">e.g., 3x 45min</span>
              </Button>
            </div>
          </div>

          {/* Time Configuration */}
          <div className="grid grid-cols-2 gap-4">
            {studyMode === 'hours_weekly' && (
              <div className="space-y-2">
                <Label>Hours per week</Label>
                <Select
                  value={String(hoursPerWeek)}
                  onValueChange={(v) => setHoursPerWeek(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS_OPTIONS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h} hour{h > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {studyMode === 'hours_monthly' && (
              <div className="space-y-2">
                <Label>Hours per month</Label>
                <Select
                  value={String(hoursPerMonth)}
                  onValueChange={(v) => setHoursPerMonth(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHLY_HOURS_OPTIONS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h} hours
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {studyMode === 'sessions' && (
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
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} session{n > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preferred Days */}
          <div className="space-y-2">
            <Label>Preferred study days</Label>
            <div className="flex gap-2 flex-wrap">
              {DAY_LABELS.map((day, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant={preferredDays.includes(idx) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDay(idx)}
                  className="w-12"
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
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
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Target Finish</Label>
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
                    {targetFinishDate ? format(targetFinishDate, 'PPP') : 'Optional'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetFinishDate}
                    onSelect={setTargetFinishDate}
                    disabled={(date) => date < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Project Assignment */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Organize under a project
            </Label>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="create-project"
                checked={createNewProject}
                onCheckedChange={(checked) => setCreateNewProject(!!checked)}
              />
              <label htmlFor="create-project" className="text-sm cursor-pointer">
                Create new project: <span className="font-medium text-primary">"{suggestedProjectName}"</span>
              </label>
            </div>

            {!createNewProject && (
              <ProjectSelector
                value={projectId}
                onChange={setProjectId}
                suggestedName={suggestedProjectName}
                placeholder="Select existing project..."
                allowCreate
                showNoneOption
              />
            )}
          </div>

          {/* Commitment Summary */}
          {commitmentSummary && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{commitmentSummary.label}</p>
                    <p className="text-sm text-muted-foreground">{commitmentSummary.detail}</p>
                    {completionEstimate && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        {completionEstimate.weeks} weeks = ~{completionEstimate.totalHours} total hours
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Creating...' : createStudyPlan ? 'Create Course & Plan' : 'Create Course'}
        </Button>
      </div>
    </div>
  );
}
