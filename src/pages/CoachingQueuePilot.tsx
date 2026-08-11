import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Clock3,
  LockKeyhole, PlayCircle, RefreshCw, ShieldCheck, UserRoundCheck,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import {
  CoachingQueueCandidate, CoachingCallWindow, canJoinQueue,
  getEstimatedQueueStatus, getQueueWindowState, sortCoachingQueue,
} from '@/lib/coachingQueue';
import { toast } from 'sonner';

type PilotMode = 'demo' | 'live';

interface CoachingCall extends CoachingCallWindow {
  callId: string;
  title: string;
  status: string;
}

interface QueueCard extends CoachingQueueCandidate {
  userId: string;
  memberName: string;
  question: string;
  desiredResult: string | null;
  whatTried: string | null;
  blocker: string | null;
  goal: string | null;
  milestone: string | null;
  capacity: string | null;
  lastCheckinAt: string | null;
  latestWins: string | null;
  latestChallenges: string | null;
  previousCoachingNotes: Array<{ coached_at?: string; main_decision?: string; next_action?: string; result_note?: string }>;
  attendanceIntent: 'live' | 'absent_ok' | 'unsure';
  coachIfAbsent: boolean;
  replayPermission: boolean;
  sensitive: boolean;
  privacyRoute: 'live_queue' | 'private_written';
  manualPriorityReason: string | null;
  queuePosition: number | null;
}

interface RequestForm {
  question: string;
  desiredResult: string;
  whatTried: string;
  blocker: string;
  deadline: string;
  attendanceIntent: 'live' | 'absent_ok' | 'unsure';
  coachIfAbsent: boolean;
  replayPermission: boolean;
  sensitive: boolean;
  privacyRoute: 'live_queue' | 'private_written';
}

const initialForm: RequestForm = {
  question: '', desiredResult: '', whatTried: '', blocker: '', deadline: '',
  attendanceIntent: 'live', coachIfAbsent: false, replayPermission: false,
  sensitive: false, privacyRoute: 'live_queue',
};

type PilotRpcResult<T> = { data: T | null; error: { message: string } | null };

