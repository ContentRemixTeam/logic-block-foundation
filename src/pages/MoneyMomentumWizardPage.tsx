import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { useWizard } from '@/hooks/useWizard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { MastermindGate } from '@/components/membership/MastermindGate';

import { 
  MoneyMomentumData, 
  DEFAULT_MONEY_MOMENTUM_DATA, 
  MONEY_MOMENTUM_STEPS 
} from '@/types/moneyMomentum';

// Step components
import { StepTheNumbers } from '@/components/wizards/money-momentum/StepTheNumbers';
import { StepRealityCheck } from '@/components/wizards/money-momentum/StepRealityCheck';
import { StepWhatYouHave } from '@/components/wizards/money-momentum/StepWhatYouHave';
import { StepFastCashPicker } from '@/components/wizards/money-momentum/StepFastCashPicker';
import { StepRevenueActions } from '@/components/wizards/money-momentum/StepRevenueActions';
import { StepOfferScoring } from '@/components/wizards/money-momentum/StepOfferScoring';
import { StepScriptGenerator } from '@/components/wizards/money-momentum/StepScriptGenerator';
import { StepWhatsStoppingYou } from '@/components/wizards/money-momentum/StepWhatsStoppingYou';
import { StepSprintSchedule } from '@/components/wizards/money-momentum/StepSprintSchedule';
import { StepCommit } from '@/components/wizards/money-momentum/StepCommit';

export default function MoneyMomentumWizardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  // Stable default data reference
  const defaultData = useMemo(() => DEFAULT_MONEY_MOMENTUM_DATA, []);

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
  } = useWizard<MoneyMomentumData>({
    templateName: 'money_momentum',
    totalSteps: MONEY_MOMENTUM_STEPS.length,
    defaultData,
  });

  const handleChange = (updates: Partial<MoneyMomentumData>) => {
    setData(updates);
  };

  const handleComplete = async () => {
    if (isCreating || !user) return;

    setIsCreating(true);
    try {
      // Calculate final values
      const finalGap = data.gapToClose - data.estimatedSavings;
      const finalDailyTarget = data.daysInSprint > 0 ? finalGap / data.daysInSprint : 0;

      // Create the revenue sprint
      const { data: sprint, error } = await supabase
        .from('revenue_sprints' as any)
        .insert({
          user_id: user.id,
          current_revenue: data.currentRevenue,
          revenue_goal: data.adjustedGoal || data.revenueGoal,
          target_month: data.targetMonth,
          days_in_sprint: data.daysInSprint,
          gap_to_close: data.gapToClose,
          daily_target: finalDailyTarget,
          expense_cuts: data.estimatedSavings,
          adjusted_gap: finalGap,
          survival_mode: data.survivalMode,
          current_offers: data.currentOffers,
          past_customers_count: data.pastCustomersCount,
          warm_leads_count: data.warmLeadsCount,
          warm_leads_sources: data.warmLeadsSources,
          fastest_sale: data.fastestSale,
          brainstormed_ideas: data.brainstormedIdeas,
          selected_actions: data.selectedActions,
          blocking_thought: data.blockingThought,
          new_thought: data.newThought,
          counter_evidence: data.counterEvidence,
          sprint_start_date: data.sprintStartDate,
          sprint_end_date: data.sprintEndDate,
          working_days: data.workingDays,
          daily_time: data.dailyTime,
          daily_duration: data.dailyDuration,
          accountability_partner: data.accountabilityPartner,
          accountability_method: data.accountabilityMethod,
          commitment_options: data.commitmentOptions,
          consequences: data.consequences,
          // New fields
          recommended_lane: data.recommendedLane,
          primary_offer_id: data.primaryOfferId,
          backup_offer_id: data.backupOfferId,
          offer_scores: data.offerScores,
          status: 'active',
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Create tasks for selected actions
      for (const action of data.selectedActions) {
        await supabase.from('tasks').insert({
          user_id: user.id,
          task_text: `💰 ${action.action}`,
          notes: `${action.details}\n\nWhy: ${action.why}`,
          category: 'Revenue Sprint',
          scheduled_date: data.sprintStartDate,
          source: 'money_momentum_wizard',
          is_recurring: true,
          recurrence_pattern: 'daily',
        });
      }

      // Mark wizard as complete
      await supabase
        .from('wizard_completions')
        .update({ completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('template_name', 'money_momentum')
        .is('completed_at', null);

      toast.success('Your Money Momentum Sprint is ready! Let\'s go get that revenue.');
      navigate('/finances');
    } catch (error) {
      console.error('Failed to create sprint:', error);
      toast.error('Failed to create sprint. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveAndExit = async () => {
    await save();
    navigate('/wizards');
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: // The Numbers
        return (
          data.currentRevenue !== null && 
          data.currentRevenue >= 0 &&
          data.revenueGoal !== null && 
          data.revenueGoal > 0
        );
      case 2: // Reality Check
        return data.survivalMode === false;
      case 3: // What You Already Have
        return data.offerType !== null;
      case 4: // Fast Cash Picker
        return (
          data.hasExistingBuyers !== null &&
          data.cashSpeed !== null &&
          data.readyAssets.length > 0 &&
          data.weeklyCapacity !== null &&
          data.sellingComfort !== null
        );
      case 5: // Revenue Ideas (Brainstorming)
        return data.brainstormedIdeas.length >= 1;
      case 6: // Score Your Offers
        return data.offerScores.length >= 1 && data.primaryOfferId !== null;
      case 7: // Scripts
        return true; // Optional step
      case 8: // What's Stopping You
        return true; // Optional but encouraged
      case 9: // Sprint Schedule
        return (
          data.sprintStartDate !== '' &&
          data.sprintEndDate !== '' &&
          data.workingDays.length > 0
        );
      case 10: // Commit
        return data.commitmentOptions.length > 0 || data.consequences.trim() !== '';
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepTheNumbers data={data} onChange={handleChange} />;
      case 2:
        return <StepRealityCheck data={data} onChange={handleChange} />;
      case 3:
        return <StepWhatYouHave data={data} onChange={handleChange} />;
      case 4:
        return <StepFastCashPicker data={data} onChange={handleChange} />;
      case 5:
        return <StepRevenueActions data={data} onChange={handleChange} />;
      case 6:
        return <StepOfferScoring data={data} onChange={handleChange} />;
      case 7:
        return <StepScriptGenerator data={data} onChange={handleChange} />;
      case 8:
        return <StepWhatsStoppingYou data={data} onChange={handleChange} />;
      case 9:
        return <StepSprintSchedule data={data} onChange={handleChange} />;
      case 10:
        return <StepCommit data={data} onChange={handleChange} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <MastermindGate>
        <div className="max-w-4xl mx-auto">
          <WizardLayout
            title="Money Momentum Sprint"
            stepTitle={MONEY_MOMENTUM_STEPS[step - 1].title}
            currentStep={step}
            totalSteps={totalSteps}
            onBack={goBack}
            onNext={step === totalSteps ? handleComplete : goNext}
            onSave={handleSaveAndExit}
            canProceed={canProceed()}
            isSaving={isSaving || isCreating}
            isLastStep={step === totalSteps}
            lastStepButtonText={isCreating ? 'Creating Sprint...' : 'Start My Sprint'}
          >
            {renderStep()}
          </WizardLayout>
        </div>
      </MastermindGate>
    </Layout>
  );
}
