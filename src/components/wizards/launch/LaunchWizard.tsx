import { WizardLayout } from '@/components/wizards/WizardLayout';
import { WizardProgress } from '@/components/wizards/WizardProgress';
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
import { useState } from 'react';

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
  } = useWizard<LaunchWizardData>({
    templateName: 'launch-planner',
    totalSteps: 7,
    defaultData: DEFAULT_LAUNCH_WIZARD_DATA,
    validateStep: validateLaunchStep,
  });

  const handleChange = (updates: Partial<LaunchWizardData>) => {
    setData(updates);
  };

  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/wizards');
  };

  const handleCreateLaunch = async () => {
    if (isCreating || !user) return;
    setIsCreating(true);

    try {
      // Transform wizard data to database format (JSON.parse/stringify for Supabase Json compatibility)
      const launchData = {
        user_id: user.id,
        name: data.name.trim(),
        cart_opens: data.cartOpens,
        cart_closes: data.cartCloses,
        launch_duration: data.launchDuration,
        revenue_goal: data.revenueGoal,
        price_per_sale: data.pricePerSale,
        sales_needed: data.salesNeeded,
        selected_content_ids: data.selectedContentIds,
        has_waitlist: data.hasWaitlist,
        waitlist_opens: data.waitlistOpens || null,
        waitlist_incentive: data.waitlistIncentive || null,
        has_lead_magnet: data.hasLeadMagnet === 'skip' ? false : data.hasLeadMagnet,
        lead_magnet_topic: data.leadMagnetTopic || null,
        lead_magnet_due_date: data.leadMagnetDueDate || null,
        email_sequences: data.emailSequences,
        live_events: JSON.parse(JSON.stringify(data.liveEvents)),
        has_ads: String(data.hasAds),
        ads_budget: data.adsBudget,
        ads_platform: data.adsPlatform,
        social_posts_per_day: data.socialPostsPerDay,
        social_strategy: data.socialStrategy,
        offer_goal: data.offerGoal,
        offer_breakdown: JSON.parse(JSON.stringify(data.offerBreakdown)),
        belief: data.belief || null,
        limiting_thought: data.limitingThought || null,
        useful_thought: data.usefulThought || null,
        post_purchase_flow: data.postPurchaseFlow,
        non_buyer_followup: data.nonBuyerFollowup || null,
        debrief_date: data.debriefDate || null,
        status: 'planning',
      };

      const { data: launch, error } = await supabase
        .from('launches')
        .insert([launchData])
        .select('id')
        .single();

      if (error) throw error;

      // Clear the draft after successful creation
      await clearDraft();
      
      toast.success('Launch created successfully!');
      navigate(`/launches/${launch.id}`);
    } catch (error) {
      console.error('Error creating launch:', error);
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
      >
        {renderStep()}
      </WizardLayout>
    </div>
  );
}
