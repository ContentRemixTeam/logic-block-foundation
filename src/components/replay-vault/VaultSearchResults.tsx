import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, PlayCircle } from 'lucide-react';
import { formatCompactTime, formatSpokenTime } from './replayVaultCore.mjs';
import { ProtectedReplayLink } from './ProtectedReplayLink';
import type { PlaybackTarget, VaultReplayGroup } from './types';
interface Props { groups: VaultReplayGroup[]; loadingKey: string | null; detailBasePath?: string; onOpen: (target: PlaybackTarget) => void; }
export function VaultSearchResults({ groups, loadingKey, detailBasePath, onOpen }: Props) {
  return (
    <section aria-labelledby="vault-results-heading" className="min-w-0 space-y-4">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3"><div><h2 id="vault-results-heading" className="text-xl font-semibold">Matching replays</h2><p className="text-sm text-muted-foreground">Choose the moment that sounds most useful.</p></div><span className="shrink-0 text-sm text-muted-foreground" aria-live="polite">{groups.length} replay{groups.length === 1 ? '' : 's'}</span></div>
      {groups.map((group) => (
        <Card key={group.resourceId} className="min-w-0 overflow-hidden"><CardHeader className="space-y-2"><div className="flex flex-wrap gap-2"><Badge variant="outline">{group.category}</Badge><Badge variant="secondary">{group.moments.length} moment{group.moments.length === 1 ? '' : 's'}</Badge></div><CardTitle className="break-words text-lg">{group.title}</CardTitle><CardDescription>Approved moments from this replay are grouped together.</CardDescription></CardHeader>
          <CardContent><ul className="divide-y" aria-label={`Moments in ${group.title}`}>
            {group.moments.map((moment) => {
              const rowKey = `${group.resourceId}:${moment.momentId}`;
              const loading = loadingKey === rowKey;
              const target = { resourceId: group.resourceId, title: group.title, startSeconds: moment.startSeconds, questionId: moment.questionId, momentId: moment.momentId };
              return <li key={moment.momentId} data-vault-result-row aria-busy={loading} className="min-w-0 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><Badge variant={moment.matchType === 'best_answer' ? 'default' : 'secondary'}>{moment.matchType === 'best_answer' ? 'Best answer' : formatCompactTime(moment.startSeconds)}</Badge>{moment.answerer && <span className="text-xs text-muted-foreground">Answered by {moment.answerer}</span>}</div><p className="break-words text-sm">{moment.snippet || moment.reason || 'Open this approved moment.'}</p></div>
                  <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:w-auto sm:justify-end"><Button type="button" className="min-h-11 min-w-0" disabled={loading} aria-label={`Watch ${group.title} at ${formatSpokenTime(moment.startSeconds)}`} onClick={() => onOpen(target)}><PlayCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{loading ? 'Opening…' : 'Watch answer'}</span></Button><ProtectedReplayLink {...target} detailBasePath={detailBasePath} className="inline-flex min-h-11 items-center justify-center rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => onOpen(target)}>Detail <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" /></ProtectedReplayLink></div>
                </div></li>;
            })}
          </ul></CardContent>
        </Card>
      ))}
    </section>
  );
}
