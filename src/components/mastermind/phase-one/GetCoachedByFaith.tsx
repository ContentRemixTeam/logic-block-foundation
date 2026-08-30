import { useState } from 'react';
import { CalendarDays, MessageCircle, Send, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMastermindAI, parseAIJson } from '@/hooks/useMastermindAI';
import type { CoachingContext } from '@/hooks/useMastermindPhaseOne';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => any };
type Mode = 'next' | 'smaller' | 'evidence' | 'stuck' | 'coaching' | 'restart';
interface CoachAnswer { diagnosis: string; action: string; reason: string; evidence: string; askFaithDraft: string }
interface SavedExchange { conversation_id: string; assistant_message_id: string }

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'next', label: 'What should I do next?' }, { id: 'smaller', label: 'Make this smaller' },
  { id: 'evidence', label: 'Interpret my evidence' }, { id: 'stuck', label: 'I am stuck' },
  { id: 'coaching', label: 'Prepare for coaching' }, { id: 'restart', label: 'Help me restart' },
];

function deterministicAnswer(mode: Mode, context: CoachingContext | null, memberText: string): CoachAnswer {
  const result = context?.plan?.result?.trim() || 'your current 90-day result';
  const actions: Record<Mode, string> = {
    next: context?.plan?.minimumMove?.trim() || 'Schedule one 20-minute action that puts this plan in front of the real world.',
    smaller: 'Cut the next move down to one 20-minute draft, message, decision, or test.',
    evidence: 'Record what you tried, who encountered it, and the response before changing the plan.',
    stuck: 'Name the exact step you are avoiding, then do the smallest visible version once.',
    coaching: 'Write one decision question and bring what you tried plus what happened to the next coaching call.',
    restart: 'Keep the same result for 48 hours and complete one reduced move before rebuilding the plan.',
  };
  const diagnoses: Record<Mode, string> = {
    next: 'You need a real attempt before you need more strategy.', smaller: 'The move is larger than the capacity available right now.',
    evidence: 'You have information to organize, but not enough reason yet to replace the whole plan.',
    stuck: 'This looks more like a decision or follow-through problem than a curriculum problem.',
    coaching: 'Human judgment will help most once the decision and evidence are specific.',
    restart: 'A missed week does not automatically mean the goal or strategy failed.',
  };
  return { diagnosis: diagnoses[mode], action: actions[mode], reason: `This protects ${result} while creating evidence instead of adding more planning.`, evidence: 'Bring back the attempt, the response, and what you want to decide next.', askFaithDraft: `My 90-day result is: ${result}. Right now: ${memberText.trim()}. I tried: ____. The evidence was: ____. The one decision I need help with is: ____.` };
}

function validAnswer(value: unknown): value is CoachAnswer {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return ['diagnosis','action','reason','evidence','askFaithDraft'].every((key) => typeof row[key] === 'string' && (row[key] as string).trim().length > 0 && (row[key] as string).length <= 1200);
}

