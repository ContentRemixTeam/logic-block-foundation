import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { useTaskMutations } from '@/hooks/useTasks';
import { useMastermindAI, parseAIJson } from '@/hooks/useMastermindAI';
import { toast } from 'sonner';

interface Move {
  title: string;
  why: string;
  energy: 'low' | 'medium' | 'high';
  estimated_minutes: number;
}
interface CoachOutput { reflection: string; next_moves: Move[] }

/**
 * Weekly Focus Coach (Mastermind only).
 * Reviews the user's 90-day goal, the current week's planned tasks, and energy data,
 * then suggests the simplest next moves. Suggestions are previewed; the user explicitly
 * approves before any task is created. Nothing is silently edited.
 */
export function WeeklyFocusCoach() {
  const { user } = useAuth();
  const { data: cycle } = useActiveCycle();
  const { createTask } = useTaskMutations();
  const ai = useMastermindAI();
  const [output, setOutput] = useState<CoachOutput | null>(null);
  const [approved, setApproved] = useState<Set<number>>(new Set());

  const run = async () => {
    if (!user) return;
    setOutput(null);
    setApproved(new Set());

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const [tasksRes, energyRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('task_text, status, priority, energy_level, scheduled_date, estimated_minutes')
        .eq('user_id', user.id)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .limit(80),
      supabase
        .from('tasks')
        .select('energy_level, status')
        .eq('user_id', user.id)
        .gte('updated_at', format(weekStart, 'yyyy-MM-dd'))
        .limit(200),
    ]);

    const weekTasks = tasksRes.data || [];
    const energyCounts = (energyRes.data || []).reduce<Record<string, number>>((acc, t) => {
      const k = t.energy_level || 'unknown'; acc[k] = (acc[k] || 0) + 1; return acc;
    }, {});

    const context = {
      ninety_day_goal: cycle?.goal || null,
      focus_area: cycle?.focus_area || null,
      biggest_bottleneck: cycle?.biggest_bottleneck || null,
      week: { start: format(weekStart, 'yyyy-MM-dd'), end: format(weekEnd, 'yyyy-MM-dd') },
      planned_tasks: weekTasks.slice(0, 60),
      energy_distribution_recent: energyCounts,
    };

    const res = await ai.mutateAsync({
      messages: [
        { role: 'system', content: 'You are a calm weekly focus coach for a solopreneur. Given the 90-day goal, this week\'s planned tasks, and energy mix, write a 2-sentence reflection and 3-5 SIMPLE next moves that compound toward the goal. Bias toward smaller, lower-energy actions when energy data is light. Reply ONLY as JSON: {"reflection": string, "next_moves":[{"title":string,"why":string,"energy":"low"|"medium"|"high","estimated_minutes":number}]}.' },
        { role: 'user', content: JSON.stringify(context) },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });
    const parsed = parseAIJson<CoachOutput>(res.content);
    if (!parsed?.next_moves) { toast.error('Could not parse coach response.'); return; }
    setOutput(parsed);
  };

  useEffect(() => { setOutput(null); }, [cycle?.cycle_id]);

  const toggle = (i: number) => {
    const next = new Set(approved);
    if (next.has(i)) next.delete(i); else next.add(i);
    setApproved(next);
  };

  const addApproved = async () => {
    if (!output) return;
    let added = 0;
    for (const i of approved) {
      const m = output.next_moves[i];
      if (!m) continue;
      await createTask.mutateAsync({
        task_text: m.title,
        energy_level: m.energy === 'low' ? 'low_energy' : m.energy === 'high' ? 'high_focus' : 'medium',
        estimated_minutes: m.estimated_minutes || 15,
        status: 'backlog',
        priority: 'medium',
      });
      added++;
    }
    toast.success(`Added ${added} task${added === 1 ? '' : 's'}`);
    setApproved(new Set());
  };

  const energyDot = (e: Move['energy']) =>
    e === 'low' ? 'bg-green-500' : e === 'high' ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Weekly Focus Coach
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mastermind-only. Suggestions are previewed — nothing saves until you approve.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={ai.isPending}>
          {ai.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Thinking…</> : output ? 'Regenerate' : 'Coach my week'}
        </Button>
      </div>

      {!output && !ai.isPending && (
        <p className="text-sm text-muted-foreground">
          {cycle?.goal ? <>Goal: <span className="text-foreground">{cycle.goal}</span></> : 'Set a 90-day goal to get richer suggestions.'}
        </p>
      )}

      {output && (
        <div className="space-y-3">
          <p className="text-sm bg-muted/40 rounded-md p-3 italic">{output.reflection}</p>
          <div className="space-y-2">
            {output.next_moves.map((m, i) => (
              <div key={i} className="rounded-lg border border-border bg-card/40 p-3 flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 rounded-full ${energyDot(m.energy)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.why}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] h-4">{m.energy}</Badge>
                    <span className="text-[10px] text-muted-foreground">~{m.estimated_minutes}m</span>
                  </div>
                </div>
                <Button
                  size="sm" variant={approved.has(i) ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => toggle(i)}
                >
                  {approved.has(i) ? <><Check className="h-3 w-3 mr-1" />Approved</> : <><X className="h-3 w-3 mr-1" />Skip</>}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={addApproved} disabled={approved.size === 0 || createTask.isPending}>
              Add {approved.size} approved task{approved.size === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
