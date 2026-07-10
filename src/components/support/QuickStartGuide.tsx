/**
 * Quick Start Guide — describes ONLY what a new user actually sees today.
 * Steps match the current calm, energy-aware flow:
 *   1. Do your daily battery check-in
 *   2. Set your bare-minimum list (Settings → Planner)
 *   3. Start a 90-day cycle when you're ready
 *   4. Plan today (just today)
 *   5. Come back tomorrow — no streak pressure
 *
 * Extra features (Finance, Content Vault, Arcade, Challenges, etc.) live
 * behind Settings → Extra Features and are intentionally not surfaced here.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BatteryLow,
  BatteryCharging,
  Compass,
  ListChecks,
  Sparkles,
  Sunrise,
  ArrowRight,
} from 'lucide-react';

const STEPS = [
  {
    icon: BatteryCharging,
    title: 'Start with a battery check-in',
    body: 'Each day the planner asks how much energy you have. Your answer shapes suggestions — nothing more. Skippable, always changeable.',
    href: '/daily-plan',
    cta: 'Open today',
  },
  {
    icon: BatteryLow,
    title: 'Set your bare-minimum list',
    body: '1–3 tiny things that make a day count, even on your hardest day. Doing these = a full day.',
    href: '/settings/planner',
    cta: 'Edit bare minimum',
  },
  {
    icon: Compass,
    title: 'Start a 90-day cycle when ready',
    body: "The 90-day cycle is the heart of the planner: one clear direction, at your pace. Start it now, or later — it's always there.",
    href: '/cycle-setup',
    cta: 'Start a cycle',
  },
  {
    icon: ListChecks,
    title: 'Plan just today',
    body: 'Add a small number of things for today. Match my energy filters the list to what fits your battery.',
    href: '/tasks',
    cta: 'Open my tasks',
  },
  {
    icon: Sunrise,
    title: 'Come back tomorrow',
    body: 'No streaks in the core planner. No penalty for a rest day. Life happens — your planner resets in one tap.',
    href: '/dashboard',
    cta: 'Go to dashboard',
  },
];

export function QuickStartGuide() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome in.</CardTitle>
          <CardDescription className="text-base">
            This planner works <em>with</em> your energy, not against it. Here's the calm
            first-week rhythm — no urgency, everything skippable, rest counts.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="border-border/60">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Step {i + 1}
                    </span>
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link to={step.href}>
                      {step.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 text-primary/70" />
          <p className="text-muted-foreground">
            Looking for Finance, Content Vault, Arcade, Coaching, or Challenges? Turn them on
            in <Link to="/settings" className="underline">Settings → Extra Features</Link>. They stay off by
            default so the core stays calm.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
