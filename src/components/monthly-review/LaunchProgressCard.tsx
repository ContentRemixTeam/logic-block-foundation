import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Rocket, DollarSign, Target, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { useActiveLaunches } from '@/hooks/useActiveLaunches';
import { format } from 'date-fns';

interface LaunchProgressCardProps {
  className?: string;
}

export function LaunchProgressCard({ className }: LaunchProgressCardProps) {
  const { data: launches = [], isLoading } = useActiveLaunches();

  if (isLoading || launches.length === 0) {
    return null;
  }

  const getPhaseEmoji = (phase: string) => {
    switch (phase) {
      case 'live': return '🔴';
      case 'pre-launch': return '🚀';
      default: return '✅';
    }
  };

  const getPhaseLabel = (phase: string, daysUntilOpen: number, daysUntilClose: number) => {
    switch (phase) {
      case 'live': return `${daysUntilClose}d left`;
      case 'pre-launch': return `Opens in ${daysUntilOpen}d`;
      default: return 'Closed';
    }
  };

  return (
    <Card className={`border-orange-500/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-lg">Launch Progress</CardTitle>
        </div>
        <CardDescription>
          Track your active and upcoming launches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {launches.map(launch => (
          <div 
            key={launch.id}
            className="p-4 rounded-lg border bg-gradient-to-br from-orange-500/5 to-transparent space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  {getPhaseEmoji(launch.phase)} {launch.name}
                </h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(launch.cart_opens), 'MMM d')} - {format(new Date(launch.cart_closes), 'MMM d')}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={launch.isLive 
                  ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                  : 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                }
              >
                {getPhaseLabel(launch.phase, launch.daysUntilOpen, launch.daysUntilClose)}
              </Badge>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Revenue Goal */}
              {launch.revenue_goal && (
                <div className="p-2 bg-card rounded-md border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Revenue Goal</span>
                  </div>
                  <p className="font-semibold">${launch.revenue_goal.toLocaleString()}</p>
                </div>
              )}

              {/* Task Progress */}
              <div className="p-2 bg-card rounded-md border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Tasks Complete</span>
                </div>
                <p className="font-semibold">{launch.tasksCompleted}/{launch.tasksTotal}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Launch readiness</span>
                <span className="font-medium">{launch.taskPercent}%</span>
              </div>
              <Progress value={launch.taskPercent} className="h-2" />
            </div>

            {/* Pre-launch checklist summary */}
            {launch.phase === 'pre-launch' && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {launch.email_sequences.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {launch.email_sequences.length} email sequences
                  </Badge>
                )}
                {launch.has_waitlist && (
                  <Badge variant="secondary" className="text-xs">
                    Waitlist active
                  </Badge>
                )}
                {launch.live_events.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {launch.live_events.length} live event{launch.live_events.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
