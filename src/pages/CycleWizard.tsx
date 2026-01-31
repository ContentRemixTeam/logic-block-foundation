import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { WizardSaveStatus } from '@/components/wizards/WizardSaveStatus';
import { useWizard } from '@/hooks/useWizard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { CycleWizardFormData, STEP_TITLES, TOTAL_STEPS } from '@/components/cycle-wizard/CycleWizardTypes';
import { getDefaultFormData, validateStep } from '@/components/cycle-wizard/CycleWizardData';
import { generateCycleWizardPDF } from '@/components/cycle-wizard/CycleWizardPDFExport';

import {
  StepBigGoal,
  StepDiagnostic,
  StepIdentity,
  StepMetrics,
  StepWeeklyRhythm,
  StepBottleneck,
  StepTheGap,
  StepMindset,
  StepReview,
} from '@/components/cycle-wizard/steps';

export default function CycleWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCycleId = searchParams.get('edit');
  const { user } = useAuth();
  
  const [showResumeDraft, setShowResumeDraft] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const {
    step,
    data,
    setData,
    goNext,
    goBack,
    goToStep,
    canProceed,
    save,
    saveDraft,
    isLoading,
    isSaving,
    hasDraft,
    clearDraft,
    lastServerSync,
    syncError,
    getDraftAge,
  } = useWizard<CycleWizardFormData>({
    templateName: 'cycle-90-day-wizard',
    totalSteps: TOTAL_STEPS,
    defaultData: getDefaultFormData(),
    validateStep: (s, d) => validateStep(s, d),
  });

  // Handle completing the wizard
  const handleComplete = useCallback(async () => {
    if (!user) {
      toast.error('Please log in to save your plan');
      return;
    }

    setIsCreating(true);
    try {
      // Prepare data for database
      const cycleData = {
        user_id: user.id,
        goal: data.goal,
        why: data.why,
        discover_score: data.discoverScore,
        nurture_score: data.nurtureScore,
        convert_score: data.convertScore,
        focus_area: data.focusArea,
        identity: data.identity,
        target_feeling: data.targetFeeling,
        metric_1_name: data.metric1_name || null,
        metric_1_start: data.metric1_start,
        metric_1_goal: data.metric1_goal,
        metric_2_name: data.metric2_name || null,
        metric_2_start: data.metric2_start,
        metric_2_goal: data.metric2_goal,
        metric_3_name: data.metric3_name || null,
        metric_3_start: data.metric3_start,
        metric_3_goal: data.metric3_goal,
        weekly_planning_day: data.weeklyPlanningDay,
        weekly_debrief_day: data.weeklyDebriefDay,
        office_hours_start: data.officeHoursStart || null,
        office_hours_end: data.officeHoursEnd || null,
        office_hours_days: data.officeHoursDays,
        biggest_bottleneck: data.biggestBottleneck || null,
        biggest_fear: data.biggestFear || null,
        fear_response: data.fearResponse || null,
        gap_strategy: data.gapStrategy || null,
        accountability_person: data.accountabilityPerson || null,
        useful_belief: data.usefulBelief || null,
        limiting_thought: data.limitingThought || null,
        useful_thought: data.usefulThought || null,
        things_to_remember: data.thingsToRemember,
        start_date: data.startDate,
        end_date: data.endDate,
      };

      let cycleId: string;

      if (editCycleId) {
        // Update existing cycle
        const { error } = await supabase
          .from('cycles_90_day')
          .update(cycleData)
          .eq('cycle_id', editCycleId)
          .eq('user_id', user.id);

        if (error) throw error;
        cycleId = editCycleId;
      } else {
        // Create new cycle
        const { data: newCycle, error } = await supabase
          .from('cycles_90_day')
          .insert([cycleData])
          .select('cycle_id')
          .single();

        if (error) throw error;
        cycleId = newCycle.cycle_id;

        // Mark wizard as completed
        await supabase
          .from('wizard_completions')
          .update({ 
            completed_at: new Date().toISOString(),
            created_cycle_id: cycleId,
          })
          .eq('user_id', user.id)
          .eq('template_name', 'cycle-90-day-wizard')
          .is('completed_at', null);
      }

      // Clear draft
      await clearDraft();

      toast.success(editCycleId ? 'Your plan has been updated!' : '🎉 Your 90-day cycle is ready!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving cycle:', error);
      toast.error('Failed to save your plan. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [user, data, editCycleId, clearDraft, navigate]);

  const handleNext = useCallback(() => {
    if (step === TOTAL_STEPS) {
      handleComplete();
    } else {
      goNext();
    }
  }, [step, goNext, handleComplete]);

  const handleSaveAndExit = useCallback(async () => {
    await saveDraft();
    navigate('/wizards');
  }, [saveDraft, navigate]);

  const handleExportPDF = useCallback(async () => {
    setIsExportingPDF(true);
    try {
      const result = await generateCycleWizardPDF(data);
      if (result.success && result.blob) {
        // Create download link
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `90-day-plan-${data.startDate}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('PDF downloaded!');
      } else {
        throw new Error(result.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExportingPDF(false);
    }
  }, [data]);

  // Show resume draft dialog
  const handleResumeDraft = useCallback(() => {
    setShowResumeDraft(false);
  }, []);

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft();
    setShowResumeDraft(false);
  }, [clearDraft]);

  // Render current step content
  const renderStepContent = () => {
    const stepProps = { data, setData };

    switch (step) {
      case 1:
        return <StepBigGoal {...stepProps} />;
      case 2:
        return <StepDiagnostic {...stepProps} />;
      case 3:
        return <StepIdentity {...stepProps} />;
      case 4:
        return <StepMetrics {...stepProps} />;
      case 5:
        return <StepWeeklyRhythm {...stepProps} />;
      case 6:
        return <StepBottleneck {...stepProps} />;
      case 7:
        return <StepTheGap {...stepProps} />;
      case 8:
        return <StepMindset {...stepProps} />;
      case 9:
        return (
          <StepReview 
            {...stepProps} 
            onGoToStep={goToStep} 
            onExportPDF={handleExportPDF}
            isExporting={isExportingPDF}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <WizardLayout
        title={editCycleId ? 'Edit Your 90-Day Plan' : '90-Day Planner'}
        stepTitle={STEP_TITLES[step - 1]}
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onBack={goBack}
        onNext={handleNext}
        onSave={handleSaveAndExit}
        canProceed={canProceed}
        isSaving={isSaving || isCreating}
        isLastStep={step === TOTAL_STEPS}
        lastStepButtonText={isCreating ? 'Creating...' : (editCycleId ? 'Update Plan' : 'Create My 90-Day Cycle')}
        statusIndicator={
          <WizardSaveStatus
            lastSaved={lastServerSync}
            isSaving={isSaving}
            syncError={syncError}
          />
        }
      >
        {renderStepContent()}
      </WizardLayout>

      {/* Resume Draft Dialog */}
      <ResumeDraftDialog
        isOpen={showResumeDraft && hasDraft && !editCycleId}
        onResume={handleResumeDraft}
        onStartFresh={handleDiscardDraft}
        draftAge={getDraftAge()}
      />
    </Layout>
  );
}
