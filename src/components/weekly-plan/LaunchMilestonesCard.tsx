import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Rocket, Calendar, Target, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { useActiveLaunches } from '@/hooks/useActiveLaunches';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface UpcomingMilestone {
  id: string;
  text: string;
  date: string;
  daysAway: number;
  type: 'task' | 'event' | 'deadline';
  launchName: string;
  completed: boolean;
}

export function LaunchMilestonesCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: launches = [], isLoading: launchesLoading } = useActiveLaunches();

  // Fetch upcoming launch-related tasks
  const { data: upcomingTasks = [] } = useQuery({
    queryKey: ['launch-milestones', user?.id],
    queryFn: async (): Promise<UpcomingMilestone[]> => {
      if (!user || launches.length === 0) return [];

      const today = format(new Date(), 'yyyy-MM-dd');
      const twoWeeksOut = format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      // Get projects that are launches
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_launch', true);

      if (!projects?.length) return [];

      // Get tasks for these projects in the next 2 weeks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('task_id, task_text, scheduled_date, status, project_id')
        .in('project_id', projects.map(p => p.id))
        .gte('scheduled_date', today)
        .lte('scheduled_date', twoWeeksOut)
        .order('scheduled_date');

      if (!tasks) return [];

      return tasks.map(task => {
        const project = projects.find(p => p.id === task.project_id);
        const launchName = project?.name.replace('🚀 ', '') || 'Launch';
        const daysAway = differenceInDays(new Date(task.scheduled_date), new Date());

        return {
          id: task.task_id,
          text: task.task_text,
          date: task.scheduled_date,
          daysAway,
          type: 'task' as const,
          launchName,
          completed: task.status === 'done',
        };
      });
    },
    enabled: !!user && launches.length > 0,
    staleTime: 60_000,
  });

  if (launchesLoading || launches.length === 0) {
    return null;
  }

  const activeLaunch = launches[0]; // Primary launch
  const incompleteMilestones = upcomingTasks.filter(m => !m.completed).slice(0, 5);
  const completedThisWeek = upcomingTasks.filter(m => m.completed && m.daysAway <= 7).length;

  return (
    <Card className="border-orange-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Launch Milestones</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={activeLaunch.isLive 
              ? 'bg-green-500/10 text-green-600 border-green-500/30 animate-pulse' 
              : 'bg-orange-500/10 text-orange-600 border-orange-500/30'
            }
          >
            {activeLaunch.isLive ? '🔴 LIVE NOW' : `${activeLaunch.daysUntilOpen}d until open`}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span>{activeLaunch.name}</span>
          {activeLaunch.revenue_goal && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                ${activeLaunch.revenue_goal.toLocaleString()} goal
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Launch tasks complete</span>
            <span className="font-medium">{activeLaunch.taskPercent}%</span>
          </div>
          <Progress value={activeLaunch.taskPercent} className="h-2" />
        </div>

        {/* Key Dates */}
        <div className="flex items-center gap-4 text-xs py-2 px-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Cart Opens: <strong>{format(new Date(activeLaunch.cart_opens), 'MMM d')}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Closes: <strong>{format(new Date(activeLaunch.cart_closes), 'MMM d')}</strong></span>
          </div>
        </div>

        {/* Upcoming Milestones */}
        {incompleteMilestones.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Next Up
            </p>
            <div className="space-y-1.5">
              {incompleteMilestones.slice(0, 3).map(milestone => (
                <div 
                  key={milestone.id}
                  className="flex items-center gap-2 text-sm p-2 rounded-md bg-card border"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    milestone.daysAway === 0 ? 'bg-destructive animate-pulse' :
                    milestone.daysAway <= 2 ? 'bg-warning' : 'bg-muted-foreground'
                  }`} />
                  <span className="flex-1 truncate">{milestone.text}</span>
                  <Badge variant="secondary" className="text-xs">
                    {milestone.daysAway === 0 ? 'Today' : 
                     milestone.daysAway === 1 ? 'Tomorrow' : 
                     `${milestone.daysAway}d`}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed This Week */}
        {completedThisWeek > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{completedThisWeek} milestones completed this week</span>
          </div>
        )}

        {/* View Project Button */}
        {activeLaunch.project_id && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2"
            onClick={() => navigate(`/projects/${activeLaunch.project_id}`)}
          >
            View Full Launch Plan
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
