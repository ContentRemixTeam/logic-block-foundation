import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { clearAllOfflineData } from '@/lib/offlineDb';
import { queryClient } from '@/App';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
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
      (event, session) => {
        const newUserId = session?.user?.id ?? null;
        const prevUserId = prevUserIdRef.current;
        
        // 🔍 Auth event logging for debugging
        console.log('🔐 Auth state changed:', {
          event,
          prevUserId,
          newUserId,
          email: session?.user?.email,
          timestamp: new Date().toISOString()
        });
        
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
