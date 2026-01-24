import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type PlannerStyle = 'minimal' | 'balanced' | 'detailed';

export interface DailyPageWidgets {
  top3Tasks: boolean;
  habits: boolean;
  calendar: boolean;
  timeBlocks: boolean;
  scratchPad: boolean;
  todayFocus: boolean;
  metrics: boolean;
  journaling: boolean;
  thoughtWork: boolean;
}

export interface WeeklyPageWidgets {
  weeklyGoals: boolean;
  priorityList: boolean;
  habitTracker: boolean;
  calendar: boolean;
  courseStudy: boolean;
  projectProgress: boolean;
  metricsReview: boolean;
  contentPlan: boolean;
  thoughtWork: boolean;
}

export interface AutoSchedulingOptions {
  enabled: boolean;
  studySessions: boolean;
  habits: boolean;
  recurringTasks: boolean;
}

export interface PlannerPreferences {
  plannerStyle: PlannerStyle;
  dailyPageWidgets: DailyPageWidgets;
  weeklyPageWidgets: WeeklyPageWidgets;
  autoScheduling: AutoSchedulingOptions;
}

// Preset configurations for different planner styles
export const PLANNER_STYLE_PRESETS: Record<PlannerStyle, Omit<PlannerPreferences, 'plannerStyle'>> = {
  minimal: {
    dailyPageWidgets: {
      top3Tasks: true,
      habits: false,
      calendar: false,
      timeBlocks: false,
      scratchPad: true,
      todayFocus: true,
      metrics: false,
      journaling: false,
      thoughtWork: false,
    },
    weeklyPageWidgets: {
      weeklyGoals: true,
      priorityList: true,
      habitTracker: false,
      calendar: false,
      courseStudy: false,
      projectProgress: false,
      metricsReview: false,
      contentPlan: false,
      thoughtWork: false,
    },
    autoScheduling: {
      enabled: true,
      studySessions: true,
      habits: false,
      recurringTasks: false,
    },
  },
  balanced: {
    dailyPageWidgets: {
      top3Tasks: true,
      habits: true,
      calendar: true,
      timeBlocks: true,
      scratchPad: true,
      todayFocus: true,
      metrics: false,
      journaling: false,
      thoughtWork: false,
    },
    weeklyPageWidgets: {
      weeklyGoals: true,
      priorityList: true,
      habitTracker: true,
      calendar: true,
      courseStudy: true,
      projectProgress: false,
      metricsReview: false,
      contentPlan: false,
      thoughtWork: false,
    },
    autoScheduling: {
      enabled: true,
      studySessions: true,
      habits: true,
      recurringTasks: true,
    },
  },
  detailed: {
    dailyPageWidgets: {
      top3Tasks: true,
      habits: true,
      calendar: true,
      timeBlocks: true,
      scratchPad: true,
      todayFocus: true,
      metrics: true,
      journaling: true,
      thoughtWork: true,
    },
    weeklyPageWidgets: {
      weeklyGoals: true,
      priorityList: true,
      habitTracker: true,
      calendar: true,
      courseStudy: true,
      projectProgress: true,
      metricsReview: true,
      contentPlan: true,
      thoughtWork: true,
    },
    autoScheduling: {
      enabled: true,
      studySessions: true,
      habits: true,
      recurringTasks: true,
    },
  },
};

const DEFAULT_PREFERENCES: PlannerPreferences = {
  plannerStyle: 'balanced',
  ...PLANNER_STYLE_PRESETS.balanced,
};

const STORAGE_KEY = 'planner-preferences';

export function usePlannerPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PlannerPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      // Try localStorage first for instant UI
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      } catch (e) {
        console.error('Failed to parse local planner preferences');
      }

      // Then load from server if authenticated
      if (user) {
        try {
          const { data } = await supabase
            .from('user_settings')
            .select('planner_preferences')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data?.planner_preferences) {
            const serverPrefs = data.planner_preferences as unknown as PlannerPreferences;
            const merged = { ...DEFAULT_PREFERENCES, ...serverPrefs };
            setPreferences(merged);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
        } catch (e) {
          console.error('Failed to load planner preferences from server');
        }
      }

      setIsLoading(false);
    };

    loadPreferences();
  }, [user]);

  // Save preferences
  const savePreferences = useCallback(async (newPrefs: PlannerPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user) {
      try {
        const { data: existing } = await supabase
          .from('user_settings')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_settings')
            .update({
              planner_preferences: newPrefs as unknown as Json,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('user_settings')
            .insert({
              user_id: user.id,
              planner_preferences: newPrefs as unknown as Json,
            });
        }
      } catch (e) {
        console.error('Failed to save planner preferences to server');
      }
    }
  }, [user]);

  // Apply a style preset
  const applyStylePreset = useCallback((style: PlannerStyle) => {
    const newPrefs: PlannerPreferences = {
      plannerStyle: style,
      ...PLANNER_STYLE_PRESETS[style],
    };
    savePreferences(newPrefs);
  }, [savePreferences]);

  // Toggle individual widget
  const toggleDailyWidget = useCallback((widget: keyof DailyPageWidgets) => {
    const newPrefs: PlannerPreferences = {
      ...preferences,
      plannerStyle: 'balanced', // Switch to custom when manually toggling
      dailyPageWidgets: {
        ...preferences.dailyPageWidgets,
        [widget]: !preferences.dailyPageWidgets[widget],
      },
    };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  const toggleWeeklyWidget = useCallback((widget: keyof WeeklyPageWidgets) => {
    const newPrefs: PlannerPreferences = {
      ...preferences,
      plannerStyle: 'balanced', // Switch to custom when manually toggling
      weeklyPageWidgets: {
        ...preferences.weeklyPageWidgets,
        [widget]: !preferences.weeklyPageWidgets[widget],
      },
    };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  const updateAutoScheduling = useCallback((key: keyof AutoSchedulingOptions, value: boolean) => {
    const newPrefs: PlannerPreferences = {
      ...preferences,
      autoScheduling: {
        ...preferences.autoScheduling,
        [key]: value,
      },
    };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  // Check if a specific widget is enabled
  const isDailyWidgetEnabled = useCallback((widget: keyof DailyPageWidgets) => {
    return preferences.dailyPageWidgets[widget] ?? true;
  }, [preferences]);

  const isWeeklyWidgetEnabled = useCallback((widget: keyof WeeklyPageWidgets) => {
    return preferences.weeklyPageWidgets[widget] ?? true;
  }, [preferences]);

  return {
    preferences,
    isLoading,
    savePreferences,
    applyStylePreset,
    toggleDailyWidget,
    toggleWeeklyWidget,
    updateAutoScheduling,
    isDailyWidgetEnabled,
    isWeeklyWidgetEnabled,
  };
}
