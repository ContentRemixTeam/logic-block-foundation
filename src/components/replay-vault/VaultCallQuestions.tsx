import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { normalizeQuestions } from './replayVaultLibraryCore.mjs';
import { formatCompactTime } from './replayVaultCore.mjs';
import type { PlaybackTarget } from './types';

type QuestionRow = {
  questionId: string;
  resourceId: string;
  question: string;
  startSeconds: number;
};

export function VaultCallQuestions({ resourceId, title, onOpen }: {
  resourceId: string;
  title: string;
  onOpen: (target: PlaybackTarget) => void;
}) {
  const [rows, setRows] = useState<QuestionRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setRows(null);
    try {
      const { data, error } = await supabase.functions.invoke('vault-member-library', {
        body: { action: 'questions', resourceId, offset: 0, limit: 60 },
      });
      const next = error ? null : normalizeQuestions(data) as QuestionRow[] | null;
      if (!next) {
        setFailed(true);
        return;
      }
      setRows(next);
    } catch {
      setFailed(true);
    }
  }, [resourceId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section aria-labelledby="call-questions-heading" className="space-y-2 rounded-lg border p-3">
      <h3 id="call-questions-heading" className="font-semibold">Questions answered in this call</h3>
      {rows === null && !failed && <p role="status" className="text-sm text-muted-foreground">Loading approved questions…</p>}
      {failed && (
        <div role="alert">
          <p className="text-sm">Questions are temporarily unavailable.</p>
          <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => void load()}>Retry questions</Button>
        </div>
      )}
      {rows?.length === 0 && <p className="text-sm text-muted-foreground">No approved questions are indexed for this call yet.</p>}
      {rows && rows.length > 0 && (
        <ul className="space-y-1">
          {rows.map((question) => (
            <li key={question.questionId}>
              <button
                type="button"
                className="min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => onOpen({ resourceId, title, startSeconds: question.startSeconds, questionId: question.questionId, momentId: null })}
              >
                <span className="mr-2 font-semibold text-primary">{formatCompactTime(question.startSeconds)}</span>
                {question.question}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
