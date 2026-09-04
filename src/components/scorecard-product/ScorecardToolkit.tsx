import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import {
  BatteryLow,
  Beaker,
  BrainCircuit,
  ClipboardCopy,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalActiveCycle, useScorecardWeek } from '@/hooks/useScorecardProduct';
import { buildScorecardBrief, copyScorecardText } from './scorecardBrief';

type BatteryLevel = 'low' | 'steady' | 'full';
type OutcomeSignal = 'yes' | 'no' | 'too-soon';

interface ToolkitNotes {
  win: string;
  heavy: string;
  decision: string;
  experiment: string;
  experimentMetric: string;
  experimentAction: string;
  experimentReviewDate: string;
}

const defaultNotes = (): ToolkitNotes => ({
  win: '',
  heavy: '',
  decision: '',
  experiment: '',
  experimentMetric: '',
  experimentAction: '',
  experimentReviewDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
});

function CopyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 border-2 border-[#111111] bg-[#111111] px-4 text-sm font-bold text-white shadow-[4px_4px_0_#C8145E] transition-transform hover:-translate-y-0.5"
    >
      <ClipboardCopy className="h-4 w-4" />
      {label}
    </button>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em]">{label}</span>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-y border-2 border-[#111111] bg-white px-3 py-3 text-sm outline-none transition-shadow focus:shadow-[3px_3px_0_#C8145E]"
      />
    </label>
  );
}

