import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { PhaseOneResource } from '@/hooks/useMastermindPhaseOne';
import { PHASE_ONE_LESSONS } from '@/data/phaseOneCurriculum';

const SUGGESTIONS = ['I keep changing my focus', 'My plan is too big', 'I need people to find me', 'I need help selling'];

export function FindPhaseOneResources({ search, onOpenResource }: { search: (query: string) => Promise<PhaseOneResource[]>; onOpenResource: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PhaseOneResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) { requestId.current += 1; setResults([]); setError(null); setLoading(false); return; }
    const timer = window.setTimeout(() => {
      const currentRequest = ++requestId.current;
      setLoading(true); setError(null);
      void search(clean).then((next) => { if (currentRequest === requestId.current) setResults(next); }).catch(() => { if (currentRequest === requestId.current) setError('Search is temporarily unavailable. Your plan and progress are safe.'); }).finally(() => { if (currentRequest === requestId.current) setLoading(false); });
    }, 300);
    return () => { window.clearTimeout(timer); requestId.current += 1; };
  }, [query, search]);
  return <Card className="overflow-hidden border-amber-200 shadow-sm dark:border-amber-900"><CardHeader className="border-b bg-gradient-to-r from-amber-50 to-background dark:from-amber-950/20"><div className="flex items-center justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Search className="h-5 w-5" /></div><Badge variant="outline">Protected results only</Badge></div><CardTitle className="text-xl">Find What I Need</CardTitle><CardDescription>Search by the problem you have—not by remembering a lesson title.</CardDescription></CardHeader><CardContent className="space-y-4 p-5"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search Phase One resources" className="min-h-11 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try: I keep changing my focus" /></div><div className="flex flex-wrap gap-2">{SUGGESTIONS.map((suggestion) => <Button key={suggestion} type="button" size="sm" variant="outline" className="min-h-11 h-auto whitespace-normal text-left text-xs" onClick={() => setQuery(suggestion)}>{suggestion}</Button>)}</div><div className="rounded-xl bg-amber-50 px-3 py-2 text-sm" aria-live="polite">{loading ? 'Searching your available lessons…' : error ? error : query.trim().length < 2 ? 'Type a problem or tap an example.' : results.length ? `${results.length} useful match${results.length === 1 ? '' : 'es'}` : 'No strong match. Try different words or use Get Coached.'}</div><div className="space-y-3">{results.map((resource) => { const editorial = PHASE_ONE_LESSONS.find((item) => item.resourceId === resource.portal_resource_id); return <article key={resource.portal_resource_id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{resource.title}</h3>{resource.duration_seconds && <Badge variant="secondary">{Math.round(resource.duration_seconds / 60)} min</Badge>}</div>{editorial && <><p className="mt-2 text-sm text-muted-foreground">{editorial.whyRecommended}</p><div className="mt-3 rounded-xl bg-muted/30 p-3 text-sm"><p><strong>After:</strong> {editorial.afterWatchingAction}</p><p className="mt-1"><strong>Bring back:</strong> {editorial.evidenceTarget}</p></div></>}<Button className="mt-3 min-h-11 w-full" variant="outline" onClick={() => onOpenResource(resource.portal_resource_id)}>{resource.completed ? 'Watch again' : 'Open protected lesson'}</Button></article>; })}</div></CardContent></Card>;
}
