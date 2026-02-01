import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, ChevronRight, Plus, ExternalLink, Calendar, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LaunchTimelineBar } from './LaunchTimelineBar';
import { ActiveLaunch } from '@/hooks/useActiveLaunches';
import { format, parseISO, differenceInDays } from 'date-fns';

interface LaunchZoneProps {
  children?: ReactNode;
  launchName?: string;
  hasLaunch: boolean;
  launch?: ActiveLaunch | null;
  className?: string;
}

export function LaunchZone({ children, launchName, hasLaunch, launch, className }: LaunchZoneProps) {
  if (!hasLaunch || !launch) {
    return (
      <Card className={cn(
        "overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300 hover:border-primary/20",
        className
      )}>
        <CardHeader className="bg-gradient-to-r from-orange-500/5 to-transparent pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Rocket className="h-5 w-5 text-orange-500" />
            </div>
            <CardTitle className="text-lg">Launch Zone</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center py-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/5 mx-auto flex items-center justify-center mb-4">
              <Rocket className="h-8 w-8 text-orange-500/60" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No launches scheduled</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Planning a launch? Create a timeline and track your progress
            </p>
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20" asChild>
              <Link to="/wizards/launch">
                <Plus className="h-4 w-4" />
                Plan Your Launch
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active launch view with timeline
  const cartOpens = parseISO(launch.cart_opens);
  const cartCloses = parseISO(launch.cart_closes);
  const daysUntilOpen = launch.daysUntilOpen;
  const daysUntilClose = launch.daysUntilClose;
  const isLive = launch.isLive;

  // Calculate revenue progress if available
  const revenueGoal = launch.revenue_goal;
  
  return (
    <Card className={cn(
      "overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300",
      isLive ? "border-green-500/30 bg-green-500/5" : "hover:border-primary/20",
      className
    )}>
      <CardHeader className={cn(
        "pb-3",
        isLive 
          ? "bg-gradient-to-r from-green-500/10 to-transparent" 
          : "bg-gradient-to-r from-orange-500/5 to-transparent"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              isLive ? "bg-green-500/20" : "bg-orange-500/10"
            )}>
              <Rocket className={cn(
                "h-5 w-5",
                isLive ? "text-green-500" : "text-orange-500"
              )} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {launch.name}
                {isLive && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-500 text-white rounded-full animate-pulse">
                    LIVE
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(cartOpens, 'MMM d')} - {format(cartCloses, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 group" asChild>
            <Link to={launch.project_id ? `/projects/${launch.project_id}` : '/wizards/launch'}>
              View
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Timeline bar */}
        <LaunchTimelineBar launch={launch} />

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {isLive ? daysUntilClose : daysUntilOpen}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLive ? 'days left' : 'days until open'}
            </div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">
              {launch.taskPercent}%
            </div>
            <div className="text-xs text-muted-foreground">
              tasks done
            </div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">
              {revenueGoal ? `$${(revenueGoal / 1000).toFixed(0)}k` : '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              revenue goal
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 pt-2">
          {launch.project_id && (
            <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
              <Link to={`/projects/${launch.project_id}`}>
                <Target className="h-4 w-4" />
                Tasks
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
            <Link to="/wizards/launch">
              <Plus className="h-4 w-4" />
              New Launch
            </Link>
          </Button>
        </div>

        {/* Children for additional widgets */}
        {children}
      </CardContent>
    </Card>
  );
}
