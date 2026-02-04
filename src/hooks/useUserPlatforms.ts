import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_PLATFORM_COLORS, AVAILABLE_PLATFORMS, PLATFORM_SHORT_LABELS, PLATFORM_LABELS } from '@/lib/calendarConstants';
import { toast } from 'sonner';

export interface UserPlatform {
  id: string;
  user_id: string;
  platform: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  is_custom?: boolean;
  custom_name?: string | null;
  short_label?: string | null;
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

  // Get custom platforms only
  const customPlatforms = platforms.filter(p => p.is_custom);

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
            is_custom: false,
          });
        if (error) throw error;
      }

      return { platform, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-platforms', user?.id] });
      const platformLabel = PLATFORM_LABELS[data.platform] || data.platform;
      toast.success(`${platformLabel} ${data.isActive ? 'enabled' : 'disabled'}`);
    },
    onError: () => {
      toast.error('Failed to update platform. Please try again.');
    },
  });

  // Add custom platform
  const addCustomPlatform = useMutation({
    mutationFn: async ({ 
      name, 
      color, 
      shortLabel 
    }: { 
      name: string; 
      color: string; 
      shortLabel?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Slugify the name for the platform key
      const platformKey = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      // Generate short label if not provided
      const label = shortLabel || name.slice(0, 3).toUpperCase();

      const { error } = await supabase
        .from('user_content_platforms')
        .insert({
          user_id: user.id,
          platform: platformKey,
          color,
          is_active: true,
          sort_order: (query.data?.length || 0) + 1,
          is_custom: true,
          custom_name: name,
          short_label: label,
        });

      if (error) throw error;
      return name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ['user-platforms', user?.id] });
      toast.success(`Added "${name}" platform`);
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('A platform with this name already exists');
      } else {
        toast.error('Failed to add platform');
      }
    },
  });

  // Update custom platform
  const updateCustomPlatform = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Pick<UserPlatform, 'color' | 'custom_name' | 'short_label'>>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_content_platforms')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-platforms', user?.id] });
      toast.success('Platform updated');
    },
    onError: () => {
      toast.error('Failed to update platform');
    },
  });

  // Delete custom platform
  const deleteCustomPlatform = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_content_platforms')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('is_custom', true); // Only allow deleting custom platforms

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-platforms', user?.id] });
      toast.success('Platform deleted');
    },
    onError: () => {
      toast.error('Failed to delete platform');
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

  // Get label for a platform (custom name or default label)
  const getPlatformLabel = (platform: string): string => {
    const userPlatform = platforms.find(p => p.platform.toLowerCase() === platform.toLowerCase());
    if (userPlatform?.custom_name) return userPlatform.custom_name;
    return PLATFORM_LABELS[platform.toLowerCase()] || platform;
  };

  // Get short label for a platform
  const getPlatformShortLabel = (platform: string): string => {
    const userPlatform = platforms.find(p => p.platform.toLowerCase() === platform.toLowerCase());
    if (userPlatform?.short_label) return userPlatform.short_label;
    return PLATFORM_SHORT_LABELS[platform.toLowerCase()] || platform.slice(0, 2).toUpperCase();
  };

  return {
    platforms,
    activePlatforms,
    customPlatforms,
    isLoading: query.isLoading,
    error: query.error,
    // Sync versions (fire and forget)
    togglePlatform: togglePlatform.mutate,
    addCustomPlatform: addCustomPlatform.mutate,
    updateCustomPlatform: updateCustomPlatform.mutate,
    deleteCustomPlatform: deleteCustomPlatform.mutate,
    updatePlatformColor: updatePlatformColor.mutate,
    // Async versions (for proper await)
    togglePlatformAsync: togglePlatform.mutateAsync,
    addCustomPlatformAsync: addCustomPlatform.mutateAsync,
    // Helpers
    getPlatformColor,
    getPlatformLabel,
    getPlatformShortLabel,
    // Pending states
    isToggling: togglePlatform.isPending,
    isUpdatingColor: updatePlatformColor.isPending,
    isAddingCustom: addCustomPlatform.isPending,
    isDeletingCustom: deleteCustomPlatform.isPending,
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
    is_custom: false,
    custom_name: null,
    short_label: null,
  }));
}
