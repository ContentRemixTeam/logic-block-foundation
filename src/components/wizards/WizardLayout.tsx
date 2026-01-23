import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateProgress } from '@/lib/wizardHelpers';

interface WizardLayoutProps {
  title: string;
  stepTitle: string;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  canProceed: boolean;
  isSaving?: boolean;
  isLastStep?: boolean;
  lastStepButtonText?: string;
  children: ReactNode;
  className?: string;
  statusIndicator?: ReactNode;
}

export function WizardLayout({
  title,
  stepTitle,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSave,
  canProceed,
  isSaving = false,
  isLastStep = false,
  lastStepButtonText = 'Complete',
  children,
  className,
  statusIndicator,
}: WizardLayoutProps) {
  const progress = calculateProgress(currentStep, totalSteps);

  return (
    <div className={cn('flex flex-col min-h-[calc(100vh-12rem)]', className)}>
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-muted-foreground">
                Step {currentStep} of {totalSteps}: {stepTitle}
              </p>
              {statusIndicator}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save & Exit
          </Button>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress}% complete</span>
            <span>{totalSteps - currentStep} steps remaining</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {children}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={currentStep === 1 || isSaving}
            className="min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Auto-saving...</span>
          </div>

          <Button
            onClick={onNext}
            disabled={!canProceed || isSaving}
            className="min-h-[44px]"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isLastStep ? (
              lastStepButtonText
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
