import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useMoneyMovesTracker } from '@/hooks/useMoneyMovesTracker';
import { postDiagnostic, postAllDone, postSale } from '@/lib/moneyMovesPosts';
import { MONEY_MOVES_COMMUNITY_URL } from '@/constants/moneyMovesConfig';

export function CommunityPostsPanel() {
  const { tracker, update } = useMoneyMovesTracker();
  if (!tracker) return null;

  const allDone = tracker.actions.length > 0 && tracker.actions.every(a => a.completed);

  const posts: Array<{ key: string; title: string; text: string; visible: boolean }> = [
    {
      key: 'diagnostic',
      title: 'Day 1: Commit publicly',
      text: postDiagnostic(tracker),
      visible: true,
    },
    {
      key: 'all_done',
      title: 'Wrap-up: I did the move',
      text: postAllDone(tracker),
      visible: allDone,
    },
    {
      key: 'sale',
      title: 'It worked: I got a result',
      text: postSale(tracker),
      visible: tracker.sale_logged,
    },
  ];

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    if (key === 'diagnostic') {
      update.mutate({
        community_posts: { ...tracker.community_posts, diagnostic_shared: true },
      });
    }
    toast.success('Copied to clipboard.');
  };

  return (
    <Card className="editorial-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl text-foreground">Community posts</h3>
          <p className="text-sm text-muted-foreground">Copy. Paste. Get cheered on.</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <a href={MONEY_MOVES_COMMUNITY_URL} target="_blank" rel="noreferrer">
            Open community
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      <div className="space-y-3">
        {posts.filter(p => p.visible).map(p => (
          <div key={p.key} className="rounded-lg border border-border p-4 space-y-2 bg-muted/20">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.title}</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{p.text}</p>
            <Button size="sm" variant="outline" onClick={() => copy(p.text, p.key)}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
