import { lazy, Suspense } from 'react';
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { useWizard } from '@/hooks/useWizard';
import { Loader2 } from 'lucide-react';
import { 
  ContentChallengeWizardData, 
  DEFAULT_CONTENT_CHALLENGE_DATA,
} from '@/types/contentChallenge';

// Lazy load step components
const StepContextCheck = lazy(() => import('./steps/StepContextCheck'));
const StepPillarsDiscovery = lazy(() => import('./steps/StepPillarsDiscovery'));
const StepPlatformSelection = lazy(() => import('./steps/StepPlatformSelection'));
const StepGenerateEdit = lazy(() => import('./steps/StepGenerateEdit'));
const StepScheduleCalendar = lazy(() => import('./steps/StepScheduleCalendar'));
const StepReviewLaunch = lazy(() => import('./steps/StepReviewLaunch'));

const TOTAL_STEPS = 6;

const STEP_TITLES = [
  'Context Check',
  'Content Pillars',
  'Platform Selection',
  'Generate & Edit',
  'Schedule',
  'Review & Launch',
];

export default function ContentChallengeWizard() {
  const wizard = useWizard<Record<string, unknown> & ContentChallengeWizardData>({
    templateName: 'content-challenge-30-days',
    totalSteps: TOTAL_STEPS,
    defaultData: DEFAULT_CONTENT_CHALLENGE_DATA as Record<string, unknown> & ContentChallengeWizardData,
    validateStep: () => true, // Allow free navigation
  });

  const StepFallback = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const renderStep = () => {
    const stepProps = {
      data: wizard.data as ContentChallengeWizardData,
      setData: wizard.setData as (updates: Partial<ContentChallengeWizardData>) => void,
      goNext: wizard.goNext,
      goBack: wizard.goBack,
    };

    switch (wizard.step) {
      case 1:
        return (
          <Suspense fallback={<StepFallback />}>
            <StepContextCheck {...stepProps} />
          </Suspense>
        );
      case 2:
        return (
          <Suspense fallback={<StepFallback />}>
            <StepPillarsDiscovery {...stepProps} />
          </Suspense>
        );
      case 3:
        return (
          <Suspense fallback={<StepFallback />}>
            <StepPlatformSelection {...stepProps} />
          </Suspense>
        );
      case 4:
        return (
          <Suspense fallback={<StepFallback />}>
            <StepGenerateEdit {...stepProps} />
          </Suspense>
        );
      case 5:
        return (
          <Suspense fallback={<StepFallback />}>
            <StepScheduleCalendar {...stepProps} />
          </Suspense>
        );
      case 6:
        return (
          <Suspense fallback={<StepFallback />}>
            <StepReviewLaunch {...stepProps} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  if (wizard.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <WizardLayout
      title="30 Days of Content"
      currentStep={wizard.step}
      totalSteps={TOTAL_STEPS}
      stepTitle={STEP_TITLES[wizard.step - 1]}
      onNext={wizard.goNext}
      onBack={wizard.goBack}
      onSave={wizard.saveDraft}
      canProceed={true}
      isSaving={wizard.isSaving}
      isLastStep={wizard.step === TOTAL_STEPS}
      lastStepButtonText="Review"
    >
      {renderStep()}
    </WizardLayout>
  );
}
