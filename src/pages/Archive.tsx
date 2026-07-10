import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Archive as ArchiveIcon, ArrowLeft, Search, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/system/EmptyState';
import { PageSkeleton } from '@/components/system/PageSkeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFreshStart } from '@/hooks/useFreshStart';

interface ArchivedTask {
  task_id: string;
  task_text: string;
  archived_at: string;
  scheduled_date: string | null;
  is_completed: boolean;
}

interface ArchivedPlan {
  day_id: string;
  date: string;
  archived_at: string;
}

export default function Archive() {
  const { user } = useAuth();
  const fresh = useFreshStart();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['archived-tasks', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ArchivedTask[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('task_id, task_text, archived_at, scheduled_date, is_completed')
        .eq('user_id', user!.id)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ArchivedTask[];
    },
  });

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['archived-plans', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ArchivedPlan[]> => {
      const { data, error } = await supabase
        .from('daily_plans')
        .select('day_id, date, archived_at')
        .eq('user_id', user!.id)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ArchivedPlan[];
    },
  });

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.task_text.toLowerCase().includes(q));
  }, [tasks, query]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const restoreOne = async (taskId: string) => {
    setBusy(true);
    try {
      await fresh.restoreTaskIds([taskId]);
      toast.success('Restored.');
    } catch {
      toast.error("Couldn't restore that — try again.");
    } finally {
      setBusy(false);
    }
  };

  const restoreSelected = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await fresh.restoreTaskIds(Array.from(selected));
      toast.success(`Restored ${selected.size} item${selected.size === 1 ? '' : 's'}.`);
      setSelected(new Set());
    } catch {
      toast.error("Couldn't restore — try again.");
    } finally {
      setBusy(false);
    }
  };

  const restorePlan = async (planId: string) => {
    setBusy(true);
    try {
      await fresh.restorePlanIds([planId]);
      toast.success('Plan restored.');
    } catch {
      toast.error("Couldn't restore that — try again.");
    } finally {
      setBusy(false);
    }
  };

  const isLoading = loadingTasks || loadingPlans;
  const isEmpty = !isLoading && tasks.length === 0 && plans.length === 0;

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton cards={4} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="sm" className="min-h-11">
              <Link to="/tasks">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Tasks
              </Link>
            </Button>
          </div>
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={restoreSelected}
              disabled={busy}
              className="min-h-11"
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Restore {selected.size}
            </Button>
          )}
        </div>

        <header className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Archive</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nothing here is deleted. Restore anything, anytime.
          </p>
        </header>

        {isEmpty ? (
          <AppCard>
            <AppCard.Body>
              <EmptyState
                icon={ArchiveIcon}
                title="Nothing tidied away."
                body="When you clean up your planner, archived items land here so you can restore them later."
                action={{ label: 'Back to tasks', href: '/tasks' }}
              />
            </AppCard.Body>
          </AppCard>
        ) : (
          <>
            {tasks.length > 0 && (
              <AppCard>
                <AppCard.Header>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-medium">Tasks</h2>
                      <p className="text-xs text-muted-foreground">
                        {tasks.length} archived
                      </p>
                    </div>
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                      <Input
                        type="search"
                        placeholder="Search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-8 h-9"
                        aria-label="Search archived tasks"
                      />
                    </div>
                  </div>
                </AppCard.Header>
                <AppCard.Body>
                  <ul className="divide-y divide-border/50">
                    {filteredTasks.map((t) => {
                      const isChecked = selected.has(t.task_id);
                      return (
                        <li
                          key={t.task_id}
                          className="flex items-center gap-3 py-2.5"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSelect(t.task_id)}
                            aria-label={`Select "${t.task_text}"`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{t.task_text}</p>
                            <p className="text-xs text-muted-foreground">
                              archived {format(parseISO(t.archived_at), 'MMM d')}
                              {t.scheduled_date && ` · from ${format(parseISO(t.scheduled_date), 'MMM d')}`}
                              {t.is_completed && ' · was complete'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => restoreOne(t.task_id)}
                            disabled={busy}
                            className="min-h-11 shrink-0"
                            aria-label={`Restore "${t.task_text}"`}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Restore
                          </Button>
                        </li>
                      );
                    })}
                    {filteredTasks.length === 0 && (
                      <li className="py-8 text-center text-sm text-muted-foreground">
                        Nothing matches "{query}".
                      </li>
                    )}
                  </ul>
                </AppCard.Body>
              </AppCard>
            )}

            {plans.length > 0 && (
              <AppCard>
                <AppCard.Header>
                  <div>
                    <h2 className="text-base font-medium">Past daily plans</h2>
                    <p className="text-xs text-muted-foreground">
                      {plans.length} archived
                    </p>
                  </div>
                </AppCard.Header>
                <AppCard.Body>
                  <ul className="divide-y divide-border/50">
                    {plans.map((p) => (
                      <li key={p.day_id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            {format(parseISO(p.date), 'EEEE, MMM d')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            archived {format(parseISO(p.archived_at), 'MMM d')}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => restorePlan(p.day_id)}
                          disabled={busy}
                          className="min-h-11 shrink-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Restore
                        </Button>
                      </li>
                    ))}
                  </ul>
                </AppCard.Body>
              </AppCard>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
