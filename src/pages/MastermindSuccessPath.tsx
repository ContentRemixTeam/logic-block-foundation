import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AssignedLearningPlayer } from '@/components/mastermind/AssignedLearningPlayer';
import { useSuccessPathLearningSlice } from '@/hooks/useSuccessPathLearningSlice';
import { newStableRequestId, type SuccessPathLearningEmptyState } from '@/lib/successPathLearningSlice';
import { parseEditContext, parseEngagementReceipt, parseTransitionConfirmation, parseTransitionPreview, type EngagementEvent, type TransitionPreview } from '@/lib/successPathMemberAuthority';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, Clock3, LifeBuoy, Loader2, Pencil, RotateCcw, Sparkles, Target, X } from 'lucide-react';

type SaveState = 'idle' | 'pending' | 'saved' | 'conflict' | 'ambiguous';
type Outcome = 'continue' | 'improve' | 'reduce' | 'support';

const emptyCopy: Record<SuccessPathLearningEmptyState, { title: string; body: string; action?: string }> = {
  denied: { title: 'This Success Path is not available', body: 'We could not open this private plan for this account.' },
  verification_unavailable: { title: 'We cannot verify access right now', body: 'This is a temporary verification problem, not a membership decision.', action: 'Try verification again' },
  no_plan: { title: 'Your 90-day result comes first', body: 'Save one 90-day result before opening this Success Path.', action: 'Build my 90-day plan' },
  unconfirmed: { title: 'Your recommendation needs confirmation', body: 'Confirm the recommended focus in the protected planning flow before a lesson is revealed.' },
  review_required: { title: 'Your plan needs a quick review', body: 'Something in the saved Planner receipt changed. Review the current plan before continuing.', action: 'Check again' },
  resource_not_ready: { title: 'Your assigned resource is not ready', body: 'This resource is being prepared. Your plan has not changed.', action: 'Check again' },
};

