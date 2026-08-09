import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Clock, ListFilter, PlayCircle, RotateCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCompactTime } from './replayVaultCore.mjs';
import { normalizeBrowse, normalizeCategories, normalizeQuestions, normalizeSaved } from './replayVaultLibraryCore.mjs';
import type { PlaybackTarget } from './types';

type Surface = 'browse' | 'questions' | 'saved';
type LoadState = 'loading' | 'ready' | 'empty' | 'error';
type Category = { category: string; resourceCount: number };
type BrowseItem = { resourceId: string; title: string; category: string; durationSeconds: number | null; publishedAt: string | null; questionCount: number };
type QuestionItem = { questionId: string; resourceId: string; title: string; category: string; question: string; answerSummary: string; answerer: string | null; startSeconds: number };
type SavedItem = { bookmarkId: string; resourceId: string; title: string; category: string; targetKind: 'replay' | 'moment' | 'question'; targetId: string; startSeconds: number | null; label: string };
type LibraryItem = BrowseItem | QuestionItem | SavedItem;

export function VaultLibrarySurfaces({ onOpen }: { onOpen: (target: PlaybackTarget) => void }) {
  const [surface, setSurface] = useState<Surface>('browse');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [receipt, setReceipt] = useState('');

  const loadSurface = useCallback(async () => {
    setLoadState('loading');
    setReceipt('');
    try {
      let nextItems: LibraryItem[] | null = null;
      if (surface === 'browse') {
        const [browseResult, categoryResult] = await Promise.all([
          supabase.functions.invoke('vault-member-library', { body: { action: 'browse', category, offset: 0, limit: 20 } }),
          supabase.functions.invoke('vault-member-library', { body: { action: 'categories' } }),
        ]);
        const rows = browseResult.error ? null : normalizeBrowse(browseResult.data) as BrowseItem[] | null;
        const nextCategories = categoryResult.error ? null : normalizeCategories(categoryResult.data) as Category[] | null;
        if (!rows || !nextCategories) {
          setLoadState('error');
          return;
        }
        nextItems = rows;
        setCategories(nextCategories);
      } else if (surface === 'questions') {
        const result = await supabase.functions.invoke('vault-member-library', { body: { action: 'questions', offset: 0, limit: 40 } });
        nextItems = result.error ? null : normalizeQuestions(result.data) as QuestionItem[] | null;
      } else {
        const result = await supabase.functions.invoke('vault-member-library', { body: { action: 'saved', filter, offset: 0, limit: 40 } });
        nextItems = result.error ? null : normalizeSaved(result.data) as SavedItem[] | null;
      }
      if (!nextItems) {
        setLoadState('error');
        return;
      }
      setItems(nextItems);
      setLoadState(nextItems.length ? 'ready' : 'empty');
    } catch {
      setLoadState('error');
    }
  }, [category, filter, surface]);

  useEffect(() => { void loadSurface(); }, [loadSurface]);

  const saveReplay = async (resourceId: string) => {
    setBusy(resourceId);
    setReceipt('');
    try {
      const { data, error } = await supabase.functions.invoke('vault-member-interactions', {
        body: { action: 'set_bookmark', resourceId, targetKind: 'replay', saved: true },
      });
      const confirmed = !error && data?.data?.saved === true && data.data.resourceId === resourceId && data.data.targetKind === 'replay';
      setReceipt(confirmed ? 'Full replay saved. It is now in Saved videos.' : 'Could not confirm this save. Nothing was reported as saved.');
    } catch {
      setReceipt('Could not confirm this save. Nothing was reported as saved.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (bookmarkId: string) => {
    setBusy(bookmarkId);
    setReceipt('');
    try {
      const { data, error } = await supabase.functions.invoke('vault-member-interactions', { body: { action: 'delete_bookmark', bookmarkId } });
      const confirmed = !error && data?.data?.deleted === true && data.data.bookmarkId === bookmarkId;
      if (confirmed) {
        setItems((current) => current.filter((item) => !('bookmarkId' in item) || item.bookmarkId !== bookmarkId));
        setReceipt('Removed everywhere from Saved.');
      } else {
        setReceipt('Remove could not be confirmed. The item remains visible.');
      }
    } catch {
      setReceipt('Remove could not be confirmed. The item remains visible.');
    } finally {
      setBusy(null);
    }
  };

  const emptyMessage = surface === 'saved'
    ? 'Nothing saved in this filter yet.'
    : surface === 'questions'
      ? 'No approved questions are available yet.'
      : 'No approved replays are available in this category yet.';

  return (
    <section aria-labelledby="vault-library-heading" className="space-y-4" data-vault-library>
      <div>
        <h2 id="vault-library-heading" className="text-xl font-semibold">Explore your Replay Vault</h2>
        <p className="text-sm text-muted-foreground">Only replays and answers approved for your membership appear here.</p>
      </div>
      <nav aria-label="Replay Vault sections" className="grid grid-cols-3 gap-2">
        {(['browse', 'questions', 'saved'] as Surface[]).map((item) => (
          <Button key={item} type="button" variant={surface === item ? 'default' : 'outline'} className="min-h-11 min-w-0 px-2 capitalize" aria-current={surface === item ? 'page' : undefined} onClick={() => setSurface(item)}>{item}</Button>
        ))}
      </nav>
      {surface === 'browse' && categories.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Browse categories">
          <Button type="button" variant={!category ? 'secondary' : 'outline'} className="min-h-11" onClick={() => setCategory(null)}>Recent Calls</Button>
          {categories.map((item) => <Button key={item.category} type="button" variant={category === item.category ? 'secondary' : 'outline'} className="min-h-11" onClick={() => setCategory(item.category)}>{item.category} ({item.resourceCount})</Button>)}
        </div>
      )}
      {surface === 'saved' && (
        <div className="flex flex-wrap gap-2" aria-label="Saved filters">
          <ListFilter className="h-5 w-5 self-center" aria-hidden="true" />
          {['all', 'videos', 'moments'].map((item) => <Button key={item} type="button" variant={filter === item ? 'secondary' : 'outline'} className="min-h-11 capitalize" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</Button>)}
        </div>
      )}
      {loadState === 'loading' && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Loading authorized {surface}…</p>}
      {loadState === 'error' && (
        <div role="alert" className="space-y-2 rounded-md border p-3">
          <p className="text-sm">This section is temporarily unavailable. Your access has not changed.</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => void loadSurface()}>Try again</Button>
        </div>
      )}
      {loadState === 'empty' && <p role="status" className="rounded-md border p-3 text-sm text-muted-foreground">{emptyMessage}</p>}
      {loadState === 'ready' && surface === 'browse' && (
        <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
          {(items as BrowseItem[]).map((item) => (
            <li key={item.resourceId}>
              <Card className="h-full min-w-0"><CardHeader><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.category}</Badge>{item.publishedAt && <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" aria-hidden="true" />Recent</Badge>}</div><CardTitle className="break-words text-lg">{item.title}</CardTitle><CardDescription>{item.questionCount} approved question{item.questionCount === 1 ? '' : 's'} · {formatCompactTime(item.durationSeconds)}</CardDescription></CardHeader><CardContent><Button type="button" variant="outline" className="min-h-11 w-full" disabled={busy === item.resourceId} onClick={() => void saveReplay(item.resourceId)}>{busy === item.resourceId ? <RotateCw className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Bookmark className="mr-2 h-4 w-4" aria-hidden="true" />}Save full video</Button></CardContent></Card>
            </li>
          ))}
        </ul>
      )}
      {loadState === 'ready' && surface === 'questions' && (
        <ul className="space-y-3">
          {(items as QuestionItem[]).map((item) => <li key={item.questionId}><Card><CardHeader><Badge variant="outline" className="w-fit">{item.category}</Badge><CardTitle className="text-lg">{item.question}</CardTitle><CardDescription>{item.title}{item.answerer ? ` · ${item.answerer}` : ''}</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-sm">{item.answerSummary}</p><Button type="button" className="min-h-11" onClick={() => onOpen({ resourceId: item.resourceId, title: item.title, startSeconds: item.startSeconds, questionId: item.questionId, momentId: null })}><PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />Watch answer at {formatCompactTime(item.startSeconds)}</Button></CardContent></Card></li>)}
        </ul>
      )}
      {loadState === 'ready' && surface === 'saved' && (
        <ul className="space-y-3">
          {(items as SavedItem[]).map((item) => <li key={item.bookmarkId}><Card><CardHeader><div className="flex flex-wrap gap-2"><Badge>{item.targetKind === 'replay' ? 'Video' : 'Moment'}</Badge><Badge variant="outline">{item.category}</Badge></div><CardTitle className="text-lg">{item.title}</CardTitle><CardDescription>{item.label}{item.targetKind !== 'replay' ? ` · ${formatCompactTime(item.startSeconds)}` : ''}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{item.targetKind !== 'replay' && <Button type="button" className="min-h-11" onClick={() => onOpen({ resourceId: item.resourceId, title: item.title, startSeconds: item.startSeconds, questionId: item.targetKind === 'question' ? item.targetId : null, momentId: item.targetKind === 'moment' ? item.targetId : null })}>Open saved moment</Button>}<Button type="button" variant="outline" className="min-h-11" disabled={busy === item.bookmarkId} onClick={() => void remove(item.bookmarkId)}><Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />Remove everywhere</Button></CardContent></Card></li>)}
        </ul>
      )}
      <p role="status" aria-live="polite" className="text-sm" tabIndex={-1}>{receipt}</p>
    </section>
  );
}
