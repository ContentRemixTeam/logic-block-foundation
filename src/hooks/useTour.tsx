import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';

interface TourStep {
  id: string;
  target: string; // CSS selector or data attribute
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  hasSeenTour: boolean;
  showChecklist: boolean;
  isLoading: boolean;
  startTour: () => void;
  endTour: (completed?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  dismissChecklist: () => void;
  restartTour: () => void;
  markTourComplete: () => Promise<void>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const TOUR_STORAGE_KEY = 'ninety-day-planner-tour-seen';
const CHECKLIST_STORAGE_KEY = 'ninety-day-planner-checklist-dismissed';

const tourSteps: TourStep[] = [
  {
    id: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: 'Your Command Center',
    content: "This is your Dashboard – see your progress at a glance, upcoming tasks, and quick actions to keep you moving forward.",
    placement: 'right',
  },
  {
    id: 'cycle-setup',
    target: '[data-tour="cycle-setup"]',
    title: 'Start Here!',
    content: "Set your 90-day cycle dates and choose 3 key metrics to track. This is where every successful quarter begins.",
    placement: 'right',
  },
  {
    id: 'planning',
    target: '[data-tour="planning"]',
    title: 'The Planning Flow',
    content: "Plan your weeks on Sunday, then break them into daily actions. This is where the magic happens – small consistent steps lead to big results.",
    placement: 'right',
  },
  {
    id: 'reflection',
    target: '[data-tour="reflection"]',
    title: 'Your Review Rhythm',
    content: "Reviews keep you honest and help you course-correct. Daily takes 5 minutes, weekly takes 15, monthly takes 30. Trust the process!",
    placement: 'right',
  },
  {
    id: 'progress',
    target: '[data-tour="progress"]',
    title: 'Track Your Progress',
    content: "Watch your 3 key metrics trend over the quarter. What gets measured gets done – celebrate every improvement!",
    placement: 'right',
  },
  {
    id: 'resources',
    target: '[data-tour="resources"]',
    title: 'Your Support Toolkit',
    content: "Notes, SOPs, Habits tracker, Ideas, Mindset tools, and Celebration Wall – everything you need to stay organized and motivated.",
    placement: 'right',
  },
  {
    id: 'support',
    target: '[data-tour="support"]',
    title: 'Need Help?',
    content: "Stuck? Check Quick Start guide, FAQ, or request features and report issues. We're here to help you succeed!",
    placement: 'right',
  },
];

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true); // Default to true to prevent flash
  const [showChecklist, setShowChecklist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Load tour state from database when user authenticates
  useEffect(() => {
    const loadTourState = async () => {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not logged in - use localStorage as fallback
        const seen = getStorageItem(TOUR_STORAGE_KEY);
        const checklistDismissed = getStorageItem(CHECKLIST_STORAGE_KEY);
        setHasSeenTour(seen === 'true');
        setShowChecklist(seen === 'true' && checklistDismissed !== 'true');
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      try {
        // Check database for tour state
        const { data, error } = await supabase
          .from('user_settings')
          .select('has_seen_tour')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading tour state:', error);
          // Fall back to localStorage
          const seen = getStorageItem(TOUR_STORAGE_KEY);
          setHasSeenTour(seen === 'true');
        } else if (data) {
          // Use database state
          setHasSeenTour(data.has_seen_tour === true);
          // Sync to localStorage for faster subsequent checks
          if (data.has_seen_tour) {
            setStorageItem(TOUR_STORAGE_KEY, 'true');
          }
        } else {
          // No settings record yet - user hasn't seen tour
          setHasSeenTour(false);
        }

        // Checklist is still localStorage-based (less critical)
        const checklistDismissed = getStorageItem(CHECKLIST_STORAGE_KEY);
        setShowChecklist(hasSeenTour && checklistDismissed !== 'true');
      } catch (error) {
        console.error('Error loading tour state:', error);
        const seen = getStorageItem(TOUR_STORAGE_KEY);
        setHasSeenTour(seen === 'true');
      }
      
      setIsLoading(false);
    };

    loadTourState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadTourState();
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setHasSeenTour(true); // Hide tour when logged out
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update showChecklist when hasSeenTour changes
  useEffect(() => {
    const checklistDismissed = getStorageItem(CHECKLIST_STORAGE_KEY);
    setShowChecklist(hasSeenTour && checklistDismissed !== 'true');
  }, [hasSeenTour]);

  const markTourComplete = useCallback(async () => {
    // Update local state immediately
    setHasSeenTour(true);
    setStorageItem(TOUR_STORAGE_KEY, 'true');
    setShowChecklist(true);

    // Save to database if user is logged in
    if (userId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('save-user-settings', {
            body: { has_seen_tour: true }
          });
        }
      } catch (error) {
        console.error('Error saving tour state to database:', error);
        // State is already saved locally, so user won't see popup again this session
      }
    }
  }, [userId]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback((completed = true) => {
    setIsActive(false);
    setCurrentStep(0);
    if (completed) {
      markTourComplete();
    }
  }, [markTourComplete]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    markTourComplete();
  }, [markTourComplete]);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      endTour(true);
    }
  }, [currentStep, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const dismissChecklist = useCallback(() => {
    setStorageItem(CHECKLIST_STORAGE_KEY, 'true');
    setShowChecklist(false);
  }, []);

  const restartTour = useCallback(async () => {
    // Clear local state
    removeStorageItem(TOUR_STORAGE_KEY);
    removeStorageItem(CHECKLIST_STORAGE_KEY);
    setHasSeenTour(false);
    setShowChecklist(false);

    // Clear database state if logged in
    if (userId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('save-user-settings', {
            body: { has_seen_tour: false }
          });
        }
      } catch (error) {
        console.error('Error clearing tour state in database:', error);
      }
    }

    startTour();
  }, [userId, startTour]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        steps: tourSteps,
        hasSeenTour,
        showChecklist,
        isLoading,
        startTour,
        endTour,
        nextStep,
        prevStep,
        skipTour,
        dismissChecklist,
        restartTour,
        markTourComplete,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
