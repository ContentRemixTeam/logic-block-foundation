/**
 * Calm 5-step first-run onboarding for The Low Battery Business Planner.
 * Matches the current app: philosophy → battery check-in → bare minimum
 * template → 90-day cycle intro → dashboard.
 *
 * Every step is skippable. Progress dots at the top. No urgency, no pressure.
 * Completion is persisted so returning users land on their dashboard.
 *
 * Existing users don't see this: only new signups are routed here from Auth,
 * and any user can revisit via `/onboarding` (settings link).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BatteryLow,
  CheckCircle2,
  Compass,
  HeartHandshake,
  Sparkles,
  Trash2,
  Plus,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTodayBattery, BATTERY_LEVELS, type BatteryLevel } from '@/hooks/useBatteryCheckin';
import { useBareMinimumTemplate, type BareMinimumTemplateItem } from '@/hooks/useBareMinimum';

const COMPLETE_KEY = 'lbb-onboarding-complete';

export function markOnboardingComplete() {
  try { localStorage.setItem(COMPLETE_KEY, '1'); } catch { /* noop */ }
}

export function hasCompletedOnboarding(): boolean {
  try { return localStorage.getItem(COMPLETE_KEY) === '1'; } catch { return false; }
}

const STEPS = ['Welcome', 'Battery', 'Bare minimum', '90-day cycle', 'Ready'] as const;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const finish = () => {
    markOnboardingComplete();
    navigate('/dashboard');
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  return (
    <Layout>
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8 sm:py-12">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2" aria-label="Onboarding progress">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                'h-2 rounded-full transition-all',
                i === step ? 'w-6 bg-primary' : i < step ? 'w-2 bg-primary/60' : 'w-2 bg-muted',
              )}
              aria-current={i === step ? 'step' : undefined}
            />
          ))}
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {step === 0 && <StepWelcome onNext={next} onSkip={finish} />}
            {step === 1 && <StepBattery onNext={next} onSkip={next} />}
            {step === 2 && <StepBareMinimum onNext={next} onSkip={next} />}
            {step === 3 && <StepCycle onNext={next} onSkip={next} />}
            {step === 4 && <StepDone onFinish={finish} />}
          </CardContent>
        </Card>

        <button
          type="button"
          className="mx-auto text-xs text-muted-foreground hover:text-foreground"
          onClick={finish}
        >
          Skip setup — I'll explore on my own
        </button>
      </div>
    </Layout>
  );
}

/* ---------- Step 1: Welcome ---------- */
function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <HeartHandshake className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Welcome in.</h1>
        <p className="text-muted-foreground leading-relaxed">
          This planner works <em>with</em> your energy, not against it.
          Built for building a business through chronic illness, low-battery days,
          and everything life brings.
        </p>
      </div>
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
        <Button onClick={onNext} className="gap-2">
          Let's set it up gently <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </div>
  );
}

/* ---------- Step 2: Battery check-in ---------- */
function StepBattery({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { level, setLevel } = useTodayBattery();
  const [saving, setSaving] = useState(false);

  const pick = async (l: BatteryLevel) => {
    setSaving(true);
    try { await setLevel(l); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-primary/80">Step 2 · Battery</p>
        <h2 className="text-xl font-semibold">How's your battery today?</h2>
        <p className="text-sm text-muted-foreground">
          Each morning the planner asks this once. Your answer shapes what it suggests — nothing more.
          No wrong answer. Rest counts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {BATTERY_LEVELS.map((b) => {
          const active = level === b.level;
          return (
            <button
              key={b.level}
              type="button"
              disabled={saving}
              onClick={() => pick(b.level)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-colors',
                'hover:border-primary/60 hover:bg-primary/5',
                active ? 'border-primary bg-primary/10' : 'border-border',
              )}
            >
              <span className="text-2xl" aria-hidden>{b.emoji}</span>
              <span className="text-sm font-medium">{b.label}</span>
              <span className="text-[11px] text-muted-foreground">{b.blurb}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
        <Button onClick={onNext} className="gap-2" disabled={saving}>
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Step 3: Bare minimum ---------- */
function StepBareMinimum({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { items, save, isLoading } = useBareMinimumTemplate();
  const [local, setLocal] = useState<BareMinimumTemplateItem[]>(items.length ? items : [
    { id: 't-0', text: '', energy_cost: null },
  ]);
  const [saving, setSaving] = useState(false);

  // If server items load after mount, seed once
  const seeded = useMemo(() => items, [items]);
  if (seeded.length && local.length === 1 && !local[0].text && seeded !== items) {
    setLocal(seeded);
  }

  const setText = (id: string, text: string) =>
    setLocal((l) => l.map((i) => (i.id === id ? { ...i, text } : i)));

  const addRow = () =>
    setLocal((l) => (l.length >= 3 ? l : [...l, { id: `t-${l.length}-${Date.now()}`, text: '', energy_cost: null }]));

  const removeRow = (id: string) => setLocal((l) => l.filter((i) => i.id !== id));

  const handleNext = async () => {
    const trimmed = local.map((i) => ({ ...i, text: i.text.trim() })).filter((i) => i.text);
    if (trimmed.length > 0) {
      setSaving(true);
      try { await save(trimmed); } finally { setSaving(false); }
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-primary/80">Step 3 · Bare minimum</p>
        <h2 className="text-xl font-semibold">Your bare-minimum list</h2>
        <p className="text-sm text-muted-foreground">
          1–3 tiny things that make a day <em>count</em>, even on your worst day.
          Doing these = a full day. Optional — you can add them later.
        </p>
      </div>

      <div className="space-y-2">
        {local.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
            <Input
              value={item.text}
              onChange={(e) => setText(item.id, e.target.value)}
              placeholder="e.g. Reply to one client email"
              maxLength={80}
              disabled={isLoading}
            />
            {local.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => removeRow(item.id)}
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        {local.length < 3 && (
          <Button type="button" variant="ghost" size="sm" onClick={addRow} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add another
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" onClick={onSkip} disabled={saving}>Skip</Button>
        <Button onClick={handleNext} className="gap-2" disabled={saving}>
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Step 4: 90-day cycle ---------- */
function StepCycle({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-primary/80">Step 4 · Direction</p>
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">The 90-day cycle</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          When you're ready, the 90-day cycle is the heart of the planner —
          one clear focus you're moving toward, at your own pace.
          You can start it now, or come back to it any time from your dashboard.
        </p>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 text-sm">
        <BatteryLow className="mb-2 h-4 w-4 text-primary" />
        <p className="text-muted-foreground">
          Low-battery weeks are part of the cycle. There's no penalty for slowing down.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onSkip}>I'll set it up later</Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => { markOnboardingComplete(); navigate('/cycle-setup'); }}>
            Start my cycle
          </Button>
          <Button onClick={onNext} className="gap-2">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 5: Done ---------- */
function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">You're set.</h2>
        <p className="text-muted-foreground leading-relaxed">
          Your dashboard is waiting. Try adding one small task for today —
          just one. That's a full first step.
        </p>
      </div>
      <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
        <Sparkles className="mx-auto mb-1 h-4 w-4 text-primary/70" />
        Everything is optional. Everything is reversible. Rest counts.
      </div>
      <Button onClick={onFinish} size="lg" className="w-full gap-2">
        Open my planner <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
