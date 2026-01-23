import { WizardLayout } from '@/components/wizards/WizardLayout';
import { WizardProgress } from '@/components/wizards/WizardProgress';
import { WizardSaveStatus } from '@/components/wizards/WizardSaveStatus';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { useWizard } from '@/hooks/useWizard';
import { LaunchWizardData, DEFAULT_LAUNCH_WIZARD_DATA } from '@/types/launch';
import { validateLaunchStep } from '@/lib/launchValidation';
import { LaunchBasics } from './LaunchBasics';
import { LaunchContentReuse } from './LaunchContentReuse';
import { LaunchPreLaunch } from './LaunchPreLaunch';
import { LaunchActivities } from './LaunchActivities';
import { LaunchOffers } from './LaunchOffers';
import { LaunchThoughtWork } from './LaunchThoughtWork';
import { LaunchReview } from './LaunchReview';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

const LAUNCH_WIZARD_STEPS = [
  { number: 1, title: 'Launch Basics' },
  { number: 2, title: 'Content Reuse' },
  { number: 3, title: 'Pre-Launch' },
  { number: 4, title: 'Activities' },
  { number: 5, title: 'Making Offers' },
  { number: 6, title: 'Thought Work' },
  { number: 7, title: 'Review' },
];

export function LaunchWizard() {
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
  } = useWizard<LaunchWizardData>({
    templateName: 'launch-planner',
    totalSteps: 7,
    defaultData: DEFAULT_LAUNCH_WIZARD_DATA,
    validateStep: validateLaunchStep,
  });

  // Show resume dialog when draft is detected
  useEffect(() => {
    if (!isLoading && !hasCheckedDraft) {
      setHasCheckedDraft(true);
      if (hasDraft && draftUpdatedAt) {
        setShowResumeDialog(true);
      }
    }
  }, [isLoading, hasDraft, draftUpdatedAt, hasCheckedDraft]);

  const handleResumeDraft = () => {
    setShowResumeDialog(false);
    // Data is already loaded, just close dialog
  };

  const handleStartFresh = async () => {
    setShowResumeDialog(false);
    await clearDraft();
  };

  const getDraftAgeText = () => {
    if (!draftUpdatedAt) return null;
    return formatDistanceToNow(draftUpdatedAt, { addSuffix: false });
  };

  const handleChange = (updates: Partial<LaunchWizardData>) => {
    setData(updates);
  };

  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/wizards');
  };

  const handleCreateLaunch = async () => {
    if (isCreating || !user) return;
    
    // Validation
    if (!data.name?.trim()) {
      toast.error('Please enter a launch name');
      return;
    }
    if (!data.cartOpens || !data.cartCloses) {
      toast.error('Please select valid cart open and close dates');
      return;
    }
    
    setIsCreating(true);

    try {
      // Call the edge function that creates project + tasks
      const { data: result, error } = await supabase.functions.invoke('create-launch-from-wizard', {
        body: data
      });

      if (error) throw error;

      if (result?.success) {
        // Clear the draft after successful creation
        await clearDraft();
        
        toast.success(result.message || `Launch created with ${result.tasks_created} tasks!`);
        
        // Redirect to the created project
        navigate(`/projects/${result.project_id}`);
      } else {
        throw new Error(result?.message || 'Failed to create launch');
      }
    } catch (error) {
      console.error('Create launch error:', error);
      toast.error('Failed to create launch. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = () => {
    if (step === totalSteps) {
      handleCreateLaunch();
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
      case 1:
        return <LaunchBasics data={data} onChange={handleChange} />;
      case 2:
        return <LaunchContentReuse data={data} onChange={handleChange} />;
      case 3:
        return <LaunchPreLaunch data={data} onChange={handleChange} />;
      case 4:
        return <LaunchActivities data={data} onChange={handleChange} />;
      case 5:
        return <LaunchOffers data={data} onChange={handleChange} />;
      case 6:
        return <LaunchThoughtWork data={data} onChange={handleChange} />;
      case 7:
        return <LaunchReview data={data} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <WizardProgress
        steps={LAUNCH_WIZARD_STEPS}
        currentStep={step}
        onStepClick={goToStep}
        className="mb-6"
      />

      <WizardLayout
        title="Launch Planner"
        stepTitle={LAUNCH_WIZARD_STEPS[step - 1]?.title || ''}
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
