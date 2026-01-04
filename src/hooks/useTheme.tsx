import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { questLabels, defaultLabels, getLevelTitle, calculateLevel } from '@/lib/questLabels';

export type ThemeMode = 'quest' | 'minimal' | 'vibrant' | 'bw';

interface ThemeContextType {
  theme: ThemeMode;
  isQuestMode: boolean;
  isMinimalMode: boolean;
  setTheme: (theme: ThemeMode) => Promise<void>;
  getNavLabel: (key: keyof typeof questLabels) => string;
  // XP and Level info (only relevant in Quest Mode)
  xp: number;
  level: number;
  levelTitle: string;
  xpToNextLevel: number;
  currentLevelXP: number;
  refreshXP: () => Promise<void>;
  // Streak info
  streak: number;
  longestStreak: number;
  potions: number;
  refreshStreak: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>('quest');
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [levelTitle, setLevelTitle] = useState('Novice Adventurer');
  const [xpToNextLevel, setXpToNextLevel] = useState(500);
  const [currentLevelXP, setCurrentLevelXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [potions, setPotions] = useState(2);

  const isQuestMode = theme === 'quest';
  const isMinimalMode = theme === 'minimal';

  const loadTheme = useCallback(async () => {
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
        const userTheme = data.theme_preference || 'quest';
        setThemeState(userTheme);
        document.documentElement.setAttribute('data-theme', userTheme);
        
        // Load XP and level data
        const totalXP = data.xp_points || 0;
        setXP(totalXP);
        const levelInfo = calculateLevel(totalXP);
        setLevel(levelInfo.level);
        setLevelTitle(getLevelTitle(levelInfo.level));
        setXpToNextLevel(levelInfo.xpToNextLevel);
        setCurrentLevelXP(levelInfo.currentXP);
        
        // Load streak data
        setStreak(data.current_debrief_streak || 0);
        setLongestStreak(data.longest_debrief_streak || 0);
        setPotions(data.streak_potions_remaining ?? 2);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    if (!user) return;
    
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          theme_preference: newTheme,
        });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [user]);

  const getNavLabel = useCallback((key: keyof typeof questLabels): string => {
    if (isQuestMode) {
      return questLabels[key] || defaultLabels[key] || key;
    }
    return defaultLabels[key] || key;
  }, [isQuestMode]);

  const refreshXP = useCallback(async () => {
    await loadTheme();
  }, [loadTheme]);

  const refreshStreak = useCallback(async () => {
    await loadTheme();
  }, [loadTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isQuestMode,
        isMinimalMode,
        setTheme,
        getNavLabel,
        xp,
        level,
        levelTitle,
        xpToNextLevel,
        currentLevelXP,
        refreshXP,
        streak,
        longestStreak,
        potions,
        refreshStreak,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback for components outside provider
    return {
      theme: 'quest' as ThemeMode,
      isQuestMode: true,
      isMinimalMode: false,
      setTheme: async () => {},
      getNavLabel: (key: string) => defaultLabels[key as keyof typeof defaultLabels] || key,
      xp: 0,
      level: 1,
      levelTitle: 'Novice Adventurer',
      xpToNextLevel: 500,
      currentLevelXP: 0,
      refreshXP: async () => {},
      streak: 0,
      longestStreak: 0,
      potions: 2,
      refreshStreak: async () => {},
    };
  }
  return context;
}
