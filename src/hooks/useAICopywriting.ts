import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { encryptAPIKey } from '@/lib/encryption';
import { OpenAIService } from '@/lib/openai-service';
import { 
  BrandProfile, 
  UserProduct, 
  UserAPIKey, 
  AICopyGeneration,
  ContentType,
  VoiceProfile
} from '@/types/aiCopywriting';
import { GenerationMode } from '@/types/generationModes';
import { CopyControls } from '@/types/copyControls';
import { BrandDNA } from '@/types/brandDNA';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

// Query Keys
export const aiCopywritingKeys = {
  brandProfile: (userId: string) => ['brand-profile', userId],
  products: (userId: string) => ['user-products', userId],
  apiKey: (userId: string) => ['user-api-key', userId],
  generations: (userId: string) => ['ai-generations', userId],
  recentGenerations: (userId: string) => ['ai-generations', userId, 'recent'],
};

// Helper to cast Json to VoiceProfile
function parseVoiceProfile(json: Json | null): VoiceProfile | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  return json as unknown as VoiceProfile;
}

// Brand Profile Hooks
export function useBrandProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: aiCopywritingKeys.brandProfile(user?.id || ''),
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      
      return {
        ...data,
        voice_profile: parseVoiceProfile(data.voice_profile),
      } as BrandProfile;
    },
    enabled: !!user,
  });
}

export function useSaveBrandProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profile: Partial<BrandProfile>) => {
      if (!user) throw new Error('Not authenticated');
      
      // Ensure we have a valid session before making the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Session expired. Please refresh the page and try again.');
      }
      
      // Convert VoiceProfile to Json for Supabase
      const dbProfile = {
        ...profile,
        voice_profile: profile.voice_profile as unknown as Json,
      };
      
      const { data: existing } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from('brand_profiles')
          .update({ ...dbProfile, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // For insert, business_name is required
        if (!dbProfile.business_name) {
          throw new Error('Business name is required');
        }
        const { data, error } = await supabase
          .from('brand_profiles')
          .insert({ 
            business_name: dbProfile.business_name,
            industry: dbProfile.industry,
            what_you_sell: dbProfile.what_you_sell,
            target_customer: dbProfile.target_customer,
            voice_profile: dbProfile.voice_profile,
            voice_samples: dbProfile.voice_samples,
            transcript_samples: dbProfile.transcript_samples,
            customer_reviews: dbProfile.customer_reviews,
            user_id: user.id 
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.brandProfile(user?.id || '') });
    },
  });
}

// Products Hooks
export function useProducts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: aiCopywritingKeys.products(user?.id || ''),
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserProduct[];
    },
    enabled: !!user,
  });
}

export function useSaveProduct() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<UserProduct, 'id' | 'user_id' | 'created_at'> & { id?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      if (product.id) {
        const { data, error } = await supabase
          .from('user_products')
          .update({
            product_name: product.product_name,
            product_type: product.product_type,
            price: product.price,
            affiliate_link: product.affiliate_link,
            description: product.description,
          })
          .eq('id', product.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('user_products')
          .insert({
            user_id: user.id,
            product_name: product.product_name,
            product_type: product.product_type,
            price: product.price,
            affiliate_link: product.affiliate_link,
            description: product.description,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.products(user?.id || '') });
      toast.success('Product saved');
    },
  });
}

export function useDeleteProduct() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.products(user?.id || '') });
      toast.success('Product deleted');
    },
  });
}

// API Key Hooks
export function useAPIKey() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: aiCopywritingKeys.apiKey(user?.id || ''),
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('id, user_id, key_status, last_tested, created_at, updated_at')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Omit<UserAPIKey, 'encrypted_key'> | null;
    },
    enabled: !!user,
  });
}

export function useSaveAPIKey() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (apiKey: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // Test the key first
      const isValid = await OpenAIService.testAPIKey(apiKey);
      if (!isValid) {
        throw new Error('Invalid API key. Please check and try again.');
      }
      
      // Encrypt the key
      const encryptedKey = await encryptAPIKey(apiKey, user.id);
      
      // Check if key exists
      const { data: existing } = await supabase
        .from('user_api_keys')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (existing) {
        const { error } = await supabase
          .from('user_api_keys')
          .update({
            encrypted_key: encryptedKey,
            key_status: 'valid',
            last_tested: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_api_keys')
          .insert({
            user_id: user.id,
            encrypted_key: encryptedKey,
            key_status: 'valid',
            last_tested: new Date().toISOString(),
          });
        
        if (error) throw error;
      }
      
      return { status: 'valid' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.apiKey(user?.id || '') });
      toast.success('API key saved and verified');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useTestAPIKey() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const apiKey = await OpenAIService.getUserAPIKey(user.id);
      if (!apiKey) throw new Error('No API key configured');
      
      const isValid = await OpenAIService.testAPIKey(apiKey);
      
      // Update status in database
      await supabase
        .from('user_api_keys')
        .update({
          key_status: isValid ? 'valid' : 'invalid',
          last_tested: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      if (!isValid) throw new Error('API key is invalid');
      
      return { status: 'valid' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.apiKey(user?.id || '') });
      toast.success('API key is valid');
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.apiKey(user?.id || '') });
      toast.error(error.message);
    },
  });
}

