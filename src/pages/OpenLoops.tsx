import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOpenLoops, OPEN_LOOP_GROUPS, OpenLoopType } from '@/hooks/useOpenLoops';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Inbox, RefreshCw } from 'lucide-react';

export default function OpenLoops() {
  const { data, isLoading, refetch, isFetching } = useOpenLoops();
  const [active, setActive] = useState<OpenLoopType | 'all'>('all');

  const items = data?.items || [];
  const counts = data?.counts;
  const total = items.length;

  const filtered = useMemo(
    () => (active === 'all' ? items : items.filter((i) => i.type === active)),
    [active, items],
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="h-7 w-7 text-primary" />
            Open Loops
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Everything in your business that's waiting on a decision, a date, or a next step. Close the loop, move it forward, or send it to someday.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <Chip
          label={`All (${total})`}
          active={active === 'all'}
          onClick={() => setActive('all')}
        />
        {OPEN_LOOP_GROUPS.map((g) => {
          const c = counts?.[g.type] || 0;
          if (c === 0) return null;
          return (
            <Chip
              key={g.type}
              label={`${g.emoji} ${g.label} (${c})`}
              active={active === g.type}
              onClick={() => setActive(g.type)}
            />
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState />
      ) : active === 'all' ? (
        <GroupedList items={items} />
      ) : (
        <FlatList items={filtered} />
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background hover:bg-muted border-border text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

function GroupedList({ items }: { items: ReturnType<typeof useOpenLoops>['data'] extends infer D ? D extends { items: infer I } ? I : never : never }) {
  return (
    <div className="space-y-6">
      {OPEN_LOOP_GROUPS.map((g) => {
        const groupItems = (items as any[]).filter((i) => i.type === g.type);
        if (groupItems.length === 0) return null;
        return (
          <section key={g.type}>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-lg font-semibold">
                {g.emoji} {g.label}
                <span className="text-muted-foreground font-normal ml-2">{groupItems.length}</span>
              </h2>
              <span className="text-xs text-muted-foreground">{g.description}</span>
            </div>
            <FlatList items={groupItems as any} />
          </section>
        );
      })}
    </div>
  );
}

function FlatList({ items }: { items: any[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link to={item.link} key={item.id}>
          <Card className="p-4 hover:bg-muted/50 transition-colors flex items-start justify-between gap-4 group">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  {item.badgeLabel}
                </Badge>
                {item.created_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="font-medium truncate">{item.title}</p>
              {item.subtitle && (
                <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
          </Card>
        </Link>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="text-5xl mb-3">🎯</div>
      <h2 className="text-xl font-semibold mb-1">No open loops</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Everything has a date, a project, or a next action. This is what a clean planner feels like.
      </p>
    </Card>
  );
}
