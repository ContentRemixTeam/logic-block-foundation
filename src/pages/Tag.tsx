import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hash, ArrowLeft, FileText, CalendarIcon, CheckSquare, Lightbulb, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TagPageItem {
  id?: string;
  day_id?: string;
  date?: string;
  title?: string;
  scratch_pad_title?: string | null;
  scratch_pad_content?: string;
  content?: string;
  updated_at?: string;
  status?: string;
}

interface TagItemsResponse {
  tag: string;
  totalCount: number;
  pages: TagPageItem[];
  entries: TagPageItem[];
  tasks: TagPageItem[];
  ideas: TagPageItem[];
}

const preview = (s: string | undefined, n = 140) => {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
};

export default function Tag() {
  const { tag: rawTag = '' } = useParams();
  const navigate = useNavigate();
  const tagKey = decodeURIComponent(rawTag).replace(/^#/, '').toLowerCase();

  const { data, isLoading, error } = useQuery<TagItemsResponse>({
    queryKey: ['tag-items', tagKey],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await supabase.functions.invoke('get-tag-items', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { tag: tagKey },
      });
      if (res.error) throw res.error;
      return res.data as TagItemsResponse;
    },
    enabled: !!tagKey,
  });

  const groups = useMemo(() => ({
    pages: data?.pages ?? [],
    entries: data?.entries ?? [],
    tasks: data?.tasks ?? [],
    ideas: data?.ideas ?? [],
  }), [data]);

  const total = data?.totalCount ?? 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 pb-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2 flex-wrap">
            <Hash className="h-7 w-7 text-primary" />
            <span>{tagKey}</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Loading…' : `${total} item${total === 1 ? '' : 's'} tagged with #${tagKey}`}
          </p>
        </div>

        {error && (
          <Card><CardContent className="py-6 text-sm text-destructive">Couldn't load this tag. Please try again.</CardContent></Card>
        )}

        {!isLoading && total === 0 && (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <Hash className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="font-medium">Nothing tagged with #{tagKey} yet</h3>
              <p className="text-sm text-muted-foreground">
                Add <span className="font-mono">#{tagKey}</span> to a page, daily entry, task, or idea to see it here.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/notes">Go to Notes</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pages */}
        {groups.pages.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" /> Pages
              <Badge variant="secondary" className="text-xs">{groups.pages.length}</Badge>
            </h2>
            <div className="space-y-2">
              {groups.pages.map((p: any) => (
                <Link key={p.id} to={`/notes?pageId=${p.id}`} className="block">
                  <Card className="hover:shadow-sm active:bg-muted/50 transition">
                    <CardContent className="py-3">
                      <div className="font-medium text-sm truncate">{p.title || 'Untitled Page'}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{preview(p.content)}</div>
                      {p.updated_at && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Updated {format(parseISO(p.updated_at), 'MMM d, yyyy')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Daily entries */}
        {groups.entries.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" /> Daily Entries
              <Badge variant="secondary" className="text-xs">{groups.entries.length}</Badge>
            </h2>
            <div className="space-y-2">
              {groups.entries.map((e: any) => (
                <Link key={e.day_id} to={`/daily-plan?date=${e.date}`} className="block">
                  <Card className="hover:shadow-sm active:bg-muted/50 transition">
                    <CardContent className="py-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {e.date ? format(parseISO(e.date), 'EEEE, MMM d, yyyy') : ''}
                      </div>
                      {e.scratch_pad_title && (
                        <div className="font-medium text-sm mt-1 truncate">{e.scratch_pad_title}</div>
                      )}
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1 whitespace-pre-wrap">
                        {preview(e.scratch_pad_content, 180)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tasks */}
        {groups.tasks.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <CheckSquare className="h-4 w-4" /> Tasks
              <Badge variant="secondary" className="text-xs">{groups.tasks.length}</Badge>
            </h2>
            <div className="space-y-2">
              {groups.tasks.map((t: any) => (
                <Link key={t.id} to={`/tasks?taskId=${t.id}`} className="block">
                  <Card className="hover:shadow-sm active:bg-muted/50 transition">
                    <CardContent className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{t.title || 'Untitled task'}</div>
                        {t.due_date && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Due {format(parseISO(t.due_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                      {t.status && (
                        <Badge variant="outline" className="text-[10px] uppercase">{t.status}</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Ideas */}
        {groups.ideas.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Lightbulb className="h-4 w-4" /> Ideas
              <Badge variant="secondary" className="text-xs">{groups.ideas.length}</Badge>
            </h2>
            <div className="space-y-2">
              {groups.ideas.map((i: any) => (
                <Link key={i.id} to={`/ideas?ideaId=${i.id}`} className="block">
                  <Card className="hover:shadow-sm active:bg-muted/50 transition">
                    <CardContent className="py-3">
                      <div className="font-medium text-sm truncate">{i.title || 'Untitled idea'}</div>
                      {i.content && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{preview(i.content)}</div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
