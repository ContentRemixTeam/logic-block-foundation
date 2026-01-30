import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  DailyPageLayout, 
  SectionId, 
  DEFAULT_SECTION_ORDER,
  CustomQuestion 
} from '@/types/dailyPage';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

const LAYOUT_QUERY_KEY = 'daily-page-layout';

interface RawLayoutRow {
  id: string;
  user_id: string;
  layout_name: string;
  section_order: unknown;
  hidden_sections: unknown;
  custom_questions: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Normalize JSONB arrays from Supabase
const normalizeArray = <T>(value: unknown, fallback: T[] = []): T[] => {
  if (Array.isArray(value)) return value as T[];
  return fallback;
};

// Transform raw DB row to typed layout
const transformLayout = (row: RawLayoutRow): DailyPageLayout => ({
  id: row.id,
  user_id: row.user_id,
  layout_name: row.layout_name,
  section_order: normalizeArray<SectionId>(row.section_order, DEFAULT_SECTION_ORDER),
  hidden_sections: normalizeArray<SectionId>(row.hidden_sections, []),
  custom_questions: normalizeArray<CustomQuestion>(row.custom_questions, []),
  is_active: row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export function useDailyPageLayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: layout, isLoading, error } = useQuery({
    queryKey: [LAYOUT_QUERY_KEY, user?.id],
    queryFn: async (): Promise<DailyPageLayout | null> => {
      if (!user?.id) return null;

      // Try to fetch existing layout
      const { data, error } = await supabase
        .from('daily_page_layouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      // Return existing layout if found
      if (data) {
        return transformLayout(data as RawLayoutRow);
      }

      // Create default layout if none exists
      const defaultLayout = {
        user_id: user.id,
        layout_name: 'default',
        section_order: DEFAULT_SECTION_ORDER as unknown as Json,
        hidden_sections: [] as unknown as Json,
        custom_questions: [] as unknown as Json,
        is_active: true,
      };

      const { data: newData, error: insertError } = await supabase
        .from('daily_page_layouts')
        .insert(defaultLayout)
        .select()
        .single();

      if (insertError) throw insertError;

      return transformLayout(newData as RawLayoutRow);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateLayoutMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<DailyPageLayout, 'section_order' | 'hidden_sections' | 'custom_questions'>>) => {
      if (!user?.id || !layout?.id) throw new Error('No layout to update');

      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.section_order) {
        dbUpdates.section_order = updates.section_order as unknown as Json;
      }
      if (updates.hidden_sections) {
        dbUpdates.hidden_sections = updates.hidden_sections as unknown as Json;
      }
      if (updates.custom_questions) {
        dbUpdates.custom_questions = updates.custom_questions as unknown as Json;
      }

      const { error } = await supabase
        .from('daily_page_layouts')
        .update(dbUpdates)
        .eq('id', layout.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LAYOUT_QUERY_KEY] });
    },
  });

  const resetToDefaultMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !layout?.id) throw new Error('No layout to reset');

      const { error } = await supabase
        .from('daily_page_layouts')
        .update({
          section_order: DEFAULT_SECTION_ORDER as unknown as Json,
          hidden_sections: [] as unknown as Json,
          custom_questions: [] as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', layout.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LAYOUT_QUERY_KEY] });
      toast.success('Layout reset to default');
    },
    onError: () => {
      toast.error('Failed to reset layout');
    },
  });

  const toggleSection = (sectionId: SectionId) => {
    if (!layout) return;

    const currentHidden = new Set(layout.hidden_sections);
    
    if (currentHidden.has(sectionId)) {
      currentHidden.delete(sectionId);
    } else {
      currentHidden.add(sectionId);
    }

    return Array.from(currentHidden);
  };

  // Helper to check if a section is visible
  const isSectionVisible = (sectionId: SectionId): boolean => {
    if (!layout) return true; // Default to visible while loading
    return !layout.hidden_sections.includes(sectionId);
  };

  // Helper to get ordered sections (only visible ones)
  const getSectionOrder = (): SectionId[] => {
    if (!layout) return DEFAULT_SECTION_ORDER;
    return layout.section_order.filter(id => !layout.hidden_sections.includes(id));
  };

  // Helper to get all sections in order (including hidden)
  const getAllSectionsInOrder = (): SectionId[] => {
    if (!layout) return DEFAULT_SECTION_ORDER;
    return layout.section_order;
  };

  return {
    layout,
    isLoading,
    error,
    updateLayout: updateLayoutMutation.mutateAsync,
    resetToDefault: resetToDefaultMutation.mutateAsync,
    isUpdating: updateLayoutMutation.isPending,
    isResetting: resetToDefaultMutation.isPending,
    toggleSection,
    isSectionVisible,
    getSectionOrder,
    getAllSectionsInOrder,
    refetch: queryClient.invalidateQueries.bind(queryClient, { queryKey: [LAYOUT_QUERY_KEY] }),
  };
}
