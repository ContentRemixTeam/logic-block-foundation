import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO } from 'date-fns';
import { CalendarItem } from '@/lib/calendarConstants';

interface UseEditorialCalendarOptions {
  weekStart: Date;
}

export function useEditorialCalendar({ weekStart }: UseEditorialCalendarOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Calculate week range (Monday-Sunday)
  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekStartStr = format(weekStartDate, 'yyyy-MM-dd');
  const weekEndStr = format(weekEndDate, 'yyyy-MM-dd');

  // Fetch content items for the week
  // Use proper grouped OR: items appear if creation OR publish date falls within week range
  const contentItemsQuery = useQuery({
    queryKey: ['editorial-calendar-content', user?.id, weekStartStr],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('content_items')
        .select('id, title, type, channel, planned_creation_date, planned_publish_date, status')
        .eq('user_id', user.id)
        .or(
          `and(planned_creation_date.gte.${weekStartStr},planned_creation_date.lte.${weekEndStr}),` +
          `and(planned_publish_date.gte.${weekStartStr},planned_publish_date.lte.${weekEndStr})`
        );

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch content plan items for the week
  // Filter out items that have been promoted to content_items to prevent duplicates
  const planItemsQuery = useQuery({
    queryKey: ['editorial-calendar-plans', user?.id, weekStartStr],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('content_plan_items')
        .select('id, title, content_type, channel, planned_date, status')
        .eq('user_id', user.id)
        .is('content_item_id', null) // Only unlinked plan items to prevent duplicates
        .gte('planned_date', weekStartStr)
        .lte('planned_date', weekEndStr);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch tasks with content calendar data for the week
  // Use proper grouped OR: tasks appear if creation OR publish date falls within week range
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
    queryKey: ['editorial-calendar-unscheduled', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('content_items')
        .select('id, title, type, channel, planned_creation_date, planned_publish_date, status')
        .eq('user_id', user.id)
        .is('planned_publish_date', null)
        .neq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);

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
      creationDate: null, // Plan items don't have creation date
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
        // Plan items only have planned_date (publish)
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
      // Invalidate all calendar queries
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-content'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-plans'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
    },
  });

  return {
    items: allItems,
    unscheduledItems,
    getItemsForDay,
    updateItemDate: updateItemDate.mutate,
    isUpdating: updateItemDate.isPending,
    isLoading: contentItemsQuery.isLoading || planItemsQuery.isLoading || tasksQuery.isLoading,
    error: contentItemsQuery.error || planItemsQuery.error || tasksQuery.error,
    weekStartDate,
    weekEndDate,
    refetch: () => {
      contentItemsQuery.refetch();
      planItemsQuery.refetch();
      tasksQuery.refetch();
      unscheduledQuery.refetch();
    },
  };
}
