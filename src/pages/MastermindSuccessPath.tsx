import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AssignedLearningPlayer } from '@/components/mastermind/AssignedLearningPlayer';
import { useSuccessPathLearningSlice } from '@/hooks/useSuccessPathLearningSlice';
import { newStableRequestId, type SuccessPathLearningEmptyState } from '@/lib/successPathLearningSlice';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, CheckCircle2, LifeBuoy, Loader2, RotateCcw } from 'lucide-react';

type SaveState = 'idle' | 'pending' | 'saved' | 'conflict' | 'ambiguous';
type Outcome = 'continue' | 'improve' | 'reduce' | 'support';

const emptyCopy: Record<SuccessPathLearningEmptyState, { title: string; body: string; action?: string }> = {
  denied: { title: 'This Success Path is not available', body: 'We could not open this private plan for this account.' },
  verification_unavailable: { title: 'We cannot verify access right now', body: 'This is a temporary verification problem, not a membership decision.', action: 'Try verification again' },
  no_plan: { title: 'Your 90-day result comes first', body: 'Save one 90-day result before opening this Success Path.', action: 'Build my 90-day plan' },
  unconfirmed: { title: 'Your recommendation needs confirmation', body: 'Confirm the recommended focus in the protected planning flow before a lesson is revealed.' },
  review_required: { title: 'Your plan needs a quick review', body: 'Something in the saved Planner receipt changed. Review the current plan before continuing.', action: 'Check again' },
  resource_not_ready: { title: 'Your assigned resource is not ready', body: 'The current lesson is being checked. No lesson details are available yet.', action: 'Check again' },
};

