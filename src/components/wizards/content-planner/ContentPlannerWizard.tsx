// Content Planner Wizard - Main Component
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { WizardProgress } from '@/components/wizards/WizardProgress';
import { WizardSaveStatus } from '@/components/wizards/WizardSaveStatus';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { useWizard } from '@/hooks/useWizard';
import { ContentPlannerData, DEFAULT_CONTENT_PLANNER_DATA } from '@/types/contentPlanner';
import { validateContentPlannerStep } from '@/lib/contentPlannerValidation';
import {
  StepModeSelection,
  StepMessagingFramework,
  StepFormatSelection,
  StepVaultReview,
  StepBatching,
  StepCalendar,
  StepReviewCreate,
} from './steps';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ContentPlanMode } from '@/types/contentPlanner';

const WIZARD_STEPS = [
  { number: 1, title: 'Mode' },
  { number: 2, title: 'Messaging' },
  { number: 3, title: 'Formats' },
  { number: 4, title: 'Vault' },
  { number: 5, title: 'Batching' },
  { number: 6, title: 'Calendar' },
  { number: 7, title: 'Review' },
];

export function ContentPlannerWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  // Check for launch ID in URL (from post-launch prompt)
  const launchIdFromUrl = searchParams.get('launchId');

  // Memoize defaultData to prevent render loops
  const defaultData = useMemo(() => ({
    ...DEFAULT_CONTENT_PLANNER_DATA,
    mode: (launchIdFromUrl ? 'launch' : '') as ContentPlanMode | '',
    launchId: launchIdFromUrl,
  }), [launchIdFromUrl]);

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
  } = useWizard<ContentPlannerData>({
    templateName: 'content-planner',
    totalSteps: 7,
    defaultData,
    validateStep: validateContentPlannerStep,
  });

  // Check for existing draft on mount
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
  
  const handleChange = (updates: Partial<ContentPlannerData>) => setData(updates);
  
  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/wizards');
  };

  const handleCreatePlan = async () => {
    if (isCreating || !user) return;
    
    setIsCreating(true);
    try {
      // Create messaging framework first if we have messaging data
      let frameworkId: string | null = null;
      
      if (data.coreProblem || data.uniqueSolution || data.sellingPoints.length > 0) {
        const { data: framework, error: frameworkError } = await supabase
          .from('messaging_frameworks')
          .insert({
            user_id: user.id,
            name: data.mode === 'launch' ? 'Launch Framework' : 'Content Framework',
            core_problem: data.coreProblem || null,
            unique_solution: data.uniqueSolution || null,
            target_customer: data.targetCustomer || null,
            core_narrative: data.coreNarrative || null,
            launch_id: data.launchId || null,
          })
          .select('id')
          .single();
        
        if (frameworkError) throw frameworkError;
        frameworkId = framework.id;

        // Create selling points
        if (data.sellingPoints.length > 0) {
          const sellingPointsData = data.sellingPoints.map((sp, index) => ({
            user_id: user.id,
            framework_id: frameworkId,
            label: sp.label,
            description: sp.description || null,
            is_core: sp.isCore,
            sort_order: index,
          }));

          const { error: spError } = await supabase
            .from('selling_points')
            .insert(sellingPointsData);
          
          if (spError) throw spError;
        }
      }

      // Create content plan
      const { data: plan, error: planError } = await supabase
        .from('content_plans')
        .insert({
          user_id: user.id,
          name: data.mode === 'launch' ? 'Launch Content Plan' : 'Content Plan',
          mode: data.mode || 'regular',
          start_date: data.customStartDate || null,
          end_date: data.customEndDate || null,
          selected_formats: data.selectedFormats,
          batching_enabled: data.batchingEnabled,
          launch_id: data.launchId || null,
          framework_id: frameworkId,
          status: 'active',
        })
        .select('id')
        .single();

      if (planError) throw planError;

      // Create content plan items
      if (data.plannedItems.length > 0) {
        const itemsData = data.plannedItems.map((item, index) => ({
          user_id: user.id,
          plan_id: plan.id,
          title: item.title,
          content_type: item.type,
          planned_date: item.date || null,
          phase: item.phase || null,
          selling_point_ids: item.sellingPointIds.length > 0 ? item.sellingPointIds : null,
          messaging_angle: item.messagingAngle || null,
          is_repurposed: item.isRepurposed,
          sort_order: index,
          status: 'planned',
        }));

        const { error: itemsError } = await supabase
          .from('content_plan_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      // Generate tasks if enabled
      if (data.generateTasks) {
        // TODO: Implement task generation via edge function
        // For now, just log
        console.log('Task generation enabled for', data.plannedItems.length, 'items');
      }

      await clearDraft();
      toast.success(`Content plan created with ${data.plannedItems.length} items!`);
      
      // Navigate to content or project page
      if (data.launchId) {
        navigate(`/projects/${data.launchId}`);
      } else {
        navigate('/content');
      }
    } catch (error) {
      console.error('Create content plan error:', error);
      toast.error('Failed to create content plan. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = () => step === totalSteps ? handleCreatePlan() : goNext();

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
      case 1: return <StepModeSelection data={data} onChange={handleChange} />;
      case 2: return <StepMessagingFramework data={data} onChange={handleChange} />;
      case 3: return <StepFormatSelection data={data} onChange={handleChange} />;
      case 4: return <StepVaultReview data={data} onChange={handleChange} />;
      case 5: return <StepBatching data={data} onChange={handleChange} />;
      case 6: return <StepCalendar data={data} onChange={handleChange} />;
      case 7: return <StepReviewCreate data={data} onChange={handleChange} />;
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
        title="Content Planner"
        stepTitle={WIZARD_STEPS[step - 1]?.title || ''}
        currentStep={step}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={handleNext}
        onSave={handleSaveAndExit}
        canProceed={canProceed}
        isSaving={isSaving || isCreating}
        isLastStep={step === totalSteps}
        lastStepButtonText="Create Content Plan"
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

export default ContentPlannerWizard;
