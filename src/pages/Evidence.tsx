import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, Loader2, Trash2 } from 'lucide-react';
import { useEvidenceBank, EvidenceCategory } from '@/hooks/useEvidenceBank';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES: { id: EvidenceCategory; label: string; emoji: string }[] = [
  { id: 'win', label: 'Win', emoji: '🏆' },
  { id: 'learning', label: 'Learning', emoji: '💡' },
  { id: 'proof', label: 'Proof', emoji: '✅' },
  { id: 'pride', label: 'Pride', emoji: '✨' },
];

export default function Evidence() {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<EvidenceCategory>('win');
  const [filter, setFilter] = useState<EvidenceCategory | 'all'>('all');
  const { entries, isLoading, add, isAdding, remove } = useEvidenceBank({ limit: 200 });
  const { toast } = useToast();

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter(e => e.category === filter)),
    [entries, filter]
  );

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of filtered) {
      const list = map.get(e.entry_date) ?? [];
      list.push(e);
      map.set(e.entry_date, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await add({ content: content.trim(), category, source: 'evidence_page' });
      setContent('');
      toast({ title: 'Added to Evidence Bank' });
    } catch (err: any) {
      toast({ title: 'Could not save', description: err?.message, variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Evidence Bank
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Proof you're building something real. Wins, learnings, and small moments of pride.
            </p>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Badge>
        </div>

        {/* Composer */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                    category === c.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="What's the proof? Be specific."
                disabled={isAdding}
                maxLength={500}
              />
              <Button onClick={handleAdd} disabled={isAdding || !content.trim()}>
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs rounded-full px-2.5 py-1 border ${
              filter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-accent'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`text-xs rounded-full px-2.5 py-1 border ${
                filter === c.id ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-accent'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No entries yet. The first one is the hardest — try writing one tiny win above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  {format(parseISO(date), 'EEEE, MMM d, yyyy')}
                </h3>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {items.map(e => (
                      <div key={e.id} className="flex items-start gap-3 p-3 group">
                        <span className="text-lg leading-none mt-0.5">
                          {CATEGORIES.find(c => c.id === e.category)?.emoji ?? '•'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{e.content}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(e.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
