import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WeeklyTimeData {
  week_start: string;
  estimated_minutes: number;
  actual_minutes: number;
  task_count: number;
}

export interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  project_color: string;
  total_minutes: number;
  task_count: number;
}

export interface TagBreakdown {
  tag: string;
  total_minutes: number;
  estimated_minutes: number;
  task_count: number;
  accuracy: number | null;
}

export interface RecurringTaskAverage {
  parent_task_id: string;
  task_text: string;
  instance_count: number;
  avg_actual_minutes: number;
  avg_estimated_minutes: number;
}

export interface AccuracyMetrics {
  overall_accuracy_percent: number | null;
  tendency: 'underestimate' | 'overestimate' | 'accurate';
  tendency_percent: number;
  total_estimated_minutes: number;
  total_actual_minutes: number;
  best_estimated_tag: string | null;
  best_estimated_accuracy: number | null;
  worst_estimated_tag: string | null;
  worst_estimated_accuracy: number | null;
}

export interface TimeAnalyticsData {
  weeklyTimeData: WeeklyTimeData[];
  projectBreakdown: ProjectBreakdown[];
  tagBreakdown: TagBreakdown[];
  recurringTaskAverages: RecurringTaskAverage[];
  accuracyMetrics: AccuracyMetrics;
}

export function useTimeAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['time-analytics', user?.id],
    queryFn: async (): Promise<TimeAnalyticsData | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('get-time-analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data as TimeAnalyticsData;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
