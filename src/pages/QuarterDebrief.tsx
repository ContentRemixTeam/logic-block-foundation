import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type QuarterOption = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
};

type QuarterDebriefRow = {
  id: string;
  quarter_key: string;
  quarter_label: string;
  quarter_start_date: string | null;
  quarter_end_date: string | null;
  what_worked: unknown;
  what_did_not_work: unknown;
  lessons_learned: unknown;
  carry_forward: unknown;
  leave_behind: unknown;
  business_sections: unknown;
  next_quarter_focus: string | null;
  support_needed: string | null;
  cycle_score: number | null;
  wants_next_quarter_plan: boolean | null;
  completed_at: string | null;
};

type QuarterDebriefsTable = {
  select: (columns?: string) => QuarterDebriefsTable;
  eq: (column: string, value: string) => QuarterDebriefsTable;
  maybeSingle: () => Promise<{ data: QuarterDebriefRow | null; error: { message?: string } | null }>;
  upsert: (
    value: Record<string, unknown>,
    options?: { onConflict?: string },
  ) => {
    select: (columns?: string) => {
      single: () => Promise<{ data: QuarterDebriefRow | null; error: { message?: string } | null }>;
    };
  };
  update: (value: Record<string, unknown>) => QuarterDebriefsTable;
  then: <TResult1 = { data: QuarterDebriefRow | null; error: { message?: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: QuarterDebriefRow | null; error: { message?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};

type BusinessSectionKey = 'lead_generation' | 'nurture' | 'sales' | 'delivery' | 'operations' | 'money';

type BusinessSectionReflection = {
  strategy: string;
  wins: string;
  lessons: string;
  nextShift: string;
};

type BusinessSectionsState = Record<BusinessSectionKey, BusinessSectionReflection>;

type BusinessSectionField = keyof BusinessSectionReflection;

type BusinessSectionConfig = {
  key: BusinessSectionKey;
  title: string;
  description: string;
  strategyLabel: string;
  strategyPlaceholder: string;
  winsPlaceholder: string;
  lessonsPlaceholder: string;
  nextShiftPlaceholder: string;
};

const BUSINESS_SECTIONS: BusinessSectionConfig[] = [
  {
    key: 'lead_generation',
    title: 'Lead generation',
    description: 'How new people found you, entered your world, or became aware of your work.',
    strategyLabel: 'What was your lead generation strategy this quarter?',
    strategyPlaceholder: 'Example: Instagram posts, referrals, podcast guesting, ads, SEO, collaborations, or outreach.',
    winsPlaceholder: 'Example: Better-fit leads, list growth, more conversations, new referral source, higher-quality attention.',
    lessonsPlaceholder: 'Example: Which visibility actions created real interest, and which ones only looked productive?',
    nextShiftPlaceholder: 'Example: Keep the best channel, stop scattered posting, or test one new lead source.',
  },
  {
    key: 'nurture',
    title: 'Nurture',
    description: 'How you built trust, stayed visible, and helped people understand why your work matters.',
    strategyLabel: 'What was your nurture strategy this quarter?',
    strategyPlaceholder: 'Example: Weekly emails, podcast episodes, lives, stories, community posts, or DM follow-up.',
    winsPlaceholder: 'Example: More replies, clearer buyer language, stronger content rhythm, people warming up before buying.',
    lessonsPlaceholder: 'Example: Which messages helped people feel seen, trust you, or understand the offer?',
    nextShiftPlaceholder: 'Example: Repeat a winning content lane, tighten the email rhythm, or simplify the message.',
  },
  {
    key: 'sales',
    title: 'Sales',
    description: 'How you made offers, invited people to buy, followed up, and handled buyer decisions.',
    strategyLabel: 'What was your sales strategy this quarter?',
    strategyPlaceholder: 'Example: Webinar, sales calls, cart close, evergreen checkout, weekly direct offers, or follow-up.',
    winsPlaceholder: 'Example: Sales made, clearer pitch, better objections, more confident asks, stronger checkout path.',
    lessonsPlaceholder: 'Example: What made people say yes, hesitate, disappear, or need more support?',
    nextShiftPlaceholder: 'Example: Make offers more often, clarify one promise, improve follow-up, or simplify the sales path.',
  },
  {
    key: 'delivery',
    title: 'Delivery and results',
    description: 'How you delivered the work, supported clients or customers, and created useful outcomes.',
    strategyLabel: 'What was your delivery or student/client success strategy?',
    strategyPlaceholder: 'Example: Coaching calls, curriculum, client projects, office hours, or implementation support.',
    winsPlaceholder: 'Example: Better client results, smoother onboarding, fewer support issues, stronger testimonials or proof.',
    lessonsPlaceholder: 'Example: What helped people get results, and where did they get stuck or need more guidance?',
    nextShiftPlaceholder: 'Example: Improve onboarding, add a support asset, remove friction, or simplify the delivery promise.',
  },
  {
    key: 'operations',
    title: 'Operations and capacity',
    description: 'How your systems, schedule, support, and real-life capacity affected follow-through.',
    strategyLabel: 'What was your operations or capacity strategy?',
    strategyPlaceholder: 'Example: CEO day, Asana, batching, automation, VA support, office hours, or rest/capacity planning.',
    winsPlaceholder: 'Example: Less chaos, faster follow-through, clearer priorities, fewer dropped balls, better support.',
    lessonsPlaceholder: 'Example: Which systems helped your actual life, and which ones became extra work?',
    nextShiftPlaceholder: 'Example: Keep one planning rhythm, automate one task, delegate one area, or remove a bottleneck.',
  },
  {
    key: 'money',
    title: 'Money, profit, and expenses',
    description: 'Rough is fine. This is about noticing the money pattern, not perfect bookkeeping.',
    strategyLabel: 'What was your money strategy or goal this quarter?',
    strategyPlaceholder: 'Example: Sell one core offer, protect recurring revenue, reduce tools, manage ad spend, or increase renewals.',
    winsPlaceholder: 'Example: Revenue collected, profit protected, expenses reduced, renewals saved, useful investments made.',
    lessonsPlaceholder: 'Example: What did your revenue, profit, expenses, pricing, or cash flow teach you?',
    nextShiftPlaceholder: 'Example: Focus on one offer, cut one leak, follow up faster, raise price, or track cash weekly.',
  },
];

function quarterDebriefsTable() {
  return (supabase.from as unknown as (table: string) => QuarterDebriefsTable)('quarter_debriefs');
}

function toDateInputValue(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function buildQuarterOption(year: number, quarter: number): QuarterOption {
  const start = new Date(year, (quarter - 1) * 3, 1);
  const end = new Date(year, quarter * 3, 0);

  return {
    key: `${year}-Q${quarter}`,
    label: `Q${quarter} ${year}`,
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function getRecentQuarterOptions(count = 6): QuarterOption[] {
  const now = new Date();
  let quarter = Math.floor(now.getMonth() / 3) + 1;
  let year = now.getFullYear();

  const options: QuarterOption[] = [];
  for (let i = 0; i < count; i += 1) {
    quarter -= 1;
    if (quarter < 1) {
      quarter = 4;
      year -= 1;
    }
    options.push(buildQuarterOption(year, quarter));
  }

  return options;
}

function cleanList(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function listFromValue(value: unknown) {
  if (!Array.isArray(value)) return [''];
  const cleaned = value.map(String).map((item) => item.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [''];
}

function emptyBusinessSection(): BusinessSectionReflection {
  return {
    strategy: '',
    wins: '',
    lessons: '',
    nextShift: '',
  };
}

function createEmptyBusinessSections(): BusinessSectionsState {
  return BUSINESS_SECTIONS.reduce((sections, section) => {
    sections[section.key] = emptyBusinessSection();
    return sections;
  }, {} as BusinessSectionsState);
}

function businessSectionsFromValue(value: unknown): BusinessSectionsState {
  const sections = createEmptyBusinessSections();
  if (!value || typeof value !== 'object') return sections;

  const storedSections = value as Partial<Record<BusinessSectionKey, Partial<BusinessSectionReflection>>>;
  BUSINESS_SECTIONS.forEach((section) => {
    const stored = storedSections[section.key];
    if (!stored || typeof stored !== 'object') return;

    sections[section.key] = {
      strategy: typeof stored.strategy === 'string' ? stored.strategy : '',
      wins: typeof stored.wins === 'string' ? stored.wins : '',
      lessons: typeof stored.lessons === 'string' ? stored.lessons : '',
      nextShift: typeof stored.nextShift === 'string' ? stored.nextShift : '',
    };
  });

  return sections;
}

function cleanBusinessSections(sections: BusinessSectionsState) {
  return BUSINESS_SECTIONS.reduce((cleanedSections, section) => {
    const value = sections[section.key];
    const cleaned = {
      strategy: value.strategy.trim(),
      wins: value.wins.trim(),
      lessons: value.lessons.trim(),
      nextShift: value.nextShift.trim(),
    };

    if (Object.values(cleaned).some(Boolean)) {
      cleanedSections[section.key] = cleaned;
    }

    return cleanedSections;
  }, {} as Partial<BusinessSectionsState>);
}

function hasBusinessSectionAnswer(sections: BusinessSectionsState) {
  return Object.values(cleanBusinessSections(sections)).length > 0;
}

interface PromptListProps {
  label: string;
  helper: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}

function PromptList({ label, helper, items, onChange, placeholder }: PromptListProps) {
  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, i) => (i === index ? value : item)));
  };

  const addItem = () => {
    onChange([...items, '']);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : ['']);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{label}</CardTitle>
        <CardDescription>{helper}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="space-y-2">
            <Textarea
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={placeholder}
              className="min-h-[92px]"
              maxLength={1200}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{item.length}/1200</p>
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          Add another
        </Button>
      </CardContent>
    </Card>
  );
}

interface BusinessEngineDebriefProps {
  sections: BusinessSectionsState;
  onChange: (section: BusinessSectionKey, field: BusinessSectionField, value: string) => void;
}

function BusinessEngineDebrief({ sections, onChange }: BusinessEngineDebriefProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Business engine debrief</CardTitle>
        <CardDescription>
          Look across the main parts of the business. Answer what is useful; rough notes are enough.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['lead_generation', 'nurture', 'sales']} className="space-y-3">
          {BUSINESS_SECTIONS.map((section) => {
            const values = sections[section.key];

            return (
              <AccordionItem key={section.key} value={section.key} className="rounded-md border px-4">
                <AccordionTrigger className="gap-4 text-left hover:no-underline">
                  <div>
                    <p className="font-semibold">{section.title}</p>
                    <p className="mt-1 text-sm font-normal text-muted-foreground">{section.description}</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${section.key}-strategy`}>{section.strategyLabel}</Label>
                    <Textarea
                      id={`${section.key}-strategy`}
                      value={values.strategy}
                      onChange={(event) => onChange(section.key, 'strategy', event.target.value)}
                      placeholder={section.strategyPlaceholder}
                      maxLength={1200}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`${section.key}-wins`}>What were the wins or useful evidence here?</Label>
                      <Textarea
                        id={`${section.key}-wins`}
                        value={values.wins}
                        onChange={(event) => onChange(section.key, 'wins', event.target.value)}
                        placeholder={section.winsPlaceholder}
                        maxLength={1200}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${section.key}-lessons`}>What lessons did this section give you?</Label>
                      <Textarea
                        id={`${section.key}-lessons`}
                        value={values.lessons}
                        onChange={(event) => onChange(section.key, 'lessons', event.target.value)}
                        placeholder={section.lessonsPlaceholder}
                        maxLength={1200}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${section.key}-next-shift`}>What would you keep, stop, or adjust next quarter?</Label>
                    <Textarea
                      id={`${section.key}-next-shift`}
                      value={values.nextShift}
                      onChange={(event) => onChange(section.key, 'nextShift', event.target.value)}
                      placeholder={section.nextShiftPlaceholder}
                      maxLength={1200}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default function QuarterDebrief() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const quarterOptions = useMemo(() => getRecentQuarterOptions(), []);
  const [selectedQuarterKey, setSelectedQuarterKey] = useState(quarterOptions[0]?.key || '');
  const selectedQuarter = quarterOptions.find((option) => option.key === selectedQuarterKey) || quarterOptions[0];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [debriefId, setDebriefId] = useState<string | null>(null);
  const [whatWorked, setWhatWorked] = useState<string[]>(['']);
  const [whatDidNotWork, setWhatDidNotWork] = useState<string[]>(['']);
  const [lessonsLearned, setLessonsLearned] = useState<string[]>(['']);
  const [carryForward, setCarryForward] = useState<string[]>(['']);
  const [leaveBehind, setLeaveBehind] = useState<string[]>(['']);
  const [businessSections, setBusinessSections] = useState<BusinessSectionsState>(() => createEmptyBusinessSections());
  const [nextQuarterFocus, setNextQuarterFocus] = useState('');
  const [supportNeeded, setSupportNeeded] = useState('');
  const [cycleScore, setCycleScore] = useState(5);

  const resetForm = useCallback(() => {
    setDebriefId(null);
    setWhatWorked(['']);
    setWhatDidNotWork(['']);
    setLessonsLearned(['']);
    setCarryForward(['']);
    setLeaveBehind(['']);
    setBusinessSections(createEmptyBusinessSections());
    setNextQuarterFocus('');
    setSupportNeeded('');
    setCycleScore(5);
    setCompleted(false);
  }, []);

  const loadDebrief = useCallback(async () => {
    if (!user || !selectedQuarter) return;

    try {
      setLoading(true);
      const { data, error } = await quarterDebriefsTable()
        .select('*')
        .eq('user_id', user.id)
        .eq('quarter_key', selectedQuarter.key)
        .maybeSingle();

      if (error) throw new Error(error.message || 'Could not load debrief');

      if (!data) {
        resetForm();
        return;
      }

      setDebriefId(data.id);
      setWhatWorked(listFromValue(data.what_worked));
      setWhatDidNotWork(listFromValue(data.what_did_not_work));
      setLessonsLearned(listFromValue(data.lessons_learned));
      setCarryForward(listFromValue(data.carry_forward));
      setLeaveBehind(listFromValue(data.leave_behind));
      setBusinessSections(businessSectionsFromValue(data.business_sections));
      setNextQuarterFocus(data.next_quarter_focus || '');
      setSupportNeeded(data.support_needed || '');
      setCycleScore(data.cycle_score ?? 5);
      setCompleted(Boolean(data.completed_at));
    } catch (error) {
      console.error('Quarter debrief load error:', error);
      toast.error('Could not load this debrief');
    } finally {
      setLoading(false);
    }
  }, [resetForm, selectedQuarter, user]);

  useEffect(() => {
    void loadDebrief();
  }, [loadDebrief]);

  const hasMeaningfulAnswer =
    cleanList(whatWorked).length > 0 ||
    cleanList(whatDidNotWork).length > 0 ||
    cleanList(lessonsLearned).length > 0 ||
    cleanList(carryForward).length > 0 ||
    cleanList(leaveBehind).length > 0 ||
    hasBusinessSectionAnswer(businessSections) ||
    nextQuarterFocus.trim().length > 0 ||
    supportNeeded.trim().length > 0;

  const updateBusinessSection = (section: BusinessSectionKey, field: BusinessSectionField, value: string) => {
    setBusinessSections((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const saveDebrief = async (markComplete: boolean) => {
    if (!user || !selectedQuarter) return;
    if (!hasMeaningfulAnswer) {
      toast.error('Add at least one reflection before saving');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        user_id: user.id,
        quarter_key: selectedQuarter.key,
        quarter_label: selectedQuarter.label,
        quarter_start_date: selectedQuarter.startDate,
        quarter_end_date: selectedQuarter.endDate,
        what_worked: cleanList(whatWorked),
        what_did_not_work: cleanList(whatDidNotWork),
        lessons_learned: cleanList(lessonsLearned),
        carry_forward: cleanList(carryForward),
        leave_behind: cleanList(leaveBehind),
        business_sections: cleanBusinessSections(businessSections),
        next_quarter_focus: nextQuarterFocus.trim() || null,
        support_needed: supportNeeded.trim() || null,
        cycle_score: cycleScore,
        completed_at: markComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await quarterDebriefsTable()
        .upsert(payload, { onConflict: 'user_id,quarter_key' })
        .select('*')
        .single();

      if (error) throw new Error(error.message || 'Could not save debrief');

      setDebriefId(data?.id || null);
      setCompleted(markComplete);
      toast.success(markComplete ? 'Quarter debrief finished' : 'Quarter debrief saved');
    } catch (error) {
      console.error('Quarter debrief save error:', error);
      toast.error('Could not save this debrief');
    } finally {
      setSaving(false);
    }
  };

  const markPlanningChoice = async (wantsPlan: boolean) => {
    if (!user || !selectedQuarter) return;

    try {
      if (debriefId) {
        const { error } = await quarterDebriefsTable()
          .update({ wants_next_quarter_plan: wantsPlan, updated_at: new Date().toISOString() })
          .eq('id', debriefId)
          .eq('user_id', user.id);
        if (error) throw new Error(error.message || 'Could not save planning choice');
      }
    } catch (error) {
      console.error('Quarter debrief planning choice error:', error);
    }

    if (wantsPlan) {
      navigate('/cycle-setup');
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Standalone reflection
            </div>
            <div>
              <h1 className="text-3xl font-bold">Last Quarter Debrief</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Review the last quarter even if you did not build a 90-day plan in the app.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/reviews')}>
            Reviews
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5" />
              Choose the quarter
            </CardTitle>
            <CardDescription>
              Use the quarter that matches the season you want to close out.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter</Label>
              <select
                id="quarter"
                value={selectedQuarterKey}
                onChange={(event) => setSelectedQuarterKey(event.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                )}
              >
                {quarterOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {selectedQuarter && (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{selectedQuarter.label}</p>
                <p>
                  {format(new Date(`${selectedQuarter.startDate}T00:00:00`), 'MMM d, yyyy')} to{' '}
                  {format(new Date(`${selectedQuarter.endDate}T00:00:00`), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading debrief...
            </CardContent>
          </Card>
        ) : completed ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Quarter debrief complete
              </CardTitle>
              <CardDescription>
                You captured what happened. Now decide whether you want to turn it into the next 90-day plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => markPlanningChoice(true)} className="gap-2">
                Plan my next quarter
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => markPlanningChoice(false)}>
                Not right now
              </Button>
              <Button variant="ghost" onClick={() => setCompleted(false)} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Edit debrief
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          <PromptList
            label="What worked?"
            helper="Capture the actions, decisions, offers, habits, relationships, or rhythms that helped."
            items={whatWorked}
            onChange={setWhatWorked}
            placeholder="Example: I made offers weekly, kept my daily plan smaller, or asked for support earlier."
          />

          <PromptList
            label="What did not work?"
            helper="Name the friction without turning it into a personal failure story."
            items={whatDidNotWork}
            onChange={setWhatDidNotWork}
            placeholder="Example: I overplanned, avoided the sales task, or kept switching priorities."
          />

          <PromptList
            label="What did you learn?"
            helper="Look for the lesson you want future-you to remember."
            items={lessonsLearned}
            onChange={setLessonsLearned}
            placeholder="Example: Simple plans worked better when I trusted them for more than a week."
          />

          <BusinessEngineDebrief sections={businessSections} onChange={updateBusinessSection} />

          <PromptList
            label="What do you want to carry forward?"
            helper="Choose the pieces that deserve to come with you into the next quarter."
            items={carryForward}
            onChange={setCarryForward}
            placeholder="Example: Weekly CEO day, one core offer, Friday debriefs, or one content theme."
          />

          <PromptList
            label="What do you want to leave behind?"
            helper="Release the patterns, projects, or pressure that made the quarter heavier."
            items={leaveBehind}
            onChange={setLeaveBehind}
            placeholder="Example: Rebuilding the plan every time I felt doubt."
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next quarter direction</CardTitle>
              <CardDescription>
                You do not need a perfect plan yet. Just name the clearest next focus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="next-quarter-focus">What feels like the right focus for the next 90 days?</Label>
                <Textarea
                  id="next-quarter-focus"
                  value={nextQuarterFocus}
                  onChange={(event) => setNextQuarterFocus(event.target.value)}
                  placeholder="Example: Sell one offer consistently before adding another project."
                  maxLength={1200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-needed">What support would make follow-through easier?</Label>
                <Textarea
                  id="support-needed"
                  value={supportNeeded}
                  onChange={(event) => setSupportNeeded(event.target.value)}
                  placeholder="Example: Coaching on offer clarity, a weekly coworking block, or help simplifying my tasks."
                  maxLength={1200}
                />
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Quarter score</Label>
                    <p className="text-sm text-muted-foreground">Rate the quarter from 0 to 10.</p>
                  </div>
                  <div className="text-3xl font-bold text-primary">{cycleScore}</div>
                </div>
                <Slider
                  value={[cycleScore]}
                  onValueChange={(value) => setCycleScore(value[0])}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => navigate('/reviews')}>
            Back to Reviews
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => saveDebrief(false)} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save draft
            </Button>
            <Button onClick={() => saveDebrief(true)} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Finish debrief
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
