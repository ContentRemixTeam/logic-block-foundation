import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Progress } from '@/components/ui/progress';

interface WizardProgressProps {
  steps: { number: number; title: string }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export function WizardProgress({ 
  steps, 
  currentStep, 
  onStepClick,
  className 
}: WizardProgressProps) {
  const isMobile = useIsMobile();
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;
  const currentStepData = steps.find(s => s.number === currentStep);

  // Mobile: Compact "Step X of Y" with progress bar
  if (isMobile) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-muted-foreground truncate ml-2 max-w-[60%] text-right">
            {currentStepData?.title}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    );
  }

  // Desktop: Full horizontal stepper
  return (
    <nav className={cn('space-y-1', className)} aria-label="Progress">
      <ol className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = onStepClick && step.number <= currentStep;

          return (
            <li key={step.number} className="flex items-center">
              <button
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                  isCompleted && 'bg-primary/10 text-primary',
                  isCurrent && 'bg-primary text-primary-foreground',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                  isClickable && 'cursor-pointer hover:opacity-80',
                  !isClickable && 'cursor-default'
                )}
              >
                <span 
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary-foreground text-primary',
                    !isCompleted && !isCurrent && 'bg-muted-foreground/20 text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : step.number}
                </span>
                <span className="hidden sm:inline whitespace-nowrap">{step.title}</span>
              </button>
              
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-8 h-0.5 mx-1',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
