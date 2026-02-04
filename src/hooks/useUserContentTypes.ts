import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CONTENT_TYPE_ICONS, DEFAULT_CONTENT_ICON } from '@/lib/calendarConstants';

export interface UserContentType {
  id: string;
  user_id: string;
  type_key: string;
  type_label: string;
  platform: string | null;
  icon: string;
  color: string;
  is_custom: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// Default content types to seed for new users
const DEFAULT_CONTENT_TYPES: Omit<UserContentType, 'id' | 'user_id' | 'created_at'>[] = [
  { type_key: 'post', type_label: 'Post', platform: null, icon: 'FileText', color: '#6B7280', is_custom: false, is_active: true, sort_order: 0 },
  { type_key: 'reel', type_label: 'Reel/Short', platform: null, icon: 'Video', color: '#E4405F', is_custom: false, is_active: true, sort_order: 1 },
  { type_key: 'video', type_label: 'Video', platform: null, icon: 'PlayCircle', color: '#FF0000', is_custom: false, is_active: true, sort_order: 2 },
  { type_key: 'blog-post', type_label: 'Blog Post', platform: null, icon: 'FileText', color: '#10B981', is_custom: false, is_active: true, sort_order: 3 },
  { type_key: 'newsletter', type_label: 'Newsletter', platform: null, icon: 'Newspaper', color: '#F59E0B', is_custom: false, is_active: true, sort_order: 4 },
  { type_key: 'podcast-episode', type_label: 'Podcast Episode', platform: null, icon: 'Podcast', color: '#8B5CF6', is_custom: false, is_active: true, sort_order: 5 },
  { type_key: 'email-single', type_label: 'Email', platform: null, icon: 'Mail', color: '#EA580C', is_custom: false, is_active: true, sort_order: 6 },
  { type_key: 'carousel', type_label: 'Carousel', platform: null, icon: 'Images', color: '#E4405F', is_custom: false, is_active: true, sort_order: 7 },
  { type_key: 'live-stream', type_label: 'Live Stream', platform: null, icon: 'Radio', color: '#EF4444', is_custom: false, is_active: true, sort_order: 8 },
  { type_key: 'story', type_label: 'Story', platform: null, icon: 'Camera', color: '#E4405F', is_custom: false, is_active: true, sort_order: 9 },
];

export function useUserContentTypes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-content-types', user?.id],
    queryFn: async (): Promise<UserContentType[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_content_types')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // If user has no content types, seed defaults
      if (!data || data.length === 0) {
        await seedDefaults(user.id);
        // Re-fetch after seeding
        const { data: seededData, error: seededError } = await supabase
          .from('user_content_types')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true });
        
        if (seededError) throw seededError;
        return seededData || [];
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  async function seedDefaults(userId: string) {
    const defaults = DEFAULT_CONTENT_TYPES.map(type => ({
      ...type,
      user_id: userId,
    }));

    const { error } = await supabase
      .from('user_content_types')
      .insert(defaults);

    if (error) {
      console.error('Failed to seed default content types:', error);
    }
  }

  // Get active content types only
  const activeContentTypes = query.data?.filter(t => t.is_active) || [];

  // Toggle content type active state
  const toggleContentType = useMutation({
    mutationFn: async ({ typeKey, isActive }: { typeKey: string; isActive: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const existing = query.data?.find(t => t.type_key === typeKey);

      if (existing) {
        const { error } = await supabase
          .from('user_content_types')
          .update({ is_active: isActive })
          .eq('id', existing.id);
        if (error) throw error;
      }

      return { typeKey, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-content-types', user?.id] });
      toast.success(`${data.typeKey} ${data.isActive ? 'enabled' : 'disabled'}`);
    },
    onError: () => {
      toast.error('Failed to update content type');
    },
  });

  // Add custom content type
  const addCustomContentType = useMutation({
    mutationFn: async ({ 
      typeLabel, 
      platform, 
      icon 
    }: { 
      typeLabel: string; 
      platform?: string; 
      icon?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const typeKey = typeLabel.toLowerCase().replace(/\s+/g, '-');
      const maxOrder = Math.max(0, ...(query.data?.map(t => t.sort_order) || [0]));

      const { error } = await supabase
        .from('user_content_types')
        .insert({
          user_id: user.id,
          type_key: typeKey,
          type_label: typeLabel,
          platform: platform || null,
          icon: icon || 'FileText',
          color: '#6B7280',
          is_custom: true,
          is_active: true,
          sort_order: maxOrder + 1,
        });

      if (error) throw error;
      return typeLabel;
    },
    onSuccess: (typeLabel) => {
      queryClient.invalidateQueries({ queryKey: ['user-content-types', user?.id] });
      toast.success(`Added "${typeLabel}"`);
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('A content type with this name already exists');
      } else {
        toast.error('Failed to add content type');
      }
    },
  });

  // Update custom content type
  const updateContentType = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Pick<UserContentType, 'type_label' | 'icon' | 'platform'>>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_content_types')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-content-types', user?.id] });
      toast.success('Content type updated');
    },
    onError: () => {
      toast.error('Failed to update content type');
    },
  });

  // Delete custom content type
  const deleteContentType = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_content_types')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('is_custom', true); // Only allow deleting custom types

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-content-types', user?.id] });
      toast.success('Content type deleted');
    },
    onError: () => {
      toast.error('Failed to delete content type');
    },
  });

  // Get icon for a content type (with fallback)
  const getContentTypeIcon = (typeKey: string): string => {
    const userType = query.data?.find(t => t.type_key === typeKey);
    if (userType) return userType.icon;
    return CONTENT_TYPE_ICONS[typeKey] || DEFAULT_CONTENT_ICON;
  };

  // Get label for a content type (with fallback)
  const getContentTypeLabel = (typeKey: string): string => {
    const userType = query.data?.find(t => t.type_key === typeKey);
    if (userType) return userType.type_label;
    // Fallback: capitalize and replace dashes
    return typeKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return {
    contentTypes: query.data || [],
    activeContentTypes,
    isLoading: query.isLoading,
    error: query.error,
    toggleContentType: toggleContentType.mutate,
    toggleContentTypeAsync: toggleContentType.mutateAsync,
    addCustomContentType: addCustomContentType.mutate,
    addCustomContentTypeAsync: addCustomContentType.mutateAsync,
    updateContentType: updateContentType.mutate,
    deleteContentType: deleteContentType.mutate,
    getContentTypeIcon,
    getContentTypeLabel,
    isToggling: toggleContentType.isPending,
    isAdding: addCustomContentType.isPending,
  };
}
