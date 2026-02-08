// Lead Magnet Creator Wizard - Main Component
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { WizardProgress } from '@/components/wizards/WizardProgress';
import { WizardSaveStatus } from '@/components/wizards/WizardSaveStatus';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { useWizard } from '@/hooks/useWizard';
import { LeadMagnetWizardData, DEFAULT_LEAD_MAGNET_DATA, validateLeadMagnetStep } from '@/types/leadMagnet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

import {
  StepIdeaBrainstorm,
  StepIdealSubscriber,
  StepFormatDeliverables,
  StepOptinPromise,
  StepTechSetup,
  StepEmailSequence,
  StepPromotionPlan,
  StepReviewCreate,
} from './steps';

const WIZARD_STEPS = [
  { number: 1, title: 'Brainstorm & Idea' },
  { number: 2, title: 'Ideal Subscriber' },
  { number: 3, title: 'Format & Deliverables' },
  { number: 4, title: 'Opt-in Promise' },
  { number: 5, title: 'Tech Setup' },
  { number: 6, title: 'Email Sequence' },
  { number: 7, title: 'Promotion Plan' },
  { number: 8, title: 'Review & Create' },
];

export function LeadMagnetWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  const defaultData = useMemo(() => DEFAULT_LEAD_MAGNET_DATA, []);

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
  } = useWizard<LeadMagnetWizardData>({
    templateName: 'lead-magnet-wizard',
    totalSteps: 8,
    defaultData,
    validateStep: validateLeadMagnetStep,
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
  
  const handleChange = (updates: Partial<LeadMagnetWizardData>) => setData(updates);
  
  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/wizards');
  };

  const handleCreateLeadMagnet = async () => {
    if (isCreating || !user) return;
    
    if (!data.name?.trim()) {
      toast.error('Please enter a name for your lead magnet');
      return;
    }
    
    setIsCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-lead-magnet', {
        body: data,
      });
      
      if (error) throw error;
      
      if (result?.success) {
        await clearDraft();
        toast.success(result.message || `Lead magnet created with ${result.tasks_created} tasks!`);
        navigate(`/projects/${result.project_id}`);
      } else {
        throw new Error(result?.message || 'Failed to create lead magnet');
      }
    } catch (error) {
      console.error('Create lead magnet error:', error);
      toast.error('Failed to create lead magnet. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = () => {
    if (step === totalSteps) {
      handleCreateLeadMagnet();
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

  const renderStep = () => {
    switch (step) {
      case 1: return <StepIdeaBrainstorm data={data} onChange={handleChange} />;
      case 2: return <StepIdealSubscriber data={data} onChange={handleChange} />;
      case 3: return <StepFormatDeliverables data={data} onChange={handleChange} />;
      case 4: return <StepOptinPromise data={data} onChange={handleChange} />;
      case 5: return <StepTechSetup data={data} onChange={handleChange} />;
      case 6: return <StepEmailSequence data={data} onChange={handleChange} />;
      case 7: return <StepPromotionPlan data={data} onChange={handleChange} />;
      case 8: return <StepReviewCreate data={data} onChange={handleChange} />;
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
        title="Lead Magnet Creator"
        stepTitle={WIZARD_STEPS[step - 1]?.title || ''}
        currentStep={step}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={handleNext}
        onSave={handleSaveAndExit}
        canProceed={canProceed}
        isSaving={isSaving || isCreating}
        isLastStep={step === totalSteps}
        lastStepButtonText="Create Lead Magnet"
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

export default LeadMagnetWizard;