function weekKey(now = new Date()) {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-w${String(week).padStart(2, '0')}`;
}

function mutationKind(error: unknown): 'conflict' | 'ambiguous' {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /conflict|stale|unavailable/i.test(message) && !/fetch|network|timeout/i.test(message) ? 'conflict' : 'ambiguous';
}

export default function MastermindSuccessPath() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { data, isLoading, error, refetch } = useSuccessPathLearningSlice(cycleId);
  const actionRef = useRef<HTMLElement>(null);
  const evidenceStatusRef = useRef<HTMLDivElement>(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceState, setEvidenceState] = useState<SaveState>('idle');
  const [evidenceReceiptId, setEvidenceReceiptId] = useState<string | null>(null);
  const [evidenceRequestId, setEvidenceRequestId] = useState(newStableRequestId());
  const [evaluationState, setEvaluationState] = useState<SaveState>('idle');
  const [evaluationRequestId, setEvaluationRequestId] = useState(newStableRequestId());
  const [reducedText, setReducedText] = useState('');
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [absenceRequestId, setAbsenceRequestId] = useState(newStableRequestId());

  const slice = data?.slice_state === 'ready' ? data.slice : null;
  const reducedMinutes = useMemo(() => slice ? Math.max(5, Math.min(slice.action.estimated_minutes - 1, Math.ceil(slice.action.estimated_minutes / 2))) : 5, [slice]);

  const focusAction = () => {
    actionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    actionRef.current?.focus({ preventScroll: true });
  };

  const saveEvidence = async () => {
    if (!slice || !evidenceNote.trim()) return;
    setEvidenceState('pending');
    const args = {
      p_cycle_id: slice.cycle_id,
      p_request_id: evidenceRequestId,
      p_expected_path_version: slice.path_version,
      p_action_id: slice.action.action_id,
      p_evidence_type: 'other_business_observation',
      p_structured_value: { observation: evidenceNote.trim().slice(0, 500) },
      p_member_note: evidenceNote.trim().slice(0, 1000),
      p_reference_label: 'Success Path evidence checkpoint',
      p_observed_at: new Date().toISOString(),
    };
    try {
      const first = await supabase.rpc('submit_my_success_path_evidence', args);
      if (first.error) throw first.error;
      const receipt = first.data as { status?: string; evidence_receipt_id?: string } | null;
      if (receipt?.status !== 'saved' || !receipt.evidence_receipt_id) throw new Error('Evidence receipt unavailable');
      const readback = await supabase.rpc('submit_my_success_path_evidence', args);
      if (readback.error) throw readback.error;
      const confirmed = readback.data as { status?: string; evidence_receipt_id?: string; replayed?: boolean } | null;
      if (confirmed?.status !== 'saved' || confirmed.evidence_receipt_id !== receipt.evidence_receipt_id || confirmed.replayed !== true) {
        throw new Error('Evidence readback unavailable');
      }
      setEvidenceReceiptId(receipt.evidence_receipt_id);
      setEvidenceState('saved');
      setEvidenceRequestId(newStableRequestId());
    } catch (caught) {
      setEvidenceState(mutationKind(caught));
      requestAnimationFrame(() => evidenceStatusRef.current?.focus());
    }
  };

  const evaluate = async (outcome: Outcome) => {
    if (!slice || !evidenceReceiptId) return;
    setEvaluationState('pending');
    const args = {
      p_cycle_id: slice.cycle_id,
      p_request_id: evaluationRequestId,
      p_period_key: weekKey(),
      p_expected_path_version: slice.path_version,
      p_action_id: slice.action.action_id,
      p_evidence_receipt_id: evidenceReceiptId,
      p_outcome: outcome,
      p_reduced_action_text: outcome === 'reduce' ? (reducedText.trim() || `Small step: ${slice.action.text}`).slice(0, 300) : null,
      p_reduced_action_minutes: outcome === 'reduce' ? reducedMinutes : null,
    };
    try {
      const first = await supabase.rpc('evaluate_my_success_path_week', args);
      if (first.error) throw first.error;
      const receipt = first.data as { status?: string; checkin_id?: string; outcome?: string } | null;
      if (receipt?.status !== 'saved' || !receipt.checkin_id || receipt.outcome !== outcome) throw new Error('Evaluation receipt unavailable');
      const readback = await supabase.rpc('evaluate_my_success_path_week', args);
      if (readback.error) throw readback.error;
      const confirmed = readback.data as { checkin_id?: string; outcome?: string; replayed?: boolean } | null;
      if (confirmed?.checkin_id !== receipt.checkin_id || confirmed.outcome !== outcome || confirmed.replayed !== true) throw new Error('Evaluation readback unavailable');
      const refreshed = await refetch();
      if (refreshed?.slice_state !== 'ready' || refreshed.slice.latest_evaluation_outcome !== outcome) throw new Error('Evaluation state readback unavailable');
      setEvaluationState('saved');
      setEvaluationRequestId(newStableRequestId());
    } catch (caught) {
      setEvaluationState(mutationKind(caught));
    }
  };

  const recoverAfterAbsence = async () => {
    if (!slice) return;
    setEvaluationState('pending');
    const args = {
      p_cycle_id: slice.cycle_id,
      p_request_id: absenceRequestId,
      p_expected_path_version: slice.path_version,
      p_small_action_text: `Return step: ${slice.action.text}`.slice(0, 300),
      p_small_action_minutes: Math.min(15, reducedMinutes),
    };
    try {
      const first = await supabase.rpc('recover_my_success_path_after_absence', args);
      if (first.error) throw first.error;
      const receipt = first.data as { status?: string; recovery_id?: string } | null;
      const readback = await supabase.rpc('recover_my_success_path_after_absence', args);
      if (readback.error) throw readback.error;
      const confirmed = readback.data as { recovery_id?: string; replayed?: boolean } | null;
      if (receipt?.status !== 'saved' || !receipt.recovery_id || confirmed?.recovery_id !== receipt.recovery_id || !confirmed.replayed) throw new Error('Recovery readback unavailable');
      await refetch();
      setAbsenceRequestId(newStableRequestId());
      setAbsenceOpen(false);
      setEvaluationState('saved');
    } catch (caught) { setEvaluationState(mutationKind(caught)); }
  };

  if (isLoading && !data) return <Layout><main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8" role="status" aria-live="polite"><Loader2 className="mr-2 inline h-5 w-5 animate-spin motion-reduce:animate-none" />Loading your current Success Path…</main></Layout>;
  if (error || !data) return <Layout><main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8"><Card role="alert"><CardHeader><CardTitle>Your Success Path did not load</CardTitle><CardDescription>This is a load problem, not empty onboarding.</CardDescription></CardHeader><CardContent><Button className="min-h-11 w-full sm:w-auto" onClick={() => void refetch()}>Try again</Button></CardContent></Card></main></Layout>;
  if (!slice) {
    const copy = emptyCopy[data.slice_state];
    return <Layout><main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8"><Card role={data.slice_state === 'verification_unavailable' ? 'alert' : undefined}><CardHeader><CardTitle>{copy.title}</CardTitle><CardDescription>{copy.body}</CardDescription></CardHeader>{copy.action && <CardContent>{data.slice_state === 'no_plan' ? <Button asChild className="min-h-11 w-full sm:w-auto"><Link to="/cycle-setup">{copy.action}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button> : <Button className="min-h-11 w-full sm:w-auto" onClick={() => void refetch()}>{copy.action}</Button>}</CardContent>}</Card></main></Layout>;
  }

  return (
    <Layout>
      <main className="mx-auto w-full max-w-3xl min-w-0 space-y-5 overflow-x-hidden px-4 py-6 sm:py-8">
        <header className="space-y-2"><p className="text-sm font-medium text-primary">My 90-day Success Path</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">One result. One next move.</h1><p className="text-muted-foreground">Watch only what supports the action in front of you, then record real-world evidence.</p></header>
        <Card><CardHeader><CardDescription>My saved 90-day result</CardDescription><CardTitle className="text-xl break-words">{slice.result_text}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Confirmed focus</CardDescription><CardTitle>{slice.confirmed_stage === 'offer' ? 'Offer' : slice.confirmed_stage}</CardTitle></CardHeader><CardContent><p className="font-medium break-words">{slice.milestone.title}</p></CardContent></Card>
        <Card>
          <CardHeader><CardDescription>Your one assigned lesson</CardDescription><CardTitle className="break-words">{slice.learning.title}</CardTitle><p className="text-sm text-muted-foreground">With {slice.learning.teacher} · {slice.learning.attribution}</p></CardHeader>
        <CardContent className="space-y-4"><p className="break-words">{slice.learning.intended_output}</p>{slice.learning.action_prompt && <p className="rounded-md bg-muted p-3 text-sm break-words"><span className="font-medium">Listen for:</span> {slice.learning.action_prompt}</p>}<AssignedLearningPlayer key={slice.learning.assignment_item_id} cycleId={slice.cycle_id} assignmentItemId={slice.learning.assignment_item_id} title={slice.learning.title} onBackToAction={focusAction} /></CardContent>
        </Card>
        <Card ref={actionRef as React.RefObject<HTMLDivElement>} tabIndex={-1} className="scroll-mt-6 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <CardHeader><CardDescription>My one Planner action</CardDescription><CardTitle className="break-words">{slice.action.text}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3"><span className="text-sm text-muted-foreground">About {slice.action.estimated_minutes} minutes</span><span className="text-sm">Planner task: {slice.action.completion_state === 'completed' ? 'completed' : 'open'}</span></CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Evidence checkpoint</CardDescription><CardTitle>What happened when you took the action?</CardTitle>{slice.learning.evidence_prompt && <p className="text-sm text-muted-foreground break-words">{slice.learning.evidence_prompt}</p>}</CardHeader>
          <CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="success-path-evidence">Business evidence</Label><Input id="success-path-evidence" value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} maxLength={1000} disabled={evidenceState === 'pending'} placeholder="A reply, decision, metric, or observation" className="min-h-11" /></div><Button className="min-h-11 w-full sm:w-auto" disabled={!evidenceNote.trim() || evidenceState === 'pending'} onClick={() => void saveEvidence()}>{evidenceState === 'pending' ? 'Saving and reading back…' : 'Save evidence'}</Button><div ref={evidenceStatusRef} tabIndex={evidenceState === 'conflict' || evidenceState === 'ambiguous' ? -1 : undefined} role={evidenceState === 'conflict' || evidenceState === 'ambiguous' ? 'alert' : 'status'} aria-live="polite" className="text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">{evidenceState === 'saved' && <span className="inline-flex items-center text-emerald-700"><CheckCircle2 className="mr-2 h-4 w-4" />Evidence saved and confirmed by the server.</span>}{evidenceState === 'conflict' && 'Your plan changed before this evidence could be confirmed. Your input and request are retained; refresh the plan and retry.'}{evidenceState === 'ambiguous' && 'We could not confirm whether the save completed. Your input and request are retained; retry safely.'}</div></CardContent>
        </Card>
        {evidenceReceiptId && <Card><CardHeader><CardDescription>Weekly evaluation</CardDescription><CardTitle>What does the evidence say?</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(['continue','improve','reduce','support'] as Outcome[]).map((outcome) => <Button key={outcome} variant="outline" className="min-h-11 capitalize" disabled={evaluationState === 'pending'} onClick={() => void evaluate(outcome)}>{outcome}</Button>)}</div><div role={evaluationState === 'conflict' || evaluationState === 'ambiguous' ? 'alert' : 'status'} aria-live="polite" className="text-sm">{evaluationState === 'pending' && 'Saving and reading back your evaluation…'}{evaluationState === 'saved' && 'Evaluation saved and confirmed by the server.'}{evaluationState === 'conflict' && 'The current action changed. Your request is retained; reload before retrying.'}{evaluationState === 'ambiguous' && 'We could not confirm the evaluation. Your request is retained for a safe retry.'}</div><div className="space-y-2"><Label htmlFor="reduced-action">Low-capacity version (used only if you choose Reduce)</Label><Input id="reduced-action" value={reducedText} onChange={(event) => setReducedText(event.target.value)} maxLength={300} placeholder={`A smaller ${reducedMinutes}-minute version`} className="min-h-11" /></div>{slice.support_state && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Support is open. Use the support route below to continue.</p>}</CardContent></Card>}
        <Card><CardHeader><CardDescription>Returning after time away?</CardDescription><CardTitle>Keep the same focus and restart smaller.</CardTitle></CardHeader><CardContent className="space-y-3">{!absenceOpen ? <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setAbsenceOpen(true)}><RotateCcw className="mr-2 h-4 w-4" />Show my return step</Button> : <><p className="text-sm text-muted-foreground">This preserves your Offer stage and milestone and creates no overdue work.</p><Button className="min-h-11 w-full sm:w-auto" onClick={() => void recoverAfterAbsence()}>Use a {Math.min(15, reducedMinutes)}-minute return step</Button></>}</CardContent></Card>
        <Button asChild variant="ghost" className="min-h-11 w-full sm:w-auto"><Link to="/support"><LifeBuoy className="mr-2 h-4 w-4" />Ask for support</Link></Button>
      </main>
    </Layout>
  );
}
