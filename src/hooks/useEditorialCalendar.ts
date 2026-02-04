import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { CalendarItem } from '@/lib/calendarConstants';

export interface EditorialCampaign {
  id: string;
  name: string;
  cart_opens: string | null;
  cart_closes: string | null;
  status: string;
  display_color: string;
}

interface UseEditorialCalendarOptions {
  weekStart: Date;
  campaignFilter?: string | null;
}

const CAMPAIGN_COLORS = ['#8B5CF6', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#14B8A6', '#F97316'];

export function useEditorialCalendar({ weekStart, campaignFilter }: UseEditorialCalendarOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Calculate week range (Monday-Sunday)
  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekStartStr = format(weekStartDate, 'yyyy-MM-dd');
  const weekEndStr = format(weekEndDate, 'yyyy-MM-dd');

  // Fetch campaigns/launches that overlap with current week
  const campaignsQuery = useQuery({
    queryKey: ['editorial-calendar-campaigns', user?.id, weekStartStr],
    queryFn: async (): Promise<EditorialCampaign[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('launches')
        .select('id, name, cart_opens, cart_closes, status')
        .eq('user_id', user.id)
        .in('status', ['planning', 'active', 'scheduled', 'pre-launch', 'runway'])
        .not('cart_opens', 'is', null)
        .not('cart_closes', 'is', null)
        .lte('cart_opens', weekEndStr)
        .gte('cart_closes', weekStartStr);

      if (error) throw error;

      // Assign colors based on index
      return (data || []).map((campaign, idx) => ({
        ...campaign,
        display_color: CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length],
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch content items for the week
  const contentItemsQuery = useQuery({
    queryKey: ['editorial-calendar-content', user?.id, weekStartStr, campaignFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('content_items')
        .select('id, title, type, channel, planned_creation_date, planned_publish_date, status, launch_id')
        .eq('user_id', user.id)
        .or(
          `and(planned_creation_date.gte.${weekStartStr},planned_creation_date.lte.${weekEndStr}),` +
          `and(planned_publish_date.gte.${weekStartStr},planned_publish_date.lte.${weekEndStr})`
        );

      // Apply campaign filter if set
      if (campaignFilter) {
        query = query.eq('launch_id', campaignFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch content plan items for the week
  const planItemsQuery = useQuery({
    queryKey: ['editorial-calendar-plans', user?.id, weekStartStr, campaignFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('content_plan_items')
        .select('id, title, content_type, channel, planned_date, status, plan_id')
        .eq('user_id', user.id)
        .is('content_item_id', null)
        .gte('planned_date', weekStartStr)
        .lte('planned_date', weekEndStr);

      // If filtering by campaign, we need to join through content_plans
      // For now, plan items don't have direct launch_id, so they show regardless of filter
      // This is intentional - plan items are for planning before linking to campaigns

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch tasks with content calendar data for the week
  const tasksQuery = useQuery({
    queryKey: ['editorial-calendar-tasks', user?.id, weekStartStr],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('task_id, task_text, content_type, content_channel, content_creation_date, content_publish_date, is_completed')
        .eq('user_id', user.id)
        .not('content_type', 'is', null)
        .or(
          `and(content_creation_date.gte.${weekStartStr},content_creation_date.lte.${weekEndStr}),` +
          `and(content_publish_date.gte.${weekStartStr},content_publish_date.lte.${weekEndStr})`
        );

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch unscheduled content items
  const unscheduledQuery = useQuery({
    queryKey: ['editorial-calendar-unscheduled', user?.id, campaignFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('content_items')
        .select('id, title, type, channel, planned_creation_date, planned_publish_date, status, launch_id')
        .eq('user_id', user.id)
        .is('planned_publish_date', null)
        .neq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);

      if (campaignFilter) {
        query = query.eq('launch_id', campaignFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Combine and normalize all items
  const allItems: CalendarItem[] = [
    // Content items
    ...(contentItemsQuery.data || []).map(item => ({
      id: `content-${item.id}`,
      title: item.title,
      type: item.type,
      channel: item.channel,
      creationDate: item.planned_creation_date,
      publishDate: item.planned_publish_date,
      source: 'content_item' as const,
      status: item.status,
      sourceId: item.id,
    })),
    // Plan items (only show if not already linked to a content item)
    ...(planItemsQuery.data || []).map(item => ({
      id: `plan-${item.id}`,
      title: item.title,
      type: item.content_type,
      channel: item.channel,
      creationDate: null,
      publishDate: item.planned_date,
      source: 'content_plan_item' as const,
      status: item.status,
      sourceId: item.id,
    })),
    // Tasks with content data
    ...(tasksQuery.data || []).map(item => ({
      id: `task-${item.task_id}`,
      title: item.task_text,
      type: item.content_type,
      channel: item.content_channel,
      creationDate: item.content_creation_date,
      publishDate: item.content_publish_date,
      source: 'task' as const,
      status: item.is_completed ? 'completed' : 'pending',
      sourceId: item.task_id,
    })),
  ];

  // Unscheduled items
  const unscheduledItems: CalendarItem[] = (unscheduledQuery.data || []).map(item => ({
    id: `content-${item.id}`,
    title: item.title,
    type: item.type,
    channel: item.channel,
    creationDate: item.planned_creation_date,
    publishDate: item.planned_publish_date,
    source: 'content_item' as const,
    status: item.status,
    sourceId: item.id,
  }));

  // Get items for a specific day and lane
  const getItemsForDay = (date: Date, lane: 'create' | 'publish'): CalendarItem[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return allItems.filter(item => {
      const targetDate = lane === 'create' ? item.creationDate : item.publishDate;
      return targetDate === dateStr;
    });
  };

  // Update item dates
  const updateItemDate = useMutation({
    mutationFn: async ({ 
      item, 
      lane, 
      newDate 
    }: { 
      item: CalendarItem; 
      lane: 'create' | 'publish'; 
      newDate: string | null;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const field = lane === 'create' ? 'planned_creation_date' : 'planned_publish_date';

      if (item.source === 'content_item') {
        const { error } = await supabase
          .from('content_items')
          .update({ [field]: newDate })
          .eq('id', item.sourceId);
        if (error) throw error;
      } else if (item.source === 'content_plan_item') {
        if (lane === 'publish') {
          const { error } = await supabase
            .from('content_plan_items')
            .update({ planned_date: newDate })
            .eq('id', item.sourceId);
          if (error) throw error;
        }
      } else if (item.source === 'task') {
        const taskField = lane === 'create' ? 'content_creation_date' : 'content_publish_date';
        const { error } = await supabase
          .from('tasks')
          .update({ [taskField]: newDate })
          .eq('task_id', item.sourceId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-content'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-plans'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
    },
  });

  return {
    items: allItems,
    unscheduledItems,
    campaigns: campaignsQuery.data || [],
    getItemsForDay,
    updateItemDate: updateItemDate.mutate,
    updateItemDateAsync: updateItemDate.mutateAsync,
    isUpdating: updateItemDate.isPending,
    updateError: updateItemDate.error,
    isLoading: contentItemsQuery.isLoading || planItemsQuery.isLoading || tasksQuery.isLoading || campaignsQuery.isLoading,
    error: contentItemsQuery.error || planItemsQuery.error || tasksQuery.error || campaignsQuery.error,
    weekStartDate,
    weekEndDate,
    refetch: () => {
      contentItemsQuery.refetch();
      planItemsQuery.refetch();
      tasksQuery.refetch();
      unscheduledQuery.refetch();
      campaignsQuery.refetch();
    },
  };
}
