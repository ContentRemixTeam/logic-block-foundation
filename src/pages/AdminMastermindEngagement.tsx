import { useEffect, useState } from 'react';
import { Activity, AlertCircle, MessageCircle, RefreshCw, Users, Video } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => any };
interface EngagementRow { user_id: string; email: string; last_sign_in_at: string | null; last_meaningful_activity: string | null; phase_status: string; videos_started: number; videos_completed: number; coaching_conversations: number; needs_human: number; engagement_state: 'new' | 'active' | 'slipping' | 'dormant' | 'returned' }
interface CoachingRow { conversation_id: string; email: string; topic: string; status: string; member_question: string; assistant_answer: string; rating: string | null; reason_code: string | null; needs_human: boolean; created_at: string }

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'No activity yet';

export default function AdminMastermindEngagement() {
  const [rows, setRows] = useState<EngagementRow[]>([]);
  const [conversations, setConversations] = useState<CoachingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true); setError(null);
    const [activityResult, coachingResult] = await Promise.all([db.rpc('admin_mastermind_member_engagement'), db.rpc('admin_mastermind_recent_coaching', { p_limit: 50 })]);
    const loadError = activityResult.error || coachingResult.error;
    if (loadError) setError(loadError.message || 'Member activity could not load.');
    else { setRows(Array.isArray(activityResult.data) ? activityResult.data as EngagementRow[] : []); setConversations(Array.isArray(coachingResult.data) ? coachingResult.data as CoachingRow[] : []); }
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const active = rows.filter((row) => row.engagement_state === 'active').length;
  const needsHelp = rows.reduce((sum, row) => sum + Number(row.needs_human || 0), 0);
  const dormant = rows.filter((row) => row.engagement_state === 'dormant').length;
  return <Layout><main className="mx-auto w-full max-w-7xl space-y-6 pb-16"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">Private admin</p><h1 className="text-3xl font-bold">Mastermind member activity</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Meaningful progress—not surveillance. Re-engagement stays human-approved.</p></div><Button variant="outline" disabled={loading} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>{error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}<section className="grid gap-3 sm:grid-cols-3"><Metric icon={Activity} label="Active this week" value={active} /><Metric icon={MessageCircle} label="Needs human help" value={needsHelp} /><Metric icon={Users} label="May need re-engagement" value={dormant} /></section><Card><CardHeader><CardTitle className="text-lg">Members</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-y bg-muted/30 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Member</th><th className="p-3">Engagement</th><th className="p-3">Last meaningful activity</th><th className="p-3">Phase One</th><th className="p-3">Videos</th><th className="p-3">Coaching</th></tr></thead><tbody>{rows.map((row) => <tr key={row.user_id} className="border-b"><td className="p-3"><p className="font-medium">{row.email}</p><p className="text-xs text-muted-foreground">Last sign-in: {formatDate(row.last_sign_in_at)}</p></td><td className="p-3"><Badge variant={row.engagement_state === 'active' ? 'default' : 'outline'}>{row.engagement_state}</Badge></td><td className="p-3">{formatDate(row.last_meaningful_activity)}</td><td className="p-3">{row.phase_status.replace('_',' ')}</td><td className="p-3"><Video className="mr-1 inline h-4 w-4" />{row.videos_completed}/{row.videos_started}</td><td className="p-3">{row.coaching_conversations} conversations{Number(row.needs_human) > 0 && <Badge className="ml-2" variant="destructive">{row.needs_human} need help</Badge>}</td></tr>)}{!loading && rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No Phase One activity yet.</td></tr>}</tbody></table></div></CardContent></Card><Card><CardHeader><CardTitle className="text-lg">What members are asking</CardTitle><p className="text-sm text-muted-foreground">Private coaching review. Do not reuse member details in another member's answer.</p></CardHeader><CardContent className="space-y-3">{conversations.map((conversation) => <details key={conversation.conversation_id} className="rounded-xl border p-4"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{conversation.email}</p><p className="text-sm text-muted-foreground">{conversation.member_question}</p></div><div className="flex gap-2"><Badge variant="outline">{conversation.topic}</Badge>{conversation.needs_human && <Badge variant="destructive">Needs help</Badge>}</div></div></summary><div className="mt-4 space-y-3 border-t pt-3"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Saved answer</p><pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{conversation.assistant_answer}</pre></div><p className="text-xs text-muted-foreground">Rating: {conversation.rating || 'Not rated'}{conversation.reason_code ? ` · ${conversation.reason_code}` : ''} · {formatDate(conversation.created_at)}</p></div></details>)}{!loading && conversations.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No saved coaching conversations yet.</p>}</CardContent></Card></main></Layout>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: number }) { return <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>; }
