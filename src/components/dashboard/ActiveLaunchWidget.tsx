import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays, differenceInHours, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Rocket, 
  Target, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  ChevronRight,
  Loader2
} from 'lucide-react';

type LaunchPhase = 'pre_launch' | 'live' | 'last_48h' | 'closed';

interface ActiveLaunch {
  id: string;
  name: string;
  cart_opens: string;
  cart_closes: string;
  revenue_goal?: number | null;
  price_per_sale?: number | null;
  project_id?: string;
  daysUntilOpen: number;
  daysUntilClose: number;
  hoursUntilClose: number;
  isLive: boolean;
  phase: string;
}

interface ActiveLaunchWidgetProps {
  launch: ActiveLaunch & {
    launchState: string;
    cartOpensFormatted: string;
    cartClosesFormatted: string;
  };
  gradientClass?: string;
  className?: string;
}

export function ActiveLaunchWidget({ launch, gradientClass = 'from-orange-500/5', className }: ActiveLaunchWidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loggingOffer, setLoggingOffer] = useState(false);

  // Get today's offer status
  const { data: todayOfferStatus } = useQuery({
    queryKey: ['today-offer-status', launch.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return { offerMade: false, salesLogged: 0, revenueLogged: 0 };
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Check for completed offer tasks today
      const { count: offerTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('project_id', launch.project_id)
        .eq('task_type', 'offer')
        .eq('is_completed', true)
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);
      
      // Get sales logged for this launch
      const { data: sales } = await supabase
        .from('sales_log')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', launch.cart_opens)
        .lte('date', launch.cart_closes);
      
      const totalRevenue = sales?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      
      return {
        offerMade: (offerTasks || 0) > 0,
        salesLogged: sales?.length || 0,
        revenueLogged: totalRevenue,
      };
    },
    enabled: !!user?.id && launch.isLive,
    staleTime: 30 * 1000,
  });

  // Get task completion stats
  const { data: taskStats } = useQuery({
    queryKey: ['launch-task-stats', launch.project_id, user?.id],
    queryFn: async () => {
      if (!user?.id || !launch.project_id) return { total: 0, completed: 0, percentage: 0 };
      
      const { count: total } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('project_id', launch.project_id);
      
      const { count: completed } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('project_id', launch.project_id)
        .eq('is_completed', true);
      
      const t = total || 0;
      const c = completed || 0;
      
      return {
        total: t,
        completed: c,
        percentage: t > 0 ? Math.round((c / t) * 100) : 0,
      };
    },
    enabled: !!user?.id && !!launch.project_id,
  });

  // Log offer mutation
  const logOfferMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Find an uncompleted offer task for today and complete it
      const { data: offerTask } = await supabase
        .from('tasks')
        .select('task_id')
        .eq('user_id', user.id)
        .eq('project_id', launch.project_id)
        .eq('task_type', 'offer')
        .eq('scheduled_date', today)
        .eq('is_completed', false)
        .limit(1)
        .maybeSingle();
      
      if (offerTask) {
        await supabase
          .from('tasks')
          .update({ 
            is_completed: true, 
            completed_at: new Date().toISOString(),
            status: 'done'
          })
          .eq('task_id', offerTask.task_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-offer-status'] });
      queryClient.invalidateQueries({ queryKey: ['launch-task-stats'] });
      toast.success('Offer logged! Keep pushing! 🚀');
    },
    onError: () => {
      toast.error('Failed to log offer');
    },
  });

  const handleLogOffer = async () => {
    setLoggingOffer(true);
    await logOfferMutation.mutateAsync();
    setLoggingOffer(false);
  };

  // Determine phase styling
  const getPhaseStyles = () => {
    if (launch.hoursUntilClose <= 48 && launch.hoursUntilClose > 0) {
      return {
        badge: 'bg-red-500 text-white animate-pulse',
        text: `CART CLOSES IN ${launch.hoursUntilClose}h`,
        urgency: 'high',
      };
    }
    if (launch.isLive) {
      return {
        badge: 'bg-green-500 text-white',
        text: 'LIVE NOW',
        urgency: 'medium',
      };
    }
    if (launch.daysUntilOpen <= 7) {
      return {
        badge: 'bg-amber-500 text-white',
        text: `${launch.daysUntilOpen} DAYS TO GO`,
        urgency: 'medium',
      };
    }
    return {
      badge: 'bg-blue-500 text-white',
      text: `Opens ${launch.cartOpensFormatted}`,
      urgency: 'low',
    };
  };

  const phaseStyles = getPhaseStyles();
  const revenueProgress = launch.revenue_goal && todayOfferStatus?.revenueLogged
    ? Math.round((todayOfferStatus.revenueLogged / launch.revenue_goal) * 100)
    : 0;

  return (
    <Card className={cn(
      "overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300",
      phaseStyles.urgency === 'high' && "border-red-500/50",
      className
    )}>
      <CardHeader className={cn("bg-gradient-to-r to-transparent pb-3", gradientClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              phaseStyles.urgency === 'high' ? "bg-red-500/20" : "bg-orange-500/20"
            )}>
              {phaseStyles.urgency === 'high' ? (
                <Flame className="h-5 w-5 text-red-500" />
              ) : (
                <Rocket className="h-5 w-5 text-orange-500" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{launch.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {launch.cartOpensFormatted} - {launch.cartClosesFormatted}
              </p>
            </div>
          </div>
          <Badge className={phaseStyles.badge}>
            {phaseStyles.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Task Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Task Progress</span>
            <span className="font-medium">{taskStats?.completed || 0}/{taskStats?.total || 0}</span>
          </div>
          <Progress value={taskStats?.percentage || 0} className="h-2" />
        </div>

        {/* Revenue Progress (if live and goal set) */}
        {launch.isLive && launch.revenue_goal && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Revenue
              </span>
              <span className="font-medium">
                ${(todayOfferStatus?.revenueLogged || 0).toLocaleString()} / ${launch.revenue_goal.toLocaleString()}
              </span>
            </div>
            <Progress value={revenueProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {todayOfferStatus?.salesLogged || 0} sales logged
            </p>
          </div>
        )}

        {/* Offer Made Today (if live) */}
        {launch.isLive && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={todayOfferStatus?.offerMade || false}
                onCheckedChange={() => !todayOfferStatus?.offerMade && handleLogOffer()}
                disabled={todayOfferStatus?.offerMade || loggingOffer}
              />
              <span className="text-sm">Made an offer today?</span>
            </div>
            {loggingOffer && <Loader2 className="h-4 w-4 animate-spin" />}
            {todayOfferStatus?.offerMade && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate(`/projects/${launch.project_id}`)}
          >
            View Tasks
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          {launch.isLive && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => navigate('/finances')}
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Log Sale
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
