import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CoachingCallPrep {
  id: string;
  user_id: string;
  call_date: string;
  metrics: Record<string, unknown> | null;
  main_question: string | null;
  what_tried: string | null;
  blocking_thought: string | null;
  coaching_need: string | null;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export function useCoachingPrep(prepId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch single prep if ID provided
  const { data: prep, isLoading } = useQuery({
    queryKey: ['coaching-prep', prepId],
    queryFn: async () => {
      if (!user || !prepId) return null;
      
      const { data, error } = await supabase
        .from('coaching_call_prep')
        .select('*')
        .eq('id', prepId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as CoachingCallPrep | null;
    },
    enabled: !!user && !!prepId,
  });

  // Fetch all preps for the user
  const { data: allPreps = [], isLoading: allLoading } = useQuery({
    queryKey: ['coaching-preps', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('coaching_call_prep')
        .select('*')
        .eq('user_id', user.id)
        .order('call_date', { ascending: false });
      
      if (error) throw error;
      return data as CoachingCallPrep[];
    },
    enabled: !!user,
  });

  // Create new prep
  const createPrep = useMutation({
    mutationFn: async (values: Partial<CoachingCallPrep>) => {
      if (!user) throw new Error('Not authenticated');
      
      const insertData = {
        user_id: user.id,
        call_date: values.call_date || format(new Date(), 'yyyy-MM-dd'),
        metrics: values.metrics as Record<string, unknown> || null,
        main_question: values.main_question || null,
        what_tried: values.what_tried || null,
        blocking_thought: values.blocking_thought || null,
        coaching_need: values.coaching_need || null,
      };
      
      const { data, error } = await supabase
        .from('coaching_call_prep')
        .insert([insertData] as any)
        .select()
        .single();
      
      if (error) throw error;
      return data as CoachingCallPrep;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['coaching-preps'] });
      toast.success('Coaching prep created');
      return data;
    },
    onError: () => {
      toast.error('Failed to create coaching prep');
    },
  });

  // Update prep
  const updatePrep = useMutation({
    mutationFn: async ({ id, ...values }: Partial<CoachingCallPrep> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const updateData: Record<string, unknown> = {
        ...values,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('coaching_call_prep')
        .update(updateData as unknown as Record<string, unknown>)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as CoachingCallPrep;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-prep'] });
      queryClient.invalidateQueries({ queryKey: ['coaching-preps'] });
      toast.success('Coaching prep saved');
    },
    onError: () => {
      toast.error('Failed to save coaching prep');
    },
  });

  // Delete prep
  const deletePrep = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('coaching_call_prep')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-preps'] });
      toast.success('Coaching prep deleted');
    },
    onError: () => {
      toast.error('Failed to delete coaching prep');
    },
  });

  return {
    prep,
    allPreps,
    isLoading: isLoading || allLoading,
    createPrep,
    updatePrep,
    deletePrep,
  };
}
