import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarSettings } from './useCalendarSettings';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

export interface ContentPlannerItem {
  id: string;
  title: string;
  channel: string | null;
  type: string;
  plannedCreationDate: string | null;
  plannedPublishDate: string | null;
  scheduledTime: string | null;
  status: string;
}

export function useContentForPlanner() {
  const { user } = useAuth();
  const { settings } = useCalendarSettings();

  // Fetch content items that have scheduled dates
  const { data: allContent = [], isLoading } = useQuery({
    queryKey: ['content-for-planner', user?.id],
    queryFn: async (): Promise<ContentPlannerItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('content_items')
        .select('id, title, channel, type, planned_creation_date, planned_publish_date, scheduled_time, status')
        .eq('user_id', user.id)
        .or('planned_creation_date.not.is.null,planned_publish_date.not.is.null')
        .order('planned_publish_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching content for planner:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        channel: item.channel,
        type: item.type,
        plannedCreationDate: item.planned_creation_date,
        plannedPublishDate: item.planned_publish_date,
        scheduledTime: item.scheduled_time,
        status: item.status,
      }));
    },
    enabled: !!user?.id && settings.showContentInPlanners,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter content for a specific date (daily planner)
  const getContentForDate = (date: Date): ContentPlannerItem[] => {
    if (!settings.showContentInPlanners) return [];
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return allContent.filter(item => 
      item.plannedCreationDate === dateStr || 
      item.plannedPublishDate === dateStr
    );
  };

  // Filter content for a week (weekly planner)
  const getContentForWeek = (weekStart: Date): ContentPlannerItem[] => {
    if (!settings.showContentInPlanners) return [];
    
    const start = startOfWeek(weekStart, { weekStartsOn: 1 });
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    return allContent.filter(item => {
      const createDate = item.plannedCreationDate ? parseISO(item.plannedCreationDate) : null;
      const publishDate = item.plannedPublishDate ? parseISO(item.plannedPublishDate) : null;
      
      const createInRange = createDate && isWithinInterval(createDate, { start, end });
      const publishInRange = publishDate && isWithinInterval(publishDate, { start, end });
      
      return createInRange || publishInRange;
    });
  };

  // Filter content for a month (monthly planner)
  const getContentForMonth = (monthDate: Date): ContentPlannerItem[] => {
    if (!settings.showContentInPlanners) return [];
    
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    
    return allContent.filter(item => {
      const createDate = item.plannedCreationDate ? parseISO(item.plannedCreationDate) : null;
      const publishDate = item.plannedPublishDate ? parseISO(item.plannedPublishDate) : null;
      
      const createInRange = createDate && isWithinInterval(createDate, { start, end });
      const publishInRange = publishDate && isWithinInterval(publishDate, { start, end });
      
      return createInRange || publishInRange;
    });
  };

  return {
    allContent,
    isLoading,
    showContentInPlanners: settings.showContentInPlanners,
    getContentForDate,
    getContentForWeek,
    getContentForMonth,
  };
}
