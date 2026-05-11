import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, HelpCircle, Plus, RotateCcw, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SupportItem {
  id: string;
  call_date: string;
  main_question: string | null;
  what_tried: string | null;
  blocking_thought: string | null;
  coaching_need: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export default function SupportQueue() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [resolving, setResolving] = useState<SupportItem | null>(null);
  const [note, setNote] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['support-queue', user?.id, filter],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from('coaching_call_prep')
        .select('id, call_date, main_question, what_tried, blocking_thought, coaching_need, is_resolved, resolved_at, resolution_note, created_at')
        .eq('user_id', user!.id)
        .not('main_question', 'is', null)
        .neq('main_question', '')
        .order('call_date', { ascending: false });
      if (filter === 'open') q = q.eq('is_resolved', false);
      if (filter === 'resolved') q = q.eq('is_resolved', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SupportItem[];
    },
  });

  const toggleResolved = useMutation({
    mutationFn: async ({ id, resolved, note }: { id: string; resolved: boolean; note?: string }) => {
      const { error } = await supabase
        .from('coaching_call_prep')
        .update({
          is_resolved: resolved,
          resolved_at: resolved ? new Date().toISOString() : null,
          resolution_note: resolved ? (note || null) : null,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-queue'] });
      qc.invalidateQueries({ queryKey: ['coaching-preps'] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update'),
  });

  const openResolve = (item: SupportItem) => {
    setResolving(item);
    setNote(item.resolution_note || '');
  };
  const confirmResolve = async () => {
    if (!resolving) return;
    await toggleResolved.mutateAsync({ id: resolving.id, resolved: true, note });
    setResolving(null);
    setNote('');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="Support Queue"
            description="Open questions you're holding for your coach, mastermind, or community."
          />
          <Button asChild className="gap-2">
            <Link to="/coach-prep"><Plus className="h-4 w-4" /> New question</Link>
          </Button>
        </div>

        <div className="flex gap-2">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24" /><Skeleton className="h-24" />
          </div>
        ) : data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MessageSquareQuestion className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">
                {filter === 'open' ? 'No open questions' : 'Nothing here'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Capture questions as they come up. Bring them to your next call instead of letting them get lost.
              </p>
              <Button asChild className="gap-2">
                <Link to="/coach-prep"><Plus className="h-4 w-4" /> Add a question</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <Card key={item.id} className={item.is_resolved ? 'opacity-70' : ''}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(item.call_date), 'MMM d, yyyy')}
                        {item.is_resolved && (
                          <Badge variant="secondary" className="ml-1">Resolved</Badge>
                        )}
                      </div>
                      <p className={`font-medium ${item.is_resolved ? 'line-through text-muted-foreground' : ''}`}>
                        {item.main_question}
                      </p>
                      {item.coaching_need && (
                        <p className="text-sm text-muted-foreground">Need: {item.coaching_need}</p>
                      )}
                      {item.is_resolved && item.resolution_note && (
                        <p className="text-sm bg-muted/50 rounded p-2 mt-2">
                          <span className="font-medium">Resolution:</span> {item.resolution_note}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {item.is_resolved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleResolved.mutate({ id: item.id, resolved: false })}
                          className="gap-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reopen
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => openResolve(item)} className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/coach-prep">Open</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as resolved</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{resolving?.main_question}</p>
              <Textarea
                placeholder="What was the answer? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolving(null)}>Cancel</Button>
              <Button onClick={confirmResolve}>Resolve</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
