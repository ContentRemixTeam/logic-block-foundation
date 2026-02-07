import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentType } from '@/types/aiCopywriting';

// Map AI content types to calendar types and channels
export function mapContentTypeToCalendar(aiType: ContentType): { type: string; channel: string } {
  // Email types
  if (aiType.includes('email')) {
    return { type: 'email', channel: 'email' };
  }
  // Sales page types
  if (aiType.includes('sales_page')) {
    return { type: 'page', channel: 'website' };
  }
  // Social post types
  if (aiType === 'social_post') {
    return { type: 'post', channel: '' }; // User selects platform
  }
  // Default to post
  return { type: 'post', channel: '' };
}

// Generate a suggested title based on content type
export function getSuggestedTitle(contentType: ContentType): string {
  const labelMap: Record<string, string> = {
    welcome_email_1: 'Welcome Email #1',
    welcome_email_2: 'Welcome Email #2',
    welcome_email_3: 'Welcome Email #3',
    welcome_email_4: 'Welcome Email #4',
    welcome_email_5: 'Welcome Email #5',
    promo_email: 'Promotional Email',
    sales_page_headline: 'Sales Page Headline',
    sales_page_body: 'Sales Page Body',
    social_post: 'Social Media Post',
  };
  return labelMap[contentType] || contentType.replace(/_/g, ' ');
}

interface SaveToVaultParams {
  title: string;
  body: string;
  contentType: ContentType;
  channel?: string;
  tags?: string[];
  generationId?: string;
}

export function useSaveToVault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveToVaultParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const calendarMapping = mapContentTypeToCalendar(params.contentType);

      const { data, error } = await supabase
        .from('content_items')
        .insert({
          user_id: user.id,
          title: params.title,
          body: params.body,
          type: calendarMapping.type,
          channel: params.channel || calendarMapping.channel || null,
          status: 'Draft',
          show_in_vault: true,
          tags: params.tags || [],
          ai_generation_id: params.generationId || null,
          // No dates - vault only, unscheduled
          planned_creation_date: null,
          planned_publish_date: null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['content-vault-items'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
      queryClient.invalidateQueries({ queryKey: ['content-for-planner'] });
      toast.success('Saved to Content Vault!');
    },
    onError: (error) => {
      console.error('Save to vault error:', error);
      toast.error('Failed to save to vault');
    },
  });
}
