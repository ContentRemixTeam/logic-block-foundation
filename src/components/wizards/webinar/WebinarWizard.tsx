// Webinar/Masterclass Planner Wizard - Main Component
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { WizardProgress } from '@/components/wizards/WizardProgress';
import { WizardSaveStatus } from '@/components/wizards/WizardSaveStatus';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { useWizard } from '@/hooks/useWizard';
import { WebinarWizardData, DEFAULT_WEBINAR_DATA, validateWebinarStep, WEBINAR_EVENT_TYPES } from '@/types/webinar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

import {
  StepEventBasics,
  StepTargetAudience,
  StepContentStructure,
  StepTechSetup,
  StepRegistrationFlow,
  StepOfferPitch,
  StepFollowupSequence,
  StepReviewLaunch,
} from './steps';

const WIZARD_STEPS = [
  { number: 1, title: 'Event Basics' },
  { number: 2, title: 'Target Audience' },
  { number: 3, title: 'Content Structure' },
  { number: 4, title: 'Tech Setup' },
  { number: 5, title: 'Registration Flow' },
  { number: 6, title: 'Offer & Pitch' },
  { number: 7, title: 'Follow-up Sequence' },
  { number: 8, title: 'Review & Launch' },
];

export function WebinarWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  const defaultData = useMemo(() => DEFAULT_WEBINAR_DATA, []);

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
  } = useWizard<WebinarWizardData>({
    templateName: 'webinar-wizard',
    totalSteps: 8,
    defaultData,
    validateStep: validateWebinarStep,
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
  
  const getDraftAgeText = () => 
    draftUpdatedAt ? formatDistanceToNow(draftUpdatedAt, { addSuffix: false }) : null;
  
  const handleChange = (updates: Partial<WebinarWizardData>) => setData(updates);
  
  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/wizards');
  };

  const handleCreateWebinar = async () => {
    if (isCreating || !user) return;
    
    if (!data.name?.trim()) {
      toast.error('Please enter a name for your webinar');
      return;
    }
    
    setIsCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-webinar', {
        body: data,
      });
      
      if (error) throw error;
      
      if (result?.success) {
        await clearDraft();
        toast.success(result.message || `Webinar created with ${result.tasks_created} tasks!`);
        navigate(`/projects/${result.project_id}`);
      } else {
        throw new Error(result?.message || 'Failed to create webinar');
      }
    } catch (error) {
      console.error('Create webinar error:', error);
      toast.error('Failed to create webinar. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = () => {
    if (step === totalSteps) {
      handleCreateWebinar();
    } else {
      goNext();
    }
  };

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

  const eventTypeLabel = WEBINAR_EVENT_TYPES.find(t => t.value === data.eventType)?.label || 'Webinar';

  const renderStep = () => {
    switch (step) {
      case 1: return <StepEventBasics data={data} onChange={handleChange} />;
      case 2: return <StepTargetAudience data={data} onChange={handleChange} />;
      case 3: return <StepContentStructure data={data} onChange={handleChange} />;
      case 4: return <StepTechSetup data={data} onChange={handleChange} />;
      case 5: return <StepRegistrationFlow data={data} onChange={handleChange} />;
      case 6: return <StepOfferPitch data={data} onChange={handleChange} />;
      case 7: return <StepFollowupSequence data={data} onChange={handleChange} />;
      case 8: return <StepReviewLaunch data={data} onChange={handleChange} />;
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
        title={`${eventTypeLabel} Planner`}
        stepTitle={WIZARD_STEPS[step - 1]?.title || ''}
        currentStep={step}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={handleNext}
        onSave={handleSaveAndExit}
        canProceed={canProceed}
        isSaving={isSaving || isCreating}
        isLastStep={step === totalSteps}
        lastStepButtonText={`Create ${eventTypeLabel}`}
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

export default WebinarWizard;
