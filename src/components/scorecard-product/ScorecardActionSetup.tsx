import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Link2, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  type ScorecardAction,
  type ScorecardCadence,
  useOptionalActiveCycle,
  useScorecardActions,
} from '@/hooks/useScorecardProduct';

const DAYS = [
  { value: 1, short: 'M', label: 'Monday' },
  { value: 2, short: 'T', label: 'Tuesday' },
  { value: 3, short: 'W', label: 'Wednesday' },
  { value: 4, short: 'T', label: 'Thursday' },
  { value: 5, short: 'F', label: 'Friday' },
  { value: 6, short: 'S', label: 'Saturday' },
  { value: 7, short: 'S', label: 'Sunday' },
] as const;

interface DraftAction {
  id?: string;
  text: string;
  category: string;
  cadence: ScorecardCadence;
  days: number[];
}

const EMPTY_DRAFT: DraftAction = {
  text: '',
  category: '',
  cadence: 'daily',
  days: [1, 2, 3, 4, 5],
};

function describeDays(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join(',') === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join(',') === '1,2,3,4,5,6,7') return 'Every day';
  return sorted.map(day => DAYS.find(option => option.value === day)?.label.slice(0, 3)).join(', ');
}

export function ScorecardActionSetup() {
  const { actions, isLoading, saveAction, archiveAction } = useScorecardActions();
  const { data: activeCycle } = useOptionalActiveCycle();
  const [draft, setDraft] = useState<DraftAction>(EMPTY_DRAFT);
  const [showForm, setShowForm] = useState(actions.length === 0);

  const title = useMemo(() => draft.id ? 'Edit your action' : 'Add an action', [draft.id]);

  const toggleDay = (day: number) => {
    setDraft(current => {
      const selected = current.days.includes(day);
      if (selected && current.days.length === 1) return current;
      return {
        ...current,
        days: selected ? current.days.filter(value => value !== day) : [...current.days, day].sort(),
      };
    });
  };

  const beginEdit = (action: ScorecardAction) => {
    setDraft({
      id: action.id,
      text: action.action_text,
      category: action.category ?? '',
      cadence: action.cadence,
      days: action.scheduled_days,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setShowForm(false);
  };

  const handleSave = async () => {
    const text = draft.text.trim();
    if (!text) {
      toast.error('Add the action you want to track.');
      return;
    }

    try {
      await saveAction.mutateAsync({
        id: draft.id,
        action_text: text,
        category: draft.category,
        cadence: draft.cadence,
        scheduled_days: draft.days,
        cycle_id: activeCycle?.cycle_id ?? null,
        sort_order: draft.id
          ? actions.find(action => action.id === draft.id)?.sort_order
          : actions.length,
      });
      toast.success(draft.id ? 'Action updated.' : 'Action added to your week.');
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('That action did not save. Please try again.');
    }
  };

  const handleRemove = async (action: ScorecardAction) => {
    try {
      await archiveAction.mutateAsync(action.id);
      toast.success(`Removed “${action.action_text}” from future weeks.`);
      if (draft.id === action.id) resetForm();
    } catch (error) {
      console.error(error);
      toast.error('That action could not be removed.');
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B8891E]">Set my week</p>
        <h1 className="mt-1 font-['Bebas_Neue'] text-5xl leading-[0.95] tracking-wide sm:text-6xl">
          Decide What Counts
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#4A4A4A]">
          Add the actions that move your business forward, then choose exactly which days you want to do them.
        </p>
      </section>

      {activeCycle && (
        <section className="flex items-start gap-3 border-2 border-[#111111] bg-[#FFF0F5] p-4">
          <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C8145E]" />
          <div>
            <p className="text-sm font-bold">Connected to your 90-day plan</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">{activeCycle.goal}</p>
          </div>
        </section>
      )}

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-2 border-[#111111] bg-white p-5 sm:p-7"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-['Bebas_Neue'] text-3xl tracking-wide">{title}</h2>
              <button
                type="button"
                onClick={resetForm}
                className="grid h-11 w-11 place-items-center hover:bg-[#F7F5F2]"
                aria-label="Close action form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]">What will you do?</span>
                <input
                  value={draft.text}
                  onChange={event => setDraft(current => ({ ...current, text: event.target.value }))}
                  maxLength={160}
                  placeholder="Example: Follow up with 5 warm leads"
                  className="min-h-12 w-full border-2 border-[#111111] bg-white px-4 text-base outline-none transition-shadow focus:shadow-[4px_4px_0_#C8145E]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]">Category <span className="font-normal normal-case tracking-normal text-[#777]">(optional)</span></span>
                <input
                  value={draft.category}
                  onChange={event => setDraft(current => ({ ...current, category: event.target.value }))}
                  maxLength={60}
                  placeholder="Sales, content, visibility…"
                  className="min-h-12 w-full border-2 border-[#111111] bg-white px-4 text-base outline-none transition-shadow focus:shadow-[4px_4px_0_#C8145E]"
                />
              </label>

              <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-[0.16em]">How do you think about it?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['daily', 'weekly'] as const).map(cadence => (
                    <button
                      key={cadence}
                      type="button"
                      onClick={() => setDraft(current => ({
                        ...current,
                        cadence,
                        days: cadence === 'weekly' && current.cadence !== cadence ? [1] : current.days,
                      }))}
                      className={cn(
                        'min-h-12 border-2 border-[#111111] px-3 text-sm font-bold capitalize',
                        draft.cadence === cadence ? 'bg-[#111111] text-white' : 'bg-white hover:bg-[#F7F5F2]',
                      )}
                    >
                      {cadence}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-xs font-bold uppercase tracking-[0.16em]">Which days?</legend>
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {DAYS.map(day => {
                    const selected = draft.days.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        aria-label={day.label}
                        aria-pressed={selected}
                        className={cn(
                          'aspect-square min-h-11 border-2 border-[#111111] text-sm font-black transition-transform active:scale-95',
                          selected ? 'bg-[#C8145E] text-white' : 'bg-white hover:bg-[#FFF0F5]',
                        )}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saveAction.isPending}
                className="flex min-h-12 w-full items-center justify-center gap-2 border-2 border-[#111111] bg-[#C8145E] px-5 font-bold text-white shadow-[4px_4px_0_#111111] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                <Check className="h-5 w-5" />
                {saveAction.isPending ? 'Saving…' : draft.id ? 'Save changes' : 'Add to my scorecard'}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 border-2 border-dashed border-[#111111] bg-white px-5 font-bold transition-colors hover:bg-[#FFF0F5]"
        >
          <Plus className="h-5 w-5 text-[#C8145E]" />
          Add another action
        </button>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8891E]">Your repeatable week</p>
            <h2 className="font-['Bebas_Neue'] text-3xl tracking-wide">{actions.length} {actions.length === 1 ? 'Action' : 'Actions'}</h2>
          </div>
          <Target className="h-6 w-6 text-[#C8145E]" />
        </div>

        {isLoading ? (
          <div className="h-28 animate-pulse border-2 border-[#111111]/20 bg-white" />
        ) : actions.length === 0 ? (
          <div className="border-2 border-[#111111] bg-[#FFF7D8] p-6 text-center">
            <p className="font-bold">Your scorecard is blank on purpose.</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">Start with 3–5 actions you can actually repeat.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map(action => (
              <motion.article
                layout
                key={action.id}
                className="flex items-center gap-3 border-2 border-[#111111] bg-white p-4"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center bg-[#FFF0F5] font-['Bebas_Neue'] text-xl text-[#C8145E]">
                  {action.scheduled_days.length}×
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-5">{action.action_text}</p>
                  <p className="mt-1 text-xs text-[#666]">
                    {action.category ? `${action.category} · ` : ''}{describeDays(action.scheduled_days)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => beginEdit(action)}
                  className="grid h-11 w-11 shrink-0 place-items-center hover:bg-[#F7F5F2]"
                  aria-label={`Edit ${action.action_text}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove(action)}
                  className="grid h-11 w-11 shrink-0 place-items-center text-[#777] hover:bg-red-50 hover:text-red-700"
                  aria-label={`Remove ${action.action_text}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
