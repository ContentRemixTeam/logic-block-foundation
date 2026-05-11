import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useOpenLoops,
  useOpenLoopActions,
  OPEN_LOOP_BUCKETS,
  type OpenLoopBucket,
  type OpenLoopItem,
} from '@/hooks/useOpenLoops';
import { useProjects } from '@/hooks/useProjects';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Inbox, RefreshCw, MoreHorizontal, ExternalLink, Calendar, ListPlus, Archive, FolderInput } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OpenLoops() {
  const { data, isLoading, refetch, isFetching } = useOpenLoops();
  const actions = useOpenLoopActions();
  const projectsQuery = useProjects();
  const [activeBucket, setActiveBucket] = useState<OpenLoopBucket | 'all'>('all');

  const items = data?.items || [];
  const bucketCounts = data?.bucketCounts;
  const total = items.length;

  const visibleBuckets = useMemo(
    () => (activeBucket === 'all' ? OPEN_LOOP_BUCKETS : OPEN_LOOP_BUCKETS.filter((b) => b.bucket === activeBucket)),
    [activeBucket],
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Inbox className="h-7 w-7 text-primary" />
              Open Loops
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Your weekly command center. Every loose thread, in one calm place.
              Decide what to <em>Do</em>, <em>Decide</em>, <em>Defer</em>, <em>Delete</em>, or <em>Ask for Support</em> on.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </header>

        {/* Bucket pills */}
        <div className="flex flex-wrap gap-2">
          <Pill
            active={activeBucket === 'all'}
            onClick={() => setActiveBucket('all')}
            label={`All · ${total}`}
          />
          {OPEN_LOOP_BUCKETS.map((b) => (
            <Pill
              key={b.bucket}
              active={activeBucket === b.bucket}
              onClick={() => setActiveBucket(b.bucket)}
              label={`${b.emoji} ${b.label} · ${bucketCounts?.[b.bucket] || 0}`}
            />
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : total === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {visibleBuckets.map((b) => {
              const groupItems = items.filter((i) => i.bucket === b.bucket);
              if (groupItems.length === 0) {
                return activeBucket === 'all' ? null : (
                  <BucketEmpty key={b.bucket} bucket={b} />
                );
              }
              return (
                <section key={b.bucket}>
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <span>{b.emoji}</span>
                      <span>{b.label}</span>
                      <Badge variant="secondary" className="ml-1">{groupItems.length}</Badge>
                    </h2>
                    <span className="text-xs text-muted-foreground">{b.description}</span>
                  </div>
                  <div className="space-y-2">
                    {groupItems.map((it) => (
                      <LoopRow
                        key={it.id}
                        item={it}
                        accent={b.tone}
                        projects={projectsQuery.data || []}
                        onSchedule={(when) => actions.schedule.mutate({ item: it, when })}
                        onConvert={() => actions.convertToTask.mutate(it)}
                        onArchive={() => actions.archive.mutate(it)}
                        onLinkProject={(projectId) => actions.linkToProject.mutate({ item: it, projectId })}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background hover:bg-muted border-border text-foreground',
      )}
    >
      {label}
    </button>
  );
}

interface LoopRowProps {
  item: OpenLoopItem;
  accent: string;
  projects: { id: string; name: string }[];
  onSchedule: (when: 'today' | 'tomorrow' | 'next_week') => void;
  onConvert: () => void;
  onArchive: () => void;
  onLinkProject: (projectId: string) => void;
}

function LoopRow({ item, accent, projects, onSchedule, onConvert, onArchive, onLinkProject }: LoopRowProps) {
  const canConvert = item.sourceTable !== 'tasks' && item.sourceTable !== 'projects';
  const canLinkProject = ['tasks', 'ideas', 'journal_pages', 'content_items'].includes(item.sourceTable);

  return (
    <Card className={cn('p-4 border-l-4 hover:bg-muted/40 transition-colors', accent)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="secondary" className="text-xs">{item.badgeLabel}</Badge>
            {item.created_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="font-medium break-words">{item.title}</p>
          {item.subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 break-words">{item.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Open">
            <Link to={item.link}><ExternalLink className="h-4 w-4" /></Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Schedule</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onSchedule('today')}>
                <Calendar className="h-4 w-4 mr-2" /> Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSchedule('tomorrow')}>
                <Calendar className="h-4 w-4 mr-2" /> Tomorrow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSchedule('next_week')}>
                <Calendar className="h-4 w-4 mr-2" /> Next week
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {canConvert && (
                <DropdownMenuItem onClick={onConvert}>
                  <ListPlus className="h-4 w-4 mr-2" /> Convert to task
                </DropdownMenuItem>
              )}

              {canLinkProject && projects.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="h-4 w-4 mr-2" /> Link to project
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                    {projects.map((p) => (
                      <DropdownMenuItem key={p.id} onClick={() => onLinkProject(p.id)}>
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive} className="text-destructive focus:text-destructive">
                <Archive className="h-4 w-4 mr-2" /> Archive / dismiss
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

function BucketEmpty({ bucket }: { bucket: typeof OPEN_LOOP_BUCKETS[number] }) {
  return (
    <Card className="p-8 text-center text-muted-foreground">
      <div className="text-3xl mb-2">{bucket.emoji}</div>
      <p className="font-medium text-foreground">{bucket.label} is clear</p>
      <p className="text-sm mt-1">{bucket.description}</p>
    </Card>
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
