import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Rocket, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { ActiveLaunch } from '@/hooks/useActiveLaunches';
import { QuickLaunchReflectionCard } from './QuickLaunchReflectionCard';
import { LaunchTasksToday } from './LaunchTasksToday';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, differenceInHours } from 'date-fns';
import { Link } from 'react-router-dom';

interface LaunchModeSectionProps {
  launch: ActiveLaunch;
}

export function LaunchModeSection({ launch }: LaunchModeSectionProps) {
  const [showReflection, setShowReflection] = useState(false);
  const [showTasks, setShowTasks] = useState(true);

  const today = new Date();
  const cartOpens = parseISO(launch.cart_opens);
  const cartCloses = parseISO(launch.cart_closes);
  const isLive = today >= cartOpens && today <= cartCloses;
  const isPast = today > cartCloses;

  // Calculate countdown
  const daysUntilOpen = differenceInDays(cartOpens, today);
  const daysUntilClose = differenceInDays(cartCloses, today);
  const hoursUntilClose = differenceInHours(cartCloses, today);

  // Determine phase display
  let phaseLabel = 'Pre-Launch';
  let phaseColor = 'bg-blue-500';
  let countdown = '';
  let urgencyLevel: 'low' | 'medium' | 'high' = 'low';

  if (isPast) {
    phaseLabel = 'Post-Launch';
    phaseColor = 'bg-purple-500';
    countdown = 'Cart closed';
  } else if (isLive) {
    phaseLabel = 'LIVE';
    phaseColor = 'bg-green-500 animate-pulse';
    if (daysUntilClose <= 1) {
      countdown = hoursUntilClose <= 24 
        ? `${hoursUntilClose}h left!` 
        : `${daysUntilClose} day${daysUntilClose !== 1 ? 's' : ''} left`;
      urgencyLevel = 'high';
    } else if (daysUntilClose <= 3) {
      countdown = `${daysUntilClose} days left`;
      urgencyLevel = 'medium';
    } else {
      countdown = `${daysUntilClose} days left`;
    }
  } else {
    if (daysUntilOpen <= 3) {
      countdown = `${daysUntilOpen} day${daysUntilOpen !== 1 ? 's' : ''} until launch`;
      urgencyLevel = 'medium';
    } else if (daysUntilOpen <= 7) {
      countdown = `${daysUntilOpen} days until launch`;
    } else {
      countdown = `${daysUntilOpen} days to prepare`;
    }
  }

  return (
    <Card className={cn(
      "border-2 transition-all",
      urgencyLevel === 'high' && "border-red-500/50 bg-red-50/30 dark:bg-red-950/10",
      urgencyLevel === 'medium' && "border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/10",
      urgencyLevel === 'low' && "border-accent/30"
    )}>
      <CardHeader className="pb-2">
        {/* Phase Banner */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-sm font-medium",
              phaseColor
            )}>
              <Rocket className="h-4 w-4" />
              {phaseLabel}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">{launch.name}</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {countdown}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {launch.revenue_goal && (
              <Badge variant="outline" className="hidden sm:flex">
                <Target className="h-3 w-3 mr-1" />
                ${launch.revenue_goal.toLocaleString()}
              </Badge>
            )}
            <Link to={`/projects/${launch.project_id}`}>
              <Button variant="ghost" size="sm" className="text-xs">
                View Project
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        {launch.tasksTotal > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Task Progress</span>
              <span>{launch.tasksCompleted}/{launch.tasksTotal} ({launch.taskPercent}%)</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${launch.taskPercent}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Today's Launch Tasks */}
        {launch.project_id && (
          <Collapsible open={showTasks} onOpenChange={setShowTasks}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                <span className="flex items-center gap-1.5 text-sm">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Today's Launch Tasks
                </span>
                {showTasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <LaunchTasksToday projectId={launch.project_id} />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Quick Reflection Toggle */}
        <Collapsible open={showReflection} onOpenChange={setShowReflection}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "w-full justify-between h-9 transition-colors",
                showReflection && "bg-accent/10 border-accent"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-accent" />
                {showReflection ? 'Hide' : 'Log'} today's wins & lessons
              </span>
              {showReflection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <QuickLaunchReflectionCard 
              launch={launch} 
              compact 
              showMetrics={isLive}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
