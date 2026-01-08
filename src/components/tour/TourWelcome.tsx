import { createPortal } from 'react-dom';
import { useTour } from '@/hooks/useTour';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Rocket, X } from 'lucide-react';

export function TourWelcome() {
  const { hasSeenTour, startTour, skipTour, isActive, isFirstLoginComplete, markFirstLoginComplete } = useTour();

  const handleStartTour = () => {
    markFirstLoginComplete();
    startTour();
  };

  const handleSkipTour = () => {
    markFirstLoginComplete();
    skipTour();
  };

  // Don't show if tour has been seen, tour is already active, or first login is not complete yet
  if (hasSeenTour || isActive || !isFirstLoginComplete) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 animate-in fade-in-0 duration-300">
      <Card className="w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Your 90-Day Planner!</CardTitle>
          <CardDescription className="text-base mt-2">
            You're about to transform the next 90 days into focused, intentional progress toward your biggest goals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
              className="w-full h-12 text-base"
              size="lg"
            >
              <Rocket className="h-5 w-5 mr-2" />
              Take the Quick Tour (2 min)
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkipTour}
              className="w-full text-muted-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              I'll explore on my own
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can restart the tour anytime from Support → Quick Start
          </p>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
