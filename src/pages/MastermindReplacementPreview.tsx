import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Flag,
  PlayCircle,
  Sparkles,
  Target,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type PreviewScreen = 'welcome' | 'recommendation' | 'milestone' | 'progress';

const screens: Array<{ id: PreviewScreen; label: string }> = [
  { id: 'welcome', label: '1. Welcome' },
  { id: 'recommendation', label: '2. Recommendation' },
  { id: 'milestone', label: '3. Milestone' },
  { id: 'progress', label: '4. Progress' },
];

const stageOptions = [
  { id: 'offer', label: 'Offer', description: 'Clarify what you sell and validate it.' },
  { id: 'find', label: 'Find', description: 'Help more of the right people discover you.' },
  { id: 'nurture', label: 'Nurture', description: 'Turn attention into trust and readiness.' },
  { id: 'sell', label: 'Sell', description: 'Run a complete, repeatable sales process.' },
  { id: 'deliver', label: 'Deliver', description: 'Create stronger results and proof.' },
  { id: 'leverage', label: 'Leverage', description: 'Simplify the business and remove bottlenecks.' },
];

export default function MastermindReplacementPreview() {
  const [screen, setScreen] = useState<PreviewScreen>('welcome');
  const [stage, setStage] = useState('sell');
  const [actionComplete, setActionComplete] = useState(false);
  const [evidenceAdded, setEvidenceAdded] = useState(false);

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-5" data-preview-only="true">
        <div className="sticky top-0 z-20 -mx-4 border-y border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm md:-mx-6 md:px-6">
          <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 shrink-0" />
            DRAFT PREVIEW · FAKE MEMBER DATA · NOTHING SAVES
          </div>
        </div>

        <header className="space-y-2">
          <Badge variant="secondary">Becoming Boss Mastermind</Badge>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Success Plan</h1>
            <p className="text-muted-foreground">One quarter. One result. One clear path.</p>
          </div>
        </header>

        <nav aria-label="Preview screens" className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-2 sm:grid-cols-4">
          {screens.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={screen === item.id ? 'default' : 'ghost'}
              className="h-11 justify-start sm:justify-center"
              onClick={() => setScreen(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {screen === 'welcome' && <WelcomeScreen onContinue={() => setScreen('recommendation')} />}
        {screen === 'recommendation' && (
          <RecommendationScreen
            stage={stage}
            onStageChange={setStage}
            onContinue={() => setScreen('milestone')}
          />
        )}
        {screen === 'milestone' && (
          <MilestoneScreen
            actionComplete={actionComplete}
            evidenceAdded={evidenceAdded}
            onToggleAction={() => setActionComplete((value) => !value)}
            onToggleEvidence={() => setEvidenceAdded((value) => !value)}
            onContinue={() => setScreen('progress')}
          />
        )}
        {screen === 'progress' && (
          <ProgressScreen
            actionComplete={actionComplete}
            evidenceAdded={evidenceAdded}
            onRestart={() => setScreen('welcome')}
          />
        )}
      </div>
    </Layout>
  );
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="w-fit">Mastermind welcome</Badge>
        <CardTitle className="text-2xl">Welcome to the Mastermind</CardTitle>
        <CardDescription>Tell us what is true right now so your plan and support fit your real business.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <PreviewField label="What do you sell right now?" value="A group coaching program for service providers" />
          <PreviewField label="Why did you join?" value="I need consistent sales without rebuilding every month" />
          <PreviewField label="What would make this quarter a win?" value="Enroll 8 clients into my signature offer" />
          <PreviewField label="What is getting in the way?" value="I start marketing plans but do not finish the full sales cycle" />
        </div>
        <div className="space-y-2">
          <Label>What capacity should your plan respect?</Label>
          <RadioGroup defaultValue="standard" className="grid gap-2 sm:grid-cols-3">
            {['Low: protect the essentials', 'Standard: steady weekly action', 'High: extra room to experiment'].map((option, index) => (
              <label key={option} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                <RadioGroupItem value={['low', 'standard', 'high'][index]} />
                {option}
              </label>
            ))}
          </RadioGroup>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={onContinue}>
            See my recommended path <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={value} readOnly className="min-h-24 resize-none bg-muted/20" />
    </div>
  );
}

function RecommendationScreen({
  stage,
  onStageChange,
  onContinue,
}: {
  stage: string;
  onStageChange: (stage: string) => void;
  onContinue: () => void;
}) {
  const selected = stageOptions.find((option) => option.id === stage) ?? stageOptions[3];

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">Recommended from your real plan</span>
          </div>
          <CardTitle className="text-2xl">Focus on {selected.label}</CardTitle>
          <CardDescription>{selected.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Your 90-day result</p>
            <p className="mt-1 font-semibold">Enroll 8 clients into my signature offer</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">First milestone</p>
            <p className="mt-1 font-semibold">Set the sales target and activity math</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Does this feel like the first broken link?</CardTitle>
          <CardDescription>Confirm it or choose the area that needs attention first.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stageOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn(
                'min-h-24 rounded-lg border p-4 text-left transition-colors',
                option.id === stage ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
              )}
              onClick={() => onStageChange(option.id)}
            >
              <span className="flex items-center justify-between font-semibold">
                {option.label}
                {option.id === stage && <Check className="h-4 w-4 text-primary" />}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={onContinue}>
          Confirm {selected.label} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MilestoneScreen({
  actionComplete,
  evidenceAdded,
  onToggleAction,
  onToggleEvidence,
  onContinue,
}: {
  actionComplete: boolean;
  evidenceAdded: boolean;
  onToggleAction: () => void;
  onToggleEvidence: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge>Sell</Badge>
              <span className="text-sm text-muted-foreground">Milestone 1 of 4</span>
            </div>
            <CardTitle className="text-2xl">Set the sales target and activity math</CardTitle>
            <CardDescription>Know exactly what needs to happen before you build the rest of the sales plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={25} aria-label="Milestone progress" />
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Primary implementation project</p>
              <p className="mt-1 font-semibold">Complete one full sales cycle for your signature offer</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Target className="h-4 w-4" />
              <span className="text-sm font-semibold">Do this this week</span>
            </div>
            <CardTitle>Calculate your sales target and invitation number</CardTitle>
            <CardDescription>Write the revenue target, offer price, sales needed, and invitations you will make.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant={actionComplete ? 'secondary' : 'default'} onClick={onToggleAction}>
              {actionComplete ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
              {actionComplete ? 'Marked complete' : 'Mark action complete'}
            </Button>
            <Button type="button" variant="outline" onClick={onToggleEvidence}>
              <Flag className="mr-2 h-4 w-4" />
              {evidenceAdded ? 'Evidence added' : 'Add evidence'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-semibold">Recommended resource</span>
            </div>
            <CardTitle className="text-xl">Sales Target + Sales Math</CardTitle>
            <CardDescription>A short lesson to help you complete this milestone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" variant="outline" className="w-full" onClick={() => undefined}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Preview lesson placement
            </Button>
            <p className="rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              Provisional curriculum slot. The exact WIBN/current-course lesson still needs source verification.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need help?</CardTitle>
            <CardDescription>Bring your target, math, and sticking point to coaching.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="ghost" className="w-full" onClick={() => undefined}>Prepare a coaching question</Button>
          </CardContent>
        </Card>

        <Button type="button" className="w-full" onClick={onContinue}>
          See progress view <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ProgressScreen({
  actionComplete,
  evidenceAdded,
  onRestart,
}: {
  actionComplete: boolean;
  evidenceAdded: boolean;
  onRestart: () => void;
}) {
  const progress = actionComplete && evidenceAdded ? 50 : actionComplete || evidenceAdded ? 35 : 25;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">Weekly check-in</Badge>
          <CardTitle className="text-2xl">Your plan gives coaching the context</CardTitle>
          <CardDescription>Your action, evidence, capacity, and question stay connected to the same milestone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Milestone progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard label="Weekly action" complete={actionComplete} detail="Sales math and invitation target" />
            <StatusCard label="Evidence" complete={evidenceAdded} detail="Worksheet or note attached" />
            <StatusCard label="Coaching context" complete detail="Focus, action, and blocker ready" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview-check-in">What happened when you took the action?</Label>
            <Textarea
              id="preview-check-in"
              readOnly
              value="I completed the sales math. My next blocker is making the invitation plan small enough to repeat every week."
              className="min-h-24 resize-none bg-muted/20"
            />
          </div>
          <div className="flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">Next step</p>
              <p className="text-sm text-muted-foreground">Build the invitation plan, then keep this milestone active until the evidence is complete.</p>
            </div>
            <Button type="button" variant="outline" onClick={onRestart}>Review from the beginning</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({ label, complete, detail }: { label: string; complete: boolean; detail: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        {complete ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span className="h-4 w-4 rounded-full border" />}
        <p className="font-semibold">{label}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
