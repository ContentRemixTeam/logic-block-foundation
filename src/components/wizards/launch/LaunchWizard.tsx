import { WizardLayout } from '@/components/wizards/WizardLayout';
import { WizardProgress } from '@/components/wizards/WizardProgress';
import { WizardSaveStatus } from '@/components/wizards/WizardSaveStatus';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { useWizard } from '@/hooks/useWizard';
import { LaunchWizardData, DEFAULT_LAUNCH_WIZARD_DATA } from '@/types/launch';
import { validateLaunchStep } from '@/lib/launchValidation';
import { LaunchBasics } from './LaunchBasics';
import { LaunchRunwayTimeline } from './LaunchRunwayTimeline';
import { LaunchMessaging } from './LaunchMessaging';
import { LaunchContentPlan } from './LaunchContentPlan';
import { LaunchContentReuse } from './LaunchContentReuse';
import { LaunchContentGaps } from './LaunchContentGaps';
import { LaunchPreLaunchTasks } from './LaunchPreLaunchTasks';
import { LaunchActivities } from './LaunchActivities';
import { LaunchVideoStrategy } from './LaunchVideoStrategy';
import { LaunchSalesAssets } from './LaunchSalesAssets';
import { LaunchOffers } from './LaunchOffers';
import { LaunchThoughtWork } from './LaunchThoughtWork';
import { LaunchVisualTimeline } from './LaunchVisualTimeline';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

const LAUNCH_WIZARD_STEPS = [
  { number: 1, title: 'Launch Basics' },
  { number: 2, title: 'Runway Timeline' },
  { number: 3, title: 'Messaging' },
  { number: 4, title: 'Content Plan' },
  { number: 5, title: 'Content Reuse' },
  { number: 6, title: 'Content Gaps' },
  { number: 7, title: 'Pre-Launch' },
  { number: 8, title: 'Activities' },
  { number: 9, title: 'Video & Podcasts' },
  { number: 10, title: 'Sales Assets' },
  { number: 11, title: 'Offers' },
  { number: 12, title: 'Thought Work' },
  { number: 13, title: 'Timeline Review' },
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
    totalSteps: 13,
    defaultData: DEFAULT_LAUNCH_WIZARD_DATA,
    validateStep: validateLaunchStep,
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
  const handleChange = (updates: Partial<LaunchWizardData>) => setData(updates);
  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/wizards');
  };

  const handleCreateLaunch = async () => {
    if (isCreating || !user) return;
    if (!data.name?.trim()) { toast.error('Please enter a launch name'); return; }
    if (!data.cartOpens || !data.cartCloses) { toast.error('Please select valid cart dates'); return; }
    
    setIsCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-launch-from-wizard', { body: data });
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
      case 1: return <LaunchBasics data={data} onChange={handleChange} />;
      case 2: return <LaunchRunwayTimeline data={data} onChange={handleChange} />;
      case 3: return <LaunchMessaging data={data} onChange={handleChange} />;
      case 4: return <LaunchContentPlan data={data} onChange={handleChange} />;
      case 5: return <LaunchContentReuse data={data} onChange={handleChange} />;
      case 6: return <LaunchContentGaps data={data} onChange={handleChange} />;
      case 7: return <LaunchPreLaunchTasks data={data} onChange={handleChange} />;
      case 8: return <LaunchActivities data={data} onChange={handleChange} />;
      case 9: return <LaunchVideoStrategy data={data} onChange={handleChange} />;
      case 10: return <LaunchSalesAssets data={data} onChange={handleChange} />;
      case 11: return <LaunchOffers data={data} onChange={handleChange} />;
      case 12: return <LaunchThoughtWork data={data} onChange={handleChange} />;
      case 13: return <LaunchVisualTimeline data={data} />;
      default: return null;
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
