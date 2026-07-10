import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { EnergySelector } from '@/components/battery/EnergySelector';
import { useBareMinimumTemplate, type BareMinimumTemplateItem } from '@/hooks/useBareMinimum';

function makeId() {
  return `bm-${Math.random().toString(36).slice(2, 9)}`;
}

export function BareMinimumTemplateSection() {
  const { items, save, isLoading } = useBareMinimumTemplate();
  const [draft, setDraft] = useState<BareMinimumTemplateItem[]>([]);

  useEffect(() => {
    setDraft(items);
  }, [items]);

  const update = (next: BareMinimumTemplateItem[]) => {
    setDraft(next);
    void save(next);
  };

  const addRow = () => {
    if (draft.length >= 3) return;
    update([...draft, { id: makeId(), text: '', energy_cost: null }]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bare Minimum template</CardTitle>
        <CardDescription>
          The 1–3 tiny non-negotiables that make a day count. These appear at the top of your daily plan every day —
          you can turn each one into a task with one tap, or leave them as reminders. Nothing is auto-scheduled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {draft.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground italic">
            Nothing set yet. Try something like "Check messages" or "One sales action".
          </p>
        )}

        {draft.map((item, i) => (
          <div key={item.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={item.text}
                onChange={(e) => {
                  const next = [...draft];
                  next[i] = { ...item, text: e.target.value };
                  setDraft(next);
                }}
                onBlur={() => save(draft)}
                placeholder="e.g. Check messages"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => update(draft.filter((_, j) => j !== i))}
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EnergySelector
              value={item.energy_cost ?? null}
              onChange={(v) => {
                const next = [...draft];
                next[i] = { ...item, energy_cost: (v as BareMinimumTemplateItem['energy_cost']) ?? null };
                update(next);
              }}
            />
          </div>
        ))}

        {draft.length < 3 && (
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add item ({draft.length}/3)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
