import { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/system/LoadingState';

type Submission = { id: string; first_name: string; email: string; answers: Record<string, unknown>; current_step: number; completed_at: string | null; created_at: string; updated_at: string };

const answerText = (answers: Record<string, unknown>) => Object.entries(answers).flatMap(([section, value]) =>
  value && typeof value === 'object' ? Object.entries(value as Record<string, unknown>).map(([key, item]) => `${section}.${key}: ${Array.isArray(item) ? item.join(', ') : String(item || '')}`) : [`${section}: ${String(value || '')}`]
).filter(line => !line.endsWith(': ')).join('\n');

export default function LowBatteryWorkshopAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => { (async () => {
    if (!user) return setLoading(false);
    const { data: admin } = await supabase.rpc('is_admin', { check_user_id: user.id });
    if (!admin) return setLoading(false);
    setAllowed(true);
    const { data } = await supabase.from('low_battery_workshop_submissions').select('id,first_name,email,answers,current_step,completed_at,created_at,updated_at').order('created_at', { ascending: false });
    setRows((data || []) as Submission[]);
    setLoading(false);
  })(); }, [user]);

  const visible = useMemo(() => rows.filter(row => `${row.first_name} ${row.email}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [['Name', 'Email', 'Progress', 'Completed', 'Created', 'Answers'], ...visible.map(row => [row.first_name, row.email, `${row.current_step}/7`, row.completed_at || '', row.created_at, answerText(row.answers)])].map(line => line.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = 'low-battery-workshop-answers.csv'; link.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState />;
  if (!allowed) return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-bold">Admin access required</h1></main>;
  return <main className="mx-auto max-w-6xl space-y-6 p-4 py-8 md:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wider text-primary">Workshop backend</p><h1 className="text-3xl font-bold">Low-Battery Planner Answers</h1><p className="mt-2 text-muted-foreground">{rows.length} submission{rows.length === 1 ? '' : 's'}</p></div><Button onClick={exportCsv} disabled={!visible.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button></div>
    <label className="relative block max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or email" /></label>
    <div className="space-y-3">{visible.map(row => <details key={row.id} className="rounded-xl border bg-card p-4"><summary className="cursor-pointer list-none"><div className="flex flex-wrap justify-between gap-3"><div><strong>{row.first_name}</strong><p className="text-sm text-muted-foreground">{row.email}</p></div><div className="text-right text-sm"><p>{row.completed_at ? 'Completed' : `Step ${row.current_step} of 7`}</p><p className="text-muted-foreground">{new Date(row.updated_at).toLocaleString()}</p></div></div></summary><pre className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs leading-6">{answerText(row.answers) || 'No answers saved yet.'}</pre></details>)}</div>
  </main>;
}
