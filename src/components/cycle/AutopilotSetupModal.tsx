import { useState } from 'react';
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
import { Sparkles, Megaphone, BarChart3, Heart, DollarSign, Calendar, Loader2 } from 'lucide-react';

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

  const autopilotItems = [
    {
      key: 'createContentEngine' as const,
      icon: Megaphone,
      title: 'Content Engine Project + Posting Tasks',
      description: 'Auto-create a project with sections and recurring posting tasks based on your schedule',
      enabled: hasPlatform && hasPostingDays,
      disabledReason: !hasPlatform ? 'No platform selected' : !hasPostingDays ? 'No posting days selected' : null,
    },
    {
      key: 'createMetricsCheckin' as const,
      icon: BarChart3,
      title: 'Weekly Metrics Check-in',
      description: 'Add a recurring Monday task to update your 3 key metrics',
      enabled: hasMetrics,
      disabledReason: !hasMetrics ? 'No metrics defined' : null,
    },
    {
      key: 'createNurtureTasks' as const,
      icon: Heart,
      title: 'Nurture Tasks',
      description: 'Create recurring tasks based on your nurture strategy (email, podcast, etc.)',
      enabled: hasNurtureMethod,
      disabledReason: !hasNurtureMethod ? 'No nurture method selected' : null,
    },
    {
      key: 'createOfferTasks' as const,
      icon: DollarSign,
      title: 'Offer & Sales Tasks',
      description: 'Add recurring offer/follow-up tasks based on your sales frequency',
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

        <div className="space-y-4 py-4">
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
