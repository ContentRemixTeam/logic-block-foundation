// Hook for managing launch templates (reusable launch configurations)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface LaunchTemplate {
  id: string;
  user_id: string;
  source_launch_id: string | null;
  name: string;
  offer_type: string | null;
  offer_name: string | null;
  price_point: number | null;
  timeline_duration: string | null;
  revenue_goal_tier: string | null;
  custom_revenue_goal: number | null;
  pre_launch_config: Record<string, any>;
  launch_week_config: Record<string, any>;
  post_launch_config: Record<string, any>;
  lessons_what_worked: string | null;
  lessons_what_to_improve: string | null;
  lessons_would_do_differently: string | null;
  lessons_energy_rating: number | null;
  times_used: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  source_launch_id?: string;
  offer_type?: string;
  offer_name?: string;
  price_point?: number;
  timeline_duration?: string;
  revenue_goal_tier?: string;
  custom_revenue_goal?: number;
  pre_launch_config?: Record<string, any>;
  launch_week_config?: Record<string, any>;
  post_launch_config?: Record<string, any>;
  lessons_what_worked?: string;
  lessons_what_to_improve?: string;
  lessons_would_do_differently?: string;
  lessons_energy_rating?: number;
}

export function useLaunchTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all templates for the user
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['launch-templates', user?.id],
    queryFn: async (): Promise<LaunchTemplate[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('launch_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching launch templates:', error);
        return [];
      }

      return (data || []) as LaunchTemplate[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Create a new template
  const createTemplate = useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('launch_templates')
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-templates'] });
      toast.success('Template saved!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('A template with this name already exists');
      } else {
        toast.error('Failed to save template');
      }
    },
  });

  // Update an existing template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LaunchTemplate> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('launch_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-templates'] });
      toast.success('Template updated!');
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  // Delete a template
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('launch_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-templates'] });
      toast.success('Template deleted');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  // Mark a template as used (increment counter and update timestamp)
  const markTemplateUsed = useMutation({
    mutationFn: async (templateId: string) => {
      if (!user) throw new Error('Not authenticated');

      // First get current times_used
      const { data: template } = await supabase
        .from('launch_templates')
        .select('times_used')
        .eq('id', templateId)
        .single();

      const currentCount = template?.times_used || 0;

      const { error } = await supabase
        .from('launch_templates')
        .update({
          times_used: currentCount + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-templates'] });
    },
  });

  // Create template from a completed launch with debrief
  const createFromLaunchDebrief = useMutation({
    mutationFn: async ({ 
      launchId, 
      templateName 
    }: { 
      launchId: string; 
      templateName: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch launch details
      const { data: launch, error: launchError } = await supabase
        .from('launches')
        .select('*')
        .eq('id', launchId)
        .eq('user_id', user.id)
        .single();

      if (launchError || !launch) throw new Error('Launch not found');

      // Fetch debrief if exists
      const { data: debrief } = await supabase
        .from('launch_debriefs')
        .select('*')
        .eq('launch_id', launchId)
        .eq('user_id', user.id)
        .maybeSingle();

      // Create template with launch config and debrief lessons
      const { data, error } = await supabase
        .from('launch_templates')
        .insert({
          user_id: user.id,
          source_launch_id: launchId,
          name: templateName,
          offer_type: launch.offer_type,
          offer_name: launch.name,
          price_point: (launch as any).price || (launch as any).full_price || null,
          revenue_goal_tier: launch.revenue_goal_tier,
          custom_revenue_goal: launch.revenue_goal,
          // Lessons from debrief
          lessons_what_worked: debrief?.what_worked || null,
          lessons_what_to_improve: debrief?.what_to_improve || null,
          lessons_would_do_differently: debrief?.would_do_differently || null,
          lessons_energy_rating: debrief?.energy_rating || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-templates'] });
      toast.success('Template created from launch!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('A template with this name already exists');
      } else {
        toast.error('Failed to create template');
      }
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    markTemplateUsed,
    createFromLaunchDebrief,
  };
}
