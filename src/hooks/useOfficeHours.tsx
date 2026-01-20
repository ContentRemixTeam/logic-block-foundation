import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';

export interface OfficeHoursBlock {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
  is_active: boolean;
}

interface UseOfficeHoursReturn {
  officeHours: OfficeHoursBlock[];
  isLoading: boolean;
  error: Error | null;
  saveBlocks: (blocks: Omit<OfficeHoursBlock, 'id'>[]) => Promise<void>;
  isSaving: boolean;
  getBlocksForDay: (dayOfWeek: number) => OfficeHoursBlock[];
  isWithinOfficeHours: (date: Date, hour: number) => boolean;
  getTodayBlocks: () => OfficeHoursBlock[];
  refetch: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useOfficeHours(): UseOfficeHoursReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: officeHours = [], isLoading, error, refetch } = useQuery({
    queryKey: ['office-hours', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('office_hours')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        timezone: row.timezone,
        is_active: row.is_active,
      }));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const saveBlocksMutation = useMutation({
    mutationFn: async (blocks: Omit<OfficeHoursBlock, 'id'>[]) => {
      if (!user) throw new Error('Not authenticated');

      // Delete existing blocks first
      const { error: deleteError } = await supabase
        .from('office_hours')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Insert new blocks if any
      if (blocks.length > 0) {
        const { error: insertError } = await supabase
          .from('office_hours')
          .insert(
            blocks.map((block) => ({
              user_id: user.id,
              day_of_week: block.day_of_week,
              start_time: block.start_time,
              end_time: block.end_time,
              timezone: block.timezone,
              is_active: block.is_active,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-hours'] });
      toast.success('Office hours saved');
    },
    onError: (error: any) => {
      console.error('Error saving office hours:', error);
      toast.error('Failed to save office hours', {
        description: error?.message || 'Please try again',
      });
    },
  });

  const saveBlocks = useCallback(async (blocks: Omit<OfficeHoursBlock, 'id'>[]) => {
    await saveBlocksMutation.mutateAsync(blocks);
  }, [saveBlocksMutation]);

  const getBlocksForDay = useCallback((dayOfWeek: number): OfficeHoursBlock[] => {
    return officeHours.filter((block) => block.day_of_week === dayOfWeek);
  }, [officeHours]);

  const getTodayBlocks = useCallback((): OfficeHoursBlock[] => {
    const today = new Date().getDay();
    return getBlocksForDay(today);
  }, [getBlocksForDay]);

  const isWithinOfficeHours = useCallback((date: Date, hour: number): boolean => {
    const dayOfWeek = date.getDay();
    const dayBlocks = getBlocksForDay(dayOfWeek);

    if (dayBlocks.length === 0) return false;

    return dayBlocks.some((block) => {
      const startHour = parseInt(block.start_time.split(':')[0], 10);
      const endHour = parseInt(block.end_time.split(':')[0], 10);
      return hour >= startHour && hour < endHour;
    });
  }, [getBlocksForDay]);

  // Memoize the return object
  const result = useMemo(() => ({
    officeHours,
    isLoading,
    error: error as Error | null,
    saveBlocks,
    isSaving: saveBlocksMutation.isPending,
    getBlocksForDay,
    isWithinOfficeHours,
    getTodayBlocks,
    refetch,
  }), [officeHours, isLoading, error, saveBlocks, saveBlocksMutation.isPending, getBlocksForDay, isWithinOfficeHours, getTodayBlocks, refetch]);

  return result;
}

// Helper function to format time for display
export function formatOfficeHoursTime(time: string): string {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours)) return time;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  if (minutes === 0) {
    return `${displayHours}${period}`;
  }
  return `${displayHours}:${String(minutes).padStart(2, '0')}${period}`;
}

// Get day name from day number
export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || '';
}
