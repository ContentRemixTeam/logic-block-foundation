import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, Megaphone, BarChart3, Heart, DollarSign, Calendar, Loader2, FolderPlus, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface AutopilotOptions {
  createContentEngine: boolean;
  createMetricsCheckin: boolean;
  createNurtureTasks: boolean;
  createOfferTasks: boolean;
  createWeeklyBlocks: boolean;
}

interface AutopilotSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: AutopilotOptions) => void;
  loading?: boolean;
  // Context from cycle setup
  hasPlatform: boolean;
  hasPostingDays: boolean;
  hasMetrics: boolean;
  hasNurtureMethod: boolean;
  hasOffers: boolean;
  // New: counts for preview
  postingDaysCount?: number;
  nurtureFrequency?: string;
  nurturePostingDaysCount?: number;
  offersCount?: number;
  customProjectsCount?: number;
}

export function AutopilotSetupModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  hasPlatform,
  hasPostingDays,
  hasMetrics,
  hasNurtureMethod,
  hasOffers,
  postingDaysCount = 0,
  nurtureFrequency = '',
  nurturePostingDaysCount = 0,
  offersCount = 0,
  customProjectsCount = 0,
}: AutopilotSetupModalProps) {
  const [options, setOptions] = useState<AutopilotOptions>({
    createContentEngine: hasPlatform && hasPostingDays,
    createMetricsCheckin: hasMetrics,
    createNurtureTasks: hasNurtureMethod,
    createOfferTasks: hasOffers,
    createWeeklyBlocks: true,
  });

  const updateOption = (key: keyof AutopilotOptions, value: boolean) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    onConfirm(options);
  };

  // Calculate estimated project and task counts
  const estimates = useMemo(() => {
    let projectCount = customProjectsCount;
    let taskCount = 0;

    if (options.createContentEngine && hasPlatform && hasPostingDays) {
      projectCount += 1; // Content Engine project
      taskCount += postingDaysCount * 13; // 13 weeks of posting tasks
    }

    if (options.createMetricsCheckin && hasMetrics) {
      taskCount += 13; // Weekly metrics check-in for 13 weeks
    }

    if (options.createNurtureTasks && hasNurtureMethod) {
      projectCount += 1; // Nurture project
      // Use nurture posting days if set, otherwise estimate from frequency
      if (nurturePostingDaysCount > 0) {
        taskCount += nurturePostingDaysCount * 13;
      } else {
        let tasksPerWeek = 1;
        if (nurtureFrequency.includes('daily')) tasksPerWeek = 7;
        else if (nurtureFrequency.includes('3x') || nurtureFrequency.includes('3')) tasksPerWeek = 3;
        else if (nurtureFrequency.includes('2x') || nurtureFrequency.includes('2')) tasksPerWeek = 2;
        taskCount += tasksPerWeek * 13;
      }
    }

    if (options.createOfferTasks && hasOffers) {
      projectCount += offersCount; // Offer projects
      taskCount += offersCount * 6; // Estimated sales tasks per offer
    }

    return { projectCount, taskCount };
  }, [options, hasPlatform, hasPostingDays, hasMetrics, hasNurtureMethod, hasOffers, postingDaysCount, nurtureFrequency, nurturePostingDaysCount, offersCount, customProjectsCount]);

  const autopilotItems = [
    {
      key: 'createContentEngine' as const,
      icon: Megaphone,
      title: 'Content Engine Project + Posting Tasks',
      description: postingDaysCount > 0 
        ? `1 project + ${postingDaysCount * 13} posting tasks (${postingDaysCount}x/week for 90 days)`
        : 'Auto-create a project with sections and recurring posting tasks based on your schedule',
      enabled: hasPlatform && hasPostingDays,
      disabledReason: !hasPlatform ? 'No platform selected' : !hasPostingDays ? 'No posting days selected' : null,
    },
    {
      key: 'createMetricsCheckin' as const,
      icon: BarChart3,
      title: 'Weekly Metrics Check-in',
      description: hasMetrics 
        ? '13 weekly tasks to update your 3 key metrics'
        : 'Add a recurring Monday task to update your 3 key metrics',
      enabled: hasMetrics,
      disabledReason: !hasMetrics ? 'No metrics defined' : null,
    },
    {
      key: 'createNurtureTasks' as const,
      icon: Heart,
      title: 'Nurture Tasks',
      description: hasNurtureMethod 
        ? nurturePostingDaysCount > 0
          ? `1 project + ${nurturePostingDaysCount * 13} nurture tasks (${nurturePostingDaysCount}x/week for 90 days)`
          : `1 project + recurring ${nurtureFrequency || 'weekly'} nurture tasks`
        : 'Create recurring tasks based on your nurture strategy (email, podcast, etc.)',
      enabled: hasNurtureMethod,
      disabledReason: !hasNurtureMethod ? 'No nurture method selected' : null,
    },
    {
      key: 'createOfferTasks' as const,
      icon: DollarSign,
      title: 'Offer & Sales Tasks',
      description: hasOffers 
        ? `${offersCount} offer project(s) + recurring sales tasks`
        : 'Add recurring offer/follow-up tasks based on your sales frequency',
      enabled: hasOffers,
      disabledReason: !hasOffers ? 'No offers defined' : null,
    },
    {
      key: 'createWeeklyBlocks' as const,
      icon: Calendar,
      title: 'Weekly Planner Blocks',
      description: 'Add recommended time blocks to your weekly planner based on your focus area',
      enabled: true,
      disabledReason: null,
    },
  ];

  const enabledCount = Object.values(options).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Set Up Your Plan Automatically
          </DialogTitle>
          <DialogDescription>
            Choose what to auto-create based on your cycle settings. You can always adjust these later.
          </DialogDescription>
        </DialogHeader>

        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap pb-2">
          <Badge variant="secondary" className="gap-1">
            <FolderPlus className="h-3 w-3" />
            {estimates.projectCount} projects
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <CheckSquare className="h-3 w-3" />
            {estimates.taskCount}+ tasks
          </Badge>
        </div>

        <div className="space-y-4 py-2">
          {autopilotItems.map((item) => {
            const Icon = item.icon;
            const isDisabled = !item.enabled;
            const isChecked = options[item.key] && item.enabled;

            return (
              <div
                key={item.key}
                className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                  isDisabled 
                    ? 'opacity-50 bg-muted/30' 
                    : isChecked 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-background'
                }`}
              >
                <div className={`p-2 rounded-lg ${isChecked ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-4 w-4 ${isChecked ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label 
                    htmlFor={item.key}
                    className={`font-medium cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}`}
                  >
                    {item.title}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isDisabled ? item.disabledReason : item.description}
                  </p>
                </div>
                <Switch
                  id={item.key}
                  checked={isChecked}
                  onCheckedChange={(checked) => updateOption(item.key, checked)}
                  disabled={isDisabled}
                />
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Cycle {enabledCount > 0 && `+ ${enabledCount} Automations`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
