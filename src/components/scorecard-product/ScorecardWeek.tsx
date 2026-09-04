import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, addWeeks, format, isSameWeek, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, ClipboardCopy, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTaskMutations } from '@/hooks/useTasks';
import { useOptionalActiveCycle, useScorecardActions, useScorecardWeek } from '@/hooks/useScorecardProduct';
import type { Task } from '@/components/tasks/types';
import { triggerCelebration } from '@/components/celebrations/CelebrationOverlay';
import { ScorecardProgress } from './ScorecardProgress';
import { ScorecardTaskRow } from './ScorecardTaskRow';
import { buildScorecardBrief, copyScorecardText } from './scorecardBrief';

export function ScorecardWeek() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const { actions } = useScorecardActions();
  const { data: activeCycle } = useOptionalActiveCycle();
  const { tasks, isLoading, refresh } = useScorecardWeek(selectedDate);
  const { toggleComplete } = useTaskMutations();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const completed = tasks.filter(task => task.is_completed).length;

  const handleCopyWeek = async () => {
    try {
      await copyScorecardText(buildScorecardBrief(tasks, format(weekStart, 'yyyy-MM-dd'), activeCycle?.goal));
      toast.success('Your week is ready to paste into Claude or ChatGPT.');
    } catch {
      toast.error('Your browser blocked copying.');
    }
  };

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateKey = format(date, 'yyyy-MM-dd');
    return {
      date,
      dateKey,
      tasks: tasks.filter(task => task.scheduled_date === dateKey || task.planned_day === dateKey),
    };
  }), [tasks, weekStart]);

  const handleToggle = async (task: Task) => {
    setPendingId(task.task_id);
    try {
      await toggleComplete.mutateAsync({ taskId: task.task_id });
      if (!task.is_completed) {
        const completesWeek = completed + 1 === tasks.length;
        triggerCelebration({
          type: completesWeek ? 'milestone' : 'task_complete',
          message: completesWeek ? 'You completed your whole Scorecard week. 🔥' : 'One more promise kept.',
        });
      }
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error('That check-off did not save.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B8891E]">Weekly view</p>
          <h1 className="mt-1 font-['Bebas_Neue'] text-5xl leading-[0.95] tracking-wide sm:text-6xl">See Your Follow-Through</h1>
          <p className="mt-3 text-base text-[#4A4A4A]">
            {format(weekStart, 'MMM d')}–{format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => void handleCopyWeek()}
            disabled={!tasks.length}
            className="flex min-h-11 items-center gap-2 border-2 border-[#111111] bg-white px-3 text-xs font-bold uppercase tracking-wide hover:bg-[#FFF0F5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ClipboardCopy className="h-4 w-4" />
            Copy my week
          </button>
          <div className="flex border-2 border-[#111111] bg-white">
            <button
              type="button"
              onClick={() => setSelectedDate(date => addWeeks(date, -1))}
              className="grid h-11 w-11 place-items-center border-r-2 border-[#111111] hover:bg-[#FFF0F5]"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="min-h-11 px-4 text-xs font-bold uppercase tracking-wide hover:bg-[#FFF0F5]"
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(date => addWeeks(date, 1))}
              className="grid h-11 w-11 place-items-center border-l-2 border-[#111111] hover:bg-[#FFF0F5]"
              aria-label="Next week"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <ScorecardProgress completed={completed} total={tasks.length} label={isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 }) ? 'This week' : 'Selected week'} />

      {isLoading ? (
        <div className="h-72 animate-pulse border-2 border-[#111111]/20 bg-white" />
      ) : actions.length === 0 ? (
        <div className="border-2 border-[#111111] bg-white p-7 text-center">
          <p className="font-bold">Choose what you want to track first.</p>
          <Link to="/scorecard/setup" className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-[#C8145E] underline underline-offset-4">
            <Settings2 className="h-4 w-4" />
            Set up my scorecard
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {days.map(day => {
            const dayCompleted = day.tasks.filter(task => task.is_completed).length;
            return (
              <section key={day.dateKey}>
                <div className="mb-2 flex items-center justify-between border-b-2 border-[#111111] pb-2">
                  <h2 className="font-['Bebas_Neue'] text-2xl tracking-wide">
                    {format(day.date, 'EEEE')} <span className="text-[#777]">{format(day.date, 'MMM d')}</span>
                  </h2>
                  {day.tasks.length > 0 && (
                    <span className="text-xs font-bold text-[#666]">{dayCompleted}/{day.tasks.length}</span>
                  )}
                </div>
                {day.tasks.length === 0 ? (
                  <p className="py-2 text-sm text-[#777]">Nothing scheduled.</p>
                ) : (
                  <div className="space-y-2">
                    {day.tasks.map(task => (
                      <ScorecardTaskRow
                        key={task.task_id}
                        task={task}
                        pending={pendingId === task.task_id}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
