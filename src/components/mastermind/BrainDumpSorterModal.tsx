import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMastermindAI, parseAIJson } from '@/hooks/useMastermindAI';
import { CATEGORY_CONFIG, type BrainDumpItem, type BrainDumpCategory } from '@/hooks/useBrainDump';
import { toast } from 'sonner';

const ALLOWED: BrainDumpCategory[] = ['task', 'idea', 'project', 'content', 'question', 'mindset', 'later', 'note'];

interface Props {
  items: BrainDumpItem[];               // unprocessed items to sort
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConvert: (item: BrainDumpItem, newCategory: BrainDumpCategory) => Promise<unknown> | void;
}

interface Row { item: BrainDumpItem; suggested: BrainDumpCategory; reason?: string; chosen: BrainDumpCategory; approve: boolean }

export function BrainDumpSorterModal({ items, open, onOpenChange, onConvert }: Props) {
  const ai = useMastermindAI();
  const [rows, setRows] = useState<Row[]>([]);
  const [applying, setApplying] = useState(false);

  const run = async () => {
    if (!items.length) return;
    setRows([]);
    const list = items.slice(0, 30); // safety cap
    const res = await ai.mutateAsync({
      messages: [
        { role: 'system', content: `You sort messy brain-dump notes into one of these categories: task, idea, project, content, question, mindset, later, note. Use "task" for actionable next steps, "project" for multi-step initiatives, "content" for content/post ideas, "question" for things to ask a coach/support, "mindset" for limiting beliefs or emotional blocks, "later" for someday/maybe, "idea" for raw ideas, "note" if unclear. Reply ONLY as JSON: {"items":[{"id":string,"category":string,"reason":string}]}.` },
        { role: 'user', content: JSON.stringify({ items: list.map(i => ({ id: i.id, text: i.text })) }) },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });
    const parsed = parseAIJson<{ items: { id: string; category: string; reason?: string }[] }>(res.content);
    if (!parsed?.items) { toast.error('Could not parse sorter response.'); return; }
    const map = new Map(parsed.items.map(p => [p.id, p]));
    setRows(list.map(item => {
      const sug = map.get(item.id);
      const cat = (ALLOWED.includes(sug?.category as BrainDumpCategory) ? sug!.category : 'note') as BrainDumpCategory;
      return { item, suggested: cat, reason: sug?.reason, chosen: cat, approve: cat !== item.category };
    }));
  };

  useEffect(() => {
    if (open && rows.length === 0 && !ai.isPending) run();
    if (!open) setRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const approveCount = rows.filter(r => r.approve).length;

  const apply = async () => {
    setApplying(true);
    try {
      let done = 0;
      for (const r of rows) {
        if (!r.approve || r.chosen === r.item.category) continue;
        await onConvert(r.item, r.chosen);
        done++;
      }
      toast.success(`Sorted ${done} item${done === 1 ? '' : 's'}`);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Sort failed');
    } finally { setApplying(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Brain Dump Sorter
          </DialogTitle>
          <DialogDescription>
            Review the AI's suggested categories. Nothing is saved until you approve.
          </DialogDescription>
        </DialogHeader>

        {ai.isPending && rows.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Sorting…
          </div>
        )}

        {rows.length > 0 && (
          <ScrollArea className="max-h-[55vh] pr-3">
            <ul className="space-y-2">
              {rows.map((r, idx) => (
                <li key={r.item.id} className="rounded-lg border border-border bg-card/40 p-3 space-y-2">
                  <div className="text-sm">{r.item.text}</div>
                  {r.reason && <div className="text-xs text-muted-foreground italic">{r.reason}</div>}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">From {CATEGORY_CONFIG[r.item.category].emoji} → </span>
                    <Select value={r.chosen} onValueChange={(v) => {
                      const next = [...rows]; next[idx] = { ...r, chosen: v as BrainDumpCategory, approve: true }; setRows(next);
                    }}>
                      <SelectTrigger className="h-7 w-auto min-w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALLOWED.map(c => (
                          <SelectItem key={c} value={c} className="text-xs">{CATEGORY_CONFIG[c].emoji} {CATEGORY_CONFIG[c].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm" variant={r.approve ? 'default' : 'outline'}
                      className="h-7 text-xs ml-auto"
                      onClick={() => { const next = [...rows]; next[idx] = { ...r, approve: !r.approve }; setRows(next); }}
                    >
                      {r.approve ? <><Check className="h-3 w-3 mr-1" /> Approved</> : 'Skip'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={apply} disabled={applying || approveCount === 0}>
            {applying ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Saving…</> : `Apply ${approveCount} change${approveCount === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