const brandDisplay = { fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '.01em' as const, lineHeight: 1 as const };

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

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div aria-hidden className="h-[2px] w-7 shrink-0 bg-[#B8860B]" />
      <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? 'text-[#B8860B]' : 'text-[#111111]'}`}>{children}</span>
    </div>
  );
}

function BrandButton({ variant = 'primary', className = '', ...props }: { variant?: 'primary' | 'dark' | 'outline' } & React.ComponentProps<typeof Button>) {
  const base = 'min-h-11 rounded-none border-2 text-[13px] font-bold uppercase tracking-[0.07em]';
  const styles = {
    primary: 'bg-[#C8145E] text-white border-[#C8145E] hover:bg-[#111111] hover:border-[#111111]',
    dark: 'bg-[#111111] text-white border-[#111111] hover:bg-[#C8145E] hover:border-[#C8145E]',
    outline: 'bg-transparent text-[#111111] border-[#111111] hover:bg-[#111111] hover:text-white',
  } as const;
  return <Button {...props} className={`${base} ${styles[variant]} ${className}`} />;
}

export default function MastermindSuccessPath() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { data, isLoading, error, refetch } = useSuccessPathLearningSlice(cycleId);
  const actionRef = useRef<HTMLElement>(null);
  const actionOpenedRecorded = useRef(false);
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editedAction, setEditedAction] = useState('');
  const [editedMinutes, setEditedMinutes] = useState(5);
  const [editState, setEditState] = useState<SaveState>('idle');
  const [preview, setPreview] = useState<TransitionPreview | null>(null);
  const [previewRequestId, setPreviewRequestId] = useState(newStableRequestId());
  const [confirmationRequestId, setConfirmationRequestId] = useState(newStableRequestId());

  const slice = data?.slice_state === 'ready' ? data.slice : null;
  const reducedMinutes = useMemo(() => slice ? Math.max(5, Math.min(slice.action.estimated_minutes - 1, Math.ceil(slice.action.estimated_minutes / 2))) : 5, [slice]);

  useEffect(() => {
    if (!slice || editedAction) return;
    setEditedAction(slice.action.text);
    setEditedMinutes(slice.action.estimated_minutes);
  }, [editedAction, slice]);

  const recordEngagement = async (event: EngagementEvent, actionId: string | null = null) => {
    if (!slice) return;
    const { data: receipt, error: receiptError } = await supabase.rpc('record_my_assigned_learning_engagement', {
      p_cycle_id: slice.cycle_id, p_assignment_item_id: slice.learning.assignment_item_id,
      p_action_id: actionId, p_request_id: newStableRequestId(), p_event_type: event, p_progress_basis_points: null,
    });
    if (receiptError) throw receiptError;
    parseEngagementReceipt(receipt);
  };

  const openReview = () => {
    if (!slice) return;
    setEditedAction(slice.action.text); setEditedMinutes(slice.action.estimated_minutes);
    setPreview(null); setEditState('idle'); setReviewOpen(true);
  };

  const cancelReview = () => {
    if (!slice) return;
    setEditedAction(slice.action.text); setEditedMinutes(slice.action.estimated_minutes);
    setPreview(null); setReviewOpen(false); setEditState('idle');
  };

  const previewChange = async () => {
    if (!slice || !editedAction.trim()) return;
    setEditState('pending');
    try {
      const contextResponse = await supabase.rpc('resolve_my_success_path_edit_context', { p_cycle_id: slice.cycle_id });
      if (contextResponse.error) throw contextResponse.error;
      const context = parseEditContext(contextResponse.data);
      if (context.path_version !== slice.path_version || context.action_id !== slice.action.action_id) throw new Error('Current action changed before review.');
      const response = await supabase.rpc('preview_my_success_path_transition_member', {
        p_cycle_id: context.cycle_id, p_request_id: previewRequestId, p_expected_path_version: context.path_version,
        p_transition_kind: 'focus_change', p_reason_code: 'member_requested', p_evidence_receipt_id: null,
        p_proposed_assignment_id: context.assignment_id, p_proposed_assignment_item_id: context.assignment_item_id,
        p_proposed_stage: context.stage, p_proposed_milestone_key: context.milestone_key,
        p_proposed_milestone_title: context.milestone_title, p_proposed_move_key: context.move_key,
        p_proposed_action_text: editedAction.trim().slice(0,300), p_proposed_action_minutes: editedMinutes,
      });
      if (response.error) throw response.error;
      setPreview(parseTransitionPreview(response.data)); setEditState('idle');
    } catch (caught) { setEditState(mutationKind(caught)); }
  };

  const confirmChange = async () => {
    if (!preview) return;
    setEditState('pending');
    try {
      const response = await supabase.rpc('confirm_my_success_path_transition_member', {
        p_proposal_id: preview.proposal_id, p_confirmation_request_id: confirmationRequestId,
        p_expected_impact_diff: preview.impact_diff, p_expected_impact_diff_sha256: preview.impact_diff_sha256, p_confirm: true,
      });
      if (response.error) throw response.error;
      const confirmed = parseTransitionConfirmation(response.data);
      const refreshed = await refetch();
      if (refreshed?.slice_state !== 'ready' || refreshed.slice.path_version !== confirmed.path_version || refreshed.slice.action.action_id !== confirmed.action_id) throw new Error('Confirmed action readback unavailable.');
      setPreview(null); setReviewOpen(false); setEditState('saved');
      setPreviewRequestId(newStableRequestId()); setConfirmationRequestId(newStableRequestId());
    } catch (caught) { setEditState(mutationKind(caught)); }
  };

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
      await recordEngagement('evidence_submitted', slice.action.action_id).catch(() => undefined);
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
      await recordEngagement(outcome === 'support' ? 'support_requested' : 'checkin_completed', slice.action.action_id).catch(() => undefined);
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
      await recordEngagement('returned_after_absence', slice.action.action_id).catch(() => undefined);
    } catch (caught) { setEvaluationState(mutationKind(caught)); }
  };

  if (isLoading && !data) return <Layout><main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8 font-['DM_Sans']" role="status" aria-live="polite"><div className="flex min-h-40 items-center justify-center gap-3 rounded-none border-2 border-[#111111] bg-white text-[#555555]"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-[#C8145E]" />Loading your current Success Path…</div></main></Layout>;
  if (error || !data) return <Layout><main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8 font-['DM_Sans']"><Card role="alert" className="rounded-none border-2 border-[#111111] bg-white shadow-none"><CardHeader><CardTitle style={brandDisplay} className="text-2xl">Your Success Path did not load</CardTitle><CardDescription>This is a load problem, not empty onboarding.</CardDescription></CardHeader><CardContent><BrandButton onClick={() => void refetch()}>Try again</BrandButton></CardContent></Card></main></Layout>;
  if (!slice) {
    const copy = emptyCopy[data.slice_state];
    return <Layout><main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8 font-['DM_Sans']"><Card role={data.slice_state === 'verification_unavailable' ? 'alert' : undefined} className="rounded-none border-2 border-[#111111] bg-white shadow-none"><CardHeader><CardTitle style={brandDisplay} className="text-2xl">{copy.title}</CardTitle><CardDescription>{copy.body}</CardDescription></CardHeader>{copy.action && <CardContent>{data.slice_state === 'no_plan' ? <BrandButton asChild><Link to="/cycle-setup">{copy.action}<ArrowRight className="ml-2 h-4 w-4" /></Link></BrandButton> : <BrandButton onClick={() => void refetch()}>{copy.action}</BrandButton>}</CardContent>}</Card></main></Layout>;
  }

  const stageLabel = slice.confirmed_stage === 'offer' ? 'Offer' : slice.confirmed_stage;
  const steps = [
    { label: 'Result', state: 'done' as const },
    { label: 'Focus', state: 'current' as const },
    { label: 'Next move', state: 'upcoming' as const },
    { label: 'Evidence', state: 'upcoming' as const },
  ];

  return (
    <Layout>
      <main className="mx-auto w-full max-w-3xl min-w-0 space-y-6 overflow-x-hidden px-4 py-6 font-['DM_Sans'] sm:py-10">
        {/* Hero — off-white, ghost watermark, gold eyebrow */}
        <section className="relative overflow-hidden rounded-none border-2 border-[#111111] bg-[#F7F5F2] p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap font-['Bebas_Neue'] text-[6.5rem] leading-none text-[#111111]/[0.03] select-none sm:text-[10rem]">ONE NEXT MOVE</div>
          <div className="relative space-y-4">
            <Eyebrow>My 90-day Success Path</Eyebrow>
            <h1 style={brandDisplay} className="text-5xl text-[#111111] sm:text-6xl">One result. One <span className="text-[#C8145E]">next move</span>.</h1>
            <p className="max-w-xl text-sm text-[#555555] sm:text-base">Watch only what supports the action in front of you, then record real-world evidence.</p>
          </div>
        </section>

        {/* Journey rail — brand numbered steps */}
        <nav aria-label="Your Success Path steps" className="rounded-none border-2 border-[#111111] bg-[#F7F5F2] p-4">
          <ol className="flex items-center justify-between gap-1 sm:gap-2">
            {steps.map((step, index) => (
              <li key={step.label} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <span aria-current={step.state === 'current' ? 'step' : undefined} className={`flex h-8 w-8 shrink-0 items-center justify-center font-['Bebas_Neue'] text-base ${step.state === 'current' ? 'bg-[#111111] text-white' : step.state === 'done' ? 'bg-[#C8145E] text-white' : 'border-2 border-[#111111] bg-white text-[#111111]'}`}>{index + 1}</span>
                <span className={`truncate text-[11px] font-bold uppercase tracking-[0.12em] sm:text-xs ${step.state === 'current' ? 'text-[#111111]' : 'text-[#555555]'}`}>{step.label}</span>
                {index < steps.length - 1 && <div aria-hidden className="mx-0.5 h-0.5 min-w-1 flex-1 bg-[#111111] sm:mx-1" />}
              </li>
            ))}
          </ol>
        </nav>

        {/* Saved result */}
        <Card className="rounded-none border-2 border-[#111111] bg-white shadow-none">
          <CardHeader className="pb-3">
            <Eyebrow>My saved 90-day result</Eyebrow>
            <CardTitle style={brandDisplay} className="pt-2 text-2xl">Your <span className="text-[#C8145E]">result</span></CardTitle>
          </CardHeader>
          <CardContent><p className="text-xl font-semibold break-words">{slice.result_text}</p></CardContent>
        </Card>

        {/* Suggested focus */}
        <Card className="rounded-none border-2 border-[#111111] bg-[#F7F5F2] shadow-none">
          <CardHeader className="pb-3">
            <Eyebrow>Suggested for you</Eyebrow>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="bg-[#C8145E] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">{stageLabel}</span>
              <CardTitle style={brandDisplay} className="text-2xl">{slice.milestone.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#555555]">Based on your saved 90-day plan, this looks like the most useful focus right now.</p>
            <div className="border-l-[3px] border-[#C8145E] bg-[#FFF0F5] px-4 py-3 text-sm font-medium text-[#111111]">You are the boss. Change anything that does not fit.</div>
            <BrandButton variant="outline" className="w-full sm:w-auto" onClick={openReview}><Pencil className="mr-2 h-4 w-4" />Review or change my focus</BrandButton>
          </CardContent>
        </Card>

        {reviewOpen && <Card aria-labelledby="review-focus-title" className="rounded-none border-2 border-[#111111] bg-white shadow-none"><CardHeader className="pb-3"><CardDescription>Review before anything changes</CardDescription><CardTitle id="review-focus-title" style={brandDisplay} className="text-2xl">Adjust this one action</CardTitle><p className="text-sm text-[#555555]">You can edit the action and time here. Choosing a different stage needs a new reviewed recommendation so the app does not silently reroute your plan.</p></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="edited-action">Action</Label><Input id="edited-action" value={editedAction} maxLength={300} className="min-h-11 rounded-none border-2 border-[#111111] bg-white" onChange={event=>{setEditedAction(event.target.value);setPreview(null);}} /></div><div className="space-y-2"><Label htmlFor="edited-minutes">Estimated minutes</Label><Input id="edited-minutes" type="number" min={5} max={240} value={editedMinutes} className="min-h-11 rounded-none border-2 border-[#111111] bg-white" onChange={event=>{setEditedMinutes(Math.max(5,Math.min(240,Number(event.target.value)||5)));setPreview(null);}} /></div>{!preview?<div className="flex flex-col gap-2 sm:flex-row"><BrandButton disabled={editState==='pending'||!editedAction.trim()} onClick={()=>void previewChange()}>{editState==='pending'?'Preparing exact preview…':'Preview exact impact'}</BrandButton><BrandButton variant="outline" onClick={cancelReview}><X className="mr-2 h-4 w-4" />Cancel — change nothing</BrandButton></div>:<div className="space-y-3 rounded-none border-l-[3px] border-[#C8145E] bg-[#FFF0F5] p-4" role="status" aria-live="polite"><p className="font-bold uppercase tracking-[0.07em] text-[#111111] text-[13px]">Exact impact preview</p><ul className="list-disc space-y-1 pl-5 text-sm text-[#111111]"><li>Replace “{preview.impact_diff.action.old.text}” ({preview.impact_diff.action.old.estimated_minutes} minutes) with “{preview.impact_diff.action.new.text}” ({preview.impact_diff.action.new.estimated_minutes} minutes).</li><li>Stage: {preview.impact_diff.stage.old} → {preview.impact_diff.stage.new}; milestone: {preview.impact_diff.milestone.old.title} → {preview.impact_diff.milestone.new.title}.</li><li>{preview.impact_diff.learning.assignment_reroute?'The reviewed assignment changes.':'The reviewed assignment stays the same.'} {preview.impact_diff.learning.learning_item_changed?'The assigned lesson changes.':'The assigned lesson stays the same.'}</li><li>History preservation: prior task {preview.impact_diff.history.prior_task_preserved?'kept':'not kept'}, completion {preview.impact_diff.history.prior_task_completion_preserved?'kept':'not kept'}, evidence {preview.impact_diff.history.evidence_preserved?'kept':'not kept'}, actions {preview.impact_diff.history.actions_preserved?'kept':'not kept'}, check-ins {preview.impact_diff.history.checkins_preserved?'kept':'not kept'}.</li></ul><div className="flex flex-col gap-2 sm:flex-row"><BrandButton disabled={editState==='pending'} onClick={()=>void confirmChange()}>{editState==='pending'?'Confirming and reading back…':'Confirm this exact change'}</BrandButton><BrandButton variant="outline" onClick={cancelReview}>Cancel — change nothing</BrandButton></div></div>}<div role={editState==='conflict'||editState==='ambiguous'?'alert':'status'} aria-live="polite" className="text-sm text-[#555555]">{editState==='conflict'&&'Your current plan changed. Nothing was overwritten; reload before reviewing again.'}{editState==='ambiguous'&&'We could not verify this request. Nothing new will be attempted with different details under the same request.'}</div></CardContent></Card>}

        {/* Assigned lesson */}
        <Card className="rounded-none border-2 border-[#111111] bg-white shadow-none">
          <CardHeader className="pb-3">
            <Eyebrow>Your one assigned lesson</Eyebrow>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="border-2 border-[#C8145E] bg-[#FFF0F5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#C8145E]">Watch this first</span>
              <CardTitle style={brandDisplay} className="break-words text-2xl">{slice.learning.title}</CardTitle>
            </div>
            <p className="text-sm text-[#555555]">With {slice.learning.teacher} · {slice.learning.attribution}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="break-words text-[#111111]">{slice.learning.intended_output}</p>
            {slice.learning.action_prompt && <div className="rounded-none border-l-[3px] border-[#C8145E] bg-[#FFF0F5] p-3 text-sm break-words text-[#111111]"><span className="font-bold text-[#C8145E]">Listen for:</span> {slice.learning.action_prompt}</div>}
            <AssignedLearningPlayer key={slice.learning.assignment_item_id} cycleId={slice.cycle_id} assignmentItemId={slice.learning.assignment_item_id} title={slice.learning.title} onOpened={()=>recordEngagement('assignment_opened')} onStarted={()=>recordEngagement('playback_started')} onCompleted={()=>recordEngagement('playback_completed')} onBackToAction={focusAction} />
          </CardContent>
        </Card>

        {/* Canonical action — pink signature */}
        <Card ref={actionRef as React.RefObject<HTMLDivElement>} tabIndex={-1} onFocus={()=>{if(!actionOpenedRecorded.current){actionOpenedRecorded.current=true;void recordEngagement('action_opened',slice.action.action_id).catch(()=>undefined);}}} className="scroll-mt-6 rounded-none border-2 border-[#111111] bg-[#C8145E] shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5"><div aria-hidden className="h-[2px] w-7 shrink-0 bg-white" /><span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">My one Planner action</span></div>
            <CardTitle style={brandDisplay} className="break-words pt-2 text-3xl text-white">{slice.action.text}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 border-2 border-white px-2.5 py-1 text-sm text-white"><Clock3 className="h-3.5 w-3.5" />About {slice.action.estimated_minutes} minutes</span>
            <span className="inline-flex items-center gap-1.5 border-2 border-white px-2.5 py-1 text-sm font-bold text-white">Planner task: {slice.action.completion_state === 'completed' ? 'completed' : 'open'}</span>
          </CardContent>
        </Card>

        {/* Evidence */}
        <Card className="rounded-none border-2 border-[#111111] bg-[#F7F5F2] shadow-none">
          <CardHeader className="pb-3">
            <Eyebrow>Evidence checkpoint</Eyebrow>
            <CardTitle style={brandDisplay} className="pt-2 text-2xl">What happened when you took the <span className="text-[#C8145E]">action</span>?</CardTitle>
            {slice.learning.evidence_prompt && <p className="text-sm text-[#555555] break-words">{slice.learning.evidence_prompt}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="success-path-evidence">Business evidence</Label><Input id="success-path-evidence" value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} maxLength={1000} disabled={evidenceState === 'pending'} placeholder="A reply, decision, metric, or observation" className="min-h-11 rounded-none border-2 border-[#111111] bg-white" /></div>
            <BrandButton disabled={!evidenceNote.trim() || evidenceState === 'pending'} onClick={() => void saveEvidence()}>{evidenceState === 'pending' ? 'Saving and reading back…' : 'Save evidence'}</BrandButton>
            <div ref={evidenceStatusRef} tabIndex={evidenceState === 'conflict' || evidenceState === 'ambiguous' ? -1 : undefined} role={evidenceState === 'conflict' || evidenceState === 'ambiguous' ? 'alert' : 'status'} aria-live="polite" className="text-sm text-[#555555] outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-none">{evidenceState === 'saved' && <span className="inline-flex items-center text-[#047857]"><CheckCircle2 className="mr-2 h-4 w-4" />Evidence saved and confirmed by the server.</span>}{evidenceState === 'conflict' && 'Your plan changed before this evidence could be confirmed. Your input and request are retained; refresh the plan and retry.'}{evidenceState === 'ambiguous' && 'We could not confirm whether the save completed. Your input and request are retained; retry safely.'}</div>
          </CardContent>
        </Card>

        {evidenceReceiptId && <Card className="rounded-none border-2 border-[#111111] bg-white shadow-none"><CardHeader className="pb-3"><Eyebrow>Weekly evaluation</Eyebrow><CardTitle style={brandDisplay} className="pt-2 text-2xl">What does the <span className="text-[#C8145E]">evidence</span> say?</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(['continue','improve','reduce','support'] as Outcome[]).map((outcome) => <Button key={outcome} variant="outline" className="min-h-11 rounded-none border-2 border-[#111111] bg-transparent text-[13px] font-bold uppercase tracking-[0.07em] text-[#111111] hover:bg-[#111111] hover:text-white disabled:opacity-50" disabled={evaluationState === 'pending'} onClick={() => void evaluate(outcome)}>{outcome}</Button>)}</div><div role={evaluationState === 'conflict' || evaluationState === 'ambiguous' ? 'alert' : 'status'} aria-live="polite" className="text-sm text-[#555555]">{evaluationState === 'pending' && 'Saving and reading back your evaluation…'}{evaluationState === 'saved' && 'Evaluation saved and confirmed by the server.'}{evaluationState === 'conflict' && 'The current action changed. Your request is retained; reload before retrying.'}{evaluationState === 'ambiguous' && 'We could not confirm the evaluation. Your request is retained for a safe retry.'}</div><div className="space-y-2"><Label htmlFor="reduced-action">Low-capacity version (used only if you choose Reduce)</Label><Input id="reduced-action" value={reducedText} onChange={(event) => setReducedText(event.target.value)} maxLength={300} placeholder={`A smaller ${reducedMinutes}-minute version`} className="min-h-11 rounded-none border-2 border-[#111111] bg-white" /></div>{slice.support_state && <p role="status" aria-live="polite" className="text-sm text-[#555555]">Support is open. Use the support route below to continue.</p>}</CardContent></Card>}

        {/* Return */}
        <Card className="rounded-none border-2 border-[#111111] bg-[#F7F5F2] shadow-none">
          <CardHeader className="pb-3">
            <Eyebrow>Returning after time away?</Eyebrow>
            <CardTitle style={brandDisplay} className="pt-2 text-2xl">Keep the same focus and restart <span className="text-[#C8145E]">smaller</span>.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">{!absenceOpen ? <BrandButton variant="outline" className="w-full sm:w-auto" onClick={() => setAbsenceOpen(true)}><RotateCcw className="mr-2 h-4 w-4" />Show my return step</BrandButton> : <><p className="text-sm text-[#555555]">This preserves your {stageLabel} stage and milestone and creates no overdue work.</p><BrandButton className="w-full sm:w-auto" onClick={() => void recoverAfterAbsence()}>Use a {Math.min(15, reducedMinutes)}-minute return step</BrandButton></>}</CardContent>
        </Card>

        <BrandButton asChild variant="dark" className="w-full sm:w-auto"><Link to="/support"><LifeBuoy className="mr-2 h-4 w-4" />Ask for support</Link></BrandButton>
      </main>
    </Layout>
  );
}
