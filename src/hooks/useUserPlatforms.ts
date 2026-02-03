import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_PLATFORM_COLORS, AVAILABLE_PLATFORMS } from '@/lib/calendarConstants';

export interface UserPlatform {
  id: string;
  user_id: string;
  platform: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export function useUserPlatforms() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-platforms', user?.id],
    queryFn: async (): Promise<UserPlatform[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_content_platforms')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // If user has no platforms, return defaults
  const platforms = query.data?.length ? query.data : getDefaultPlatforms();

  // Get active platforms only
  const activePlatforms = platforms.filter(p => p.is_active);

  // Toggle platform active state
  const togglePlatform = useMutation({
    mutationFn: async ({ platform, isActive }: { platform: string; isActive: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if platform exists
      const existing = query.data?.find(p => p.platform === platform);

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_content_platforms')
          .update({ is_active: isActive })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('user_content_platforms')
          .insert({
            user_id: user.id,
            platform,
            color: DEFAULT_PLATFORM_COLORS[platform] || '#6B7280',
            is_active: isActive,
            sort_order: (query.data?.length || 0) + 1,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-platforms', user?.id] });
    },
  });

  // Update platform color
  const updatePlatformColor = useMutation({
    mutationFn: async ({ platform, color }: { platform: string; color: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const existing = query.data?.find(p => p.platform === platform);

      if (existing) {
        const { error } = await supabase
          .from('user_content_platforms')
          .update({ color })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_content_platforms')
          .insert({
            user_id: user.id,
            platform,
            color,
            is_active: true,
            sort_order: (query.data?.length || 0) + 1,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-platforms', user?.id] });
    },
  });

  // Get color for a platform (from user settings or default)
  const getPlatformColor = (platform: string): string => {
    const userPlatform = platforms.find(p => p.platform.toLowerCase() === platform.toLowerCase());
    if (userPlatform) return userPlatform.color;
    return DEFAULT_PLATFORM_COLORS[platform.toLowerCase()] || '#6B7280';
  };

  return {
    platforms,
    activePlatforms,
    isLoading: query.isLoading,
    error: query.error,
    togglePlatform: togglePlatform.mutate,
    updatePlatformColor: updatePlatformColor.mutate,
    getPlatformColor,
    isToggling: togglePlatform.isPending,
    isUpdatingColor: updatePlatformColor.isPending,
  };
}

// Generate default platforms (before user customizes)
// Better starter set including podcast and commonly used platforms
function getDefaultPlatforms(): UserPlatform[] {
  const defaultSet = ['instagram', 'email', 'podcast', 'youtube', 'linkedin', 'blog', 'tiktok', 'newsletter'];
  return defaultSet.map((platform, index) => ({
    id: `default-${platform}`,
    user_id: '',
    platform,
    color: DEFAULT_PLATFORM_COLORS[platform] || '#6B7280',
    is_active: true,
    sort_order: index,
    created_at: new Date().toISOString(),
  }));
}
