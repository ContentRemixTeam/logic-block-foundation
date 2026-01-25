import { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Bell, Target } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CheckinFrequency } from '@/types/course';
import { CHECKIN_FREQUENCY_LABELS } from '@/types/course';

interface CourseCheckinSectionProps {
  checkinFrequency: CheckinFrequency | undefined;
  onCheckinFrequencyChange: (freq: CheckinFrequency | undefined) => void;
  roiDeadline: Date | undefined;
  onRoiDeadlineChange: (date: Date | undefined) => void;
  roiTarget: string | undefined;
  cost: number | undefined;
  startDate: Date | undefined;
}

export function CourseCheckinSection({
  checkinFrequency,
  onCheckinFrequencyChange,
  roiDeadline,
  onRoiDeadlineChange,
  roiTarget,
  cost,
  startDate,
}: CourseCheckinSectionProps) {
  const enableCheckins = !!checkinFrequency;

  const handleToggleCheckins = (enabled: boolean) => {
    if (enabled) {
      onCheckinFrequencyChange('weekly'); // Default to weekly
    } else {
      onCheckinFrequencyChange(undefined);
    }
  };

  // Calculate ROI countdown
  const roiCountdown = useMemo(() => {
    if (!roiDeadline) return null;
    const days = differenceInDays(roiDeadline, new Date());
    return {
      days,
      label: days > 0 ? `${days} days to hit target` : days === 0 ? 'Target is today!' : `${Math.abs(days)} days overdue`,
      isOverdue: days < 0,
      isUrgent: days >= 0 && days <= 7,
    };
  }, [roiDeadline]);

  // Format what needs to be earned back
  const roiSummary = useMemo(() => {
    if (!roiDeadline) return null;
    if (roiTarget) {
      return `Earn back: ${roiTarget}`;
    }
    if (cost) {
      return `Earn back: $${cost.toFixed(2)}`;
    }
    return null;
  }, [roiDeadline, roiTarget, cost]);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Bell className="h-4 w-4" />
        Progress Check-ins
      </h4>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Schedule check-ins</Label>
          <p className="text-xs text-muted-foreground">
            Get reminders to review your progress
          </p>
        </div>
        <Switch
          checked={enableCheckins}
          onCheckedChange={handleToggleCheckins}
        />
      </div>

      {enableCheckins && (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Check-in Frequency</Label>
            <Select
              value={checkinFrequency}
              onValueChange={(v) => onCheckinFrequencyChange(v as CheckinFrequency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHECKIN_FREQUENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {checkinFrequency === 'daily' && 'A quick "Am I on track?" will appear in your Daily Plan'}
              {checkinFrequency === 'weekly' && 'Review your course progress during Weekly Planning'}
              {checkinFrequency === 'monthly' && 'Check in during your 30-Day Review'}
            </p>
          </div>
        </div>
      )}

      {/* ROI Deadline */}
      <div className="space-y-2 pt-2">
        <Label className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          ROI Deadline
        </Label>
        <p className="text-xs text-muted-foreground">
          By when should you hit your ROI target?
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !roiDeadline && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {roiDeadline ? format(roiDeadline, 'PPP') : 'Select deadline'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={roiDeadline}
              onSelect={onRoiDeadlineChange}
              disabled={(date) => date < new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {roiDeadline && roiCountdown && (
          <Card className={cn(
            "border",
            roiCountdown.isOverdue ? "bg-destructive/10 border-destructive/30" :
            roiCountdown.isUrgent ? "bg-yellow-500/10 border-yellow-500/30" :
            "bg-primary/5 border-primary/20"
          )}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <Target className={cn(
                  "h-4 w-4",
                  roiCountdown.isOverdue ? "text-destructive" :
                  roiCountdown.isUrgent ? "text-yellow-600" :
                  "text-primary"
                )} />
                <div className="text-sm">
                  <span className="font-medium">{roiCountdown.label}</span>
                  {roiSummary && (
                    <span className="text-muted-foreground"> • {roiSummary}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
