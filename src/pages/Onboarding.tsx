import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  ExternalLink,
  ListChecks,
  MessageSquare,
  Target,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Layout } from '@/components/Layout';
import { cn } from '@/lib/utils';
import { MASTERMIND_LINKS } from '@/lib/mastermindLinks';

const STORAGE_KEY = 'boss-planner-onboarding-checklist';

const checklistItems = [
  {
    id: 'planner-storage',
    label: 'Confirm planner storage',
    description: 'New accounts use a private Google Sheet in Drive; existing accounts can turn it on from Settings.',
    href: '/settings',
  },
  {
    id: 'community',
    label: 'Open the Mastermind community',
    description: 'Know where to post wins, questions, and stuck points.',
    href: MASTERMIND_LINKS.MASTERMIND_GROUP,
  },
  {
    id: 'calendar',
    label: 'Check upcoming Mastermind events',
    description: 'Use calls and coworking as support points in your plan.',
    href: MASTERMIND_LINKS.EVENTS_CALENDAR,
  },
  {
    id: 'coworking',
    label: 'Bookmark the coworking room',
    description: 'Keep one easy place to go when it is time to execute.',
    href: MASTERMIND_LINKS.COWORKING_ROOM,
  },
  {
    id: 'planning',
    label: 'Review the planning rhythm',
    description: '90-day direction, weekly focus, daily top 3, weekly reflection.',
    href: '/planning',
  },
];

const flowSteps = [
  {
    title: 'Set the 90-day direction',
    description: 'Choose the goal, focus area, and milestones for this cycle.',
    href: '/cycle-setup',
    icon: Target,
  },
  {
    title: 'Turn it into this week',
    description: 'Pick the weekly focus, commitments, and support you need.',
    href: '/weekly-plan',
    icon: CalendarDays,
  },
  {
    title: 'Choose today\'s top 3',
    description: 'Keep the day small enough to actually follow through.',
    href: '/daily-plan',
    icon: ListChecks,
  },
  {
    title: 'Reflect and ask for support',
    description: 'Share wins, lessons, and questions with the Mastermind.',
    href: '/weekly-reflection',
    icon: MessageSquare,
  },
];

export default function Onboarding() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      setChecked(JSON.parse(stored));
    } catch {
      setChecked({});
    }
  }, []);

  const completedCount = useMemo(
    () => checklistItems.filter((item) => checked[item.id]).length,
    [checked]
  );
  const progress = Math.round((completedCount / checklistItems.length) * 100);
  const allChecked = completedCount === checklistItems.length;

  const updateChecked = (id: string, value: boolean) => {
    const next = { ...checked, [id]: value };
    setChecked(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-primary/5 p-6">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <Users className="h-3.5 w-3.5" />
                Start here
              </div>
              <h1 className="text-3xl font-bold">Welcome to the Becoming Boss Mastermind</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                This planner is here to help you leave each week with a clear focus, a realistic action plan,
                and an obvious place to get support when you hit resistance.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => navigate('/cycle-setup')} className="gap-2">
                  Create 90-day plan
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/planning">Open planning hub</Link>
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Setup Progress</CardTitle>
              <CardDescription>{completedCount} of {checklistItems.length} steps complete</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} />
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium">
                  {allChecked ? 'You are ready to plan your first cycle.' : 'Start with the links, then build your plan.'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can come back and change anything. The goal is momentum, not perfect setup.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Mastermind Setup</CardTitle>
              <CardDescription>Do these once so the planner has somewhere useful to point you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklistItems.map((item) => {
                const isInternal = item.href.startsWith('/');
                return (
                  <div key={item.id} className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={item.id}
                        checked={checked[item.id] || false}
                        onCheckedChange={(value) => updateChecked(item.id, !!value)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <label htmlFor={item.id} className="font-medium leading-none">
                          {item.label}
                        </label>
                        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                        <Button variant="link" className="mt-2 h-auto p-0" asChild>
                          {isInternal ? (
                            <Link to={item.href}>Open step</Link>
                          ) : (
                            <a href={item.href} target="_blank" rel="noopener noreferrer">
                              Open resource <ExternalLink className="ml-1 h-3.5 w-3.5" />
                            </a>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Planning Loop</CardTitle>
              <CardDescription>The weekly rhythm this app is built around.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {flowSteps.map((step, index) => (
                <Link
                  key={step.href}
                  to={step.href}
                  className="group flex items-start gap-3 rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Step {index + 1}
                      </span>
                      {index === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="mt-1 font-semibold group-hover:text-primary">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  <ArrowRight className={cn('mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary')} />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
