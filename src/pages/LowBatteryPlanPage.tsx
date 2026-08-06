import { useEffect, useMemo, useState } from 'react';
import { BatteryLow, ChevronLeft, ChevronRight, Clipboard, ExternalLink, Eye, EyeOff, Headphones, Loader2, Mail, Play, Printer, RotateCcw, Save, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type PlanData = {
  breaks: string[]; dependency: string;
  offer: string; buyer: string; outcome: string; salesMethod: string; salesOther: string;
  visibility: string; visibilityOther: string; discoveryAction: string;
  nurture: string; nurtureOther: string; nurtureShort: string; pathWorks: string; missingConnection: string;
  remove: string[]; removeOther: string; notResponsible: string; avoidance: string; parkingLot: string; reviewDate: string;
  findRegular: string; findLow: string; nurtureRegular: string; nurtureLow: string; sellRegular: string; sellLow: string; recovery: string;
  avoidedAction: string; limitingThought: string; feeling: string; instead: string; usefulBelief: string;
  moveDate: string; regularMove: string; lowMove: string;
};

const EMPTY: PlanData = {
  breaks: [], dependency: '', offer: '', buyer: '', outcome: '', salesMethod: '', salesOther: '',
  visibility: '', visibilityOther: '', discoveryAction: '', nurture: '', nurtureOther: '', nurtureShort: '',
  pathWorks: '', missingConnection: '', remove: [], removeOther: '', notResponsible: '', avoidance: '',
  parkingLot: '', reviewDate: '', findRegular: '', findLow: '', nurtureRegular: '', nurtureLow: '',
  sellRegular: '', sellLow: '', recovery: '', avoidedAction: '', limitingThought: '', feeling: '', instead: '',
  usefulBelief: '', moveDate: '', regularMove: '', lowMove: '',
};

const STORAGE_KEY = 'low-battery-business-plan-v1';
const VISITOR_KEY = 'low-battery-workshop-visitor-v1';
type WorkshopVisitor = { id: string; token: string; first_name: string; email: string };
const BREAK_OPTIONS = ['Content', 'Email / nurture', 'Selling', 'Client delivery', 'Planning', 'All of it'];
const SALES_OPTIONS = ['Live workshop / webinar', 'Short email promotion', 'Weekly direct invitations', 'Sales / consult calls', 'Evergreen sequence', 'Personal follow-up', 'Other'];
const VISIBILITY_OPTIONS = ['Searchable long-form content', 'Short-form video', 'Collaborations, bundles, or referrals', 'Speaking and live workshops', 'Paid ads', 'Direct outreach', 'Other'];
const NURTURE_OPTIONS = ['One useful weekly email', 'One podcast / video that becomes the email', 'A short email plus reused existing content', 'A recurring live touchpoint', 'Other'];
const REMOVE_OPTIONS = ['Rebuilding the website', 'Designing a new freebie', 'Starting a new platform', 'Creating another offer', 'Tweaking the branding', 'Consuming more training', 'Planning content that points nowhere', 'Automating an unproven process'];
const THOUGHTS = [
  'The right buyer cannot decide about an offer I keep hiding.',
  'This does not need to become a whole dramatic project.',
  'The offer does not need to be impressive. It needs to be clear.',
  'Facts are our friends.',
  'I can be disappointed and still be the business owner.',
  'I do not need to feel confident to complete one clear sales action.',
  'My brain can chatter after I send it.',
];

const stepMeta = [
  ['The Full-Battery Dependency', 'If the plan only works when you feel fine, feeling fine is part of the strategy.'],
  ['ONE Offer + ONE Way to Sell It', 'Visibility without an offer becomes another avoidance project.'],
  ['ONE Way People Find You', 'Choose the channel you can repeat, not the one a “real” business owner is supposed to use.'],
  ['ONE Nurture Rhythm', 'Attention is not the same as trust.'],
  ['What Comes Off the Plan', "A good idea is not automatically this week's assignment."],
  ['Build the Battery Floor', 'The low-battery plan is the minimum version that keeps the money path alive.'],
  ['The Thought + Next Money Move', 'The simple move feels hard for a reason.'],
] as const;

function TextField({ label, value, onChange, placeholder, area = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean }) {
  const cls = 'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/30';
  return <label className="block text-sm font-semibold text-foreground">{label}{area
    ? <textarea rows={3} className={cls} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    : <input className={cls} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}</label>;
}

function ChoiceGrid({ options, value, onChange, multi = false, crossed = false }: { options: string[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean; crossed?: boolean }) {
  const selected = (item: string) => multi ? (value as string[]).includes(item) : value === item;
  const choose = (item: string) => multi
    ? onChange(selected(item) ? (value as string[]).filter(x => x !== item) : [...(value as string[]), item])
    : onChange(item);
  return <div className="grid gap-2 sm:grid-cols-2">{options.map(item => <button key={item} type="button" aria-pressed={selected(item)} onClick={() => choose(item)} className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${selected(item) ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card hover:border-primary/40'} ${crossed && selected(item) ? 'line-through opacity-60' : ''}`}>{item}</button>)}</div>;
}

function ResultPlan({ data }: { data: PlanData }) {
  const sales = data.salesMethod === 'Other' ? data.salesOther : data.salesMethod;
  const visibility = data.visibility === 'Other' ? data.visibilityOther : data.visibility;
  const nurture = data.nurture === 'Other' ? data.nurtureOther : data.nurture;
  return <article id="low-battery-plan-result" className="print-plan space-y-5 rounded-2xl border bg-card p-6 shadow-sm md:p-8">
    <header className="border-b pb-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-primary">The next 90 days</p><h2 className="mt-1 text-3xl font-bold">My Low-Battery Business Plan</h2></header>
    <section><h3 className="font-bold">My Three ONEs</h3><p className="mt-2 text-sm leading-6">People find me through <strong>{visibility || '________'}</strong>. I stay connected through <strong>{nurture || '________'}</strong>. I sell <strong>{data.offer || '________'}</strong> to <strong>{data.buyer || '________'}</strong> through <strong>{sales || '________'}</strong>.</p></section>
    <section><h3 className="font-bold">What Comes Off</h3><p className="mt-2 text-sm">For 90 days, I am not responsible for: <strong>{data.notResponsible || data.remove.join(', ') || '________'}</strong></p></section>
    <section><h3 className="font-bold">My Battery Floor</h3><div className="mt-2 overflow-hidden rounded-xl border text-sm"><div className="grid grid-cols-3 bg-muted p-2 font-semibold"><span>Money path</span><span>Regular week</span><span>Low-battery week</span></div>{[['Get found', data.findRegular, data.findLow], ['Nurture', data.nurtureRegular, data.nurtureLow], ['Sell', data.sellRegular, data.sellLow]].map(r => <div key={r[0]} className="grid grid-cols-3 gap-2 border-t p-2"><strong>{r[0]}</strong><span>{r[1] || '—'}</span><span>{r[2] || '—'}</span></div>)}</div></section>
    <section><h3 className="font-bold">My Recovery Rule</h3><p className="mt-2 text-sm">When I miss a week, I will not catch up. I will restart with <strong>{data.recovery || '________'}</strong>.</p></section>
    <section className="grid gap-4 md:grid-cols-2"><div><h3 className="font-bold">The Thought I Am Not Letting Run the Plan</h3><p className="mt-2 text-sm">{data.limitingThought || '________'}</p></div><div><h3 className="font-bold">The Belief I Am Borrowing</h3><p className="mt-2 text-sm">{data.usefulBelief || '________'}</p></div></section>
    <section className="rounded-xl bg-primary/10 p-4"><h3 className="font-bold">My Next Seven-Day Money Move</h3><p className="mt-2 text-sm">By <strong>{data.moveDate || '________'}</strong>, I will complete <strong>{data.regularMove || '________'}</strong>. If my battery is low, I will complete <strong>{data.lowMove || '________'}</strong> instead.</p></section>
    <footer className="border-t pt-4 text-sm font-semibold">Low capacity does not mean low ambition. Keep the ambition. Remove the full-battery dependencies. Then return to the next useful move.</footer>
  </article>;
}

export default function LowBatteryPlanPage() {
  const [welcome, setWelcome] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [registering, setRegistering] = useState(false);
  const [visitor, setVisitor] = useState<WorkshopVisitor | null>(() => {
    try { return JSON.parse(localStorage.getItem(VISITOR_KEY) || 'null'); } catch { return null; }
  });
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState(false);
  const [presenter, setPresenter] = useState(false);
  const [data, setData] = useState<PlanData>(() => {
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch { return EMPTY; }
  });
  const [saveState, setSaveState] = useState('Saved on this device');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data: auth }) => setUserId(auth.user?.id || null)); }, []);
  useEffect(() => { setSaveState('Saving…'); const t = window.setTimeout(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); setSaveState('Saved on this device'); }, 250); return () => clearTimeout(t); }, [data]);
  useEffect(() => { if (visitor) { setFirstName(visitor.first_name); setEmail(visitor.email); } }, [visitor]);
  useEffect(() => {
    if (!visitor) return;
    const timer = window.setTimeout(async () => {
      const { data: saved, error } = await supabase.rpc('save_low_battery_workshop_answers', {
        p_submission_id: visitor.id,
        p_submission_token: visitor.token,
        p_answers: JSON.parse(JSON.stringify(data)) as Json,
        p_current_step: step,
        p_completed: preview,
      });
      if (error || !saved) toast.error('Your device copy is safe, but the workshop answer backup did not save.');
    }, 900);
    return () => window.clearTimeout(timer);
  }, [data, preview, step, visitor]);
  const update = (patch: Partial<PlanData>) => setData(d => ({ ...d, ...patch }));
  const progress = useMemo(() => Math.round((step / 7) * 100), [step]);

  const reset = () => { if (!window.confirm('Start over and erase the plan saved on this device?')) return; localStorage.removeItem(STORAGE_KEY); setData(EMPTY); setStep(1); setPreview(false); };
  const savePlanner = async () => {
    if (!userId) { toast.error('Log in to save this plan to the Planner. It is already saved on this device.'); return; }
    setSaveState('Saving to planner…');
    const payload = { user_id: userId, template_name: 'low-battery-business-plan', answers: data, completed_at: new Date().toISOString() };
    const { data: existing } = await supabase.from('wizard_completions').select('id').eq('user_id', userId).eq('template_name', payload.template_name).maybeSingle();
    const result = existing ? await supabase.from('wizard_completions').update(payload).eq('id', existing.id) : await supabase.from('wizard_completions').insert(payload);
    if (result.error) { setSaveState('Saved on this device'); toast.error('Could not save to the Planner. Your device copy is safe.'); }
    else { setSaveState('Saved to planner'); toast.success('Low-Battery plan saved to your Planner.'); }
  };
  const copyPlan = async () => { const text = (document.getElementById('low-battery-plan-result')?.innerText || ''); await navigator.clipboard.writeText(text); toast.success('Plan copied.'); };
  const enterWorkshop = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = firstName.trim(); const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !/^\S+@\S+\.\S+$/.test(cleanEmail)) return toast.error('Enter your name and a valid email address.');
    if (visitor && visitor.first_name === cleanName && visitor.email === cleanEmail) { setWelcome(false); return; }
    setRegistering(true);
    const { data: result, error } = await supabase.rpc('register_low_battery_workshop', { p_first_name: cleanName, p_email: cleanEmail });
    setRegistering(false);
    if (error || !result || typeof result !== 'object' || Array.isArray(result)) return toast.error('We could not save your registration. Please try again.');
    const record = result as Record<string, Json | undefined>;
    const nextVisitor = { id: String(record.id), token: String(record.token), first_name: String(record.first_name), email: String(record.email) };
    localStorage.setItem(VISITOR_KEY, JSON.stringify(nextVisitor)); setVisitor(nextVisitor); setWelcome(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <div className="space-y-6"><p className="helper text-sm text-muted-foreground">A full-battery dependency requires unusually reliable energy, focus, memory, confidence, or uninterrupted time.</p><div><h3 className="mb-3 font-semibold">What breaks first on a low-battery week?</h3><ChoiceGrid options={BREAK_OPTIONS} value={data.breaks} multi onChange={v => update({ breaks: v as string[] })} /></div><TextField area label="My current plan depends on me being able to…" value={data.dependency} onChange={v => update({ dependency: v })} /><div className="rounded-xl bg-primary/10 p-4 font-semibold">A bad week should reduce the plan, not erase it.</div></div>;
      case 2: return <div className="space-y-5"><p className="helper rounded-xl bg-muted p-4 text-sm">Choose the existing offer closest to money or with the most proof. Do not invent a new offer today.</p><TextField label="For the next 90 days, I am selling…" value={data.offer} onChange={v => update({ offer: v })} /><TextField label="To…" value={data.buyer} onChange={v => update({ buyer: v })} /><TextField label="Because it helps them…" value={data.outcome} onChange={v => update({ outcome: v })} /><div><h3 className="mb-3 font-semibold">I will primarily sell it through…</h3><ChoiceGrid options={SALES_OPTIONS} value={data.salesMethod} onChange={v => update({ salesMethod: v as string })} /></div>{data.salesMethod === 'Other' && <TextField label="My sales method" value={data.salesOther} onChange={v => update({ salesOther: v })} />}<div className="rounded-xl border p-4 text-sm">For 90 days, I am selling <strong>{data.offer || '____'}</strong> to <strong>{data.buyer || '____'}</strong> through <strong>{(data.salesMethod === 'Other' ? data.salesOther : data.salesMethod) || '____'}</strong>.</div></div>;
      case 3: return <div className="space-y-5"><div><h3 className="mb-3 font-semibold">New people will primarily find me through…</h3><ChoiceGrid options={VISIBILITY_OPTIONS} value={data.visibility} onChange={v => update({ visibility: v as string })} /></div>{data.visibility === 'Other' && <TextField label="My visibility channel" value={data.visibilityOther} onChange={v => update({ visibilityOther: v })} />}<TextField label="My smallest repeatable discovery action is…" value={data.discoveryAction} onChange={v => update({ discoveryAction: v })} /><p className="helper text-sm text-muted-foreground">Other channels may exist. They are not all assignments for this 90-day cycle.</p></div>;
      case 4: return <div className="space-y-5"><div><h3 className="mb-3 font-semibold">Each week, I will stay connected through…</h3><ChoiceGrid options={NURTURE_OPTIONS} value={data.nurture} onChange={v => update({ nurture: v as string })} /></div>{data.nurture === 'Other' && <TextField label="My nurture rhythm" value={data.nurtureOther} onChange={v => update({ nurtureOther: v })} />}<TextField label="The shortest version I will actually repeat is…" value={data.nurtureShort} onChange={v => update({ nurtureShort: v })} /><div className="rounded-xl border p-4 text-sm leading-6">People find me through <strong>{(data.visibility === 'Other' ? data.visibilityOther : data.visibility) || '____'}</strong>. I stay connected through <strong>{(data.nurture === 'Other' ? data.nurtureOther : data.nurture) || '____'}</strong>. I sell <strong>{data.offer || '____'}</strong> through <strong>{(data.salesMethod === 'Other' ? data.salesOther : data.salesMethod) || '____'}</strong>.</div><div><h3 className="mb-3 font-semibold">Can a real person reach a buying decision through this path?</h3><ChoiceGrid options={['Yes', 'Not yet']} value={data.pathWorks} onChange={v => update({ pathWorks: v as string })} /></div>{data.pathWorks === 'Not yet' && <TextField label="What connection is missing?" value={data.missingConnection} onChange={v => update({ missingConnection: v })} />}</div>;
      case 5: return <div className="space-y-5"><div><h3 className="mb-3 font-semibold">Cross off the work that is not part of this 90-day plan.</h3><ChoiceGrid options={REMOVE_OPTIONS} value={data.remove} multi crossed onChange={v => update({ remove: v as string[] })} /></div><TextField area label="For 90 days, I am not responsible for…" value={data.notResponsible} onChange={v => update({ notResponsible: v })} /><TextField label="My favorite productive-looking avoidance task is…" value={data.avoidance} onChange={v => update({ avoidance: v })} /><TextField label="I will park new ideas in…" value={data.parkingLot} onChange={v => update({ parkingLot: v })} /><TextField label="I will review the parking lot on…" value={data.reviewDate} onChange={v => update({ reviewDate: v })} /></div>;
      case 6: return <div className="space-y-5">{[
        ['GET FOUND', 'findRegular', 'findLow', 'Publish one full video', 'Repost one proven clip or send one collaboration pitch'],
        ['NURTURE', 'nurtureRegular', 'nurtureLow', 'Write a full weekly email', 'Send a 150-word note, story, or useful replay'],
        ['SELL', 'sellRegular', 'sellLow', 'Run the planned promotion', 'Send one direct sales email or follow up with five warm leads'],
      ].map(r => <div key={r[0]} className="rounded-xl border p-4"><h3 className="mb-4 font-bold">{r[0]}</h3><div className="grid gap-4 md:grid-cols-2"><TextField label="Regular-week action" placeholder={r[3]} value={data[r[1] as keyof PlanData] as string} onChange={v => update({ [r[1]]: v })} /><TextField label="Low-battery version" placeholder={r[4]} value={data[r[2] as keyof PlanData] as string} onChange={v => update({ [r[2]]: v })} /></div></div>)}<div className="helper rounded-xl bg-amber-500/10 p-4 text-sm font-medium">The low-battery version must still touch a buyer, lead, or offer. “Organize my files” is not the low-battery sales plan.</div><TextField label="When I miss a week, I will not catch up. I will restart with…" value={data.recovery} onChange={v => update({ recovery: v })} /><button type="button" className="helper text-sm font-semibold text-primary underline" onClick={() => update({ recovery: 'Return to the offer and complete one buyer-facing money move.' })}>Use Faith's suggested recovery rule</button><div className="rounded-xl bg-primary/10 p-4 font-semibold">A hard week can cost you a week. It does not automatically get the whole quarter.</div></div>;
      case 7: return <div className="space-y-5"><p className="helper rounded-xl bg-muted p-4 text-sm">Physical limits are real. This exercise addresses the meaning, fear, and decisions surrounding the action—not whether illness, ADHD, depression, or exhaustion are real.</p><TextField label="The action I keep avoiding is…" value={data.avoidedAction} onChange={v => update({ avoidedAction: v })} /><TextField label="When I imagine doing it, I think…" value={data.limitingThought} onChange={v => update({ limitingThought: v })} /><TextField label="That thought makes me feel…" value={data.feeling} onChange={v => update({ feeling: v })} /><TextField label="And instead I…" value={data.instead} onChange={v => update({ instead: v })} /><div className="rounded-xl border-l-4 border-primary bg-primary/10 p-4"><p className="font-bold">Two coaching questions</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm"><li>What are you thinking about the action you keep avoiding?</li><li>What would you need to believe to take the next useful step?</li></ol></div><TextField area label="A more useful belief I can borrow is…" value={data.usefulBelief} onChange={v => update({ usefulBelief: v })} /><div className="helper flex flex-wrap gap-2">{THOUGHTS.map(t => <button type="button" key={t} onClick={() => update({ usefulBelief: t })} className="rounded-full border px-3 py-2 text-left text-xs hover:border-primary">{t}</button>)}</div><div className="grid gap-4 md:grid-cols-3"><TextField label="By this date" value={data.moveDate} onChange={v => update({ moveDate: v })} /><TextField label="I will complete" value={data.regularMove} onChange={v => update({ regularMove: v })} /><TextField label="If my battery is low, I will complete" value={data.lowMove} onChange={v => update({ lowMove: v })} /></div></div>;
      default: return null;
    }
  };

  return <div className={`low-battery min-h-screen bg-background text-foreground ${presenter ? 'presenter-mode' : ''}`}>
    <style>{`@media print{body *{visibility:hidden}.print-plan,.print-plan *{visibility:visible}.print-plan{position:absolute;left:0;top:0;width:100%;border:0!important;box-shadow:none!important}.no-print{display:none!important}}.presenter-mode .teaching-note{font-size:1.35rem;line-height:1.55}.presenter-mode .helper{display:none}`}</style>
    <header className="no-print sticky top-0 z-20 border-b bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3"><div className="flex items-center gap-2"><BatteryLow className="h-6 w-6 text-primary" /><div><h1 className="font-bold leading-tight">The Low-Battery Business Plan</h1><p className="hidden text-xs text-muted-foreground sm:block">A 90-day plan that still works on a bad week.</p></div></div><div className="flex items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline">{saveState}</span><button type="button" onClick={() => setPresenter(v => !v)} className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm">{presenter ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}<span className="hidden sm:inline">Presenter</span></button></div></div></header>
    <main className="mx-auto max-w-4xl px-4 py-6 md:py-10">{welcome ? <section className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 shadow-sm md:p-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Welcome</p>
      <h2 className="mt-2 text-3xl font-bold md:text-4xl">You're in the right place.</h2>
      <p className="mt-4 text-lg leading-8 text-muted-foreground">You're about to build a 90-day business plan that can still run on a bad week.</p>
      <form onSubmit={enterWorkshop} className="mt-7 rounded-xl border bg-background p-4 md:p-5">
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="First name" value={firstName} onChange={setFirstName} placeholder="Your first name" /><TextField label="Email" value={email} onChange={setEmail} placeholder="you@example.com" /></div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">By continuing, you agree to receive workshop follow-up emails from Faith, including useful resources and podcast recommendations. Unsubscribe anytime.</p>
        <button type="submit" disabled={registering} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground disabled:opacity-60 sm:w-auto">{registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}{registering ? 'Saving…' : 'Enter the workshop'}<ChevronRight className="h-4 w-4" /></button>
      </form>
      <p className="mt-7 leading-7 text-foreground">While you're here, these are three ways to keep getting useful business support and find people to grow with.</p>
      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {[
          { title: 'Listen to the podcast', text: 'Practical business coaching for weeks when your energy and attention are not predictable.', href: 'https://home.faithmariah.com/podcast', icon: Headphones },
          { title: 'Subscribe on YouTube', text: 'Watch coaching, strategy, and the conversations behind the plan.', href: 'https://www.youtube.com/@FaithMariah?sub_confirmation=1', icon: Play },
          { title: 'Find collaborators', text: 'Meet business owners, find collaborations, and stop trying to grow alone in my Facebook group.', href: 'https://www.facebook.com/groups/faithmariah', icon: Users },
        ].map(({ title, text, href, icon: Icon }) => <a key={title} href={href} target="_blank" rel="noopener noreferrer" className="group rounded-xl border bg-background p-4 transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40">
          <div className="flex items-center justify-between gap-3"><Icon className="h-5 w-5 text-primary" aria-hidden="true" /><ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" /></div>
          <h3 className="mt-4 font-bold">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
        </a>)}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">Already started? Enter the same email on this device. Your saved answers are still here.</p>
    </section> : preview ? <><ResultPlan data={data} /><div className="no-print mt-5 flex flex-wrap gap-2"><button onClick={() => setPreview(false)} className="min-h-11 rounded-xl border px-4 font-semibold">Edit plan</button><button onClick={() => window.print()} className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><Printer className="h-4 w-4" />Print / Save PDF</button><button onClick={copyPlan} className="flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold"><Clipboard className="h-4 w-4" />Copy</button>{userId && <button onClick={savePlanner} className="flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold"><Save className="h-4 w-4" />Save to Planner</button>}<button onClick={reset} className="ml-auto flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm text-muted-foreground"><RotateCcw className="h-4 w-4" />Start over</button></div></> : <>
      <div className="mb-6"><div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground"><span>Step {step} of 7</span><button onClick={() => setPreview(true)} className="normal-case tracking-normal text-primary">Plan preview</button></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div></div>
      <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Build it with Faith</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">{stepMeta[step - 1][0]}</h2><blockquote className="teaching-note mt-4 rounded-xl border-l-4 border-primary bg-primary/10 p-4 font-semibold">“{stepMeta[step - 1][1]}”</blockquote><div className="mt-7">{renderStep()}</div></section>
      <div className="no-print mt-5 flex items-center justify-between"><button disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1))} className="flex min-h-12 items-center gap-2 rounded-xl border px-5 font-semibold disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Back</button><button onClick={() => step === 7 ? setPreview(true) : setStep(s => Math.min(7, s + 1))} className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground">{step === 7 ? 'See my plan' : 'Next'}<ChevronRight className="h-4 w-4" /></button></div>
    </>}</main>
  </div>;
}
