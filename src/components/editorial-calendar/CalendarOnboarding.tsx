import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, GripVertical, ArrowRight, Plus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarOnboardingProps {
  onDismiss: () => void;
}

const STORAGE_KEY = 'calendar-onboarding-seen';

export function CalendarOnboarding({ onDismiss }: CalendarOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="mx-4 mt-3 mb-2 p-4 rounded-lg border border-primary/20 bg-primary/5 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Calendar className="h-5 w-5" />
        </div>
        <div className="flex-1 pr-6">
          <h3 className="text-sm font-semibold mb-2">How to use your Editorial Calendar</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-[10px] font-bold">
                1
              </div>
              <div>
                <span className="font-medium">Add content</span>
                <p className="text-muted-foreground">Click "+ Add Content" in the sidebar</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-[10px] font-bold">
                2
              </div>
              <div>
                <span className="font-medium">Drag to schedule</span>
                <p className="text-muted-foreground">Drag items from "Unscheduled" to a day</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-[10px] font-bold">
                3
              </div>
              <div>
                <span className="font-medium">Choose lane</span>
                <p className="text-muted-foreground">
                  <span className="text-teal-600 font-medium">Create</span> = production date,{' '}
                  <span className="text-violet-600 font-medium">Publish</span> = go-live
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-[10px] font-bold">
                4
              </div>
              <div>
                <span className="font-medium">Quick edit</span>
                <p className="text-muted-foreground">Click any item to edit dates & details</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <Button size="sm" onClick={handleDismiss} className="gap-2">
          Got it!
        </Button>
      </div>
    </div>
  );
}

// Hook to check if onboarding has been seen
export function useCalendarOnboardingSeen() {
  const [hasSeen, setHasSeen] = useState(true); // Default true to avoid flash

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    setHasSeen(!!seen);
  }, []);

  return hasSeen;
}
