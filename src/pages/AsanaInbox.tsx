import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, RefreshCw, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AsanaTaskRow {
  task_id: string;
  task_text: string;
  task_description: string | null;
  external_url: string | null;
  external_updated_at: string | null;
  due_date: string | null;
  tags: unknown;
  status: string | null;
}

export default function AsanaInbox() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<AsanaTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ inserted: number; updated: number; total: number } | null>(null);

  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const checkAdmin = async () => {
      if (!user) {
        if (!cancelled) setIsAllowed(false);
        return;
      }
      const { data, error } = await supabase.rpc('is_admin', { check_user_id: user.id });
      if (!cancelled) setIsAllowed(!error && data === true);
    };
    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('task_id, task_text, task_description, external_url, external_updated_at, due_date, tags, status')
      .eq('external_source', 'asana')
      .order('external_updated_at', { ascending: false })
      .limit(200);
    if (error) {
      toast.error('Failed to load Asana tasks');
      console.error(error);
    } else {
      setTasks((data ?? []) as AsanaTaskRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAllowed) load();
  }, [isAllowed]);

  if (authLoading || isAllowed === null) return null;
  if (!isAllowed) return <Navigate to="/" replace />;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-asana-tasks', { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const result = data as { total: number; inserted: number; updated: number };
      setLastSync(result);
      toast.success(`Synced ${result.total} tasks (${result.inserted} new, ${result.updated} updated)`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Asana Inbox</h1>
          <p className="text-muted-foreground mt-1">
            Private bridge — incomplete tasks assigned to you in Asana.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      {lastSync && (
        <Card>
          <CardContent className="py-3 text-sm text-muted-foreground">
            Last sync: {lastSync.total} tasks • {lastSync.inserted} new • {lastSync.updated} updated
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No Asana tasks yet</p>
            <p className="text-sm text-muted-foreground">Hit “Sync now” to pull from Asana.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const tagList = Array.isArray(t.tags) ? (t.tags as string[]).filter(Boolean) : [];
            return (
              <Card key={t.task_id} className="editorial-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-start justify-between gap-3">
                    <span>{t.task_text}</span>
                    {t.external_url && (
                      <a
                        href={t.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground shrink-0"
                        aria-label="Open in Asana"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {t.task_description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {t.task_description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 items-center text-xs">
                    {t.due_date && (
                      <Badge variant="outline">Due {format(new Date(t.due_date), 'MMM d')}</Badge>
                    )}
                    {tagList.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                    {t.external_updated_at && (
                      <span className="text-muted-foreground ml-auto">
                        Updated {format(new Date(t.external_updated_at), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
