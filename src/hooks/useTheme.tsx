import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTheme() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<'vibrant' | 'bw'>('vibrant');

  useEffect(() => {
    const loadTheme = async () => {
      if (!user) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          const userTheme = data.theme_preference || 'vibrant';
          setTheme(userTheme);
          document.documentElement.setAttribute('data-theme', userTheme);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };

    loadTheme();
  }, [user]);

  return { theme };
}
