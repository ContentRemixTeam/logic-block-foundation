import { useState, useEffect } from 'react';
import { EngineBuilderProgress } from './EngineBuilderProgress';
import { StepDiscover } from './steps/StepDiscover';
import { StepNurture } from './steps/StepNurture';
import { StepConvert } from './steps/StepConvert';
import { StepRevenueLoop } from './steps/StepRevenueLoop';
import { StepEditorialCalendar } from './steps/StepEditorialCalendar';
import { StepResults } from './steps/StepResults';
import { generateEngineBuilderPDF } from './EngineBuilderPDF';
import { DEFAULT_ENGINE_DATA, TOTAL_STEPS, STEP_CONFIGS, TRANSITION_MESSAGES } from './EngineBuilderTypes';
import type { EngineBuilderData } from './EngineBuilderTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateEngineBuilderTasksPreview } from '@/lib/engineBuilderTaskGenerator';
import { isTaskSelected, getTaskDate } from '@/types/wizardTask';

const WIZARD_NAME = 'business-engine-builder';

export function EngineBuilderWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<EngineBuilderData>(DEFAULT_ENGINE_DATA);
  const [showResults, setShowResults] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Check if mastermind member
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        if (profile?.user_type === 'member') {
          setIsMember(true);
        }
      }
    };
    checkAuth();
  }, []);

  const onChange = (updates: Partial<EngineBuilderData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    return true; // Allow click-through without requiring input
  };

  const goNext = () => {
    if (step === TOTAL_STEPS) {
      setShowResults(true);
    } else if (step < TOTAL_STEPS && canProceed()) {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (showResults) {
      setShowResults(false);
    } else if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const handleSaveToBossPlanner = async () => {
    if (!userId || saved) return;
    try {
      // 1. Save the blueprint
      await supabase.from('wizard_completions').upsert({
        user_id: userId,
        template_name: WIZARD_NAME,
        answers_json: data as any,
        completed_at: new Date().toISOString(),
      });

      // 2. Create a project for the engine
      const { data: project } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: '🏎️ Business Engine Plan',
          status: 'active',
          color: '#f59e0b',
        })
        .select('id')
        .single();

      const projectId = project?.id;

      // 3. Generate tasks if opted in
      if (data.generateTasks !== false) {
        const allTasks = generateEngineBuilderTasksPreview(data);
        const selectedTasks = allTasks.filter(t => 
          isTaskSelected(t.id, data.excludedTasks || [])
        );

        if (selectedTasks.length > 0) {
          const taskRows = selectedTasks.map(t => {
            const effectiveDate = getTaskDate(t, data.dateOverrides || []);
            return {
              user_id: userId,
              task_text: t.task_text,
              scheduled_date: effectiveDate,
              priority: t.priority,
              estimated_minutes: t.estimated_minutes,
              project_id: projectId || null,
              status: 'pending' as const,
              content_type: t.phase === 'lead-gen' || t.phase === 'nurture' ? 'social' : null,
            };
          });

          await supabase.from('tasks').insert(taskRows);
        }
      }

      // 4. Create content items if opted in
      if (data.generateContentItems !== false) {
        const contentItems = [];
        const platformName = data.primaryPlatform || 'social';

        // Lead gen content items
        for (let week = 0; week < 4; week++) {
          contentItems.push({
            user_id: userId,
            title: `Week ${week + 1} ${platformName} content`,
            type: 'social' as const,
            channel: data.primaryPlatform || null,
            status: 'idea' as const,
            project_id: projectId || null,
          });
        }

        // Email content items
        if (data.emailMethod) {
          for (let week = 0; week < 4; week++) {
            contentItems.push({
              user_id: userId,
              title: `Week ${week + 1} email newsletter`,
              type: 'email' as const,
              channel: 'email',
              status: 'idea' as const,
              project_id: projectId || null,
            });
          }
        }

        if (contentItems.length > 0) {
          await supabase.from('content_items').insert(contentItems);
        }
      }

      setSaved(true);
      toast.success('Engine blueprint saved to your planner! 🏎️');
    } catch (err) {
      console.error('Error saving engine builder:', err);
      toast.error('Failed to save — try again');
    }
  };

  const currentConfig = STEP_CONFIGS[step - 1];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏎️</span>
            <h1 className="text-lg font-bold text-foreground">Business Engine Builder</h1>
          </div>
          {!userId && (
            <a href="/join" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Mastermind member? Log in →
            </a>
          )}
        </div>
      </header>

      {/* Progress */}
      {!showResults && <EngineBuilderProgress currentStep={step} />}

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {showResults ? (
          <StepResults
            data={data}
            onChange={onChange}
            onDownloadPDF={() => generateEngineBuilderPDF(data)}
            onSaveToBossPlanner={isMember ? handleSaveToBossPlanner : undefined}
            isMember={isMember}
            isSaving={saved}
          />
        ) : (
          <>
            {/* Transition message */}
            {step > 1 && TRANSITION_MESSAGES[step - 1] && (
              <div className="mb-4 px-4 py-2 rounded-lg bg-accent/50 border border-primary/10 text-center">
                <p className="text-sm text-primary font-medium italic">
                  {TRANSITION_MESSAGES[step - 1]}
                </p>
              </div>
            )}

            {/* Step header badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {currentConfig.emoji} {currentConfig.enginePart}
              </span>
              <span className="text-xs text-muted-foreground">
                Step {step} of {TOTAL_STEPS}
              </span>
            </div>

            {/* Step content */}
            {step === 1 && <StepDiscover data={data} onChange={onChange} />}
            {step === 2 && <StepNurture data={data} onChange={onChange} />}
            {step === 3 && <StepConvert data={data} onChange={onChange} />}
            {step === 4 && <StepRevenueLoop data={data} onChange={onChange} />}
            {step === 5 && <StepEditorialCalendar data={data} onChange={onChange} />}
          </>
        )}
      </main>

      {/* Footer navigation */}
      {!showResults && (
        <footer className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={step === 1}
              className="px-5 py-2 rounded-lg text-sm font-medium text-foreground bg-secondary hover:bg-secondary-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {step === TOTAL_STEPS ? '🏆 See Your Blueprint' : 'Next →'}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
