import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Users, Loader2 } from 'lucide-react';
import { useWizard } from '@/hooks/useWizard';
import { SummitWizardData, DEFAULT_SUMMIT_WIZARD_DATA, SUMMIT_STEPS, validateSummitStep } from '@/types/summit';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Import steps
import { StepSummitBasics } from './steps/StepSummitBasics';
import { StepSummitStructure } from './steps/StepSummitStructure';
import { StepSpeakerStrategy } from './steps/StepSpeakerStrategy';
import { StepAllAccessPass } from './steps/StepAllAccessPass';
import { StepSummitTimeline } from './steps/StepSummitTimeline';
import { StepTechDelivery } from './steps/StepTechDelivery';
import { StepMarketingStrategy } from './steps/StepMarketingStrategy';
import { StepEngagement } from './steps/StepEngagement';
import { StepReviewCreate } from './steps/StepReviewCreate';

const WIZARD_NAME = 'summit-planner';
const TOTAL_STEPS = 9;

// Extend the type to satisfy Record<string, unknown>
type SummitWizardDataExtended = SummitWizardData & Record<string, unknown>;

export default function SummitWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  const defaultData = useMemo(() => DEFAULT_SUMMIT_WIZARD_DATA as SummitWizardDataExtended, []);

  const {
    data,
    setData,
    step: currentStep,
    goToStep,
    goNext,
    goBack,
    isLoading,
    hasDraft,
    clearDraft,
    getDraftAge,
  } = useWizard<SummitWizardDataExtended>({
    templateName: WIZARD_NAME,
    defaultData,
    totalSteps: TOTAL_STEPS,
    validateStep: (step, d) => validateSummitStep(step, d as SummitWizardData),
  });

  // Show resume dialog when draft is detected
  const handleResumeDraft = useCallback(() => {
    setShowResumeDialog(false);
  }, []);

  const handleStartFresh = useCallback(async () => {
    await clearDraft();
    setShowResumeDialog(false);
  }, [clearDraft]);

  // Show dialog on mount if draft exists
  useState(() => {
    if (hasDraft && !isLoading) {
      setShowResumeDialog(true);
    }
  });

  const progress = ((currentStep) / TOTAL_STEPS) * 100;
  const currentStepInfo = SUMMIT_STEPS.find(s => s.number === currentStep);
  const canProceed = validateSummitStep(currentStep, data as SummitWizardData);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS && canProceed) {
      goNext();
    }
  }, [currentStep, canProceed, goNext]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      goBack();
    } else {
      navigate('/wizards');
    }
  }, [currentStep, goBack, navigate]);

  const updateData = useCallback((updates: Partial<SummitWizardData>) => {
    setData(updates);
  }, [setData]);

  const handleCreate = async () => {
    if (!user) {
      toast.error('Please log in to create a summit');
      return;
    }

    setIsCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-summit', {
        body: { wizardData: data },
      });

      if (error) throw error;

      // Record wizard completion
      await supabase.from('wizard_completions').upsert({
        user_id: user.id,
        template_name: WIZARD_NAME,
        answers_json: data as any,
        completed_at: new Date().toISOString(),
        created_project_id: result.projectId,
      });

      // Clear draft
      await clearDraft();

      toast.success('Summit created successfully!');
      navigate(`/projects/${result.projectId}`);
    } catch (err: any) {
      console.error('Error creating summit:', err);
      toast.error(err.message || 'Failed to create summit');
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep = () => {
    const stepProps = { data: data as SummitWizardData, updateData };

    switch (currentStep) {
      case 1:
        return <StepSummitBasics {...stepProps} />;
      case 2:
        return <StepSummitStructure {...stepProps} />;
      case 3:
        return <StepSpeakerStrategy {...stepProps} />;
      case 4:
        return <StepAllAccessPass {...stepProps} />;
      case 5:
        return <StepSummitTimeline {...stepProps} />;
      case 6:
        return <StepTechDelivery {...stepProps} />;
      case 7:
        return <StepMarketingStrategy {...stepProps} />;
      case 8:
        return <StepEngagement {...stepProps} />;
      case 9:
        return <StepReviewCreate data={data as SummitWizardData} updateData={updateData} onEdit={goToStep} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <ResumeDraftDialog
        isOpen={showResumeDialog && hasDraft}
        draftAge={getDraftAge()}
        onResume={handleResumeDraft}
        onStartFresh={handleStartFresh}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Summit Planner</h1>
          <p className="text-muted-foreground">
            Step {currentStep} of {TOTAL_STEPS}: {currentStepInfo?.title}
          </p>
        </div>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStepInfo?.title}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "Let's start with the basics of your summit"}
            {currentStep === 2 && "Define how your summit will be structured"}
            {currentStep === 3 && "Plan your speaker recruitment strategy"}
            {currentStep === 4 && "Set up your all-access pass offering"}
            {currentStep === 5 && "Set your summit dates and timeline"}
            {currentStep === 6 && "Choose your tech stack and platforms"}
            {currentStep === 7 && "Plan how you'll promote your summit"}
            {currentStep === 8 && "Design the attendee experience"}
            {currentStep === 9 && "Review and create your summit"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Exit' : 'Back'}
        </Button>

        {currentStep < TOTAL_STEPS ? (
          <Button onClick={handleNext} disabled={!canProceed}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Summit'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
