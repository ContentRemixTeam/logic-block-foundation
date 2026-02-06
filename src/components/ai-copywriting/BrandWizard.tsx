import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { useWizard } from '@/hooks/useWizard';
import { useAuth } from '@/hooks/useAuth';
import { useSaveBrandProfile, useSaveProduct, useAPIKey } from '@/hooks/useAICopywriting';
import { OpenAIService } from '@/lib/openai-service';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { BrandWizardData, DEFAULT_BRAND_WIZARD_DATA, BRAND_WIZARD_STEPS } from '@/types/aiCopywriting';

// Step components
import { StepBusinessBasics } from './wizard-steps/StepBusinessBasics';
import { StepVoiceDiscovery } from './wizard-steps/StepVoiceDiscovery';
import { StepProducts } from './wizard-steps/StepProducts';
import { StepComplete } from './wizard-steps/StepComplete';

export function BrandWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: apiKey } = useAPIKey();
  const saveBrandProfile = useSaveBrandProfile();
  const saveProduct = useSaveProduct();
  const [isCreating, setIsCreating] = useState(false);

  const defaultData = useMemo(() => DEFAULT_BRAND_WIZARD_DATA, []);

  const {
    step,
    data,
    setData,
    goNext,
    goBack,
    save,
    isSaving,
    isLoading,
    totalSteps,
  } = useWizard<BrandWizardData>({
    templateName: 'brand_profile',
    totalSteps: BRAND_WIZARD_STEPS.length,
    defaultData,
  });

  const handleChange = (updates: Partial<BrandWizardData>) => {
    setData(updates);
  };

  const handleComplete = async () => {
    if (isCreating || !user) return;

    setIsCreating(true);
    try {
      // Save brand profile
      await saveBrandProfile.mutateAsync({
        business_name: data.businessName,
        industry: data.industry || null,
        what_you_sell: data.whatYouSell || null,
        target_customer: data.targetCustomer || null,
        voice_profile: data.voiceProfile,
        voice_samples: data.voiceSamples.filter(s => s.trim()),
        transcript_samples: data.transcriptSamples.filter(s => s.trim()),
        customer_reviews: data.customerReviews.filter(s => s.trim()),
      });

      // Save products
      for (const product of data.products) {
        await saveProduct.mutateAsync(product);
      }

      toast.success('Brand profile created! Ready to generate copy.');
      navigate('/ai-copywriting');
    } catch (error) {
      console.error('Failed to save brand profile:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveAndExit = async () => {
    await save();
    navigate('/ai-copywriting');
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return data.businessName.trim().length > 0;
      case 2:
        const totalSamples = [
          ...data.voiceSamples.filter(s => s.trim().length >= 50),
          ...data.transcriptSamples.filter(s => s.trim().length >= 50),
        ];
        return totalSamples.length >= 2 || data.voiceAnalyzed;
      case 3:
        return true; // Optional step
      case 4:
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepBusinessBasics data={data} onChange={handleChange} />;
      case 2:
        return (
          <StepVoiceDiscovery 
            data={data} 
            onChange={handleChange} 
            apiKey={apiKey?.key_status === 'valid' ? apiKey : null}
          />
        );
      case 3:
        return <StepProducts data={data} onChange={handleChange} />;
      case 4:
        return <StepComplete data={data} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <WizardLayout
        title="Brand Profile Setup"
        stepTitle={BRAND_WIZARD_STEPS[step - 1].title}
        currentStep={step}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={step === totalSteps ? handleComplete : goNext}
        onSave={handleSaveAndExit}
        canProceed={canProceed()}
        isSaving={isSaving || isCreating}
        isLastStep={step === totalSteps}
        lastStepButtonText={isCreating ? 'Saving...' : 'Complete Setup'}
      >
        {renderStep()}
      </WizardLayout>
    </div>
  );
}
