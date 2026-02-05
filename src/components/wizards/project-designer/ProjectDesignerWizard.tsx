import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { Button } from '@/components/ui/button';
import { ProjectDesignerData, DEFAULT_PROJECT_DESIGNER_DATA, UseCaseType } from '@/types/projectDesigner';
import { useProjectDesigner } from '@/hooks/useProjectDesigner';
import { StepUseCase, StepWorkflow, StepFields, StepSettings, StepReview } from './steps';
import { Loader2 } from 'lucide-react';

const STEPS = [
  { title: 'What Are You Tracking?', key: 'useCase' },
  { title: 'Workflow Stages', key: 'workflow' },
  { title: 'Information to Track', key: 'fields' },
  { title: 'Board Settings', key: 'settings' },
  { title: 'Review & Create', key: 'review' },
];

export function ProjectDesignerWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<ProjectDesignerData>(DEFAULT_PROJECT_DESIGNER_DATA);
  const { createBoard, applyTemplate, isCreating } = useProjectDesigner();

  const handleChange = useCallback((updates: Partial<ProjectDesignerData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleUseCaseSelect = useCallback((useCase: UseCaseType) => {
    const templateData = applyTemplate(useCase);
    setData(prev => ({ ...prev, useCase, ...templateData }));
  }, [applyTemplate]);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Create the board
      await createBoard(data);
    }
  };

  const handleSave = () => {
    // Just navigate back for now (auto-save via drafts would go here)
    navigate('/projects');
  };

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return !!data.useCase;
      case 2:
        return data.columns.length >= 2 && data.columns.every(c => c.name.trim());
      case 3:
        return data.fields.some(f => f.key === 'name');
      case 4:
        return !!data.boardName.trim();
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, data]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepUseCase
            data={data}
            onChange={handleChange}
            onUseCaseSelect={handleUseCaseSelect}
          />
        );
      case 2:
        return <StepWorkflow data={data} onChange={handleChange} />;
      case 3:
        return <StepFields data={data} onChange={handleChange} />;
      case 4:
        return <StepSettings data={data} onChange={handleChange} />;
      case 5:
        return <StepReview data={data} />;
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      title="Project Designer"
      stepTitle={STEPS[currentStep - 1].title}
      currentStep={currentStep}
      totalSteps={STEPS.length}
      onBack={handleBack}
      onNext={handleNext}
      onSave={handleSave}
      canProceed={canProceed && !isCreating}
      isSaving={isCreating}
      isLastStep={currentStep === STEPS.length}
      lastStepButtonText={isCreating ? 'Creating...' : 'Create Board'}
    >
      {renderStep()}
    </WizardLayout>
  );
}

export default ProjectDesignerWizard;
