import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTour } from '@/hooks/useTour';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTour, endTour } = useTour();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const currentStepData = steps[currentStep];

  const updatePosition = useCallback(() => {
    if (!currentStepData) return;

    const element = document.querySelector(currentStepData.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      const padding = 8;
      
      setTargetRect({
        top: rect.top - padding + window.scrollY,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Calculate tooltip position
      const tooltipWidth = 320;
      const tooltipHeight = 200;
      const margin = 16;

      let top = rect.top + window.scrollY;
      let left = rect.right + margin;

      // Adjust if tooltip goes off screen
      if (left + tooltipWidth > window.innerWidth) {
        left = rect.left - tooltipWidth - margin;
      }
      if (left < margin) {
        left = margin;
        top = rect.bottom + window.scrollY + margin;
      }
      if (top + tooltipHeight > window.innerHeight + window.scrollY) {
        top = Math.max(margin, rect.top + window.scrollY - tooltipHeight - margin);
      }

      setTooltipPosition({ top, left });
    }
  }, [currentStepData]);

  useEffect(() => {
    if (isActive) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      
      // Scroll element into view
      const element = document.querySelector(currentStepData?.target || '');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Update position after scroll
        setTimeout(updatePosition, 300);
      }
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isActive, currentStep, updatePosition, currentStepData]);

  if (!isActive || !currentStepData) return null;

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="App tour">
      {/* Overlay with cutout */}
      <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" />
      
      {/* Spotlight cutout */}
      {targetRect && (
        <div
          className="absolute rounded-lg ring-4 ring-primary ring-offset-2 transition-all duration-300 ease-out"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          "absolute z-[101] w-80 rounded-xl bg-card border shadow-2xl p-5 transition-all duration-300 ease-out",
          "animate-in fade-in-0 slide-in-from-left-4"
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Close button */}
        <button
          onClick={() => endTour(false)}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === currentStep
                  ? "w-6 bg-primary"
                  : index < currentStep
                  ? "w-1.5 bg-primary/50"
                  : "w-1.5 bg-muted"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold mb-2">{currentStepData.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          {currentStepData.content}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipTour}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </Button>

          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={nextStep}
            >
              {isLastStep ? (
                "Get Started!"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Keyboard navigation hint */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60">
        Use arrow keys to navigate • Esc to exit
      </div>
    </div>,
    document.body
  );
}
