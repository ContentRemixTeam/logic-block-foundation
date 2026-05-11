import { useEffect, useMemo, useState } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, Target, ShieldCheck, HeartPulse, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useMastermindAI, parseAIJson } from '@/hooks/useMastermindAI';

type MVP = { commitment_1: string; commitment_2: string; commitment_3: string };

const EMPTY_MVP: MVP = { commitment_1: '', commitment_2: '', commitment_3: '' };

export function WeeklyTradeoffPanel() {
  const { user } = useAuth();
  const ai = useMastermindAI();

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekEnd = useMemo(() => endOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekStartISO = format(weekStart, 'yyyy-MM-dd');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekId, setWeekId] = useState<string | null>(null);

  const [outcome, setOutcome] = useState('');
  const [mvp, setMvp] = useState<MVP>(EMPTY_MVP);
  const [lifeHappens, setLifeHappens] = useState('');
  const [capacityHours, setCapacityHours] = useState<string>('');
  const [plannedMinutes, setPlannedMinutes] = useState(0);

  // Load
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: week } = await supabase
        .from('weekly_plans')
        .select('week_id, weekly_outcome, minimum_viable_week, life_happens_plan, weekly_capacity_planned_minutes')
        .eq('user_id', user.id)
        .eq('start_of_week', weekStartISO)
        .maybeSingle();

      if (week) {
        setWeekId(week.week_id);
        setOutcome(week.weekly_outcome ?? '');
        setLifeHappens(week.life_happens_plan ?? '');
        setCapacityHours(
          week.weekly_capacity_planned_minutes != null
            ? String(Math.round((week.weekly_capacity_planned_minutes / 60) * 10) / 10)
            : ''
        );
        const m = (week.minimum_viable_week as MVP | null) ?? EMPTY_MVP;
        setMvp({
          commitment_1: m.commitment_1 ?? '',
          commitment_2: m.commitment_2 ?? '',
          commitment_3: m.commitment_3 ?? '',
        });
      }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('estimated_minutes,scheduled_date,status')
        .eq('user_id', user.id)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .neq('status', 'done');

      const total = (tasks ?? []).reduce((s, t: any) => s + (t.estimated_minutes ?? 0), 0);
      setPlannedMinutes(total);
      setLoading(false);
    })();
  }, [user, weekStartISO, weekStart, weekEnd]);

  const capacityMin = Number(capacityHours) > 0 ? Number(capacityHours) * 60 : 0;
  const pct = capacityMin > 0 ? Math.min(150, Math.round((plannedMinutes / capacityMin) * 100)) : 0;
  const over = capacityMin > 0 && plannedMinutes > capacityMin;

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const minutes = Number(capacityHours) > 0 ? Math.round(Number(capacityHours) * 60) : null;
    const payload = {
      user_id: user.id,
      start_of_week: weekStartISO,
      weekly_outcome: outcome || null,
      minimum_viable_week: mvp,
      life_happens_plan: lifeHappens || null,
      weekly_capacity_planned_minutes: minutes,
    };

    const { data, error } = weekId
      ? await supabase.from('weekly_plans').update(payload).eq('week_id', weekId).select('week_id').maybeSingle()
      : await supabase.from('weekly_plans').insert(payload).select('week_id').maybeSingle();

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.week_id) setWeekId(data.week_id);
    toast.success('Weekly tradeoff saved');
  };

  const rewriteRealistic = async () => {
    const res = await ai.mutateAsync({
      messages: [
        {
          role: 'system',
          content:
            'You are a calm planning coach. The user is over capacity. Suggest a REALISTIC week. Reply ONLY with JSON: {"weekly_outcome": string, "commitment_1": string, "commitment_2": string, "commitment_3": string, "life_happens_plan": string, "rationale": string}. Keep each field <= 140 chars. Be honest and protective of energy.',
        },
        {
          role: 'user',
          content: `Current outcome: ${outcome || '(none)'}\nMVP: ${JSON.stringify(mvp)}\nLife happens plan: ${lifeHappens || '(none)'}\nPlanned minutes: ${plannedMinutes}\nCapacity minutes: ${capacityMin || 'unset'}\n\nReturn the JSON now.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 600,
    });
    const parsed = parseAIJson<{
      weekly_outcome: string;
      commitment_1: string;
      commitment_2: string;
      commitment_3: string;
      life_happens_plan: string;
      rationale?: string;
    }>(res.content);
    if (!parsed) {
      toast.error('Could not parse AI response.');
      return;
    }
    setOutcome(parsed.weekly_outcome ?? outcome);
    setMvp({
      commitment_1: parsed.commitment_1 ?? mvp.commitment_1,
      commitment_2: parsed.commitment_2 ?? mvp.commitment_2,
      commitment_3: parsed.commitment_3 ?? mvp.commitment_3,
    });
    setLifeHappens(parsed.life_happens_plan ?? lifeHappens);
    toast.success('Suggestion applied — review and save');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading weekly tradeoff…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Weekly tradeoff
            </CardTitle>
            <CardDescription className="text-xs">
              One outcome. Three commitments. A life-happens plan. Pick the realistic week.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {over && (
              <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10">
                Over capacity
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={rewriteRealistic} disabled={ai.isPending}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {ai.isPending ? 'Rewriting…' : 'Rewrite to realistic'}
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">The one outcome that matters this week</Label>
          <Input
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
            placeholder="e.g. 50 new email subscribers from launch waitlist"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {(['commitment_1', 'commitment_2', 'commitment_3'] as const).map((k, i) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Commitment {i + 1}
              </Label>
              <Input
                value={mvp[k]}
                onChange={e => setMvp({ ...mvp, [k]: e.target.value })}
                placeholder={i === 0 ? 'Non-negotiable #1' : i === 1 ? 'Non-negotiable #2' : 'Non-negotiable #3'}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <HeartPulse className="h-3 w-3" /> Life-happens plan
            </Label>
            <Textarea
              rows={2}
              value={lifeHappens}
              onChange={e => setLifeHappens(e.target.value)}
              placeholder="If energy crashes / kid is sick / I get behind, I will…"
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Realistic capacity (hours / week)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={capacityHours}
              onChange={e => setCapacityHours(e.target.value)}
              placeholder="e.g. 20"
            />
            {capacityMin > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{(plannedMinutes / 60).toFixed(1)}h planned</span>
                  <span>{(capacityMin / 60).toFixed(1)}h capacity · {pct}%</span>
                </div>
                <Progress value={Math.min(100, pct)} className={over ? '[&>div]:bg-warning' : ''} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
