import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, ArrowRight, BatteryLow, Check, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

import {
  LOW_BATTERY_STORAGE_KEY,
  LOW_BATTERY_TEMPLATE_NAME,
  LOW_BATTERY_TOTAL_STEPS,
  LowBatteryPlanData,
  STEP_TITLES,
  emptyLowBatteryPlan,
} from './lowBatteryPlanTypes';
import { Step1, Step2, Step3, Step4, Step5, Step6, Step7, SectionKey } from './LowBatterySteps';
import { LowBatteryPlanResult, buildPlanText } from './LowBatteryPlanResult';
import { LowBatteryWelcome } from './LowBatteryWelcome';
import {
  SubmissionRef,
  checkpointSubmission,
  coercePlan,
  hasAnsweredFields,
  loadMyLatestSubmission,
  loadSubmissionAnswers,
  readSubmissionRef,
  registerSubmission,
  saveSubmissionAnswers,
  writeSubmissionRef,
} from './lowBatteryRecovery';


const RESULTS_STEP = LOW_BATTERY_TOTAL_STEPS + 1;

type SaveState = 'idle' | 'local' | 'saving' | 'online' | 'saved';

function loadFromStorage(): LowBatteryPlanData | null {
  try {
    const raw = localStorage.getItem(LOW_BATTERY_STORAGE_KEY);
    if (!raw) return null;
    return coercePlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function LowBatteryPlanWizard() {
  const { user } = useAuth();
  const [data, setData] = useState<LowBatteryPlanData>(emptyLowBatteryPlan);
  const [step, setStep] = useState(1);
  const [presenter, setPresenter] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savingToPlanner, setSavingToPlanner] = useState(false);
  const [started, setStarted] = useState(false);
  const [submission, setSubmission] = useState<SubmissionRef | null>(null);
  const [crossBrowser, setCrossBrowser] = useState(false);
  const restored = useRef(false);
  const dataRef = useRef<LowBatteryPlanData>(emptyLowBatteryPlan);
  const stepRef = useRef(1);
  const linkAttempted = useRef(false);

  dataRef.current = data;
  stepRef.current = step;

  // 1. Device restore first — the local copy is always authoritative when it has answers.
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setData(stored);
      dataRef.current = stored;
      if (hasAnsweredFields(stored)) setSaveState('local');
    }
    restored.current = true;

    // 2. Token-protected online recovery for this device's known submission.
    const ref = readSubmissionRef();
    if (!ref) return;
    setSubmission(ref);
    if (hasAnsweredFields(stored)) return;

    let cancelled = false;
    void loadSubmissionAnswers(ref).then((remote) => {
      if (cancelled || !remote?.answers || !hasAnsweredFields(remote.answers)) return;
      if (hasAnsweredFields(dataRef.current)) return;
      setData(remote.answers);
      setStep(Math.min(Math.max(remote.currentStep, 1), LOW_BATTERY_TOTAL_STEPS));
      setSaveState('online');
      toast.success('We found your saved answers and brought them back.');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 3. Signed-in cross-browser recovery + associating saves with the account.
  useEffect(() => {
    if (!user || linkAttempted.current) return;
    linkAttempted.current = true;
    let cancelled = false;

    void (async () => {
      const latest = await loadMyLatestSubmission();
      if (cancelled) return;

      if (latest) {
        setSubmission(latest.ref);
        writeSubmissionRef(latest.ref);
        setCrossBrowser(true);
        if (!hasAnsweredFields(dataRef.current) && hasAnsweredFields(latest.answers)) {
          setData(latest.answers as LowBatteryPlanData);
          setStep(Math.min(Math.max(latest.currentStep, 1), LOW_BATTERY_TOTAL_STEPS));
          setSaveState('online');
          toast.success('Welcome back — your plan is here, saved to your account.');
        }
        return;
      }

      if (!user.email) return;
      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const firstName =
        (typeof metadata.first_name === 'string' && metadata.first_name.trim()) ||
        (typeof metadata.full_name === 'string' && metadata.full_name.trim().split(' ')[0]) ||
        user.email.split('@')[0];
      const created = await registerSubmission(firstName, user.email);
      if (cancelled || !created) return;
      setSubmission(created);
      writeSubmissionRef(created);
      setCrossBrowser(true);
      void saveSubmissionAnswers(created, dataRef.current, stepRef.current);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // 4. Every answer goes to this device immediately.
  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(LOW_BATTERY_STORAGE_KEY, JSON.stringify(data));
      setSaveState((prev) => (prev === 'saving' || prev === 'saved' ? prev : 'local'));
    } catch {
      // Storage unavailable (private browsing); the plan stays in memory.
    }
  }, [data]);

  // 5. Debounced online backup whenever a submission exists (anonymous or signed in).
  useEffect(() => {
    if (!restored.current || !submission) return;
    if (!hasAnsweredFields(data)) return;
    const timer = window.setTimeout(() => {
      void saveSubmissionAnswers(submission, data, stepRef.current).then((ok) => {
        if (ok) setSaveState((prev) => (prev === 'saved' ? prev : 'online'));
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [data, submission]);

  const update = useCallback(
    <K extends SectionKey>(section: K, patch: Partial<LowBatteryPlanData[K]>) => {
      setData((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
    },
    []
  );

  const goTo = useCallback(
    (next: number) => {
      // Checkpoint the step we are leaving so a version is always recoverable.
      if (submission && next > step && hasAnsweredFields(dataRef.current)) {
        void saveSubmissionAnswers(submission, dataRef.current, step).then((ok) => {
          if (ok) void checkpointSubmission(submission, `step-${step}-complete`);
        });
      }
      setStep(next);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [step, submission]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildPlanText(data));
      toast.success('Plan copied to your clipboard');
    } catch {
      toast.error("Your browser blocked copying. You can still print or save the plan.");
    }
  }, [data]);

  const handleStartOver = useCallback(() => {
    setData(emptyLowBatteryPlan);
    setStep(1);
    setSaveState('idle');
    try {
      localStorage.removeItem(LOW_BATTERY_STORAGE_KEY);
    } catch {
      // ignore
    }
    toast.success('Cleared. You can start fresh.');
  }, []);

  const handleSaveToPlanner = useCallback(async () => {
    if (!user || savingToPlanner) return;
    setSavingToPlanner(true);
    setSaveState('saving');
    try {
      const { data: existing } = await supabase
        .from('wizard_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('template_name', LOW_BATTERY_TEMPLATE_NAME)
        .maybeSingle();

      const answers = JSON.parse(JSON.stringify(data)) as Json;
      const completedAt = new Date().toISOString();

      const { error } = existing
        ? await supabase
            .from('wizard_completions')
            .update({ answers, completed_at: completedAt })
            .eq('id', existing.id)
        : await supabase.from('wizard_completions').insert({
            user_id: user.id,
            template_name: LOW_BATTERY_TEMPLATE_NAME,
            answers,
            completed_at: completedAt,
          });


      if (error) throw error;

      // Final online checkpoint alongside the planner copy.
      if (submission) {
        const ok = await saveSubmissionAnswers(submission, data, RESULTS_STEP, true);
        if (ok) await checkpointSubmission(submission, 'final-save');
      }

      setSaveState('saved');
      toast.success('Saved to your planner');
    } catch {
      setSaveState('local');
      toast.error("We couldn't save to your planner. Your plan is still saved on this device.");
    } finally {
      setSavingToPlanner(false);
    }
  }, [data, savingToPlanner, submission, user]);


  const stepBody = useMemo(() => {
    const props = { data, update, presenter };
    switch (step) {
      case 1:
        return <Step1 {...props} />;
      case 2:
        return <Step2 {...props} />;
      case 3:
        return <Step3 {...props} />;
      case 4:
        return <Step4 {...props} />;
      case 5:
        return <Step5 {...props} />;
      case 6:
        return <Step6 {...props} />;
      case 7:
        return <Step7 {...props} />;
      default:
        return <LowBatteryPlanResult data={data} onEditStep={goTo} onCopy={handleCopy} />;
    }
  }, [data, goTo, handleCopy, presenter, step, update]);

  const isResults = step === RESULTS_STEP;
  const progress = isResults ? 100 : Math.round((step / LOW_BATTERY_TOTAL_STEPS) * 100);

  const saveLabel =
    saveState === 'saving'
      ? 'Saving...'
      : saveState === 'saved'
        ? 'Saved to planner'
        : saveState === 'local'
          ? 'Saved on this device'
          : 'Nothing to save yet';

  return (
    <div className="min-h-screen bg-background">
      {!started ? (
        <LowBatteryWelcome
          onStart={() => setStarted(true)}
          hasSavedAnswers={saveState !== 'idle'}
        />
      ) : (
        <>
          {/* Persistent presenter navigation */}
          <header className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BatteryLow className="h-4 w-4 text-primary" aria-hidden="true" />
                {isResults ? 'Your plan' : `Step ${step} of ${LOW_BATTERY_TOTAL_STEPS}`}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Label htmlFor="presenter-mode" className="text-sm text-muted-foreground">
                  Presenter mode
                </Label>
                <Switch id="presenter-mode" checked={presenter} onCheckedChange={setPresenter} />
              </div>
            </div>
            <Progress value={progress} className="h-1 rounded-none" />
          </header>

          <main className="mx-auto max-w-3xl px-4 pb-40 pt-6">
            {step === 1 && !presenter && (
              <div className="mb-8 space-y-2">
                <h1 className="text-3xl font-bold text-foreground">The Low-Battery Business Plan</h1>
                <p className="text-lg text-muted-foreground">
                  Build a 90-day plan simple enough that you can still run it on a bad week.
                </p>
                <p className="text-base font-medium text-foreground">
                  You do not need a smaller ambition. You need a plan with fewer full-battery
                  dependencies.
                </p>
              </div>
            )}

            {!isResults && (
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Step {step}: {STEP_TITLES[step - 1]}
              </h2>
            )}

            {stepBody}

            {isResults && (
              <div className="no-print mt-6 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" /> {saveLabel}
                </p>
                {user ? (
                  <Button
                    className="min-h-[44px] w-full sm:w-auto"
                    onClick={handleSaveToPlanner}
                    disabled={savingToPlanner}
                  >
                    {savingToPlanner ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Save to Planner
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Your plan is saved in this browser. Print or copy it to keep a permanent copy.
                  </p>
                )}
              </div>
            )}
          </main>

          {/* Persistent bottom navigation */}
          <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-3 py-3 sm:gap-2 sm:px-4">
              <Button
                variant="outline"
                className="min-h-[44px] shrink-0 px-3"
                onClick={() => goTo(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <Button
                variant="ghost"
                className="min-h-[44px] shrink-0 px-3"
                onClick={() => goTo(RESULTS_STEP)}
                disabled={isResults}
              >
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Plan preview</span>
              </Button>

              <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="min-h-[44px] shrink-0 px-3 text-sm text-muted-foreground"
                    >
                      Start over
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear this plan and start over?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This erases the answers saved in this browser. It cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep my answers</AlertDialogCancel>
                      <AlertDialogAction onClick={handleStartOver}>Start over</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {!isResults && (
                  <Button
                    className="min-h-[44px] shrink-0 px-3"
                    onClick={() => goTo(step === LOW_BATTERY_TOTAL_STEPS ? RESULTS_STEP : step + 1)}
                  >
                    {step === LOW_BATTERY_TOTAL_STEPS ? 'See my plan' : 'Next'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="pb-2 text-center text-xs text-muted-foreground">{saveLabel}</p>
          </nav>
        </>
      )}
    </div>
  );
}

export default LowBatteryPlanWizard;
