import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useEvidenceBank, EvidenceCategory } from '@/hooks/useEvidenceBank';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES: { id: EvidenceCategory; label: string; emoji: string }[] = [
  { id: 'win', label: 'Win', emoji: '🏆' },
  { id: 'learning', label: 'Learning', emoji: '💡' },
  { id: 'proof', label: 'Proof', emoji: '✅' },
  { id: 'pride', label: 'Pride', emoji: '✨' },
];

interface Props {
  source?: string;
  dayId?: string | null;
  className?: string;
}

/**
 * Compact "Today's Evidence" capture card for the daily plan.
 * Adds a single entry to the Evidence Bank.
 */
export function EvidenceQuickAdd({ source = 'daily_plan', dayId, className }: Props) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<EvidenceCategory>('win');
  const { entries, add, isAdding } = useEvidenceBank({ limit: 3, sinceDate: new Date().toISOString().slice(0, 10) });
  const { toast } = useToast();

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      await add({ content: trimmed, category, source, day_id: dayId ?? null });
      setContent('');
      toast({ title: 'Saved to Evidence Bank', description: 'Future-you will thank you.' });
    } catch (err: any) {
      toast({
        title: 'Could not save',
        description: err?.message ?? 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Evidence Bank</h3>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <Link to="/evidence">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          What moved forward today? What did you learn? What's evidence this is working?
        </p>

        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`text-[11px] rounded-full px-2 py-0.5 border transition-colors ${
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
                handleSave();
              }
            }}
            placeholder="One sentence of proof…"
            disabled={isAdding}
            maxLength={500}
          />
          <Button onClick={handleSave} disabled={isAdding || !content.trim()} size="sm">
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {entries.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {entries.map(e => (
              <div key={e.id} className="text-xs flex items-start gap-2 text-muted-foreground">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 shrink-0">
                  {CATEGORIES.find(c => c.id === e.category)?.emoji ?? '•'}
                </Badge>
                <span className="flex-1 text-foreground/80">{e.content}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