export function useDeleteAPIKey() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.apiKey(user?.id || '') });
      toast.success('API key removed');
    },
  });
}

// Generation Hooks
export function useGenerations(limit = 50) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: aiCopywritingKeys.generations(user?.id || ''),
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('ai_copy_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as AICopyGeneration[];
    },
    enabled: !!user,
  });
}

export function useRecentGenerations(limit = 5) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: aiCopywritingKeys.recentGenerations(user?.id || ''),
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('ai_copy_generations')
        .select('id, content_type, created_at, user_rating, generated_copy')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Pick<AICopyGeneration, 'id' | 'content_type' | 'created_at' | 'user_rating' | 'generated_copy'>[];
    },
    enabled: !!user,
  });
}

export function useGenerateCopy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      contentType,
      productId,
      additionalContext,
      generationMode = 'premium',
      copyControls,
      brandDNA,
      linkedInTemplateId,
    }: {
      contentType: ContentType;
      productId?: string;
      additionalContext?: string;
      generationMode?: GenerationMode;
      copyControls?: CopyControls;
      brandDNA?: BrandDNA;
      linkedInTemplateId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get brand profile
      const { data: profile } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Get product if selected
      let product = null;
      if (productId) {
        const { data } = await supabase
          .from('user_products')
          .select('*')
          .eq('id', productId)
          .single();
        product = data;
      }
      
      // Get past feedback for this content type
      const { data: pastFeedback } = await supabase
        .from('ai_copy_generations')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_type', contentType)
        .not('user_rating', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Convert profile to expected format
      const businessProfile = profile ? {
        ...profile,
        voice_profile: parseVoiceProfile(profile.voice_profile),
      } : undefined;
      
      // Convert past feedback to expected format
      const formattedFeedback = (pastFeedback || []).map(f => ({
        ...f,
        content_type: f.content_type as ContentType,
        prompt_context: f.prompt_context as Record<string, unknown>,
        generation_mode: f.generation_mode as GenerationMode | undefined,
      }));
      
      // Generate copy
      const result = await OpenAIService.generateCopy(user.id, {
        contentType,
        generationMode,
        copyControls,
        linkedInTemplateId,
        context: {
          businessProfile,
          brandDNA,
          productToPromote: product,
          additionalContext,
          pastFeedback: formattedFeedback,
        },
      });
      
      // Save to database
      const { data: generation, error } = await supabase
        .from('ai_copy_generations')
        .insert({
          user_id: user.id,
          content_type: contentType,
          prompt_context: {
            productId,
            additionalContext,
            linkedInTemplateId,
          },
          generated_copy: result.copy,
          product_promoted: productId || null,
          tokens_used: result.tokensUsed,
          generation_time_ms: result.generationTime,
          generation_mode: generationMode,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...generation,
        generation_mode: generation.generation_mode as GenerationMode | undefined,
      } as AICopyGeneration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.generations(user?.id || '') });
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.recentGenerations(user?.id || '') });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRateCopy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      generationId,
      rating,
      feedbackText,
      feedbackTags,
    }: {
      generationId: string;
      rating: number;
      feedbackText?: string;
      feedbackTags?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('ai_copy_generations')
        .update({
          user_rating: rating,
          feedback_text: feedbackText || null,
          feedback_tags: feedbackTags || [],
        })
        .eq('id', generationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.generations(user?.id || '') });
      toast.success('Feedback saved');
    },
  });
}

export function useDeleteGeneration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (generationId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('ai_copy_generations')
        .delete()
        .eq('id', generationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.generations(user?.id || '') });
      queryClient.invalidateQueries({ queryKey: aiCopywritingKeys.recentGenerations(user?.id || '') });
      toast.success('Generation deleted');
    },
  });
}

// Setup Status Hook
export function useAICopywritingSetupStatus() {
  const { data: brandProfile, isLoading: profileLoading } = useBrandProfile();
  const { data: apiKey, isLoading: keyLoading } = useAPIKey();
  
  const isLoading = profileLoading || keyLoading;
  const hasAPIKey = !!apiKey && apiKey.key_status === 'valid';
  const hasBrandProfile = !!brandProfile;
  const isSetupComplete = hasAPIKey && hasBrandProfile;
  
  return {
    isLoading,
    hasAPIKey,
    hasBrandProfile,
    isSetupComplete,
    brandProfile,
    apiKey,
  };
}
