import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UseOfferTrackingOptions {
  projectId: string;
  launchId?: string;
  cartOpens: string;
  cartCloses: string;
}

export function useOfferTracking({ projectId, cartOpens, cartCloses }: UseOfferTrackingOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Query for today's offer status
  const { data, isLoading } = useQuery({
    queryKey: ['offer-tracking', projectId, today, user?.id],
    queryFn: async () => {
      if (!user?.id) return { offersToday: 0, offerMade: false };

      // Count completed offer tasks for today
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('task_type', 'offer')
        .eq('is_completed', true)
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);

      return {
        offersToday: count || 0,
        offerMade: (count || 0) > 0,
      };
    },
    enabled: !!user?.id && !!projectId,
    staleTime: 30 * 1000,
  });

  // Query for launch-wide sales stats
  const { data: salesStats } = useQuery({
    queryKey: ['launch-sales-stats', projectId, cartOpens, cartCloses, user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalSales: 0, totalRevenue: 0 };

      const { data: sales } = await supabase
        .from('sales_log')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', cartOpens)
        .lte('date', cartCloses);

      const totalRevenue = sales?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

      return {
        totalSales: sales?.length || 0,
        totalRevenue,
      };
    },
    enabled: !!user?.id && !!cartOpens && !!cartCloses,
    staleTime: 60 * 1000,
  });

  // Mutation to log an offer
  const logOfferMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Find an uncompleted offer task for today and complete it
      const { data: offerTask } = await supabase
        .from('tasks')
        .select('task_id')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('task_type', 'offer')
        .eq('scheduled_date', today)
        .eq('is_completed', false)
        .limit(1)
        .maybeSingle();

      if (offerTask) {
        const { error } = await supabase
          .from('tasks')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
            status: 'done',
          })
          .eq('task_id', offerTask.task_id);

        if (error) throw error;
      } else {
        // No pending offer task - create a completed one
        const { error } = await supabase.from('tasks').insert({
          user_id: user.id,
          project_id: projectId,
          task_text: `Made an offer (${format(new Date(), 'h:mm a')})`,
          task_type: 'offer',
          scheduled_date: today,
          is_completed: true,
          completed_at: new Date().toISOString(),
          status: 'done',
          is_system_generated: false,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-tracking', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      toast.success('Offer logged! 🚀');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to log offer');
    },
  });

  return {
    offersToday: data?.offersToday || 0,
    offerMade: data?.offerMade || false,
    totalSales: salesStats?.totalSales || 0,
    totalRevenue: salesStats?.totalRevenue || 0,
    logOffer: () => logOfferMutation.mutateAsync(),
    isLogging: logOfferMutation.isPending,
    isLoading,
  };
}
