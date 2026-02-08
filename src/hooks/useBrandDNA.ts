import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BrandDNA, DEFAULT_BRAND_DNA, parseBrandDNA } from '@/types/brandDNA';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export const brandDNAKeys = {
  brandDNA: (userId: string) => ['brand-dna', userId],
};

export function useBrandDNA() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: brandDNAKeys.brandDNA(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) return DEFAULT_BRAND_DNA;
      
      const { data, error } = await supabase
        .from('brand_profiles')
        .select('custom_banned_phrases, frameworks, signature_phrases, emoji_preferences, content_philosophies, brand_values, content_examples')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return DEFAULT_BRAND_DNA;
      
      return parseBrandDNA(data);
    },
    enabled: !!user?.id
  });
  
  const saveMutation = useMutation({
    mutationFn: async (dna: BrandDNA) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Check if profile exists
      const { data: existing } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const dnaForDb = {
        custom_banned_phrases: dna.custom_banned_phrases,
        frameworks: dna.frameworks as unknown as Json,
        signature_phrases: dna.signature_phrases as unknown as Json,
        emoji_preferences: dna.emoji_preferences as unknown as Json,
        content_philosophies: dna.content_philosophies,
        brand_values: dna.brand_values,
        content_examples: dna.content_examples as unknown as Json,
        updated_at: new Date().toISOString()
      };
      
      if (existing) {
        const { error } = await supabase
          .from('brand_profiles')
          .update(dnaForDb)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Create new profile with required fields
        const { error } = await supabase
          .from('brand_profiles')
          .insert({
            user_id: user.id,
            business_name: 'My Business', // Required field
            ...dnaForDb
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandDNAKeys.brandDNA(user?.id || '') });
      toast.success('Brand DNA saved!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });
  
  return {
    brandDNA: query.data || DEFAULT_BRAND_DNA,
    isLoading: query.isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending
  };
}
