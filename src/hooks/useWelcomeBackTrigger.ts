import { useEffect, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_PREFIX = 'lbb-welcome-back-shown-';
const MIN_GAP_DAYS = 7;

/**
 * Detects whether the currently-signed-in user has been away for 7+ days and
 * should see the Welcome Back dialog. Fires at most once per return.
 */
export function useWelcomeBackTrigger() {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [daysAway, setDaysAway] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('last_activity_date')
          .eq('id', user.id)
          .maybeSingle();
        if (error || !data?.last_activity_date) return;
        const gap = differenceInDays(new Date(), new Date(data.last_activity_date));
        if (gap < MIN_GAP_DAYS) return;

        const returnDate = new Date().toISOString().slice(0, 10);
        const key = `${STORAGE_PREFIX}${user.id}-${returnDate}`;
        if (typeof window === 'undefined' || localStorage.getItem(key)) return;
        localStorage.setItem(key, '1');

        if (!cancelled) {
          setDaysAway(gap);
          setShouldShow(true);
        }
      } catch {
        // Silent — we never want this to block the app.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return {
    shouldShow,
    daysAway,
    dismiss: () => setShouldShow(false),
  };
}
