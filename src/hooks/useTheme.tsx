import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { questLabels, defaultLabels, getLevelTitle, calculateLevel } from '@/lib/questLabels';
import { ThemeId, DEFAULT_THEME, isValidTheme, isQuestTheme } from '@/lib/themes';

export type ThemeMode = ThemeId;

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
  // Loading state
  themeLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode | null>(null);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [levelTitle, setLevelTitle] = useState('Novice Adventurer');
  const [xpToNextLevel, setXpToNextLevel] = useState(500);
  const [currentLevelXP, setCurrentLevelXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [potions, setPotions] = useState(2);

  // Use centralized theme config for mode detection - prevents glitches
  const isQuestMode = themeLoaded && theme ? isQuestTheme(theme) : false;
  const isMinimalMode = themeLoaded && theme === 'minimal';

  const loadTheme = useCallback(async () => {
    if (!user) {
      // No user - set default theme and mark as loaded
      setThemeState(DEFAULT_THEME);
      document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
      setThemeLoaded(true);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setThemeState(DEFAULT_THEME);
        setThemeLoaded(true);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const rawTheme = data.theme_preference || DEFAULT_THEME;
        const userTheme = isValidTheme(rawTheme) ? rawTheme : DEFAULT_THEME;
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
      } else {
        setThemeState(DEFAULT_THEME);
        document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      setThemeState(DEFAULT_THEME);
      document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
    } finally {
      setThemeLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    if (!user) return;
    
    // Validate theme before applying
    const validTheme = isValidTheme(newTheme) ? newTheme : DEFAULT_THEME;
    
    // Add transitioning class for smooth CSS transitions
    document.documentElement.classList.add('theme-transitioning');
    
    // Apply theme immediately for responsive feel
    setThemeState(validTheme);
    document.documentElement.setAttribute('data-theme', validTheme);

    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          theme_preference: validTheme,
        });
    } catch (error) {
      console.error('Failed to save theme:', error);
    } finally {
      // Remove transitioning class after CSS transitions complete
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 200);
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
        theme: theme || DEFAULT_THEME,
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
        themeLoaded,
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
      theme: 'minimal' as ThemeMode,
      isQuestMode: false,
      isMinimalMode: true,
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
      themeLoaded: false,
    };
  }
  return context;
}
