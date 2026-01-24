import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Rocket, Calendar, Target, AlertCircle, Zap } from 'lucide-react';
import { useLaunchCheckInQuestions, useActiveLaunches, LaunchCheckInQuestion } from '@/hooks/useActiveLaunches';
import { format } from 'date-fns';

interface LaunchCheckInCardProps {
  reviewType: 'daily' | 'weekly' | 'monthly';
  className?: string;
}

export function LaunchCheckInCard({ reviewType, className }: LaunchCheckInCardProps) {
  const { data: launches = [], isLoading } = useActiveLaunches();
  const questions = useLaunchCheckInQuestions(reviewType);

  if (isLoading || launches.length === 0) {
    return null;
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'live': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'pre-launch': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'medium': return <Zap className="h-4 w-4 text-warning" />;
      default: return null;
    }
  };

  return (
    <Card className={`border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-lg">Active Launch Check-In</CardTitle>
        </div>
        <CardDescription>
          {launches.length === 1 
            ? `Tracking: ${launches[0].name}`
            : `${launches.length} active launches`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Launch Overview Cards */}
        {launches.slice(0, 2).map(launch => (
          <div 
            key={launch.id} 
            className="p-3 rounded-lg border bg-card/50 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{launch.name}</span>
              <Badge variant="outline" className={getPhaseColor(launch.phase)}>
                {launch.phase === 'live' ? '🔴 LIVE' : `${launch.daysUntilOpen}d to open`}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(launch.cart_opens), 'MMM d')} - {format(new Date(launch.cart_closes), 'MMM d')}
                </span>
              </div>
              {launch.revenue_goal && (
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>${launch.revenue_goal.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Task Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tasks</span>
                <span className="font-medium">{launch.tasksCompleted}/{launch.tasksTotal}</span>
              </div>
              <Progress value={launch.taskPercent} className="h-1.5" />
            </div>
          </div>
        ))}

        {/* Check-in Questions */}
        {questions.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Reflection Prompts
            </p>
            {questions.slice(0, 3).map(q => (
              <div 
                key={q.id}
                className="p-2 rounded-md bg-muted/50 text-sm space-y-1"
              >
                <div className="flex items-start gap-2">
                  {getPriorityIcon(q.priority)}
                  <p className="font-medium leading-tight">{q.question}</p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">{q.context}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
