import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useLaunches } from '@/hooks/useLaunches';
import { useProjects } from '@/hooks/useProjects';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Rocket, FolderKanban, FileText, ListChecks, Sparkles,
  ExternalLink, DollarSign, Target, Pencil, ArrowRight,
} from 'lucide-react';
import type { Offer } from '@/hooks/useOffers';

interface Props {
  offer: Offer | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (o: Offer) => void;
}

export function OfferDetailSheet({ offer, open, onOpenChange, onEdit }: Props) {
  const { user } = useAuth();
  const { launches = [] } = useLaunches();
  const { data: projects = [] } = useProjects();
  const { tasks: allTasks = [] } = useTasks({ loadAll: true, enabled: !!offer && open }) as any;

  const launch = useMemo(
    () => launches.find((l: any) => l.id === offer?.launch_id),
    [launches, offer?.launch_id],
  );
  const project = useMemo(
    () => projects.find((p) => p.id === offer?.project_id),
    [projects, offer?.project_id],
  );

  // Content items linked by offer name, launch_id, or project_id
  const { data: content = [] } = useQuery({
    queryKey: ['offer-content', offer?.id, user?.id],
    enabled: !!offer && !!user?.id && open,
    queryFn: async () => {
      if (!offer) return [];
      const filters: string[] = [];
      filters.push(`offer.eq.${offer.name}`);
      if (offer.launch_id) filters.push(`launch_id.eq.${offer.launch_id}`);
      if (offer.project_id) filters.push(`project_id.eq.${offer.project_id}`);
      const { data, error } = await supabase
        .from('content_items')
        .select('id,title,status,scheduled_date,platform,offer,launch_id,project_id')
        .or(filters.join(','))
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const relatedTasks = useMemo(() => {
    if (!offer) return [];
    return (allTasks as any[]).filter((t) => {
      if (offer.launch_id && t.launch_id === offer.launch_id) return true;
      if (offer.project_id && t.project_id === offer.project_id) return true;
      return false;
    });
  }, [allTasks, offer]);

  const openTasks = relatedTasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
  const doneTasks = relatedTasks.filter((t) => t.status === 'done');

  const nextBestAction = useMemo(() => {
    if (!offer) return null;
    if (!offer.launch_id) {
      return { label: 'Plan a launch or promo for this offer', to: '/launch-planner' };
    }
    const overdue = openTasks.find(
      (t) => t.scheduled_date && new Date(t.scheduled_date) < new Date(new Date().toDateString()),
    );
    if (overdue) return { label: `Catch up: ${overdue.task_text}`, to: '/tasks' };
    const next = openTasks
      .filter((t) => t.scheduled_date)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
    if (next) return { label: `Next: ${next.task_text}`, to: '/tasks' };
    if (content.filter((c: any) => !c.scheduled_date).length > 0) {
      return { label: 'Schedule the content drafts you have', to: '/editorial-calendar' };
    }
    if (openTasks.length === 0) {
      return { label: 'Add the next task to move this offer forward', to: '/tasks' };
    }
    return { label: 'Schedule your open tasks', to: '/tasks' };
  }, [offer, openTasks, content]);

  if (!offer) return null;

  const Section = ({
    icon: Icon, title, count, children,
  }: { icon: any; title: string; count: number; children: React.ReactNode }) => (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
          <Badge variant="secondary" className="ml-1">{count}</Badge>
        </div>
      </div>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground italic pl-6">Nothing connected yet.</p>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </section>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-xl">{offer.name}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="outline" className="capitalize">{offer.status}</Badge>
                {offer.offer_type && <Badge variant="secondary">{offer.offer_type}</Badge>}
                {offer.price != null && (
                  <span className="text-xs inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {offer.currency || 'USD'} {Number(offer.price).toLocaleString()}
                  </span>
                )}
              </SheetDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => onEdit(offer)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </div>
          {offer.description && (
            <p className="text-sm text-muted-foreground pt-1">{offer.description}</p>
          )}
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {nextBestAction && (
            <Link
              to={nextBestAction.to}
              onClick={() => onOpenChange(false)}
              className="block rounded-lg border bg-primary/5 hover:bg-primary/10 transition p-4"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary mb-1">
                <Sparkles className="h-3.5 w-3.5" /> Next best action
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{nextBestAction.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          )}

          {(offer.revenue_goal != null || offer.url) && (
            <div className="grid grid-cols-2 gap-3">
              {offer.revenue_goal != null && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> Revenue goal
                  </div>
                  <div className="text-base font-semibold mt-1">
                    {offer.currency || 'USD'} {Number(offer.revenue_goal).toLocaleString()}
                  </div>
                </div>
              )}
              {offer.url && (
                <a
                  href={offer.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border p-3 hover:bg-muted/40 transition"
                >
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Sales page
                  </div>
                  <div className="text-sm font-medium mt-1 truncate text-primary">{offer.url}</div>
                </a>
              )}
            </div>
          )}

          <Separator />

          <Section icon={Rocket} title="Launches & promos" count={launch ? 1 : 0}>
            {launch && (
              <Link
                to="/launch-planner"
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <span>{(launch as any).name || (launch as any).title}</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {(launch as any).status || 'planning'}
                </Badge>
              </Link>
            )}
          </Section>

          <Section icon={FolderKanban} title="Projects" count={project ? 1 : 0}>
            {project && (
              <Link
                to={`/projects?id=${project.id}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <span>{project.name}</span>
                <Badge variant="outline" className="text-xs">{project.status || 'active'}</Badge>
              </Link>
            )}
          </Section>

          <Section icon={FileText} title="Content" count={content.length}>
            {content.slice(0, 8).map((c: any) => (
              <Link
                key={c.id}
                to="/editorial-calendar"
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <span className="truncate">{c.title || 'Untitled'}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {c.scheduled_date
                    ? new Date(c.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : 'unscheduled'}
                </span>
              </Link>
            ))}
            {content.length > 8 && (
              <p className="text-xs text-muted-foreground pl-2">+ {content.length - 8} more</p>
            )}
          </Section>

          <Section icon={ListChecks} title="Tasks" count={relatedTasks.length}>
            <div className="text-xs text-muted-foreground pl-2 mb-1">
              {openTasks.length} open · {doneTasks.length} done
            </div>
            {openTasks.slice(0, 8).map((t: any) => (
              <Link
                key={t.task_id}
                to="/tasks"
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <span className="truncate">{t.task_text}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {t.scheduled_date
                    ? new Date(t.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : '—'}
                </span>
              </Link>
            ))}
            {openTasks.length > 8 && (
              <p className="text-xs text-muted-foreground pl-2">+ {openTasks.length - 8} more open</p>
            )}
          </Section>

          {offer.notes && (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offer.notes}</p>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
