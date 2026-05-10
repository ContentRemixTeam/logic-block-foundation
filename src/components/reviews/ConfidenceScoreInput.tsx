import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  weekId: string | null;
  className?: string;
}

/**
 * 1–10 weekly confidence rating with light coaching nudge when low.
 * Persists directly to weekly_plans.confidence_score.
 */
export function ConfidenceScoreInput({ weekId, className }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!weekId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from('weekly_plans')
      .select('confidence_score')
      .eq('week_id', weekId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setScore(data?.confidence_score ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [weekId]);

  const persist = async (val: number) => {
    if (!weekId) return;
    setSaving(true);
    try {
      await supabase.from('weekly_plans').update({ confidence_score: val }).eq('week_id', weekId);
    } finally {
      setSaving(false);
    }
  };

  if (!weekId) return null;

  const display = score ?? 5;
  const isLow = score !== null && score <= 4;

  return (
    <div className={cn('space-y-2 pt-4 border-t', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">
          How confident are you in this plan? <span className="text-muted-foreground font-normal">(1–10)</span>
        </Label>
        <span className="text-sm font-mono text-foreground/80 min-w-[2ch] text-right">
          {loading ? '…' : score ?? '—'}
        </span>
      </div>
      <Slider
        value={[display]}
        min={1}
        max={10}
        step={1}
        onValueChange={(v) => setScore(v[0])}
        onValueCommit={(v) => persist(v[0])}
        disabled={loading}
      />
      {saving && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </p>
      )}
      {isLow && (
        <p className="text-xs text-warning flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Low confidence often means the scope is too big. Try cutting one priority or shrinking the smallest next step.
        </p>
      )}
    </div>
  );
}