async function pilotRpc<T>(functionName: string, args: Record<string, unknown> = {}): Promise<PilotRpcResult<T>> {
  const invoke = supabase.rpc as unknown as (
    name: string,
    parameters: Record<string, unknown>,
  ) => PromiseLike<PilotRpcResult<T>>;
  return invoke(functionName, args);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function demoState(): { call: CoachingCall; cards: QueueCard[] } {
  const now = Date.now();
  const call: CoachingCall = {
    callId: 'demo-call',
    title: 'Becoming Boss Coaching — Private Test',
    startsAt: new Date(now - 5 * 60_000).toISOString(),
    queueOpensAt: new Date(now - 5 * 60_000).toISOString(),
    queueClosesAt: new Date(now + 10 * 60_000).toISOString(),
    status: 'live',
  };
  const base = (overrides: Partial<QueueCard>): QueueCard => ({
    id: crypto.randomUUID(), userId: crypto.randomUUID(), memberName: 'Test Member',
    question: 'I need help choosing the next right move.', desiredResult: 'Leave with one decision',
    whatTried: 'Reviewed the plan and narrowed the options', blocker: 'I keep second-guessing the offer',
    goal: 'Sell 10 spots in my signature offer', milestone: 'Validate the offer', capacity: 'minimum',
    lastCheckinAt: new Date(now - 3 * 86_400_000).toISOString(), latestWins: 'Sent the first invitation',
    latestChallenges: 'Offer positioning still feels muddy', attendanceIntent: 'live', coachIfAbsent: false,
    previousCoachingNotes: [{ main_decision: 'Validate the simplest version first', next_action: 'Send five invitations' }],
    replayPermission: true, sensitive: false, privacyRoute: 'live_queue', waitingSince: new Date(now - 8 * 86_400_000).toISOString(),
    joinedAt: new Date(now - 4 * 60_000).toISOString(), deadline: null, coachedCount: 1,
    lastCoachedAt: new Date(now - 90 * 86_400_000).toISOString(), timesSkipped: 0,
    returningSupportNeeded: false, manualPriority: null, manualPriorityReason: null,
    queuePosition: null,
    ...overrides,
  });
  return {
    call,
    cards: [
      base({ memberName: 'Avery (demo)', coachedCount: 0, lastCoachedAt: null, question: 'Which offer should I lead with this month?' }),
      base({ memberName: 'Jordan (demo)', deadline: format(new Date(now + 2 * 86_400_000), 'yyyy-MM-dd'), timesSkipped: 1, question: 'Do I postpone Friday’s launch or simplify it?' }),
      base({ memberName: 'Morgan (demo)', returningSupportNeeded: true, lastCoachedAt: new Date(now - 180 * 86_400_000).toISOString(), question: 'How do I restart after stepping away for a month?' }),
      base({ memberName: 'Private request (demo)', joinedAt: null, sensitive: true, replayPermission: false, privacyRoute: 'private_written', question: 'Sensitive team situation — private written coaching requested.' }),
    ],
  };
}

function toCall(row: Record<string, unknown>): CoachingCall {
  return {
    callId: String(row.call_id), title: String(row.title), status: String(row.status),
    startsAt: String(row.starts_at), queueOpensAt: String(row.queue_opens_at), queueClosesAt: String(row.queue_closes_at),
  };
}

function toCard(row: Record<string, unknown>): QueueCard {
  return {
    id: String(row.request_id), userId: String(row.user_id), memberName: String(row.member_name || 'Member'),
    question: String(row.question || ''), desiredResult: row.desired_result ? String(row.desired_result) : null,
    whatTried: row.what_tried ? String(row.what_tried) : null, blocker: row.blocker ? String(row.blocker) : null,
    deadline: row.deadline ? String(row.deadline) : null, goal: row.goal ? String(row.goal) : null,
    milestone: row.current_milestone_title ? String(row.current_milestone_title) : null,
    capacity: row.capacity_mode ? String(row.capacity_mode) : null,
    lastCheckinAt: row.last_checkin_at ? String(row.last_checkin_at) : null,
    latestWins: row.latest_wins ? String(row.latest_wins) : null,
    latestChallenges: row.latest_challenges ? String(row.latest_challenges) : null,
    previousCoachingNotes: Array.isArray(row.previous_coaching_notes) ? row.previous_coaching_notes as QueueCard['previousCoachingNotes'] : [],
    attendanceIntent: (row.attendance_intent || 'unsure') as QueueCard['attendanceIntent'],
    coachIfAbsent: Boolean(row.coach_if_absent), replayPermission: Boolean(row.replay_permission),
    sensitive: Boolean(row.sensitive), privacyRoute: (row.privacy_route || 'live_queue') as QueueCard['privacyRoute'],
    waitingSince: String(row.waiting_since), joinedAt: row.joined_at ? String(row.joined_at) : null,
    coachedCount: Number(row.coached_count || 0), lastCoachedAt: row.last_coached_at ? String(row.last_coached_at) : null,
    timesSkipped: Number(row.times_skipped || 0), returningSupportNeeded: Boolean(row.returning_support_needed),
    manualPriority: row.manual_priority == null ? null : Number(row.manual_priority),
    manualPriorityReason: row.manual_priority_reason ? String(row.manual_priority_reason) : null,
    queuePosition: row.queue_position == null ? null : Number(row.queue_position),
  };
}

export default function CoachingQueuePilot() {
  const requestedLive = new URLSearchParams(window.location.search).get('live') === '1';
  const [mode, setMode] = useState<PilotMode>(requestedLive ? 'live' : 'demo');
  const seeded = useMemo(demoState, []);
  const [call, setCall] = useState<CoachingCall | null>(seeded.call);
  const [cards, setCards] = useState<QueueCard[]>(seeded.cards);
  const [form, setForm] = useState<RequestForm>(initialForm);
  const [testRequestId, setTestRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QueueCard | null>(null);
  const [decision, setDecision] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [resource, setResource] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [disposition, setDisposition] = useState<'completed' | 'ask_faith' | 'private_written'>('completed');
  const [clockNow, setClockNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadLive = useCallback(async () => {
    if (mode !== 'live') return;
    setLoading(true);
    setLiveError(null);
    try {
      const { data: calls, error: callsError } = await pilotRpc<Record<string, unknown>[]>('get_admin_coaching_calls');
      if (callsError) throw callsError;
      if (!calls?.length) {
        setCall(null); setCards([]); return;
      }
      const activeCall = toCall(calls[0]);
      setCall(activeCall);
      const { data, error } = await pilotRpc<Record<string, unknown>[]>('get_admin_coaching_queue', { p_call_id: activeCall.callId });
      if (error) throw error;
      setCards(Array.isArray(data) ? data.map(toCard) : []);
    } catch (error: unknown) {
      setLiveError(getErrorMessage(error, 'The private coaching queue migration is not available in this database.'));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'demo') {
      setCall(seeded.call); setCards(seeded.cards); setLiveError(null); return;
    }
    void loadLive();
    const timer = window.setInterval(() => void loadLive(), 5000);
    return () => window.clearInterval(timer);
  }, [loadLive, mode, seeded]);

  const liveQueue = useMemo(() => {
    const liveCards = cards.filter(card => card.privacyRoute === 'live_queue');
    return mode === 'live'
      ? [...liveCards].sort((left, right) => (left.queuePosition ?? Number.MAX_SAFE_INTEGER) - (right.queuePosition ?? Number.MAX_SAFE_INTEGER))
      : sortCoachingQueue(liveCards);
  }, [cards, mode]);
  const privateRequests = cards.filter(card => card.privacyRoute === 'private_written');
  const testPosition = liveQueue.findIndex(card => card.id === testRequestId) + 1;
  const windowState = call ? getQueueWindowState(call, new Date(clockNow)) : 'closed';

  const updateForm = <K extends keyof RequestForm>(key: K, value: RequestForm[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!call || form.question.trim().length < 3) {
      toast.error('Add your coaching question first.'); return;
    }
    if (mode === 'demo') {
      const existing = cards.find(card => card.id === testRequestId);
      const id = existing?.id || crypto.randomUUID();
      const updated: QueueCard = {
        id, userId: 'demo-current-user', memberName: 'You (test view)', question: form.question.trim(),
        desiredResult: form.desiredResult || null, whatTried: form.whatTried || null, blocker: form.blocker || null,
        deadline: form.deadline || null, goal: 'Your current 90-day goal', milestone: 'Your current milestone',
        capacity: 'normal', lastCheckinAt: new Date().toISOString(), latestWins: null, latestChallenges: form.blocker || null,
        previousCoachingNotes: [],
        attendanceIntent: form.attendanceIntent, coachIfAbsent: form.coachIfAbsent,
        replayPermission: form.replayPermission, sensitive: form.sensitive,
        privacyRoute: form.privacyRoute, waitingSince: existing?.waitingSince || new Date().toISOString(),
        joinedAt: form.privacyRoute === 'live_queue' && canJoinQueue(call, { joinedAt: existing?.joinedAt || null })
          ? existing?.joinedAt || new Date().toISOString() : null,
        coachedCount: 0, lastCoachedAt: null, timesSkipped: 0, returningSupportNeeded: false,
        manualPriority: null, manualPriorityReason: null,
        queuePosition: null,
      };
      setCards(current => [...current.filter(card => card.id !== id), updated]);
      setTestRequestId(id);
      toast.success(form.privacyRoute === 'private_written' ? 'Private written request saved.' : 'You joined the private test queue.');
      return;
    }

    try {
      setLoading(true);
      const rpcName = form.privacyRoute === 'live_queue'
        ? 'save_and_join_my_coaching_queue'
        : 'save_my_coaching_request';
      const payload: Record<string, unknown> = {
        p_call_id: call.callId, p_cycle_id: null, p_question: form.question,
        p_desired_result: form.desiredResult || null, p_what_tried: form.whatTried || null,
        p_blocker: form.blocker || null, p_deadline: form.deadline || null,
        p_attendance_intent: form.attendanceIntent, p_coach_if_absent: form.coachIfAbsent,
        p_replay_permission: form.replayPermission, p_sensitive: form.sensitive,
        p_returning_support_needed: false, p_source_weekly_review_id: null,
      };
      if (form.privacyRoute === 'private_written') payload.p_privacy_route = 'private_written';
      const { data: receipt, error } = await pilotRpc<string | Record<string, unknown>>(rpcName, payload);
      if (error) throw error;
      const requestId = typeof receipt === 'string' ? receipt : String(receipt?.request_id || '');
      if (!requestId) throw new Error('The coaching request did not return a receipt.');
      setTestRequestId(requestId);
      await loadLive();
      toast.success(form.privacyRoute === 'private_written' ? 'Private written request saved.' : 'You joined the coaching queue.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'The coaching request was not saved.'));
    } finally {
      setLoading(false);
    }
  };

  const overridePriority = async (card: QueueCard) => {
    const reason = window.prompt('Why are you moving this request to the front?');
    if (!reason?.trim()) return;
    if (mode === 'demo') {
      setCards(current => current.map(item => item.id === card.id
        ? { ...item, manualPriority: 1, manualPriorityReason: reason.trim() } : item));
      toast.success('Manual priority recorded in the demo.');
      return;
    }
    const { error } = await pilotRpc<boolean>('set_coaching_priority_override', {
      p_request_id: card.id, p_priority: 1, p_reason: reason.trim(),
    });
    if (error) toast.error(error.message); else { toast.success('Queue adjusted.'); await loadLive(); }
  };

  const withdrawRequest = async () => {
    if (!testRequestId) return;
    if (mode === 'demo') {
      setCards(current => current.filter(card => card.id !== testRequestId));
      setTestRequestId(null);
      toast.success('Your demo request was withdrawn.');
      return;
    }
    const { error } = await pilotRpc<boolean>('withdraw_my_coaching_request', { p_request_id: testRequestId });
    if (error) toast.error(error.message);
    else {
      setTestRequestId(null);
      toast.success('Your coaching request was withdrawn.');
      await loadLive();
    }
  };

  const recordOutcome = async () => {
    if (!selected || !decision.trim() || !nextAction.trim()) {
      toast.error('Add the decision and next action.'); return;
    }
    if (mode === 'demo') {
      setCards(current => current.filter(card => card.id !== selected.id));
      toast.success('Coaching outcome saved in demo mode. The test action is shown as Planner-bound.');
    } else {
      const { error } = await pilotRpc<Record<string, unknown>>('complete_coaching_request', {
        p_request_id: selected.id, p_disposition: disposition, p_main_decision: decision,
        p_next_action: nextAction, p_due_date: dueDate || null,
        p_resource_recommended: resource || null, p_follow_up_required: followUp,
        p_follow_up_note: null, p_add_to_planner: true,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Outcome saved and the next action was added to the member’s Planner.');
      await loadLive();
    }
    setSelected(null); setDecision(''); setNextAction(''); setDueDate(''); setResource(''); setFollowUp(false); setDisposition('completed');
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="gap-1"><LockKeyhole className="h-3 w-3" /> Hidden pilot</Badge>
              <Badge variant={mode === 'demo' ? 'secondary' : 'default'}>{mode === 'demo' ? 'Local demo data' : 'Live pilot database'}</Badge>
            </div>
            <h1 className="text-3xl font-bold">Coaching Queue</h1>
            <p className="text-muted-foreground">Private test surface — no Planner navigation link and no member launch.</p>
          </div>
          <div className="flex gap-2">
            <Button variant={mode === 'demo' ? 'default' : 'outline'} onClick={() => setMode('demo')}>Demo</Button>
            <Button variant={mode === 'live' ? 'default' : 'outline'} onClick={() => setMode('live')}>Live pilot</Button>
            {mode === 'live' && <Button variant="outline" size="icon" onClick={() => void loadLive()}><RefreshCw className="h-4 w-4" /></Button>}
          </div>
        </div>

        <Alert className="border-amber-500/40 bg-amber-500/5">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Private by design</AlertTitle>
          <AlertDescription>
            Demo mode uses fake local records only. Live pilot mode is admin-gated. Full questions and priority details are never shown in the member status view.
          </AlertDescription>
        </Alert>

        {liveError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Live pilot is not connected</AlertTitle><AlertDescription>{liveError}</AlertDescription></Alert>}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{call?.title || 'No coaching call scheduled'}</CardTitle>
                <CardDescription>{call ? `${format(new Date(call.startsAt), 'EEEE, MMM d · h:mm a')} · queue closes ${format(new Date(call.queueClosesAt), 'h:mm a')}` : 'Create a private pilot call after the migration is connected.'}</CardDescription>
              </div>
              <Badge variant={windowState === 'open' ? 'default' : 'secondary'} className="gap-1">
                <Clock3 className="h-3 w-3" /> {windowState === 'open' ? 'Arrival window open' : windowState === 'before' ? 'Not open yet' : 'Queue closed'}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="member">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="member">Member test view</TabsTrigger>
            <TabsTrigger value="faith">Faith’s live queue</TabsTrigger>
          </TabsList>

          <TabsContent value="member" className="mt-6 space-y-5">
            {testRequestId && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <UserRoundCheck className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">{getEstimatedQueueStatus(testPosition, liveQueue.length)}</p>
                      <p className="text-sm text-muted-foreground">
                        {testPosition > 0 ? `Your place: ${testPosition} · ${liveQueue.length} people waiting` : 'Your private request is with Faith and is not in the public call queue.'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">This is an estimate, not a promise that coaching will happen on this call.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <form onSubmit={submitRequest} className="space-y-5">
              <Card>
                <CardHeader><CardTitle>What would help you move forward?</CardTitle><CardDescription>You can prepare early, but your queue place is earned only when you arrive during the open window.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>What do you want coaching on?</Label><Textarea value={form.question} onChange={event => updateForm('question', event.target.value)} rows={3} required /></div>
                  <div className="space-y-2"><Label>What decision or result do you want by the end?</Label><Textarea value={form.desiredResult} onChange={event => updateForm('desiredResult', event.target.value)} rows={2} /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>What have you already tried?</Label><Textarea value={form.whatTried} onChange={event => updateForm('whatTried', event.target.value)} rows={3} /></div>
                    <div className="space-y-2"><Label>What feels like the real blocker?</Label><Textarea value={form.blocker} onChange={event => updateForm('blocker', event.target.value)} rows={3} /></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Deadline, if there is one</Label><Input type="date" value={form.deadline} onChange={event => updateForm('deadline', event.target.value)} /></div>
                    <div className="space-y-2"><Label>Will you attend live?</Label><Select value={form.attendanceIntent} onValueChange={value => updateForm('attendanceIntent', value as RequestForm['attendanceIntent'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="live">Yes, live</SelectItem><SelectItem value="absent_ok">No — coach me if absent</SelectItem><SelectItem value="unsure">Not sure yet</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-3 rounded-lg border p-4">
                    <label className="flex items-start gap-3"><Checkbox checked={form.coachIfAbsent} onCheckedChange={checked => updateForm('coachIfAbsent', checked === true)} /><span><span className="font-medium">Faith may coach this if I’m absent</span><span className="block text-sm text-muted-foreground">Your request can still be useful even if you miss the call.</span></span></label>
                    <label className="flex items-start gap-3"><Checkbox checked={form.replayPermission} onCheckedChange={checked => updateForm('replayPermission', checked === true)} /><span><span className="font-medium">Okay to include in the private replay/podcast</span><span className="block text-sm text-muted-foreground">Unchecked means no replay permission.</span></span></label>
                    <label className="flex items-start gap-3"><Checkbox checked={form.sensitive} onCheckedChange={checked => updateForm('sensitive', checked === true)} /><span><span className="font-medium">This includes something sensitive</span><span className="block text-sm text-muted-foreground">Only Faith and authorized support staff see the details.</span></span></label>
                  </div>
                  <div className="space-y-2"><Label>How should Faith handle it?</Label><Select value={form.privacyRoute} onValueChange={value => updateForm('privacyRoute', value as RequestForm['privacyRoute'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="live_queue">Live coaching queue</SelectItem><SelectItem value="private_written">Private written coaching</SelectItem></SelectContent></Select></div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" disabled={loading || !call} className="flex-1 gap-2"><PlayCircle className="h-4 w-4" />{form.privacyRoute === 'private_written' ? 'Save private request' : testRequestId ? 'Update and raise my hand' : 'Raise my hand'}</Button>
                    {testRequestId && <Button type="button" variant="outline" onClick={() => void withdrawRequest()}>Withdraw request</Button>}
                  </div>
                </CardContent>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="faith" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardContent className="pt-6"><p className="text-3xl font-bold">{liveQueue.length}</p><p className="text-sm text-muted-foreground">Live queue</p></CardContent></Card>
              <Card><CardContent className="pt-6"><p className="text-3xl font-bold">{liveQueue.filter(card => card.coachedCount === 0).length}</p><p className="text-sm text-muted-foreground">Never coached</p></CardContent></Card>
              <Card><CardContent className="pt-6"><p className="text-3xl font-bold">{privateRequests.length}</p><p className="text-sm text-muted-foreground">Private written</p></CardContent></Card>
            </div>

            <div className="space-y-4">
              {liveQueue.map((card, index) => (
                <Card key={card.id} className={card.manualPriority ? 'border-primary/50' : ''}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><CardTitle className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{index + 1}</span>{card.memberName}</CardTitle><CardDescription>Waiting {formatDistanceToNow(new Date(card.waitingSince))} · {card.coachedCount === 0 ? 'Never coached' : `Last coached ${card.lastCoachedAt ? formatDistanceToNow(new Date(card.lastCoachedAt), { addSuffix: true }) : 'unknown'}`}</CardDescription></div>
                      <div className="flex flex-wrap gap-2">{card.timesSkipped > 0 && <Badge variant="secondary">Skipped {card.timesSkipped}×</Badge>}{card.deadline && <Badge variant="destructive">Deadline {format(new Date(`${card.deadline}T12:00:00`), 'MMM d')}</Badge>}{card.capacity && <Badge variant="outline">{card.capacity} capacity</Badge>}{card.manualPriority && <Badge>Manual: {card.manualPriorityReason}</Badge>}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3 rounded-lg bg-muted/40 p-4"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Question</p><p>{card.question}</p></div>{card.desiredResult && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Desired result</p><p>{card.desiredResult}</p></div>}{card.whatTried && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Already tried</p><p>{card.whatTried}</p></div>}{card.blocker && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Real blocker</p><p>{card.blocker}</p></div>}</div>
                      <div className="space-y-3 rounded-lg border p-4"><div><p className="text-xs font-semibold uppercase text-muted-foreground">90-day goal</p><p>{card.goal || 'No current goal found'}</p></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Milestone</p><p>{card.milestone || 'No milestone confirmed'}</p></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Latest check-in</p><p>{card.lastCheckinAt ? formatDistanceToNow(new Date(card.lastCheckinAt), { addSuffix: true }) : 'No recent check-in'}</p>{card.latestWins && <p className="mt-1 text-sm"><strong>Win:</strong> {card.latestWins}</p>}{card.latestChallenges && <p className="mt-1 text-sm"><strong>Challenge:</strong> {card.latestChallenges}</p>}</div>{card.previousCoachingNotes[0] && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Previous coaching</p><p className="text-sm">{card.previousCoachingNotes[0].main_decision || 'No decision recorded'}</p>{card.previousCoachingNotes[0].result_note && <p className="text-sm text-muted-foreground">Result: {card.previousCoachingNotes[0].result_note}</p>}</div>}<div className="flex gap-2"><Badge variant="outline">{card.attendanceIntent}</Badge><Badge variant={card.replayPermission ? 'secondary' : 'outline'}>{card.replayPermission ? 'Replay okay' : 'No replay permission'}</Badge>{card.coachIfAbsent && <Badge variant="secondary">Coach if absent</Badge>}</div></div>
                    </div>
                    <div className="flex flex-wrap gap-2"><Button onClick={() => setSelected(card)} className="gap-2"><CheckCircle2 className="h-4 w-4" />Record coaching</Button><Button variant="outline" onClick={() => void overridePriority(card)}>Manual override</Button></div>
                  </CardContent>
                </Card>
              ))}
              {!liveQueue.length && <Card className="border-dashed"><CardContent className="py-12 text-center"><ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-medium">No one is in the live queue.</p></CardContent></Card>}
            </div>

            {privateRequests.length > 0 && <div className="space-y-3"><h2 className="flex items-center gap-2 text-xl font-semibold"><LockKeyhole className="h-5 w-5" />Private written requests</h2>{privateRequests.map(card => <Card key={card.id}><CardHeader><CardTitle>{card.memberName}</CardTitle><CardDescription>Not assigned a live queue position</CardDescription></CardHeader><CardContent className="space-y-3"><p>{card.question}</p><Button variant="outline" size="sm" onClick={() => { setSelected(card); setDisposition('private_written'); }}>Record private response</Button></CardContent></Card>)}</div>}

            {selected && <Card className="border-primary/40"><CardHeader><CardTitle>Record coaching for {selected.memberName}</CardTitle><CardDescription>This creates the member’s coaching receipt and Planner next action.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Outcome</Label><Select value={disposition} onValueChange={value => setDisposition(value as typeof disposition)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="completed">Coaching completed</SelectItem><SelectItem value="ask_faith">Move to Ask Faith</SelectItem><SelectItem value="private_written">Private written coaching</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Main decision</Label><Textarea value={decision} onChange={event => setDecision(event.target.value)} /></div><div className="space-y-2"><Label>Next action</Label><Textarea value={nextAction} onChange={event => setNextAction(event.target.value)} /></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></div><div className="space-y-2"><Label>Resource recommended</Label><Input value={resource} onChange={event => setResource(event.target.value)} /></div></div><label className="flex items-center gap-3"><Checkbox checked={followUp} onCheckedChange={checked => setFollowUp(checked === true)} /><span>Follow-up required</span></label><div className="flex gap-2"><Button onClick={() => void recordOutcome()}>Save outcome + Planner action</Button><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button></div></CardContent></Card>}
          </TabsContent>
        </Tabs>

        <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />The test route is intentionally absent from desktop and mobile navigation.</p>
      </div>
    </Layout>
  );
}
