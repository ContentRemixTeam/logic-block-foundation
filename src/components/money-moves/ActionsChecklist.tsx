import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMoneyMovesTracker, type TrackerAction } from '@/hooks/useMoneyMovesTracker';
import { postActionDone } from '@/lib/moneyMovesPosts';
import { celebrate } from '@/lib/celebrationService';

export function ActionsChecklist() {
  const { tracker, update } = useMoneyMovesTracker();
  if (!tracker) return null;

  const patch = (idx: number, p: Partial<TrackerAction>) => {
    const next = tracker.actions.map((a, i) => (i === idx ? { ...a, ...p } : a));
    update.mutate({ actions: next });
  };

  const toggle = (idx: number) => {
    const a = tracker.actions[idx];
    const wasDone = a.completed;
    const now = new Date().toISOString();
    const next = tracker.actions.map((x, i) =>
      i === idx
        ? { ...x, completed: !wasDone, completed_at: !wasDone ? now : null }
        : x,
    );
    const justAllDone = next.every(x => x.completed);
    update.mutate({
      actions: next,
      ...(justAllDone && !tracker.completed_at ? { completed_at: now } : {}),
    });
    if (!wasDone) {
      const completedCount = next.filter(x => x.completed).length;
      if (completedCount === 1) {
        celebrate?.('First action done. Action counts before confidence.');
      } else if (justAllDone) {
        celebrate?.('That rung is complete. Ready for the next honest step?');
      }
    }
  };

  const copyPost = (idx: number) => {
    const text = postActionDone(tracker, idx);
    navigator.clipboard.writeText(text);
    patch(idx, { community_post_copied: true });
    toast.success('Copied. Go put this where the group can cheer you on.');
  };

  return (
    <Card className="editorial-card p-6 space-y-5">
      <div>
        <h3 className="font-display text-2xl text-foreground">Your 3 sprint actions</h3>
        <p className="text-sm text-muted-foreground">Small. Honest. Doable this week.</p>
      </div>

      <div className="space-y-4">
        {tracker.actions.map((a, idx) => (
          <div
            key={a.id}
            className={`rounded-lg border p-4 transition-colors ${
              a.completed ? 'bg-muted/40 border-emerald-500/30' : 'border-border'
            }`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={a.completed}
                onCheckedChange={() => toggle(idx)}
                className="mt-1 h-5 w-5"
              />
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-medium ${a.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {a.label}
                  </p>
                  {a.due_date && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      by {new Date(a.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <Textarea
                  placeholder="Notes — what came up, what you learned..."
                  value={a.notes}
                  onChange={e => patch(idx, { notes: e.target.value })}
                  className="min-h-[60px] text-sm"
                />
                <Input
                  placeholder="Proof link (optional)"
                  value={a.proof_url}
                  onChange={e => patch(idx, { proof_url: e.target.value })}
                  className="text-sm"
                />
                {a.completed && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => copyPost(idx)}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy community post
                    </Button>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={a.community_post_shared}
                        onCheckedChange={(v) => {
                          const wasShared = a.community_post_shared;
                          patch(idx, { community_post_shared: !!v });
                          if (!wasShared && v) {
                            celebrate?.('You posted it. That makes it real.');
                          }
                        }}
                      />
                      <CheckCircle2 className="h-4 w-4" />
                      Posted in community
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
