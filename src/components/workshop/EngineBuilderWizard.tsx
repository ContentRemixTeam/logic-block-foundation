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
import { addDays, nextMonday, format } from 'date-fns';

const WIZARD_NAME = 'business-engine-builder';

export function EngineBuilderWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<EngineBuilderData>(DEFAULT_ENGINE_DATA);
  const [showResults, setShowResults] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadedExisting, setLoadedExisting] = useState(false);

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
          // Load existing blueprint if any
          const { data: existing } = await supabase
            .from('wizard_completions')
            .select('answers, completed_at')
            .eq('user_id', user.id)
            .eq('template_name', WIZARD_NAME)
            .maybeSingle();
          if (existing?.answers) {
            try {
              const saved = existing.answers as unknown as EngineBuilderData;
              // Merge with defaults so new fields are included
              setData({ ...DEFAULT_ENGINE_DATA, ...saved });
              setLoadedExisting(true);
              if (existing.completed_at) {
                setSaved(true);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    };
    checkAuth();
  }, []);

  const onChange = (updates: Partial<EngineBuilderData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    // If editing after save, allow re-saving
    if (saved) setSaved(false);
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
    if (!userId || saving) return;
    setSaving(true);
    try {
      // 1. Save/update the blueprint
      const { data: existingCompletion } = await supabase
        .from('wizard_completions')
        .select('id')
        .eq('user_id', userId)
        .eq('template_name', WIZARD_NAME)
        .maybeSingle();

      if (existingCompletion) {
        await supabase.from('wizard_completions').update({
          answers: data as any,
          completed_at: new Date().toISOString(),
        }).eq('id', existingCompletion.id);
      } else {
        await supabase.from('wizard_completions').insert({
          user_id: userId,
          template_name: WIZARD_NAME,
          answers: data as any,
          completed_at: new Date().toISOString(),
        });
      }

      // 2. Create a project for the engine (only if first save)
      if (!loadedExisting || !saved) {
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
      }

      setSaved(true);
      setLoadedExisting(true);
      toast.success('Engine blueprint saved to your planner! 🏎️');
    } catch (err) {
      console.error('Error saving engine builder:', err);
      toast.error('Failed to save — try again');
    } finally {
      setSaving(false);
    }
  };

  const currentConfig = STEP_CONFIGS[step - 1];

  return (
    <div className="min-h-screen flex flex-col" style={{
      '--engine-primary': '32 95% 44%',
      '--engine-primary-fg': '0 0% 100%',
      '--engine-accent': '45 93% 47%',
      '--engine-muted': '220 13% 91%',
      '--engine-bg': '220 14% 96%',
      '--engine-card': '0 0% 100%',
      '--engine-border': '220 13% 87%',
    } as React.CSSProperties}>
      <style>{`
        .engine-wizard { 
          background: hsl(var(--engine-bg));
        }
        .engine-wizard .engine-primary-btn {
          background: linear-gradient(135deg, hsl(32 95% 44%), hsl(25 95% 38%));
          color: white;
        }
        .engine-wizard .engine-primary-btn:hover { opacity: 0.9; }
        .engine-wizard .engine-primary-btn:disabled { opacity: 0.4; }
        .engine-wizard .engine-accent-badge {
          background: hsl(45 93% 47% / 0.15);
          color: hsl(32 80% 35%);
        }
        .engine-wizard .engine-selected {
          border-color: hsl(32 95% 44%);
          background: hsl(32 95% 44% / 0.08);
          box-shadow: 0 0 0 3px hsl(32 95% 44% / 0.15);
        }
        .engine-wizard .engine-header {
          background: linear-gradient(135deg, hsl(220 20% 18%), hsl(220 20% 25%));
          color: white;
        }
        .engine-wizard .engine-footer {
          background: hsl(220 20% 18%);
          border-color: hsl(220 20% 25%);
        }
        .engine-wizard .engine-progress-fill {
          background: linear-gradient(90deg, hsl(32 95% 44%), hsl(45 93% 47%));
        }
      `}</style>
      <div className="engine-wizard flex flex-col min-h-screen">
        {/* Header */}
        <header className="engine-header sticky top-0 z-30 border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏎️</span>
              <h1 className="text-lg font-bold">Business Engine Builder</h1>
            </div>
            <div className="flex items-center gap-3">
              {loadedExisting && (
                <span className="text-xs text-white/50">Blueprint loaded</span>
              )}
              {!userId && (
                <a href="/join" className="text-xs text-white/60 hover:text-white transition-colors">
                  Mastermind member? Log in →
                </a>
              )}
            </div>
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
              isSaving={saving}
              onBack={goBack}
            />
          ) : (
            <>
              {/* Transition message */}
              {step > 1 && TRANSITION_MESSAGES[step - 1] && (
                <div className="mb-4 px-4 py-2 rounded-lg border text-center" style={{
                  background: 'hsl(32 95% 44% / 0.08)',
                  borderColor: 'hsl(32 95% 44% / 0.2)',
                }}>
                  <p className="text-sm font-medium italic" style={{ color: 'hsl(32 80% 35%)' }}>
                    {TRANSITION_MESSAGES[step - 1]}
                  </p>
                </div>
              )}

              {/* Step header badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="engine-accent-badge px-3 py-1 rounded-full text-xs font-semibold">
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
          <footer className="engine-footer sticky bottom-0 border-t">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <button
                onClick={goBack}
                disabled={step === 1}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white/80 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className="engine-primary-btn px-6 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                {step === TOTAL_STEPS ? '🏆 See Your Blueprint' : 'Next →'}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
