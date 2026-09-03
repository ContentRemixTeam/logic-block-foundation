import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { useTaskMutations } from '@/hooks/useTasks';
import { useScorecardActions, useScorecardWeek } from '@/hooks/useScorecardProduct';
import type { Task } from '@/components/tasks/types';
import { triggerCelebration } from '@/components/celebrations/CelebrationOverlay';
import { ScorecardProgress } from './ScorecardProgress';
import { ScorecardTaskRow } from './ScorecardTaskRow';

export function ScorecardToday() {
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const { actions, isLoading: actionsLoading } = useScorecardActions();
  const { tasks, isLoading, refresh } = useScorecardWeek(today);
  const { toggleComplete } = useTaskMutations();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const todaysTasks = useMemo(
    () => tasks.filter(task => task.scheduled_date === todayKey || task.planned_day === todayKey),
    [tasks, todayKey],
  );
  const completedToday = todaysTasks.filter(task => task.is_completed).length;
  const completedWeek = tasks.filter(task => task.is_completed).length;

  const handleToggle = async (task: Task) => {
    setPendingId(task.task_id);
    try {
      await toggleComplete.mutateAsync({ taskId: task.task_id });
      if (!task.is_completed) {
        const completesDay = completedToday + 1 === todaysTasks.length;
        triggerCelebration({
          type: completesDay ? 'all_done' : 'task_complete',
          message: completesDay ? 'Today is complete. You did what mattered. 🎉' : 'Done counts.',
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

  if (isLoading || actionsLoading) {
    return <div className="h-72 animate-pulse border-2 border-[#111111]/20 bg-white" />;
  }

  if (actions.length === 0) {
    return (
      <section className="mx-auto max-w-xl border-2 border-[#111111] bg-white p-7 text-center shadow-[6px_6px_0_#C8145E] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8891E]">Your first week</p>
        <h1 className="mt-2 font-['Bebas_Neue'] text-5xl leading-none tracking-wide">Make Success Visible</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-[#4A4A4A]">
          Choose a few actions you want to repeat. Your Scorecard will turn them into a simple, satisfying week you can check off.
        </p>
        <Link
          to="/scorecard/setup"
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[#111111] bg-[#C8145E] px-6 font-bold text-white shadow-[4px_4px_0_#111111]"
        >
          Set up my scorecard
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B8891E]">
          {format(today, 'EEEE, MMMM d')}
        </p>
        <h1 className="mt-1 font-['Bebas_Neue'] text-5xl leading-[0.95] tracking-wide sm:text-6xl">Do What Counts Today</h1>
        <p className="mt-3 text-base text-[#4A4A4A]">No giant list. Just the promises you made to yourself.</p>
      </section>

      <ScorecardProgress completed={completedWeek} total={tasks.length} />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8891E]">Today</p>
            <h2 className="font-['Bebas_Neue'] text-3xl tracking-wide">
              {completedToday} of {todaysTasks.length} complete
            </h2>
          </div>
        </div>

        {todaysTasks.length === 0 ? (
          <div className="border-2 border-[#111111] bg-[#FFF7D8] p-6 text-center">
            <PartyPopper className="mx-auto h-7 w-7 text-[#B8891E]" />
            <p className="mt-3 font-bold">Nothing is scheduled on your Scorecard today.</p>
            <p className="mt-1 text-sm text-[#4A4A4A]">Enjoy the breathing room—or adjust your week whenever you want.</p>
            <Link to="/scorecard/setup" className="mt-4 inline-flex min-h-11 items-center font-bold text-[#C8145E] underline underline-offset-4">
              Adjust my days
            </Link>
          </div>
        ) : (
          todaysTasks.map(task => (
            <ScorecardTaskRow
              key={task.task_id}
              task={task}
              pending={pendingId === task.task_id}
              onToggle={handleToggle}
            />
          ))
        )}
      </section>
    </div>
  );
}
