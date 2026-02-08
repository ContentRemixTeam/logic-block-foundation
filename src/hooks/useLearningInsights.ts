import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { AdaptiveLearningService } from '@/lib/adaptive-learning-service';
import { LearningInsights, DEFAULT_LEARNING_INSIGHTS } from '@/types/learningInsights';

export function useLearningInsights() {
  const { user } = useAuth();
  
  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['learning-insights', user?.id],
    queryFn: async (): Promise<LearningInsights> => {
      if (!user?.id) return DEFAULT_LEARNING_INSIGHTS;
      return AdaptiveLearningService.getLearningInsights(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return {
    insights: insights || DEFAULT_LEARNING_INSIGHTS,
    isLoading,
    error,
    hasEnoughData: insights?.hasEnoughData || false,
  };
}