export function GetCoachedByFaith({ context, hasAiKey, onOpenAiSettings, onCreateTask }: { context: CoachingContext | null; hasAiKey: boolean; onOpenAiSettings: () => void; onCreateTask: () => void }) {
  const ai = useMastermindAI();
  const [mode, setMode] = useState<Mode>('next');
  const [memberText, setMemberText] = useState('');
  const [shareWithProvider, setShareWithProvider] = useState(false);
  const [answer, setAnswer] = useState<CoachAnswer | null>(null);
  const [saved, setSaved] = useState<SavedExchange | null>(null);
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAnswer = async () => {
    if (memberText.trim().length < 5) { setError('Tell me a little more about what is happening first.'); return; }
    setError(null); setRating(null);
    let next = deterministicAnswer(mode, context, memberText);
    let provider = 'deterministic';
    if (hasAiKey && shareWithProvider) {
      try {
        const result = await ai.mutateAsync({ temperature: 0.25, max_tokens: 700, messages: [
          { role: 'system', content: `You are the bounded Get Coached assistant for Faith Mariah's Mastermind. Use supplied plan facts only. Never pretend to be Faith. Give exactly one diagnosis, action, reason, evidence target, and Ask Faith draft. Ordinary spoken language; no invented links, stories, or results. Return concise JSON with keys diagnosis, action, reason, evidence, askFaithDraft.` },
          { role: 'user', content: JSON.stringify({ mode, plan: context?.plan ?? null, memberQuestion: memberText.trim() }) },
        ] });
        const parsed = parseAIJson<CoachAnswer>(result.content);
        if (validAnswer(parsed)) { next = parsed; provider = result.provider; }
      } catch { setError('Your AI provider was unavailable, so I used the private no-key guidance instead.'); }
    }
    setAnswer(next);
    const { data, error: saveError } = await db.rpc('save_my_mastermind_coaching_exchange', { p_topic: mode, p_user_message: memberText.trim(), p_assistant_message: JSON.stringify(next), p_response_version: 'phase-one-coach-v1', p_provider: provider, p_resource_id: null, p_conversation_id: saved?.conversation_id ?? null });
    if (saveError) setError('Your answer is here, but the private conversation history did not save.'); else setSaved(data as SavedExchange);
  };

  const rate = async (nextRating: 'helpful' | 'not_helpful', needsHuman = false) => {
    if (!saved?.assistant_message_id) return;
    setRating(nextRating);
    const { error: feedbackError } = await db.rpc('rate_my_mastermind_coaching_answer', { p_assistant_message_id: saved.assistant_message_id, p_rating: nextRating, p_reason_code: nextRating === 'not_helpful' ? 'not_useful' : null, p_note: null, p_needs_human: needsHuman });
    if (feedbackError) setError('Your feedback did not save. Please try again.');
  };

  return <Card className="overflow-hidden border-sky-200 shadow-sm dark:border-sky-900"><CardHeader className="border-b bg-gradient-to-r from-sky-50 to-background dark:from-sky-950/20"><div className="flex items-center justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><MessageCircle className="h-5 w-5" /></div><Badge variant="outline">{hasAiKey ? 'AI key available' : 'Private no-key guidance'}</Badge></div><CardTitle className="text-xl">Get Coached</CardTitle><CardDescription>Turn your plan and evidence into one useful next move.</CardDescription></CardHeader><CardContent className="space-y-4 p-5"><div role="group" aria-label="What kind of help do you need?" className="flex flex-wrap gap-2">{MODES.map((item) => <Button key={item.id} size="sm" className="min-h-11 h-auto whitespace-normal" variant={mode === item.id ? 'default' : 'outline'} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setAnswer(null); }}>{item.label}</Button>)}</div><div><Label htmlFor="phase-one-coaching-context">What is happening right now?</Label><Textarea id="phase-one-coaching-context" className="mt-2 min-h-28" value={memberText} onChange={(event) => setMemberText(event.target.value)} placeholder="Tell me what you are trying, what happened, and where you feel stuck." /></div>{hasAiKey ? <label className="flex items-start gap-3 rounded-xl border p-3 text-sm"><Checkbox checked={shareWithProvider} onCheckedChange={(value) => setShareWithProvider(value === true)} /><span><strong>Use my connected AI provider</strong><span className="mt-1 block text-xs text-muted-foreground">This sends this question and the shown plan facts to your OpenAI or Anthropic API account. Leave unchecked to keep the answer inside the Planner.</span></span></label> : <Button variant="link" className="h-auto p-0 text-xs" onClick={onOpenAiSettings}>Connect OpenAI or Claude for optional richer coaching</Button>}<Button className="min-h-11 w-full" disabled={ai.isPending} onClick={() => void getAnswer()}><Sparkles className="mr-2 h-4 w-4" />{ai.isPending ? 'Thinking…' : 'Give me one next move'}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{answer && <div className="space-y-3 rounded-2xl border bg-muted/20 p-4" aria-live="polite"><AnswerLine label="What I see" value={answer.diagnosis} /><AnswerLine label="Do this next" value={answer.action} /><AnswerLine label="Why" value={answer.reason} /><AnswerLine label="Evidence to bring back" value={answer.evidence} /><div className="flex flex-col gap-2 sm:flex-row"><Button className="min-h-11 flex-1" onClick={onCreateTask}>Propose a Planner task</Button><Button variant="outline" className="min-h-11 flex-1" onClick={() => void navigator.clipboard.writeText(answer.askFaithDraft)}><Send className="mr-1.5 h-4 w-4" />Copy coaching question</Button></div><div className="flex flex-wrap gap-2 border-t pt-3"><Button size="sm" variant={rating === 'helpful' ? 'default' : 'outline'} onClick={() => void rate('helpful')}><ThumbsUp className="mr-1 h-4 w-4" />Helpful</Button><Button size="sm" variant={rating === 'not_helpful' ? 'default' : 'outline'} onClick={() => void rate('not_helpful')}><ThumbsDown className="mr-1 h-4 w-4" />Not helpful</Button><Button size="sm" variant="outline" onClick={() => void rate('not_helpful', true)}><CalendarDays className="mr-1 h-4 w-4" />I still need help</Button></div><p className="text-xs text-muted-foreground">Faith-trained AI guidance based on approved Mastermind teaching. Faith did not personally write this reply. Conversations are saved and may be reviewed by Faith's authorized team to improve support.</p></div>}</CardContent></Card>;
}

function AnswerLine({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-relaxed">{value}</p></div>; }
