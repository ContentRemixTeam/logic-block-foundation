import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Compass,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Route,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const wizardSteps = [
  'Choose the money path',
  'Plan the quarter',
  'Turn it into weeks',
  'Pick today\'s next move',
];

const plannerRooms = [
  {
    title: '90-day focus',
    description: 'Name the real business outcome and the lane you are committing to first.',
    icon: Target,
  },
  {
    title: 'Guided wizards',
    description: 'Walk through planning, selling, content, and launch decisions in the right order.',
    icon: WandSparkles,
  },
  {
    title: 'Weekly plan',
    description: 'Translate the big plan into actions your actual week has room for.',
    icon: CalendarDays,
  },
  {
    title: 'Evidence loop',
    description: 'Review what worked, what got weird, and what needs coaching or adjustment.',
    icon: CheckCircle2,
  },
];

const promisePoints = [
  'A 90-day plan tied to what you are selling',
  'Weekly actions instead of a strategy junk drawer',
  'Wizards that reduce blank-page decision spirals',
  'A simple bridge into deeper support when execution gets messy',
];

function PlannerPreview() {
  return (
    <div className="absolute inset-x-0 bottom-0 mx-auto h-[58%] max-w-6xl overflow-hidden px-4 sm:h-[62%] lg:h-[68%]">
      <div className="relative mx-auto h-full max-w-5xl rounded-t-lg border border-foreground/10 bg-background/92 shadow-xl">
        <div className="flex h-10 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--theme-teal))]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--bp-highlight))]" />
          </div>
          <div className="h-2 w-32 rounded-full bg-muted" />
        </div>

        <div className="grid h-[calc(100%-2.5rem)] grid-cols-[88px_1fr] sm:grid-cols-[160px_1fr]">
          <aside className="border-r border-border bg-card/80 p-3">
            <div className="mb-5 h-4 w-16 rounded-full bg-foreground/80 sm:w-24" />
            <div className="space-y-3">
              {['Plan', 'Week', 'Tasks', 'Review'].map((item, index) => (
                <div
                  key={item}
                  className={`flex h-8 items-center gap-2 rounded-md px-2 ${
                    index === 0 ? 'bg-primary/12 text-primary' : 'bg-muted/60 text-muted-foreground'
                  }`}
                >
                  <span className="h-3 w-3 rounded-sm bg-current/50" />
                  <span className="hidden text-xs font-semibold sm:inline">{item}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="grid min-w-0 grid-rows-[auto_1fr] bg-background">
            <div className="border-b border-border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-md">Quarter plan</Badge>
                <Badge variant="outline" className="rounded-md border-primary/30 text-primary">Money path</Badge>
              </div>
              <div className="h-6 w-48 max-w-full rounded-full bg-foreground/85" />
              <div className="mt-3 h-3 w-72 max-w-full rounded-full bg-muted" />
            </div>

            <div className="grid min-h-0 gap-3 p-4 sm:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                {wizardSteps.map((step, index) => (
                  <div key={step} className="flex min-h-14 items-center gap-3 rounded-md border border-border bg-card p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground">{step}</div>
                      <div className="mt-1 h-2 w-full rounded-full bg-muted" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden rounded-md border border-border bg-card p-4 sm:block">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">This week</span>
                </div>
                <div className="space-y-3">
                  {[68, 44, 82, 56].map((width, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="h-3 rounded-full bg-muted" style={{ width: `${width}%` }} />
                      <div className="h-8 rounded-md bg-[hsl(var(--bp-highlight))]/50" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlannerLaunch() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/planner" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Compass className="h-4 w-4" />
            </span>
            <span>Low Battery Business Planner</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/cycle-wizard">
                Start
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative min-h-[82vh] overflow-hidden border-b border-border bg-[hsl(var(--surface-sunken))]">
          <PlannerPreview />
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col px-4 pb-[22rem] pt-14 sm:pb-[25rem] sm:pt-20 lg:pb-[27rem]">
            <Badge className="mb-5 w-fit rounded-md bg-card text-foreground shadow-sm" variant="outline">
              Guided 90-day business planning
            </Badge>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              90-Day Low Battery Business Planner
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Build a business plan you can actually follow, then turn it into weekly actions that fit your brain, your capacity, and the thing you are selling next.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-h-12">
                <Link to="/cycle-wizard">
                  Start your 90-day plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12">
                <Link to="/auth">
                  Sign in
                  <LockKeyhole className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="rooms" className="border-b border-border bg-background py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-primary">Make the plan make money</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">
                One guided path from fuzzy ideas to next actions.
              </h2>
              <p className="mt-4 text-muted-foreground">
                The planner is built around decisions, not decorative dashboards. It helps you choose the money path, map the quarter, and keep returning to the next useful action.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plannerRooms.map((room) => {
                const Icon = room.icon;
                return (
                  <Card key={room.title} className="rounded-lg">
                    <CardContent className="p-5">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold">{room.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{room.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[hsl(var(--surface-sunken))] py-14">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">What it creates</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">
                A simple plan with a place to go when real life starts talking back.
              </h2>
              <p className="mt-4 text-muted-foreground">
                The app helps people make the plan. Becoming Boss is the room where they can get coached through following it when simple starts feeling suspicious.
              </p>
              <Button asChild className="mt-7 min-h-12" size="lg">
                <Link to="/cycle-wizard">
                  Build the first plan
                  <Route className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-3">
              {promisePoints.map((point, index) => (
                <div key={point} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--bp-highlight))]/70 text-foreground">
                    {index === 0 && <ClipboardList className="h-4 w-4" />}
                    {index === 1 && <ListChecks className="h-4 w-4" />}
                    {index === 2 && <LayoutDashboard className="h-4 w-4" />}
                    {index === 3 && <Sparkles className="h-4 w-4" />}
                  </div>
                  <p className="text-sm font-medium leading-6">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
