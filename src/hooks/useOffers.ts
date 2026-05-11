import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Offer {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  offer_type: string | null;
  price: number | null;
  currency: string | null;
  status: string;
  color: string | null;
  url: string | null;
  launch_id: string | null;
  project_id: string | null;
  revenue_goal: number | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export type OfferInput = Partial<Omit<Offer, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  name: string;
};

export function useOffers() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['offers', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Offer[]> => {
      const { data, error } = await supabase
        .from('offers' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Offer[];
    },
  });

  const createOffer = useMutation({
    mutationFn: async (input: OfferInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('offers' as any)
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers', user?.id] });
      toast.success('Offer added');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to add offer'),
  });

  const updateOffer = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<OfferInput>) => {
      const { data, error } = await supabase
        .from('offers' as any)
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers', user?.id] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to update offer'),
  });

  const deleteOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('offers' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers', user?.id] });
      toast.success('Offer deleted');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete offer'),
  });

  return { ...query, createOffer, updateOffer, deleteOffer };
}
