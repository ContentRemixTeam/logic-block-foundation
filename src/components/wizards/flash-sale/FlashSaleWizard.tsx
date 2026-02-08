import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { WizardProgress } from '@/components/wizards/WizardProgress';
import { WizardSaveStatus } from '@/components/wizards/WizardSaveStatus';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { useWizard } from '@/hooks/useWizard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  FlashSaleWizardData,
  DEFAULT_FLASH_SALE_DATA,
  STEP_TITLES,
  TOTAL_STEPS,
} from '@/types/flashSale';
import {
  StepTheSale,
  StepUrgencyStrategy,
  StepTargetAudience,
  StepEmailSequence,
  StepSalesCopy,
  StepPromotionPlan,
  StepReviewLaunch,
} from './steps';

const FLASH_SALE_STEPS = STEP_TITLES.map((title, index) => ({
  number: index + 1,
  title,
}));

export function FlashSaleWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showResumeDraft, setShowResumeDraft] = useState(false);

  const defaultData = useMemo(() => DEFAULT_FLASH_SALE_DATA, []);

  const {
    step,
    data,
    setData,
    goNext,
    goBack,
    goToStep,
    save,
    saveDraft,
    isLoading,
    isSaving,
    hasDraft,
    clearDraft,
    getDraftAge,
    draftUpdatedAt,
    syncError,
  } = useWizard<FlashSaleWizardData>({
    templateName: 'flash-sale-wizard',
    totalSteps: TOTAL_STEPS,
    defaultData,
  });

  // Show resume dialog if there's a draft
  useEffect(() => {
    if (hasDraft && draftUpdatedAt && !isLoading) {
      setShowResumeDraft(true);
    }
  }, [hasDraft, draftUpdatedAt, isLoading]);

  const handleResume = () => {
    setShowResumeDraft(false);
  };

  const handleStartFresh = async () => {
    await clearDraft();
    setShowResumeDraft(false);
  };

  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/wizards');
  };

  const handleComplete = async () => {
    if (!user) {
      toast.error('Please sign in to create a flash sale');
      return;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('create-flash-sale', {
        body: { wizardData: data },
      });

      if (error) throw error;

      toast.success('Flash sale created! Tasks added to your project board.');

      // Clean up draft
      await clearDraft();

      // Navigate to project or flash sale detail
      if (result?.projectId) {
        navigate(`/projects/${result.projectId}`);
      } else {
        navigate('/wizards');
      }
    } catch (error) {
      console.error('Error creating flash sale:', error);
      toast.error('Failed to create flash sale. Please try again.');
    }
  };

  const handleNext = () => {
    if (step === TOTAL_STEPS) {
      handleComplete();
    } else {
      goNext();
    }
  };

  const renderStep = () => {
    const stepProps = { data, setData };

    switch (step) {
      case 1:
        return <StepTheSale {...stepProps} />;
      case 2:
        return <StepUrgencyStrategy {...stepProps} />;
      case 3:
        return <StepTargetAudience {...stepProps} />;
      case 4:
        return <StepEmailSequence {...stepProps} />;
      case 5:
        return <StepSalesCopy {...stepProps} />;
      case 6:
        return <StepPromotionPlan {...stepProps} />;
      case 7:
        return <StepReviewLaunch {...stepProps} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <WizardProgress 
          steps={FLASH_SALE_STEPS} 
          currentStep={step} 
          onStepClick={goToStep}
        />

        <WizardLayout
          title="Flash Sale Wizard"
          stepTitle={FLASH_SALE_STEPS[step - 1]?.title || ''}
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onNext={handleNext}
          onSave={handleSaveAndExit}
          canProceed={true}
          isSaving={isSaving}
          isLastStep={step === TOTAL_STEPS}
          lastStepButtonText="Create Flash Sale"
          statusIndicator={
            <WizardSaveStatus
              isSaving={isSaving}
              lastSaved={draftUpdatedAt}
              syncError={syncError}
            />
          }
        >
          {renderStep()}
        </WizardLayout>

        <ResumeDraftDialog
          isOpen={showResumeDraft}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
          draftAge={getDraftAge()}
        />
      </div>
    </Layout>
  );
}

export default FlashSaleWizard;
