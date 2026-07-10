import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { clearAllOfflineData, getMutationCount } from '@/lib/offlineDb';
import { syncPendingMutations } from '@/lib/offlineSync';
import { getPendingTaskDrafts } from '@/hooks/useResilientTaskMutation';
import { queryClient } from '@/App';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /**
   * Sign out. If pending unsynced work exists, prompts the user to confirm
   * before wiping local caches. Returns silently (void) so it can be bound
   * directly to click handlers.
   */
  signOut: () => Promise<void>;
}

async function countPendingWork(): Promise<number> {
  try {
    const [queued, drafts] = await Promise.all([
      getMutationCount('pending').catch(() => 0),
      Promise.resolve(getPendingTaskDrafts().length).catch(() => 0),
    ]);
    return (queued || 0) + (drafts || 0);
  } catch {
    return 0;
  }
}

async function attemptFinalSync(): Promise<number> {
  if (!navigator.onLine) return await countPendingWork();
  try {
    await syncPendingMutations();
  } catch (err) {
    console.warn('[useAuth] final sync attempt failed:', err);
  }
  return await countPendingWork();
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Track previous user ID to detect user changes
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUserId = session?.user?.id ?? null;
        const prevUserId = prevUserIdRef.current;

        console.log('🔐 Auth state changed:', {
          event,
          prevUserId,
          newUserId,
          email: session?.user?.email,
          timestamp: new Date().toISOString()
        });

        // Session-expiry auto-signout path: try one final sync before we
        // lose the auth token so pending work isn't silently abandoned.
        if (event === 'SIGNED_OUT' && prevUserId) {
          const remaining = await attemptFinalSync();
          if (remaining > 0) {
            toast.warning('Your session ended', {
              description: `${remaining} change${remaining === 1 ? '' : 's'} are saved on this device and will sync next time you sign in.`,
              duration: 8000,
            });
          }
        }

        // Clear React Query cache when user changes (prevents cross-user data leakage)
        if (prevUserId !== null && newUserId !== prevUserId) {
          console.log('🚨 User changed detected, clearing React Query cache');
          queryClient.clear();
        }

        prevUserIdRef.current = newUserId;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      prevUserIdRef.current = session?.user?.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Guard: if pending offline mutations or drafts exist, confirm before wiping.
    const pending = await countPendingWork();
    if (pending > 0) {
      // Attempt a final sync first while we still have credentials.
      const remaining = await attemptFinalSync();
      if (remaining > 0) {
        const proceed = window.confirm(
          `You have ${remaining} unsaved change${remaining === 1 ? '' : 's'} that haven't synced yet.\n\n` +
          `Signing out now will keep them on this device but they won't reach the cloud until you sign back in on this same browser.\n\n` +
          `• OK — sign out anyway\n• Cancel — stay signed in and let it sync`
        );
        if (!proceed) {
          toast.info('Staying signed in', {
            description: 'We\'ll keep trying to sync your changes.',
          });
          return;
        }
      }
    }

    // Clear React Query cache first (prevents showing old user's data)
    queryClient.clear();

    // Clear all offline cached data (IndexedDB) before signing out
    try {
      await clearAllOfflineData();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }

    // Clear ALL service worker caches (not just supabase-named ones)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (error) {
        console.error('Failed to clear service worker caches:', error);
      }
    }

    // Clear session storage
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('Failed to clear session storage:', error);
    }

    await supabase.auth.signOut();
    navigate('/auth');
  };


  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    // During HMR or initial load, context might briefly be unavailable
    // Return a safe fallback instead of throwing
    console.warn('useAuth called outside AuthProvider - returning loading state');
    return {
      user: null,
      session: null,
      loading: true,
      signOut: async () => { console.warn('signOut called during loading state'); },
    };
  }
  
  return context;
}
