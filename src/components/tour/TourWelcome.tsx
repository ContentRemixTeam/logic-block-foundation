import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTour } from '@/hooks/useTour';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Rocket, X } from 'lucide-react';
import { getStorageItem } from '@/lib/storage';

const PUBLIC_ROUTES = ['/engine', '/workshop', '/workshop/engine-builder'];

export function TourWelcome() {
  const location = useLocation();
  const { hasSeenTour, startTour, markTourComplete, isActive, isLoading } = useTour();

  const handleStartTour = () => {
    startTour();
  };

  const handleSkipTour = () => {
    markTourComplete();
  };

  // Extra safety: check localStorage directly as backup for mobile browsers
  const localStorageSeen = getStorageItem('ninety-day-planner-tour-seen') === 'true';

  // Don't show if:
  // - Still loading tour state from database
  // - Tour has been seen (persisted in database OR localStorage)
  // - Tour is already active
  const isPublicRoute = PUBLIC_ROUTES.some(r => location.pathname.startsWith(r));

  if (isLoading || hasSeenTour || localStorageSeen || isActive || isPublicRoute) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-x-hidden bg-black/60 p-4 animate-in fade-in-0 duration-300">
      <Card className="w-full max-w-[calc(100vw-2rem)] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 sm:max-w-md">
        <CardHeader className="px-5 text-center pb-4 sm:px-6">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="break-words text-balance text-xl leading-snug sm:text-2xl">Welcome to Your 90-Day Planner!</CardTitle>
          <CardDescription className="mt-2 text-pretty text-sm leading-6 sm:text-base">
            You're about to transform the next 90 days into focused, intentional progress toward your biggest goals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-5 sm:px-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">The 90-Day Philosophy:</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              90 days is the perfect timeframe – long enough to achieve meaningful results, 
              short enough to maintain focus and urgency. Let's make every day count!
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleStartTour}
              className="min-h-12 w-full whitespace-normal text-sm leading-5 sm:text-base"
              size="lg"
            >
              <Rocket className="mr-2 h-5 w-5 shrink-0" />
              <span className="min-w-0">Take the Quick Tour (2 min)</span>
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkipTour}
              className="w-full whitespace-normal text-muted-foreground"
            >
              <X className="mr-2 h-4 w-4 shrink-0" />
              <span className="min-w-0">I'll explore on my own</span>
            </Button>
          </div>

          <p className="text-center text-xs leading-5 text-muted-foreground">
            You can restart the tour anytime from Support → Quick Start
          </p>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
