import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  Link2,
  ListFilter,
  MessageCircle,
  Play,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  PHASE_ONE_LESSONS,
  PHASE_ONE_REQUIRED_LESSONS,
} from '@/data/phaseOneCurriculum';
import { cn } from '@/lib/utils';
import { useMastermindPhaseOne } from '@/hooks/useMastermindPhaseOne';
import { GetCoachedByFaith } from '@/components/mastermind/phase-one/GetCoachedByFaith';
import { FindPhaseOneResources } from '@/components/mastermind/phase-one/FindPhaseOneResources';

export default function MastermindPhaseOnePreview() {
  const navigate = useNavigate();
  const phase = useMastermindPhaseOne();
  const [showFullLibrary, setShowFullLibrary] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const readyResources = useMemo(() => new Map(phase.resources.map((resource) => [resource.portal_resource_id, resource])), [phase.resources]);
  const visibleLessons = useMemo(() => {
    const baseLessons = PHASE_ONE_LESSONS.filter((lesson) => lesson.requirement === 'required' || showFullLibrary);

    return [...baseLessons].sort((left, right) => {
      const leftResource = readyResources.get(left.resourceId);
      const rightResource = readyResources.get(right.resourceId);
      const leftRank = leftResource?.completed ? 2 : leftResource ? 0 : 1;
      const rightRank = rightResource?.completed ? 2 : rightResource ? 0 : 1;

      return leftRank - rightRank || left.order - right.order;
    });
  }, [readyResources, showFullLibrary]);
  const watchedCount = phase.resources.filter((resource) => resource.completed).length;
  const planReady = Boolean(phase.phaseState?.plan_ready_at && phase.phaseState.cycle_id === phase.cycle?.cycle_id) || phase.planReady;
  const workspaceReady = phase.phaseState?.workspace_status === 'ready' && phase.hasVerifiedExternalConnection;
  const connectionTested = phase.hasVerifiedExternalConnection;
  const phaseProgress = [planReady, workspaceReady, connectionTested].filter(Boolean).length;

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try { await action(); } catch (caught) { setActionError(caught instanceof Error ? caught.message : 'That step could not be saved. Try again.'); }
  };

  if (phase.isLoading) {
    return <Layout><main className="mx-auto w-full max-w-6xl pb-16"><Card><CardContent className="space-y-3 p-6"><div className="h-6 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" /><div className="h-10 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" /><p role="status" className="text-sm text-muted-foreground">Loading your plan, protected lessons, AI connection, and progress…</p></CardContent></Card></main></Layout>;
  }

  return (
    <Layout>
      <main className="mx-auto w-full max-w-6xl space-y-6 pb-16">
        {(phase.error || actionError) && <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><strong>Nothing was lost.</strong> {actionError || phase.error}<Button variant="link" className="h-auto px-2" onClick={() => void phase.refetch()}>Try again</Button></div>}
        <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-amber-50/70 p-6 shadow-sm dark:to-amber-950/10 sm:p-8">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full">Phase One</Badge>
              <Badge variant="outline" className="rounded-full bg-background/80">Private preview</Badge>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Your 90-Day CEO Setup</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Leave with a plan your business—and your AI—can use.</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Build the big-picture path, choose how you want to work this quarter, and connect your AI workspace to the Planner.
              </p>
            </div>
            <div className="max-w-xl rounded-2xl border bg-background/80 p-4 backdrop-blur">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">Phase One setup</span>
                <span className="text-muted-foreground">{phaseProgress} of 3 ready</span>
              </div>
              <Progress value={(phaseProgress / 3) * 100} className="h-2" aria-label={`${phaseProgress} of 3 setup steps ready`} />
            </div>
          </div>
        </section>

        <section aria-labelledby="exit-standard-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Your finish line</p>
              <h2 id="exit-standard-heading" className="text-2xl font-bold">You are ready for Phase Two when…</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ExitCard icon={Target} title="Plan ready" ready={planReady} description="Your 90-day result, focus, and current checkpoint are saved." action={planReady ? 'Confirm saved plan' : 'Build my plan'} onClick={() => planReady ? void run(phase.syncPlanReady) : navigate('/cycle-setup')} />
            <ExitCard icon={Bot} title="AI workspace ready" ready={workspaceReady} description="Your business interview, examples, and customized CEO Workspace are installed." action={workspaceReady ? 'Review workspace' : 'Set up workspace'} onClick={() => setWorkspaceOpen(true)} />
            <ExitCard icon={Link2} title="AI + Planner connected" ready={connectionTested} description="Claude or Codex used your private connection to propose a task, then you approved it." action={connectionTested ? 'Verified' : phase.pendingProposal ? 'Review AI task below' : phase.hasActiveConnectionKey ? 'Check connection' : 'Connect Claude or Codex'} onClick={() => connectionTested ? undefined : phase.pendingProposal ? document.getElementById('phase-one-task-proposal')?.scrollIntoView({ behavior: 'smooth' }) : phase.hasActiveConnectionKey ? void phase.refetch() : navigate('/settings#ai-task-connection')} />
          </div>
        </section>

        <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/10">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">This week’s money move</p>
              <h2 className="mt-1 text-xl font-bold">{phase.successPath.data?.snapshot?.current_milestone_title || 'Choose the smallest real-world move for your current checkpoint.'}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Done enough: complete one visible attempt and record what happened before changing the plan.</p>
            </div>
            <Button className="min-h-11 shrink-0" onClick={() => navigate('/weekly-plan')}>Add it to my week<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </CardContent>
        </Card>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)]">
          <Card className="overflow-hidden border-primary/15 shadow-sm">
            <CardHeader className="border-b bg-muted/25">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary">Your playlist</Badge>
                    <span className="text-xs text-muted-foreground">{watchedCount} watched</span>
                  </div>
                  <CardTitle className="text-xl">Watch only what helps you build the plan.</CardTitle>
                  <CardDescription className="mt-1">Two core lessons are shown first. Use “Show all options” when you want extra support.</CardDescription>
                </div>
                <label className="flex shrink-0 items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm font-medium">
                  <ListFilter className="h-4 w-4 text-primary" aria-hidden="true" />
                  Show all options
                  <Switch checked={showFullLibrary} onCheckedChange={setShowFullLibrary} aria-label="Show all optional Phase One videos" />
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-5">
              {visibleLessons.map((lesson, index) => {
                const liveResource = readyResources.get(lesson.resourceId);
                const isWatched = Boolean(liveResource?.completed);
                const playbackReady = Boolean(liveResource);
                return (
                  <article key={lesson.resourceId} className={cn('group rounded-2xl border p-4 transition-colors', isWatched ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/15' : 'hover:border-primary/35')}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5" aria-label={isWatched ? `${lesson.title} completed` : `${lesson.title} not completed`}>
                        {isWatched ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Circle className="h-6 w-6 text-muted-foreground/60" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                          <h3 className={cn('font-semibold leading-snug', isWatched && 'text-muted-foreground line-through')}>{lesson.title}</h3>
                          {lesson.requirement === 'required' && <Badge variant="outline" className="text-[10px]">Core</Badge>}
                          {!playbackReady && <Badge variant="secondary" className="text-[10px]">Import pending</Badge>}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lesson.afterWatchingAction}</p>
                        {lesson.requirement !== 'required' && <p className="mt-2 text-xs font-medium text-primary">Show this: {lesson.showWhen}</p>}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{lesson.durationLabel ?? 'Duration pending'}</span>
                          <Button size="sm" variant={isWatched ? 'outline' : 'secondary'} disabled={!playbackReady} onClick={() => navigate(`/admin/mastermind-training-preview?resource=${encodeURIComponent(lesson.resourceId)}&from=phase-one`)}>
                            <Play className="mr-1.5 h-3.5 w-3.5" />{playbackReady ? (isWatched ? 'Watch again' : 'Watch lesson') : 'Playback coming soon'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-violet-200 bg-gradient-to-b from-violet-50/70 to-background dark:border-violet-900 dark:from-violet-950/20">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><Sparkles className="h-5 w-5" /></div>
                <CardTitle className="text-lg">Create your AI workspace</CardTitle>
                <CardDescription>We use your plan, business interview, and your own examples to create simple Claude or Codex setup files.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Answer the business interview', 'Upload your best examples', 'Install and test your workspace'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-background/80 p-3 text-sm font-medium">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">{index + 1}</span>{item}
                  </div>
                ))}
                <Button className="w-full" onClick={() => setWorkspaceOpen(true)}>{workspaceReady ? 'Review my workspace' : 'Start my AI setup'}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              </CardContent>
            </Card>

            <TaskProposalCard proposal={phase.pendingProposal} busy={phase.isSaving} hasKey={phase.hasActiveConnectionKey} onConnect={() => navigate('/settings#ai-task-connection')} onRefresh={() => void phase.refetch()} onReview={(id, decision) => void run(() => phase.reviewProposal(id, decision))} />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2" aria-label="Phase One AI support previews">
          <GetCoachedByFaith context={phase.coachingContext} hasAiKey={phase.hasAiKey} onOpenAiSettings={() => navigate('/ai-copywriting/settings')} onCreateTask={() => document.getElementById('phase-one-task-proposal')?.scrollIntoView({ behavior: 'smooth' })} />
          <FindPhaseOneResources search={phase.searchResources} onOpenResource={(resourceId) => navigate(`/admin/mastermind-training-preview?resource=${encodeURIComponent(resourceId)}&from=phase-one`)} />
        </section>

        <Card className="border-primary/20 bg-primary/[0.04]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div><p className="font-semibold">Your check-ins keep the plan alive.</p><p className="text-sm text-muted-foreground">Daily and weekly evidence helps your workspace suggest a smaller action, the right lesson, or a question to take to coaching.</p></div>
            </div>
            <Button variant="outline" className="shrink-0" onClick={() => navigate('/weekly-review')}>Open weekly check-in<ChevronRight className="ml-1 h-4 w-4" /></Button>
          </CardContent>
        </Card>
        <WorkspaceSetupDialog
          open={workspaceOpen}
          initialResult={phase.cycle?.goal ?? ''}
          initialAudience={phase.cycle?.audience_target ?? ''}
          onOpenChange={setWorkspaceOpen}
          onReady={(provider) => void run(() => phase.saveWorkspaceReady(provider.toLowerCase() as 'claude' | 'codex'))}
        />
      </main>
    </Layout>
  );
}

type WorkspaceAnswers = {
  result: string;
  offer: string;
  audience: string;
  voice: string;
  example: string;
  platform: 'Claude' | 'Codex';
};

const INITIAL_WORKSPACE_ANSWERS: WorkspaceAnswers = {
  result: 'Create and sell one clear signature offer during this 90-day cycle.',
  offer: '',
  audience: '',
  voice: '',
  example: '',
  platform: 'Claude',
};

function WorkspaceSetupDialog({ open, onOpenChange, onReady, initialResult, initialAudience }: { open: boolean; onOpenChange: (open: boolean) => void; onReady: (provider: 'Claude' | 'Codex') => void; initialResult: string; initialAudience: string }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WorkspaceAnswers>(INITIAL_WORKSPACE_ANSWERS);
  const [copied, setCopied] = useState(false);
  const [testConfirmed, setTestConfirmed] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const packet = useMemo(() => buildWorkspacePacket(answers), [answers]);

  useEffect(() => {
    if (!open) return;
    setAnswers((current) => ({
      ...current,
      result: initialResult.trim() || current.result,
      audience: current.audience.trim() || initialAudience.trim(),
    }));
  }, [initialAudience, initialResult, open]);

  const nextDisabled = step === 1 && (!answers.offer.trim() || !answers.audience.trim());
  const copyPacket = async () => {
    await navigator.clipboard.writeText(packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const downloadPacket = () => {
    const url = URL.createObjectURL(new Blob([packet], { type: 'text/markdown' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '90-day-ceo-workspace.md';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const readExampleFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (file.size > 100_000) { setFileError('Choose a plain-text example smaller than 100 KB.'); return; }
    try {
      const text = await file.text();
      setAnswers((current) => ({ ...current, example: text.slice(0, 20_000) }));
    } catch { setFileError('That file could not be read. Paste the example instead.'); }
  };

  const headings = ['Review your plan', 'Teach it your business', 'Choose your workspace', 'Install your packet', 'Run the first test'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
        <div className="border-b bg-gradient-to-r from-violet-50 to-background p-5 pr-12 dark:from-violet-950/20">
          <DialogHeader>
            <div className="mb-2 flex flex-wrap gap-2"><Badge>90-Day CEO Workspace</Badge><Badge variant="outline">Private setup</Badge></div>
            <DialogTitle className="text-xl">{headings[step]}</DialogTitle>
            <DialogDescription>Step {step + 1} of 5 · No model calls, charges, or Planner changes.</DialogDescription>
          </DialogHeader>
          <Progress value={((step + 1) / 5) * 100} className="mt-4 h-1.5" />
        </div>

        <div className="space-y-5 p-5">
          {step === 0 && <div className="space-y-4"><div className="rounded-2xl border bg-muted/25 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prefilled from your Planner</p><Label htmlFor="workspace-result" className="mt-3 block">90-day result</Label><Textarea id="workspace-result" className="mt-2" value={answers.result} onChange={(event) => setAnswers({ ...answers, result: event.target.value })} /></div><p className="text-sm text-muted-foreground">Your saved result is filled in automatically. Review it before creating the packet; nothing here changes the Planner.</p></div>}

          {step === 1 && <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="workspace-offer">What are you selling this quarter?</Label><Input id="workspace-offer" className="mt-2" placeholder="Example: 8-week group program" value={answers.offer} onChange={(event) => setAnswers({ ...answers, offer: event.target.value })} /></div><div><Label htmlFor="workspace-audience">Who needs it?</Label><Input id="workspace-audience" className="mt-2" placeholder="Describe the person and problem" value={answers.audience} onChange={(event) => setAnswers({ ...answers, audience: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="workspace-voice">How should your writing feel?</Label><Textarea id="workspace-voice" className="mt-2" placeholder="Warm, direct, practical… words or styles to avoid…" value={answers.voice} onChange={(event) => setAnswers({ ...answers, voice: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="workspace-example">Paste a short example that sounds like you</Label><Textarea id="workspace-example" className="mt-2 min-h-28" placeholder="A paragraph from an email, post, sales page, or voice note transcript" value={answers.example} onChange={(event) => setAnswers({ ...answers, example: event.target.value })} /><Label htmlFor="workspace-example-file" className="mt-3 block text-xs">Or choose a plain-text file</Label><Input id="workspace-example-file" type="file" accept=".txt,.md,text/plain,text/markdown" className="mt-2 min-h-11" onChange={(event) => void readExampleFile(event.target.files?.[0])} />{fileError && <p role="alert" className="mt-2 text-xs text-destructive">{fileError}</p>}<p className="mt-2 text-xs text-muted-foreground">Your example stays in this browser while the packet is created. It is not uploaded to the Planner.</p></div></div>}

          {step === 2 && <div role="radiogroup" aria-label="Choose AI workspace" className="grid gap-3 sm:grid-cols-2">{(['Claude', 'Codex'] as const).map((platform) => <button key={platform} type="button" role="radio" aria-checked={answers.platform === platform} onClick={() => setAnswers({ ...answers, platform })} className={cn('rounded-2xl border-2 p-5 text-left transition', answers.platform === platform ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' : 'border-muted hover:border-violet-300')}><div className="flex items-center justify-between"><Bot className="h-6 w-6 text-violet-600" />{answers.platform === platform && <CheckCircle2 className="h-5 w-5 text-violet-600" />}</div><p className="mt-4 font-semibold">{platform}</p><p className="mt-1 text-sm text-muted-foreground">Use your own {platform} account. The Planner pays for no ongoing AI usage.</p></button>)}</div>}

          {step === 3 && <div className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><Button onClick={() => void copyPacket()} className="flex-1"><Copy className="mr-2 h-4 w-4" />{copied ? 'Copied!' : 'Copy workspace packet'}</Button><Button variant="outline" onClick={downloadPacket} className="flex-1"><Download className="mr-2 h-4 w-4" />Download .md file</Button></div><pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">{packet}</pre><ol className="space-y-2 rounded-2xl border p-4 text-sm"><li><strong>1.</strong> Create a new {answers.platform} project/workspace.</li><li><strong>2.</strong> Add the copied packet as its project instructions.</li><li><strong>3.</strong> Add any private source files you want it to learn from.</li><li><strong>4.</strong> Return here and run the first test.</li></ol></div>}

          {step === 4 && <div className="space-y-4"><div className="rounded-2xl border bg-muted/25 p-4"><p className="text-xs font-semibold uppercase text-muted-foreground">Paste this into {answers.platform}</p><p className="mt-2 font-medium">“Read my 90-day result back to me. Then suggest one task small enough to complete this week. Do not change my plan.”</p></div><button type="button" onClick={() => setTestConfirmed(!testConfirmed)} className={cn('flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left', testConfirmed ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/15' : 'border-muted')}><span className="mt-0.5">{testConfirmed ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Circle className="h-6 w-6 text-muted-foreground" />}</span><span><strong className="block">My workspace passed the first test</strong><span className="text-sm text-muted-foreground">It named the correct result and proposed one relevant task without changing anything.</span></span></button><p className="text-xs text-muted-foreground">Preview receipt only. The Planner connection is tested separately because workspace setup and data access are different permissions.</p></div>}

          <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t bg-background/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => step === 0 ? onOpenChange(false) : setStep(step - 1)}>{step === 0 ? 'Save and close' : 'Back'}</Button>
            {step < 4 ? <Button disabled={nextDisabled} onClick={() => setStep(step + 1)}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button disabled={!testConfirmed} onClick={() => { onReady(answers.platform); onOpenChange(false); }}>Mark workspace ready<Check className="ml-2 h-4 w-4" /></Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildWorkspacePacket(answers: WorkspaceAnswers) {
  return `# My 90-Day CEO Workspace\n\n## My current plan\n90-day result: ${answers.result.trim() || '[add result]'}\nOffer: ${answers.offer.trim() || '[add offer]'}\nAudience: ${answers.audience.trim() || '[add audience]'}\n\n## How to support me\nHelp me protect this result, turn ideas into small actions, and collect evidence before changing strategy. Show the full Offer → Find → Nurture → Sell engine, while keeping my current bottleneck primary. Ask before adding or changing Planner tasks. Never publish, send, purchase, delete, or change my goal.\n\n## My voice\n${answers.voice.trim() || 'Use plain, warm, direct language. Do not invent personal stories or results.'}\n\n## Writing example\n${answers.example.trim() || '[I will add approved examples inside my private workspace.]'}\n\n## Mastermind support\nWhen I am stuck, recommend the smallest useful next step. If I need judgment, help me prepare a coaching question. Only link to entitled Mastermind resources returned by the Planner connector; never invent lesson or replay links.\n\n## First test\nRead my 90-day result back to me. Then suggest one task small enough to complete this week. Do not change my plan.\n`;
}

function ExitCard({ icon: Icon, title, ready, description, action, onClick }: { icon: typeof Target; title: string; ready: boolean; description: string; action: string; onClick: () => void }) {
  return <Card className={cn('border-2 transition-colors', ready ? 'border-emerald-300/70 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10' : 'border-transparent')}><CardContent className="p-4"><div className="mb-3 flex items-center justify-between"><div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', ready ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-primary/10 text-primary')}><Icon className="h-5 w-5" /></div>{ready ? <Badge className="bg-emerald-600">Ready</Badge> : <Badge variant="outline">Next step</Badge>}</div><h3 className="font-semibold">{title}</h3><p className="mt-1 min-h-12 text-sm leading-relaxed text-muted-foreground">{description}</p><Button variant="ghost" className="mt-2 h-auto p-0 text-primary" onClick={onClick}>{action}{ready ? <Check className="ml-1 h-4 w-4" /> : <ArrowRight className="ml-1 h-4 w-4" />}</Button></CardContent></Card>;
}

function TaskProposalCard({ proposal, busy, hasKey, onConnect, onRefresh, onReview }: { proposal: import('@/hooks/useMastermindPhaseOne').PlannerProposal | null; busy: boolean; hasKey: boolean; onConnect: () => void; onRefresh: () => void; onReview: (id: string, decision: 'approved' | 'rejected') => void }) {
  if (!proposal) return <Card id="phase-one-task-proposal"><CardContent className="space-y-3 p-4"><p className="font-semibold">Prove the AI + Planner connection</p><p className="text-sm text-muted-foreground">{hasKey ? 'Ask Claude or Codex to read your 90-day goal and propose one task. Then return here to approve it.' : 'Create a private connection key, add it to Claude or Codex, and run one real task proposal.'}</p><Button className="min-h-11 w-full" disabled={busy} onClick={hasKey ? onRefresh : onConnect}>{hasKey ? 'Check for my AI proposal' : 'Open connection setup'}</Button></CardContent></Card>;
  return <Card id="phase-one-task-proposal"><CardHeader className="pb-3"><div className="flex items-center justify-between gap-2"><Badge variant="secondary">AI proposal</Badge><span className="text-xs text-muted-foreground">Needs your approval</span></div><CardTitle className="text-base">{proposal.task_text}</CardTitle><CardDescription>{proposal.why_this_task || proposal.task_description}</CardDescription></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-muted/30 p-3 text-sm"><p><strong>Done enough:</strong> {proposal.done_enough || 'One small attempt is complete.'}</p><p className="mt-1"><strong>Bring back:</strong> {proposal.evidence_target || 'What you tried and what happened.'}</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button size="sm" className="min-h-11 flex-1" disabled={busy} onClick={() => onReview(proposal.proposal_id, 'approved')}><Check className="mr-1.5 h-4 w-4" />Approve and add</Button><Button size="sm" variant="outline" className="min-h-11 flex-1" disabled={busy} onClick={() => onReview(proposal.proposal_id, 'rejected')}><X className="mr-1.5 h-4 w-4" />Not now</Button></div></CardContent></Card>;
}
