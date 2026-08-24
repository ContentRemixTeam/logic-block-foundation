import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  parseSuccessPathLearningResponse,
  type SuccessPathLearningResponse,
} from '@/lib/successPathLearningSlice';

export function useSuccessPathLearningSlice(cycleId: string | undefined) {
  const [data, setData] = useState<SuccessPathLearningResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!cycleId) {
      setData({ slice_state: 'no_plan', reason: 'no_plan', slice: null });
      setIsLoading(false);
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data: response, error: rpcError } = await supabase.rpc(
        'resolve_my_success_path_learning_slice',
        { p_cycle_id: cycleId },
      );
      if (rpcError) throw rpcError;
      const parsed = parseSuccessPathLearningResponse(response);
      setData(parsed);
      return parsed;
    } catch (caught) {
      setData(null);
      setError(caught instanceof Error ? caught.message : 'Your Success Path is temporarily unavailable.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { void refetch(); }, [refetch]);
  return { data, isLoading, error, refetch };
}
