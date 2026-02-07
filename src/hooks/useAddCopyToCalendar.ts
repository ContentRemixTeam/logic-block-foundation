import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ContentType } from '@/types/aiCopywriting';
import { toast } from 'sonner';

interface AddToCalendarParams {
  generatedCopy: string;
  contentType: ContentType;
  generationId: string;
  title: string;
  platform: string;
  creationDate?: string;
  publishDate?: string;
  campaignId?: string;
}

/**
 * Maps AI content types to Editorial Calendar types and channels
 */
export function mapContentTypeToCalendar(aiType: ContentType): { type: string; channel: string } {
  if (aiType.includes('email')) {
    return { type: 'email', channel: 'email' };
  }
  if (aiType.includes('sales_page')) {
    return { type: 'page', channel: 'website' };
  }
  if (aiType === 'social_post') {
    return { type: 'post', channel: '' }; // User selects platform
  }
  return { type: 'post', channel: '' };
}

/**
 * Gets a suggested title based on content type
 */
export function getSuggestedTitle(contentType: ContentType): string {
  const labels: Record<string, string> = {
    welcome_email_1: 'Welcome Email #1 - Delivery',
    welcome_email_2: 'Welcome Email #2 - Story',
    welcome_email_3: 'Welcome Email #3 - Teaching',
    welcome_email_4: 'Welcome Email #4 - Social Proof',
    welcome_email_5: 'Welcome Email #5 - Offer',
    promo_email: 'Promotional Email',
    sales_page_headline: 'Sales Page Headline',
    sales_page_body: 'Sales Page Copy',
    social_post: 'Social Post',
  };
  return labels[contentType] || contentType.replace(/_/g, ' ');
}

/**
 * Hook to add AI-generated copy to the Editorial Calendar
 */
export function useAddCopyToCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AddToCalendarParams) => {
      if (!user) throw new Error('Not authenticated');

      const { 
        generatedCopy, 
        contentType, 
        generationId, 
        title, 
        platform, 
        creationDate, 
        publishDate, 
        campaignId 
      } = params;

      // Get type mapping
      const { type } = mapContentTypeToCalendar(contentType);

      // Create content_items record
      const { data, error } = await supabase
        .from('content_items')
        .insert({
          user_id: user.id,
          title: title.trim(),
          body: generatedCopy,
          type: type,
          channel: platform || null,
          status: 'Draft',
          planned_creation_date: creationDate || null,
          planned_publish_date: publishDate || null,
          launch_id: campaignId || null,
          ai_generation_id: generationId,
          show_in_vault: true,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-content'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
      queryClient.invalidateQueries({ queryKey: ['content-vault-items'] });
      queryClient.invalidateQueries({ queryKey: ['content-for-planner'] });
      toast.success('Added to Editorial Calendar!');
    },
    onError: (error: Error) => {
      console.error('Failed to add to calendar:', error);
      toast.error('Failed to add to calendar. Please try again.');
    },
  });
}
