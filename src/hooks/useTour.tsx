import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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
  startTour: () => void;
  endTour: (completed?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  dismissChecklist: () => void;
  restartTour: () => void;
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

  useEffect(() => {
    // Check localStorage on mount
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    const checklistDismissed = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    
    setHasSeenTour(seen === 'true');
    setShowChecklist(seen === 'true' && checklistDismissed !== 'true');
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback((completed = true) => {
    setIsActive(false);
    setCurrentStep(0);
    if (completed) {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      setHasSeenTour(true);
      setShowChecklist(true);
    }
  }, []);

  const skipTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setHasSeenTour(true);
    setIsActive(false);
    setCurrentStep(0);
  }, []);

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
    localStorage.setItem(CHECKLIST_STORAGE_KEY, 'true');
    setShowChecklist(false);
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    setHasSeenTour(false);
    setShowChecklist(false);
    startTour();
  }, [startTour]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        steps: tourSteps,
        hasSeenTour,
        showChecklist,
        startTour,
        endTour,
        nextStep,
        prevStep,
        skipTour,
        dismissChecklist,
        restartTour,
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
