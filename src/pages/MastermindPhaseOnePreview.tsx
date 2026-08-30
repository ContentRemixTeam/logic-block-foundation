import { useMemo, useState } from 'react';
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
import { usePhaseOneCatalog, savePhaseOneVideoProgress } from '@/hooks/usePhaseOneCatalog';
import { cn } from '@/lib/utils';

const PROGRESS_KEY = 'mastermind-phase-one-preview-progress';
const WORKSPACE_READY_KEY = 'mastermind-phase-one-preview-workspace-ready';
const TRAINING_PREVIEW_ROUTE = '/admin/mastermind-training-preview';

const trainingHref = (resourceId: string) =>
  `${TRAINING_PREVIEW_ROUTE}?resource=${encodeURIComponent(resourceId)}&from=phase-one`;


function readWatched(): string[] {
  try {
    const value = window.localStorage.getItem(PROGRESS_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export default function MastermindPhaseOnePreview() {
  const navigate = useNavigate();
  const [watched, setWatched] = useState<string[]>(readWatched);
  const [showFullLibrary, setShowFullLibrary] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(() => window.localStorage.getItem(WORKSPACE_READY_KEY) === 'true');
  const [proposalState, setProposalState] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const { data: catalog } = usePhaseOneCatalog();

  // Playable state is server-authorized: only lessons returned by
  // search_my_mastermind_phase_one_resources can be opened for playback.
  const catalogById = useMemo(() => {
    const map = new Map<string, { completed: boolean; duration: number | null; position: number }>();
    for (const row of catalog ?? []) {
      map.set(row.portal_resource_id, {
        completed: row.completed === true,
        duration: row.duration_seconds ?? null,
        position: row.last_position_seconds ?? 0,
      });
    }
    return map;
  }, [catalog]);

  const visibleLessons = useMemo(
    () => PHASE_ONE_LESSONS.filter((lesson) => lesson.requirement === 'required' || showFullLibrary),
    [showFullLibrary],
  );
  const isWatchedLesson = (resourceId: string) =>
    watched.includes(resourceId) || catalogById.get(resourceId)?.completed === true;
  const watchedCount = PHASE_ONE_LESSONS.filter((lesson) => isWatchedLesson(lesson.resourceId)).length;
  const requiredComplete = PHASE_ONE_REQUIRED_LESSONS.every((lesson) => isWatchedLesson(lesson.resourceId));
  const phaseProgress = [requiredComplete, workspaceReady, connectionTested].filter(Boolean).length;

  const toggleWatched = (lessonId: string) => {
    const nowWatched = !watched.includes(lessonId);
    const next = nowWatched ? [...watched, lessonId] : watched.filter((id) => id !== lessonId);
    setWatched(next);
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    if (nowWatched && catalogById.has(lessonId)) {
      void savePhaseOneVideoProgress({
        portalResourceId: lessonId,
        completed: true,
        completionSource: 'member_confirmed',
        watchedSeconds: catalogById.get(lessonId)?.duration ?? 0,
        lastPositionSeconds: catalogById.get(lessonId)?.position ?? 0,
      });
    }
  };


  return (
    <Layout>
      <main className="mx-auto w-full max-w-6xl space-y-6 pb-16">
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
            <ExitCard icon={Target} title="Plan ready" ready={requiredComplete} description="Your 90-day result, focus, weekly move, and evidence target are saved." action="Build my plan" onClick={() => navigate('/cycle-setup')} />
            <ExitCard icon={Bot} title="AI workspace ready" ready={workspaceReady} description="Your business interview, examples, and customized CEO Workspace are installed." action={workspaceReady ? 'Review workspace' : 'Set up workspace'} onClick={() => setWorkspaceOpen(true)} />
            <ExitCard icon={Link2} title="Planner connected" ready={connectionTested} description="Your AI can read the right goal and send a task for your approval." action={connectionTested ? 'Test passed' : 'Run connection test'} onClick={() => setConnectionTested(true)} />
          </div>
        </section>

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
                  <CardDescription className="mt-1">Two core lessons are shown first. Your answers can reveal extra support.</CardDescription>
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
                const isWatched = isWatchedLesson(lesson.resourceId);
                const playbackReady = catalogById.has(lesson.resourceId);
                return (
                  <article key={lesson.resourceId} className={cn('group rounded-2xl border p-4 transition-colors', isWatched ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/15' : 'hover:border-primary/35')}>
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => toggleWatched(lesson.resourceId)} disabled={!playbackReady} className="mt-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45" aria-label={playbackReady ? (isWatched ? `Mark ${lesson.title} not watched` : `Mark ${lesson.title} watched`) : `${lesson.title} playback import pending`}>
                        {isWatched ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Circle className="h-6 w-6 text-muted-foreground/60" />}
                      </button>
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
                          <Button size="sm" variant={isWatched ? 'outline' : 'secondary'} disabled={!playbackReady} onClick={() => navigate(trainingHref(lesson.resourceId))}>
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

            <TaskProposalCard state={proposalState} onStateChange={setProposalState} />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2" aria-label="Phase One AI support previews">
          <CoachingPreviewPanel onProposeTask={() => setProposalState('pending')} />
          <FindWhatINeedPanel onOpenResource={(resourceId) => navigate(trainingHref(resourceId))} />
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
          onOpenChange={setWorkspaceOpen}
          onReady={() => {
            window.localStorage.setItem(WORKSPACE_READY_KEY, 'true');
            setWorkspaceReady(true);
          }}
        />
      </main>
    </Layout>
  );
}

const COACHING_KEY = 'mastermind-phase-one-preview-coaching';
const SEARCH_KEY = 'mastermind-phase-one-preview-search';

type CoachingMode = 'next' | 'smaller' | 'evidence' | 'stuck' | 'coaching' | 'restart';

const COACHING_MODES: Array<{ id: CoachingMode; label: string }> = [
  { id: 'next', label: 'What should I do next?' },
  { id: 'smaller', label: 'Make this smaller' },
  { id: 'evidence', label: 'Interpret my evidence' },
  { id: 'stuck', label: 'I am stuck' },
  { id: 'coaching', label: 'Prepare for coaching' },
  { id: 'restart', label: 'Help me restart' },
];

const COACHING_RESPONSES: Record<CoachingMode, { diagnosis: string; action: string; evidence: string; resourceId: string }> = {
  next: { diagnosis: 'The plan needs a real-world attempt before it needs more strategy.', action: 'Write your one-sentence 90-day result and schedule the first 20-minute action.', evidence: 'A saved result plus one dated attempt within 48 hours.', resourceId: 'ninety-day-goal-setting-introduction' },
  smaller: { diagnosis: 'The move is probably too large for the capacity available this week.', action: 'Reduce the next move to one 20-minute draft, message, or decision.', evidence: 'One completed small version and what happened next.', resourceId: 'wibn-ceo-embodiment' },
  evidence: { diagnosis: 'One data point is useful, but it is not yet a reason to replace the plan.', action: 'Record what you tried, who saw it, and the response before choosing continue or adjust.', evidence: 'Attempt count plus replies, clicks, conversations, sales, or no-response.', resourceId: 'wibn-week-one-qa' },
  stuck: { diagnosis: 'You may need a decision or emotional support—not another long playlist.', action: 'Name the exact step you are avoiding and do the smallest visible version.', evidence: 'The smallest version attempted once.', resourceId: 'wibn-ceo-embodiment' },
  coaching: { diagnosis: 'Faith can coach this faster when the plan, attempt, and decision are clear.', action: 'Bring one decision, what you tried, and what happened to coaching.', evidence: 'A specific coaching question with one evidence receipt.', resourceId: 'wibn-week-one-qa' },
  restart: { diagnosis: 'Missing a week does not mean the strategy failed.', action: 'Keep the same result and choose one reduced move for the next 48 hours.', evidence: 'One restart action completed without adding curriculum debt.', resourceId: 'ninety-day-goal-setting-introduction' },
};

function CoachingPreviewPanel({ onProposeTask }: { onProposeTask: () => void }) {
  const saved = (() => { try { return JSON.parse(window.localStorage.getItem(COACHING_KEY) ?? '{}'); } catch { return {}; } })() as { mode?: CoachingMode; context?: string };
  const [mode, setMode] = useState<CoachingMode>(saved.mode ?? 'next');
  const [context, setContext] = useState(saved.context ?? 'I have several things I could work on and keep changing my plan.');
  const [showResponse, setShowResponse] = useState(false);
  const response = COACHING_RESPONSES[mode];
  const resource = PHASE_ONE_LESSONS.find((lesson) => lesson.resourceId === response.resourceId) ?? PHASE_ONE_LESSONS[0];
  const save = (nextMode: CoachingMode, nextContext: string) => window.localStorage.setItem(COACHING_KEY, JSON.stringify({ mode: nextMode, context: nextContext }));
  const askFaithDraft = `My 90-day focus is one clear offer. I am working on: ${context.trim() || 'my next move'}. I tried the smallest version and the evidence I have is ____. The decision I need help with is: should I persist, adjust, or reduce this move?`;

  return <Card className="overflow-hidden border-sky-200 shadow-sm dark:border-sky-900"><CardHeader className="border-b bg-gradient-to-r from-sky-50 to-background dark:from-sky-950/20"><div className="flex items-center justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><MessageCircle className="h-5 w-5" /></div><Badge variant="outline" className="bg-background">No key · test mode</Badge></div><CardTitle className="text-xl">Get Coached by Faith</CardTitle><CardDescription>Turn your current plan and evidence into one next move. This is Faith-trained guidance, not a live answer from Faith.</CardDescription></CardHeader><CardContent className="space-y-4 p-5"><div className="flex flex-wrap gap-2">{COACHING_MODES.map((item) => <Button key={item.id} size="sm" variant={mode === item.id ? 'default' : 'outline'} onClick={() => { setMode(item.id); setShowResponse(false); save(item.id, context); }}>{item.label}</Button>)}</div><div><Label htmlFor="coaching-context">What is happening right now?</Label><Textarea id="coaching-context" className="mt-2" value={context} onChange={(event) => { setContext(event.target.value); save(mode, event.target.value); }} /></div><Button className="w-full" onClick={() => setShowResponse(true)}><Sparkles className="mr-2 h-4 w-4" />Give me one next move</Button>{showResponse && <div className="space-y-3 rounded-2xl border bg-muted/20 p-4" aria-live="polite"><OutputLine label="What I see" value={response.diagnosis} /><OutputLine label="Do this next" value={response.action} /><OutputLine label="Evidence to bring back" value={response.evidence} /><div className="rounded-xl bg-background p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">One useful resource</p><p className="mt-1 text-sm font-semibold">{resource.title}</p><p className="text-xs text-muted-foreground">{resource.whyRecommended} Playback remains unavailable until its protected import passes.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button size="sm" className="flex-1" onClick={onProposeTask}>Propose this task</Button><Button size="sm" variant="outline" className="flex-1" onClick={() => void navigator.clipboard.writeText(askFaithDraft)}><Send className="mr-1.5 h-4 w-4" />Copy Ask Faith draft</Button></div><details className="rounded-xl border bg-background p-3"><summary className="cursor-pointer text-sm font-semibold">Preview Ask Faith handoff</summary><p className="mt-2 text-sm text-muted-foreground">{askFaithDraft}</p><p className="mt-2 text-xs font-medium text-sky-700 dark:text-sky-300">Nothing is submitted without your confirmation.</p></details></div>}</CardContent></Card>;
}

function FindWhatINeedPanel({ onOpenResource }: { onOpenResource: (resourceId: string) => void }) {
  const [query, setQuery] = useState(() => window.localStorage.getItem(SEARCH_KEY) ?? 'I need help choosing what to focus on');
  const normalized = query.trim().toLowerCase();
  const scored = PHASE_ONE_LESSONS.map((lesson) => {
    const haystack = `${lesson.title} ${lesson.whyRecommended} ${lesson.showWhen} ${lesson.afterWatchingAction} ${lesson.evidenceTarget}`.toLowerCase();
    const terms = normalized.split(/\s+/).filter((term) => term.length > 2);
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
    return { lesson, score };
  }).sort((a, b) => b.score - a.score || a.lesson.order - b.lesson.order);
  const results = (scored.some((item) => item.score > 0) ? scored.filter((item) => item.score > 0) : scored).slice(0, 3);

  return <Card className="overflow-hidden border-amber-200 shadow-sm dark:border-amber-900"><CardHeader className="border-b bg-gradient-to-r from-amber-50 to-background dark:from-amber-950/20"><div className="flex items-center justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Search className="h-5 w-5" /></div><Badge variant="outline" className="bg-background">9 approved items only</Badge></div><CardTitle className="text-xl">Find What I Need</CardTitle><CardDescription>Search the Phase One catalog by the problem you have—not by remembering a lesson title.</CardDescription></CardHeader><CardContent className="space-y-4 p-5"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search Phase One resources" className="pl-9" value={query} onChange={(event) => { setQuery(event.target.value); window.localStorage.setItem(SEARCH_KEY, event.target.value); }} placeholder="What are you stuck on?" /></div><p className="text-xs text-muted-foreground">Test mode searches approved titles and safe descriptions only. It does not search transcripts or the Replay Vault.</p><div className="space-y-3">{results.map(({ lesson }, index) => <article key={lesson.resourceId} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Match {index + 1}</p><h3 className="mt-1 font-semibold">{lesson.title}</h3></div><Badge variant="secondary">{lesson.durationLabel ?? 'Duration pending'}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{lesson.whyRecommended}</p><div className="mt-3 rounded-xl bg-muted/30 p-3"><OutputLine label="After using it" value={lesson.afterWatchingAction} /><OutputLine label="Bring back" value={lesson.evidenceTarget} /></div><Button className="mt-3 w-full" size="sm" variant="outline" disabled={lesson.lessonState !== 'ready'} onClick={() => onOpenResource(lesson.resourceId)}>{lesson.lessonState === 'ready' ? 'Open protected lesson' : 'Protected import pending'}</Button></article>)}</div></CardContent></Card>;
}

function OutputLine({ label, value }: { label: string; value: string }) {
  return <div className="mb-2 last:mb-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-relaxed">{value}</p></div>;
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

function WorkspaceSetupDialog({ open, onOpenChange, onReady }: { open: boolean; onOpenChange: (open: boolean) => void; onReady: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WorkspaceAnswers>(INITIAL_WORKSPACE_ANSWERS);
  const [copied, setCopied] = useState(false);
  const [testConfirmed, setTestConfirmed] = useState(false);
  const packet = useMemo(() => buildWorkspacePacket(answers), [answers]);

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

  const headings = ['Review your plan', 'Teach it your business', 'Choose your workspace', 'Install your packet', 'Run the first test'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
        <div className="border-b bg-gradient-to-r from-violet-50 to-background p-5 pr-12 dark:from-violet-950/20">
          <DialogHeader>
            <div className="mb-2 flex flex-wrap gap-2"><Badge>90-Day CEO Workspace</Badge><Badge variant="outline">Preview only · saved on this device</Badge></div>
            <DialogTitle className="text-xl">{headings[step]}</DialogTitle>
            <DialogDescription>Step {step + 1} of 5 · No model calls, charges, or Planner changes.</DialogDescription>
          </DialogHeader>
          <Progress value={((step + 1) / 5) * 100} className="mt-4 h-1.5" />
        </div>

        <div className="space-y-5 p-5">
          {step === 0 && <div className="space-y-4"><div className="rounded-2xl border bg-muted/25 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prefilled from your Planner</p><Label htmlFor="workspace-result" className="mt-3 block">90-day result</Label><Textarea id="workspace-result" className="mt-2" value={answers.result} onChange={(event) => setAnswers({ ...answers, result: event.target.value })} /></div><p className="text-sm text-muted-foreground">In the connected version, your saved result, focus, capacity, and evidence targets appear here automatically. You stay in control of changes.</p></div>}

          {step === 1 && <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="workspace-offer">What are you selling this quarter?</Label><Input id="workspace-offer" className="mt-2" placeholder="Example: 8-week group program" value={answers.offer} onChange={(event) => setAnswers({ ...answers, offer: event.target.value })} /></div><div><Label htmlFor="workspace-audience">Who needs it?</Label><Input id="workspace-audience" className="mt-2" placeholder="Describe the person and problem" value={answers.audience} onChange={(event) => setAnswers({ ...answers, audience: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="workspace-voice">How should your writing feel?</Label><Textarea id="workspace-voice" className="mt-2" placeholder="Warm, direct, practical… words or styles to avoid…" value={answers.voice} onChange={(event) => setAnswers({ ...answers, voice: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="workspace-example">Paste a short example that sounds like you</Label><Textarea id="workspace-example" className="mt-2 min-h-28" placeholder="A paragraph from an email, post, sales page, or voice note transcript" value={answers.example} onChange={(event) => setAnswers({ ...answers, example: event.target.value })} /><p className="mt-2 text-xs text-muted-foreground">This preview keeps the example only in memory. The final version will provide private file upload and deletion controls.</p></div></div>}

          {step === 2 && <div className="grid gap-3 sm:grid-cols-2">{(['Claude', 'Codex'] as const).map((platform) => <button key={platform} type="button" onClick={() => setAnswers({ ...answers, platform })} className={cn('rounded-2xl border-2 p-5 text-left transition', answers.platform === platform ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' : 'border-muted hover:border-violet-300')}><div className="flex items-center justify-between"><Bot className="h-6 w-6 text-violet-600" />{answers.platform === platform && <CheckCircle2 className="h-5 w-5 text-violet-600" />}</div><p className="mt-4 font-semibold">{platform}</p><p className="mt-1 text-sm text-muted-foreground">Use your own {platform} account. The Planner pays for no ongoing AI usage.</p></button>)}</div>}

          {step === 3 && <div className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><Button onClick={() => void copyPacket()} className="flex-1"><Copy className="mr-2 h-4 w-4" />{copied ? 'Copied!' : 'Copy workspace packet'}</Button><Button variant="outline" onClick={downloadPacket} className="flex-1"><Download className="mr-2 h-4 w-4" />Download .md file</Button></div><pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">{packet}</pre><ol className="space-y-2 rounded-2xl border p-4 text-sm"><li><strong>1.</strong> Create a new {answers.platform} project/workspace.</li><li><strong>2.</strong> Add the copied packet as its project instructions.</li><li><strong>3.</strong> Add any private source files you want it to learn from.</li><li><strong>4.</strong> Return here and run the first test.</li></ol></div>}

          {step === 4 && <div className="space-y-4"><div className="rounded-2xl border bg-muted/25 p-4"><p className="text-xs font-semibold uppercase text-muted-foreground">Paste this into {answers.platform}</p><p className="mt-2 font-medium">“Read my 90-day result back to me. Then suggest one task small enough to complete this week. Do not change my plan.”</p></div><button type="button" onClick={() => setTestConfirmed(!testConfirmed)} className={cn('flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left', testConfirmed ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/15' : 'border-muted')}><span className="mt-0.5">{testConfirmed ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Circle className="h-6 w-6 text-muted-foreground" />}</span><span><strong className="block">My workspace passed the first test</strong><span className="text-sm text-muted-foreground">It named the correct result and proposed one relevant task without changing anything.</span></span></button><p className="text-xs text-muted-foreground">Preview receipt only. The Planner connection is tested separately because workspace setup and data access are different permissions.</p></div>}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => step === 0 ? onOpenChange(false) : setStep(step - 1)}>{step === 0 ? 'Save and close' : 'Back'}</Button>
            {step < 4 ? <Button disabled={nextDisabled} onClick={() => setStep(step + 1)}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button disabled={!testConfirmed} onClick={() => { onReady(); onOpenChange(false); }}>Mark workspace ready<Check className="ml-2 h-4 w-4" /></Button>}
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

function TaskProposalCard({ state, onStateChange }: { state: 'pending' | 'approved' | 'rejected'; onStateChange: (state: 'pending' | 'approved' | 'rejected') => void }) {
  if (state !== 'pending') return <Card><CardContent className="flex items-center justify-between gap-3 p-4"><div className="flex items-center gap-2">{state === 'approved' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-muted-foreground" />}<div><p className="text-sm font-semibold">Task {state}</p><p className="text-xs text-muted-foreground">Preview only—nothing was changed.</p></div></div><Button size="sm" variant="ghost" onClick={() => onStateChange('pending')}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reset</Button></CardContent></Card>;
  return <Card><CardHeader className="pb-3"><div className="flex items-center justify-between gap-2"><Badge variant="secondary">From your AI</Badge><span className="text-xs text-muted-foreground">Needs approval</span></div><CardTitle className="text-base">Draft my one-sentence 90-day result</CardTitle><CardDescription>Add this to Tuesday so I finish the plan before watching another lesson.</CardDescription></CardHeader><CardContent className="flex gap-2"><Button size="sm" className="flex-1" onClick={() => onStateChange('approved')}><Check className="mr-1.5 h-4 w-4" />Add task</Button><Button size="sm" variant="outline" className="flex-1" onClick={() => onStateChange('rejected')}><X className="mr-1.5 h-4 w-4" />Not now</Button></CardContent></Card>;
}
