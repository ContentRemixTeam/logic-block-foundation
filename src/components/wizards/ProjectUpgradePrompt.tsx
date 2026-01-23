import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Calendar, ArrowRight, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProjectUpgradePromptProps {
  projectId: string;
  projectName: string;
  onUpgraded?: () => void;
  onDismissed?: () => void;
  className?: string;
}

type TopicPlanningCadence = 'monthly' | 'weekly' | 'daily' | 'external';

const CADENCE_OPTIONS: { value: TopicPlanningCadence; label: string; description: string }[] = [
  { value: 'monthly', label: 'Monthly', description: 'Plan topics at the start of each month' },
  { value: 'weekly', label: 'Weekly', description: 'Plan topics during weekly planning' },
  { value: 'daily', label: 'Daily', description: 'Pick topics each day' },
  { value: 'external', label: 'External', description: 'I plan topics elsewhere' },
];

export function ProjectUpgradePrompt({
  projectId,
  projectName,
  onUpgraded,
  onDismissed,
  className,
}: ProjectUpgradePromptProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCadence, setSelectedCadence] = useState<TopicPlanningCadence>('weekly');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // 1. Create a snapshot of the project first (safety backup)
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectData) {
        await supabase
          .from('project_snapshots')
          .insert({
            project_id: projectId,
            snapshot_data: projectData,
            reason: 'Before enabling topic planning',
          });
      }

      // 2. Enable topic planning on the project
      const { error } = await supabase
        .from('projects')
        .update({
          has_topic_planning: true,
          topic_planning_cadence: selectedCadence,
        })
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Topic planning enabled!', {
        description: 'You can now plan content topics for this project.',
      });
      
      onUpgraded?.();
    } catch (error) {
      console.error('Error enabling topic planning:', error);
      toast.error('Failed to enable topic planning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async (permanent: boolean) => {
    if (permanent) {
      try {
        await supabase
          .from('projects')
          .update({ upgrade_dismissed: true })
          .eq('id', projectId);
      } catch (error) {
        console.error('Error dismissing upgrade:', error);
      }
    }
    onDismissed?.();
  };

  if (!isExpanded) {
    return (
      <Card className={cn('border-primary/20 bg-primary/5', className)}>
        <CardContent className="flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">New: Topic Planning</p>
              <p className="text-xs text-muted-foreground">Plan your content topics in advance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleDismiss(false)}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setIsExpanded(true)}>
              Learn More
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Enable Topic Planning
                <Badge variant="secondary" className="text-xs">New Feature</Badge>
              </CardTitle>
              <CardDescription>
                For: {projectName}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* What it does */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Topic planning helps you decide <strong>what</strong> to create before you create it. 
            Plan topics in advance, then link them to your content tasks.
          </p>
        </div>

        {/* What won't change */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-green-700 dark:text-green-400">Your existing tasks won't change</p>
            <p className="text-muted-foreground">This only adds new planning features. Nothing is deleted or modified.</p>
          </div>
        </div>

        {/* Cadence selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">When do you want to plan topics?</label>
          <div className="grid grid-cols-2 gap-2">
            {CADENCE_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedCadence(option.value)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all min-h-[44px]',
                  selectedCadence === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button 
            onClick={handleUpgrade} 
            disabled={isLoading}
            className="flex-1 gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Add Topic Planning
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => handleDismiss(false)}
            className="text-muted-foreground"
          >
            Maybe Later
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => handleDismiss(true)}
            className="text-muted-foreground text-xs"
          >
            No Thanks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