export function ScorecardToolkit() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const { tasks, selectedWeek, isLoading } = useScorecardWeek(today);
  const { data: activeCycle } = useOptionalActiveCycle();
  const [battery, setBattery] = useState<BatteryLevel>('steady');
  const [outcome, setOutcome] = useState<OutcomeSignal>('too-soon');
  const storageKey = `scorecard-toolkit:${user?.id ?? 'guest'}:${selectedWeek}`;
  const [notes, setNotes] = useState<ToolkitNotes>(() => defaultNotes());

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      setNotes(saved ? { ...defaultNotes(), ...JSON.parse(saved) } : defaultNotes());
    } catch {
      setNotes(defaultNotes());
    }
  }, [storageKey]);

  useEffect(() => {
    if (!user) return;
    window.localStorage.setItem(storageKey, JSON.stringify(notes));
  }, [notes, storageKey, user]);

  const completed = tasks.filter(task => task.is_completed).length;
  const total = tasks.length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  const brief = buildScorecardBrief(tasks, selectedWeek, activeCycle?.goal);

  const diagnostic = useMemo(() => {
    if (!total) return {
      title: 'Set up your Scorecard first',
      copy: 'We need one real week of actions before we can tell whether execution or strategy needs attention.',
    };
    if (percentage < 70) return {
      title: 'Consistency needs attention first',
      copy: `You completed ${percentage}% of the actions you planned. Make the plan lighter or the actions smaller before changing the strategy.`,
    };
    if (outcome === 'no') return {
      title: 'This may be a strategy problem',
      copy: `You followed through on ${percentage}% of the plan without seeing the signal you wanted. Keep the execution data and test the offer, message, audience, or sales path next.`,
    };
    if (outcome === 'yes') return {
      title: 'Keep the strategy and repeat it',
      copy: `You followed through on ${percentage}% of the plan and saw movement. Protect the actions that worked instead of rebuilding everything.`,
    };
    return {
      title: 'Keep collecting evidence',
      copy: `You followed through on ${percentage}% of the plan. If the result needs more time, keep the test stable long enough to learn from it.`,
    };
  }, [outcome, percentage, total]);

  const copy = async (text: string, success: string) => {
    try {
      await copyScorecardText(text);
      toast.success(success);
    } catch {
      toast.error('Your browser blocked copying. Please select and copy the text manually.');
    }
  };

  const resetPrompt = `${brief}\n\nWEEKLY CEO RESET\nBiggest win: ${notes.win || '[add your win]'}\nWhat felt heavy: ${notes.heavy || '[add what felt heavy]'}\nDecision for next week: ${notes.decision || '[add the decision you need to make]'}\n\nAct as a clear, practical CEO coach. Help me identify what worked, what to stop carrying, and the three highest-leverage actions for next week. Do not give me a giant list.`;
  const incomplete = tasks.filter(task => !task.is_completed).map(task => `- ${task.task_text}`).join('\n') || '- Nothing unfinished';
  const batteryPrompt = `${brief}\n\nLOW BATTERY WEEK BUILDER\nMy capacity next week is: ${battery}.\nUnfinished actions:\n${incomplete}\n\nBuild a realistic week that protects revenue and current commitments. Tell me what to keep, shrink, move, or drop. Give me no more than three priorities and explain what can safely wait.`;
  const experimentPrompt = `${brief}\n\n30-DAY BUSINESS EXPERIMENT\nHypothesis: ${notes.experiment || '[what do you think will happen?]'}\nMetric: ${notes.experimentMetric || '[what number will tell you?]'}\nRepeatable action: ${notes.experimentAction || '[what will you do consistently?]'}\nReview date: ${notes.experimentReviewDate}\n\nTurn this into one clean 30-day experiment. Define the weekly actions, what not to change during the test, the smallest useful sample size, and the decision rule for the review date.`;
  const diagnosticPrompt = `${brief}\n\nCONSISTENCY OR STRATEGY DIAGNOSTIC\nDesired result showed movement: ${outcome}.\nCurrent read: ${diagnostic.title}. ${diagnostic.copy}\n\nHelp me diagnose this using only the evidence above. Separate execution problems from offer, message, audience, and sales-process problems. Give me the single next test you recommend and what evidence would confirm it.`;

  if (isLoading) return <div className="h-72 animate-pulse border-2 border-[#111111]/20 bg-white" />;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B8891E]">Built from your real week</p>
        <h1 className="mt-1 font-['Bebas_Neue'] text-5xl leading-[0.95] tracking-wide sm:text-6xl">CEO Reset Toolkit</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#4A4A4A]">
          Turn your Scorecard into a useful brief, then paste it into Claude or ChatGPT for focused help—without giving an AI access to your account.
        </p>
      </section>

      <section className="grid grid-cols-3 border-2 border-[#111111] bg-white text-center">
        <div className="p-4"><strong className="block font-['Bebas_Neue'] text-3xl text-[#C8145E]">{percentage}%</strong><span className="text-xs font-bold uppercase">Follow-through</span></div>
        <div className="border-x-2 border-[#111111] p-4"><strong className="block font-['Bebas_Neue'] text-3xl">{completed}</strong><span className="text-xs font-bold uppercase">Done</span></div>
        <div className="p-4"><strong className="block font-['Bebas_Neue'] text-3xl">{total - completed}</strong><span className="text-xs font-bold uppercase">Open</span></div>
      </section>

      <section className="border-2 border-[#111111] bg-[#FFF0F5] p-5 shadow-[5px_5px_0_#111111] sm:p-7">
        <div className="flex items-start gap-3">
          <RotateCcw className="mt-1 h-6 w-6 shrink-0 text-[#C8145E]" />
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B8891E]">Tool 1</p><h2 className="font-['Bebas_Neue'] text-3xl tracking-wide">Weekly CEO Reset</h2></div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="What worked?" value={notes.win} onChange={value => setNotes(current => ({ ...current, win: value }))} placeholder="The action or decision that created movement…" />
          <Field label="What felt heavy?" value={notes.heavy} onChange={value => setNotes(current => ({ ...current, heavy: value }))} placeholder="What took too much energy or kept slipping…" />
          <Field label="What needs a decision?" value={notes.decision} onChange={value => setNotes(current => ({ ...current, decision: value }))} placeholder="The one decision that would make next week easier…" />
        </div>
        <CopyButton label="Copy my CEO Reset" onClick={() => void copy(resetPrompt, 'CEO Reset copied.')} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="border-2 border-[#111111] bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3"><BatteryLow className="mt-1 h-6 w-6 text-[#C8145E]" /><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B8891E]">Tool 2</p><h2 className="font-['Bebas_Neue'] text-3xl tracking-wide">Low Battery Week Builder</h2></div></div>
          <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">Give next week a job it can actually finish.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(['low', 'steady', 'full'] as const).map(level => (
              <button key={level} type="button" onClick={() => setBattery(level)} className={cn('min-h-11 border-2 border-[#111111] text-sm font-bold capitalize', battery === level ? 'bg-[#C8145E] text-white' : 'bg-white')}>{level}</button>
            ))}
          </div>
          <CopyButton label="Copy my low-battery brief" onClick={() => void copy(batteryPrompt, 'Low-battery brief copied.')} />
        </article>

        <article className="border-2 border-[#111111] bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3"><BrainCircuit className="mt-1 h-6 w-6 text-[#C8145E]" /><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B8891E]">Tool 3</p><h2 className="font-['Bebas_Neue'] text-3xl tracking-wide">Consistency or Strategy?</h2></div></div>
          <p className="mt-3 text-sm font-bold">Did the result you wanted show movement?</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([['yes', 'Yes'], ['no', 'No'], ['too-soon', 'Too soon']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setOutcome(value)} className={cn('min-h-11 border-2 border-[#111111] text-sm font-bold', outcome === value ? 'bg-[#111111] text-white' : 'bg-white')}>{label}</button>
            ))}
          </div>
          <div className="mt-4 border-l-4 border-[#C8145E] bg-[#F7F5F2] p-4"><p className="font-bold">{diagnostic.title}</p><p className="mt-1 text-sm leading-6 text-[#4A4A4A]">{diagnostic.copy}</p></div>
          <CopyButton label="Copy my diagnostic" onClick={() => void copy(diagnosticPrompt, 'Diagnostic copied.')} />
        </article>
      </section>

      <section className="border-2 border-[#111111] bg-[#FFF7D8] p-5 sm:p-7">
        <div className="flex items-start gap-3"><Beaker className="mt-1 h-6 w-6 text-[#B8891E]" /><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B8891E]">Tool 4</p><h2 className="font-['Bebas_Neue'] text-3xl tracking-wide">30-Day Business Experiment</h2></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Hypothesis" value={notes.experiment} onChange={value => setNotes(current => ({ ...current, experiment: value }))} placeholder="If I do X, I expect Y…" />
          <Field label="Success number" value={notes.experimentMetric} onChange={value => setNotes(current => ({ ...current, experimentMetric: value }))} placeholder="Example: 10 sales-page visits each weekday…" />
          <Field label="Repeatable action" value={notes.experimentAction} onChange={value => setNotes(current => ({ ...current, experimentAction: value }))} placeholder="The action that belongs on your Scorecard…" />
        </div>
        <label className="mt-4 block max-w-xs"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em]">Review date</span><input type="date" value={notes.experimentReviewDate} onChange={event => setNotes(current => ({ ...current, experimentReviewDate: event.target.value }))} className="min-h-12 w-full border-2 border-[#111111] bg-white px-3" /></label>
        <CopyButton label="Copy my 30-day experiment" onClick={() => void copy(experimentPrompt, 'Experiment brief copied.')} />
      </section>

      <section className="flex items-start gap-3 border-2 border-[#111111] bg-white p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#C8145E]" />
        <div><p className="font-bold">Your Scorecard is the evidence.</p><p className="mt-1 text-sm leading-6 text-[#4A4A4A]">These tools use the work you actually scheduled and checked off. Your 90-day goal is included automatically when you have one.</p></div>
      </section>
    </div>
  );
}
