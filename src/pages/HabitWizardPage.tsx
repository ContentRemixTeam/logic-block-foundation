import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { useWizard } from '@/hooks/useWizard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Step components
import { HabitLifeAreas } from '@/components/wizards/habits/HabitLifeAreas';
import { HabitExistingReview } from '@/components/wizards/habits/HabitExistingReview';
import { HabitDefineNew } from '@/components/wizards/habits/HabitDefineNew';
import { HabitFrequencyTiming } from '@/components/wizards/habits/HabitFrequencyTiming';
import { HabitScheduling } from '@/components/wizards/habits/HabitScheduling';
import { HabitReviewComplete } from '@/components/wizards/habits/HabitReviewComplete';

const HABIT_WIZARD_STEPS = [
  { number: 1, title: 'Life Areas' },
  { number: 2, title: 'Current Habits' },
  { number: 3, title: 'Define Habits' },
  { number: 4, title: 'Frequency & Time' },
  { number: 5, title: 'Scheduling' },
  { number: 6, title: 'Review & Save' },
];

export interface HabitDraft {
  id?: string;
  name: string;
  category: string;
  intention: string; // Why it's important
  type: 'daily' | 'weekly' | 'custom' | 'weekdays';
  frequency?: string; // e.g., "3x per week", "weekdays"
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  specificTime?: string; // e.g., "07:00"
  duration?: number; // in minutes
  successDefinition?: string;
  // Scheduling options
  autoSchedule: boolean;
  scheduleMode: 'specific_time' | 'task_list';
  isExisting?: boolean; // If from existing habits
  keepExisting?: boolean; // User wants to keep it
  [key: string]: unknown; // Index signature for useWizard compatibility
}

export interface HabitWizardData {
  selectedAreas: string[];
  existingHabits: HabitDraft[];
  newHabits: HabitDraft[];
  globalSchedulePreference: 'specific_time' | 'task_list' | 'mixed';
  [key: string]: unknown; // Index signature for useWizard compatibility
}

const DEFAULT_DATA: HabitWizardData = {
  selectedAreas: [],
  existingHabits: [],
  newHabits: [],
  globalSchedulePreference: 'task_list',
};

export default function HabitWizardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [existingHabitsLoaded, setExistingHabitsLoaded] = useState(false);

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
  } = useWizard<HabitWizardData>({
    templateName: 'habit-planner',
    totalSteps: HABIT_WIZARD_STEPS.length,
    defaultData: DEFAULT_DATA,
  });

  // Load existing habits when user reaches step 2
  useEffect(() => {
    if (step === 2 && user && !existingHabitsLoaded) {
      loadExistingHabits();
    }
  }, [step, user, existingHabitsLoaded]);

  const loadExistingHabits = async () => {
    if (!user) return;

    try {
      const { data: habits, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      const formattedHabits: HabitDraft[] = (habits || []).map(h => ({
        id: h.habit_id,
        name: h.habit_name,
        category: h.category || 'General',
        intention: h.description || '',
        type: (h.type as 'daily' | 'weekly' | 'custom') || 'daily',
        successDefinition: h.success_definition || '',
        autoSchedule: false,
        scheduleMode: 'task_list',
        isExisting: true,
        keepExisting: true,
      }));

      setData({ existingHabits: formattedHabits });
      setExistingHabitsLoaded(true);
    } catch (err) {
      console.error('Failed to load existing habits:', err);
      setExistingHabitsLoaded(true);
    }
  };

  const handleChange = (updates: Partial<HabitWizardData>) => {
    setData(updates);
  };

  const handleComplete = async () => {
    if (isCreating || !user) return;

    setIsCreating(true);
    try {
      // Collect all habits to create/update
      const habitsToKeep = data.existingHabits.filter(h => h.keepExisting);
      const habitsToRemove = data.existingHabits.filter(h => !h.keepExisting && h.id);
      const newHabits = data.newHabits.filter(h => h.name.trim());

      // Deactivate removed habits
      for (const habit of habitsToRemove) {
        await supabase
          .from('habits')
          .update({ is_active: false })
          .eq('habit_id', habit.id);
      }

      // Create new habits
      for (let i = 0; i < newHabits.length; i++) {
        const habit = newHabits[i];
        
        const { data: created, error } = await supabase
          .from('habits')
          .insert({
            user_id: user.id,
            habit_name: habit.name,
            category: habit.category,
            type: habit.type,
            description: habit.intention,
            success_definition: habit.successDefinition || null,
            display_order: habitsToKeep.length + i,
          })
          .select()
          .single();

        if (error) throw error;

        // If auto-schedule is enabled, create recurring tasks
        if (habit.autoSchedule && habit.scheduleMode === 'task_list') {
          // Create a recurring task for this habit
          await supabase.from('tasks').insert({
            user_id: user.id,
            task_text: `🔄 ${habit.name}`,
            category: 'Habit',
            is_recurring: true,
            recurrence_pattern: habit.type === 'daily' ? 'daily' : 'weekly',
            scheduled_date: new Date().toISOString().split('T')[0],
            source: 'habit_wizard',
          });
        }
      }

      toast.success(`Created ${newHabits.length} new habits!`);
      navigate('/habits');
    } catch (error) {
      console.error('Failed to create habits:', error);
      toast.error('Failed to save habits. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveAndExit = async () => {
    await save();
    navigate('/wizards');
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.selectedAreas.length > 0;
      case 2:
        return true; // Can proceed even without existing habits
      case 3:
        return data.newHabits.length > 0 || data.existingHabits.some(h => h.keepExisting);
      case 4:
        return data.newHabits.every(h => h.type && h.preferredTime);
      case 5:
        return true; // Scheduling is optional
      case 6:
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <HabitLifeAreas data={data} onChange={handleChange} />;
      case 2:
        return <HabitExistingReview data={data} onChange={handleChange} />;
      case 3:
        return <HabitDefineNew data={data} onChange={handleChange} />;
      case 4:
        return <HabitFrequencyTiming data={data} onChange={handleChange} />;
      case 5:
        return <HabitScheduling data={data} onChange={handleChange} />;
      case 6:
        return <HabitReviewComplete data={data} onChange={handleChange} />;
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
      <div className="max-w-4xl mx-auto">
        <WizardLayout
          title="Habit Planning"
          stepTitle={HABIT_WIZARD_STEPS[step - 1].title}
          currentStep={step}
          totalSteps={totalSteps}
          onBack={goBack}
          onNext={step === totalSteps ? handleComplete : goNext}
          onSave={handleSaveAndExit}
          canProceed={canProceed()}
          isSaving={isSaving || isCreating}
          isLastStep={step === totalSteps}
          lastStepButtonText={isCreating ? 'Creating...' : 'Create Habits'}
        >
          {renderStep()}
        </WizardLayout>
      </div>
    </Layout>
  );
}
