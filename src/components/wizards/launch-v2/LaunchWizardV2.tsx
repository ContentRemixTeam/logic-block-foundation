// Launch Planner V2 - Main Wizard Component
// Streamlined 9-step wizard with questionnaire-based flow

import { WizardLayout } from '@/components/wizards/WizardLayout';
import { WizardProgress } from '@/components/wizards/WizardProgress';
import { WizardSaveStatus } from '@/components/wizards/WizardSaveStatus';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { useWizard } from '@/hooks/useWizard';
import { LaunchWizardV2Data, DEFAULT_LAUNCH_V2_DATA } from '@/types/launchV2';
import { validateLaunchV2Step } from '@/lib/launchV2Validation';
import {
  StepLaunchContext,
  StepGoalTimeline,
  StepOfferDetails,
  StepPreLaunchStrategy,
  StepLaunchWeek,
  StepPostLaunch,
  StepContingency,
  StepTheGap,
  StepReviewComplete,
} from './steps';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

const WIZARD_STEPS = [
  { number: 1, title: 'Launch Context' },
  { number: 2, title: 'Goal & Timeline' },
  { number: 3, title: 'Offer Details' },
  { number: 4, title: 'Pre-Launch Strategy' },
  { number: 5, title: 'Launch Week' },
  { number: 6, title: 'Post-Launch' },
  { number: 7, title: 'Contingency' },
  { number: 8, title: 'THE GAP' },
  { number: 9, title: 'Review & Complete' },
];

export function LaunchWizardV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  const {
    step,
    data,
    setData,
    goNext,
    goBack,
    goToStep,
    canProceed,
    saveDraft,
    isSaving,
    isLoading,
    clearDraft,
    totalSteps,
    hasDraft,
    lastServerSync,
    syncError,
    draftUpdatedAt,
  } = useWizard<LaunchWizardV2Data>({
    templateName: 'launch-planner-v2',
    totalSteps: 9,
    defaultData: DEFAULT_LAUNCH_V2_DATA,
    validateStep: validateLaunchV2Step,
  });

  useEffect(() => {
    if (!isLoading && !hasCheckedDraft) {
      setHasCheckedDraft(true);
      if (hasDraft && draftUpdatedAt) {
        setShowResumeDialog(true);
      }
    }
  }, [isLoading, hasDraft, draftUpdatedAt, hasCheckedDraft]);

  const handleResumeDraft = () => setShowResumeDialog(false);
  const handleStartFresh = async () => {
    setShowResumeDialog(false);
    await clearDraft();
  };
  const getDraftAgeText = () => draftUpdatedAt ? formatDistanceToNow(draftUpdatedAt, { addSuffix: false }) : null;
  const handleChange = (updates: Partial<LaunchWizardV2Data>) => setData(updates);
  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/wizards');
  };

  const handleCreateLaunch = async () => {
    if (isCreating || !user) return;
    if (!data.name?.trim()) { toast.error('Please enter a launch name'); return; }
    if (!data.cartOpensDate || !data.cartClosesDate) { toast.error('Please select valid cart dates'); return; }
    
    setIsCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-launch-v2', { 
        body: data
      });
      if (error) throw error;
      if (result?.success) {
        await clearDraft();
        toast.success(result.message || `Launch created with ${result.tasks_created} tasks!`);
        navigate(`/projects/${result.project_id}`);
      } else throw new Error(result?.message || 'Failed to create launch');
    } catch (error) {
      console.error('Create launch error:', error);
      toast.error('Failed to create launch. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = () => step === totalSteps ? handleCreateLaunch() : goNext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading your draft...</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1: return <StepLaunchContext data={data} onChange={handleChange} />;
      case 2: return <StepGoalTimeline data={data} onChange={handleChange} />;
      case 3: return <StepOfferDetails data={data} onChange={handleChange} />;
      case 4: return <StepPreLaunchStrategy data={data} onChange={handleChange} />;
      case 5: return <StepLaunchWeek data={data} onChange={handleChange} />;
      case 6: return <StepPostLaunch data={data} onChange={handleChange} />;
      case 7: return <StepContingency data={data} onChange={handleChange} />;
      case 8: return <StepTheGap data={data} onChange={handleChange} />;
      case 9: return <StepReviewComplete data={data} onChange={handleChange} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <WizardProgress
        steps={WIZARD_STEPS}
        currentStep={step}
        onStepClick={goToStep}
        className="mb-6"
      />

      <WizardLayout
        title="Launch Planner"
        stepTitle={WIZARD_STEPS[step - 1]?.title || ''}
        currentStep={step}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={handleNext}
        onSave={handleSaveAndExit}
        canProceed={canProceed}
        isSaving={isSaving || isCreating}
        isLastStep={step === totalSteps}
        lastStepButtonText="Create Launch"
        statusIndicator={
          <WizardSaveStatus
            isSaving={isSaving}
            lastSaved={lastServerSync}
            syncError={syncError}
          />
        }
      >
        {renderStep()}
      </WizardLayout>

      <ResumeDraftDialog
        isOpen={showResumeDialog}
        draftAge={getDraftAgeText()}
        onResume={handleResumeDraft}
        onStartFresh={handleStartFresh}
      />
    </div>
  );
}

export default LaunchWizardV2;
