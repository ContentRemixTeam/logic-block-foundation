import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DashboardWidget {
  id: string;
  label: string;
  description: string;
  category: 'execution' | 'strategy' | 'mindset' | 'external';
  column: 'main' | 'sidebar';
  defaultEnabled: boolean;
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  // Main column widgets
  { id: 'launches', label: 'Launch Countdowns', description: 'Active and upcoming launch timers', category: 'execution', column: 'main', defaultEnabled: true },
  { id: 'todayStrip', label: 'Today Strip', description: 'Top priority and office hours', category: 'execution', column: 'main', defaultEnabled: true },
  { id: 'cycleGoal', label: '90-Day Goal', description: 'Your main goal and progress', category: 'execution', column: 'main', defaultEnabled: true },
  { id: 'first3Days', label: 'First 3 Days Checklist', description: 'New cycle onboarding tasks', category: 'execution', column: 'main', defaultEnabled: true },
  { id: 'weeklyPriorities', label: 'Weekly Top 3', description: "This week's priorities", category: 'execution', column: 'main', defaultEnabled: true },
  { id: 'todayTop3', label: "Today's Top 3", description: 'Pet growth and daily tasks', category: 'execution', column: 'main', defaultEnabled: true },
  { id: 'habits', label: "Today's Habits", description: 'Habit tracking status', category: 'execution', column: 'main', defaultEnabled: true },
  { id: 'reviews', label: 'Weekly & Monthly Reviews', description: 'Review completion status', category: 'execution', column: 'main', defaultEnabled: true },
  
  // Sidebar widgets
  { id: 'routineReminder', label: 'Weekly Routine Reminder', description: 'Planning and debrief day alerts', category: 'strategy', column: 'sidebar', defaultEnabled: true },
  { id: 'challengeProgress', label: 'Monthly Challenge', description: 'Current challenge progress', category: 'strategy', column: 'sidebar', defaultEnabled: true },
  { id: 'promotionCountdown', label: 'Promotion Countdown', description: 'Active promotion timers', category: 'strategy', column: 'sidebar', defaultEnabled: true },
  { id: 'salesCalendar', label: 'Sales Calendar', description: 'Upcoming sales events', category: 'strategy', column: 'sidebar', defaultEnabled: true },
  { id: 'planWeekButton', label: 'Plan My Week Button', description: 'Quick access to weekly planning', category: 'strategy', column: 'sidebar', defaultEnabled: true },
  { id: 'metrics', label: 'Success Metrics', description: 'Track your key numbers', category: 'strategy', column: 'sidebar', defaultEnabled: true },
  { id: 'wins', label: 'Recent Wins', description: 'Celebrate your victories', category: 'mindset', column: 'sidebar', defaultEnabled: true },
  { id: 'revenueGoal', label: '90-Day Revenue Goal', description: 'Revenue target tracker', category: 'strategy', column: 'sidebar', defaultEnabled: true },
  { id: 'reminders', label: 'Key Reminders', description: 'Things to remember', category: 'mindset', column: 'sidebar', defaultEnabled: true },
  { id: 'identity', label: 'Your Identity', description: 'Who you are becoming', category: 'mindset', column: 'sidebar', defaultEnabled: true },
  { id: 'diagnostic', label: 'Business Diagnostic', description: 'Discover, Nurture, Convert scores', category: 'strategy', column: 'sidebar', defaultEnabled: true },
  { id: 'audience', label: 'Your Audience', description: 'Who you serve and their needs', category: 'strategy', column: 'sidebar', defaultEnabled: true },
  { id: 'mastermind', label: 'Mastermind Calls', description: 'Upcoming group calls', category: 'external', column: 'sidebar', defaultEnabled: true },
  { id: 'podcast', label: 'Podcast Episodes', description: 'Latest podcast content', category: 'external', column: 'sidebar', defaultEnabled: true },
  { id: 'quickActions', label: 'Quick Actions', description: 'Common shortcuts', category: 'external', column: 'sidebar', defaultEnabled: true },
  { id: 'resources', label: 'Resources', description: 'Help and support links', category: 'external', column: 'sidebar', defaultEnabled: true },
];

const STORAGE_KEY = 'dashboard-widget-preferences';

export function useDashboardWidgets() {
  const { user } = useAuth();
  const [enabledWidgets, setEnabledWidgets] = useState<Record<string, boolean>>(() => {
    // Initialize with defaults
    const defaults: Record<string, boolean> = {};
    DASHBOARD_WIDGETS.forEach(w => {
      defaults[w.id] = w.defaultEnabled;
    });
    return defaults;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage (fast) then sync with server
  useEffect(() => {
    const loadPreferences = async () => {
      // Try localStorage first for instant load
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setEnabledWidgets(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Failed to parse cached widget preferences');
        }
      }

      // Then load from server if user is authenticated
      if (user) {
        try {
          const { data } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          // Access dashboard_widgets from the raw data object
          const rawData = data as Record<string, unknown> | null;
          if (rawData?.dashboard_widgets) {
            const serverPrefs = rawData.dashboard_widgets as Record<string, boolean>;
            setEnabledWidgets(prev => ({ ...prev, ...serverPrefs }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverPrefs));
          }
        } catch (e) {
          console.error('Failed to load widget preferences from server');
        }
      }
      
      setIsLoading(false);
    };

    loadPreferences();
  }, [user]);

  // Save preferences
  const savePreferences = useCallback(async (newPrefs: Record<string, boolean>) => {
    setEnabledWidgets(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            dashboard_widgets: newPrefs,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      } catch (e) {
        console.error('Failed to save widget preferences to server');
      }
    }
  }, [user]);

  const toggleWidget = useCallback((widgetId: string) => {
    const newPrefs = { ...enabledWidgets, [widgetId]: !enabledWidgets[widgetId] };
    savePreferences(newPrefs);
  }, [enabledWidgets, savePreferences]);

  const isWidgetEnabled = useCallback((widgetId: string): boolean => {
    return enabledWidgets[widgetId] ?? true;
  }, [enabledWidgets]);

  const resetToDefaults = useCallback(() => {
    const defaults: Record<string, boolean> = {};
    DASHBOARD_WIDGETS.forEach(w => {
      defaults[w.id] = w.defaultEnabled;
    });
    savePreferences(defaults);
  }, [savePreferences]);

  const getWidgetsByColumn = useCallback((column: 'main' | 'sidebar') => {
    return DASHBOARD_WIDGETS.filter(w => w.column === column);
  }, []);

  const getWidgetsByCategory = useCallback((category: DashboardWidget['category']) => {
    return DASHBOARD_WIDGETS.filter(w => w.category === category);
  }, []);

  return {
    widgets: DASHBOARD_WIDGETS,
    enabledWidgets,
    isLoading,
    toggleWidget,
    isWidgetEnabled,
    savePreferences,
    resetToDefaults,
    getWidgetsByColumn,
    getWidgetsByCategory,
  };
}
