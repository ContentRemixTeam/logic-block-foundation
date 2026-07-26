import { useEffect, useRef, useState } from "react";
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  ListChecks,
  Moon,
  Sparkles,
  Target,
} from "lucide-react";

import { WindowChrome } from "@/components/offer/AppMock";

/**
 * Interactive product walkthrough for the public sales page.
 * Purely presentational — no data, no auth, no side effects beyond a timer.
 */

/* ---------------------------------- screens --------------------------------- */

const batteryLevels = [
  { icon: BatteryFull, label: "Full", note: "Let's go" },
  { icon: BatteryMedium, label: "Half", note: "Steady" },
  { icon: BatteryLow, label: "Low", note: "Gentle day" },
  { icon: BatteryWarning, label: "Empty", note: "Rest" },
];

function CheckinScreen() {
  return (
    <div className="space-y-4 bg-background p-5 text-left sm:p-6">
      <div>
        <p className="font-serif text-lg leading-tight sm:text-xl">
          How is your battery today?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Thirty seconds. No streak to break if you skip it.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {batteryLevels.map(({ icon: Icon, label, note }, i) => (
          <div
            key={label}
            className={`rounded-xl border p-3 text-center ${
              i === 2
                ? "border-primary bg-accent"
                : "border-border-subtle bg-card"
            }`}
          >
            <Icon
              className={`mx-auto h-5 w-5 ${
                i === 2 ? "text-primary" : "text-muted-foreground"
              }`}
              aria-hidden
            />
            <p className="mt-2 text-xs font-semibold">{label}</p>
            <p className="text-[10px] text-muted-foreground">{note}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border-subtle bg-card p-4">
        <p className="text-sm leading-relaxed">
          Low battery today. We&rsquo;ve trimmed the plan down to what actually
          matters.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Nothing is deleted &mdash; it&rsquo;s waiting for a better day.
        </p>
      </div>
    </div>
  );
}

const bareMinimum = [
  { label: "Send the follow-up email", done: true },
  { label: "Outline one post", done: true },
  { label: "Rest without guilt", done: false },
];

function BareMinimumScreen() {
  return (
    <div className="space-y-4 bg-background p-5 text-left sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-lg leading-tight sm:text-xl">
          Today&rsquo;s bare minimum
        </p>
        <span className="rounded-full border border-border-subtle bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          2 of 3
        </span>
      </div>
      <ul className="space-y-2">
        {bareMinimum.map(({ label, done }) => (
          <li
            key={label}
            className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-card px-3 py-3"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              }`}
            >
              {done ? <Check className="h-2.5 w-2.5" aria-hidden /> : null}
            </span>
            <span
              className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-accent p-4">
        <Heart className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm leading-relaxed text-accent-foreground">
          That counts. Truly &mdash; that is a finished day.
        </p>
      </div>
    </div>
  );
}

const energyRows = [
  { label: "Write the sales email", cost: "Low", active: true },
  { label: "Reply to two DMs", cost: "Low", active: true },
  { label: "Map the launch plan", cost: "Medium", active: false },
  { label: "Record the workshop", cost: "High", active: false },
];

function EnergyScreen() {
  return (
    <div className="space-y-3 bg-background p-5 text-left sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        This week &middot; sorted by energy
      </p>
      <ul className="space-y-2">
        {energyRows.map(({ label, cost, active }) => (
          <li
            key={label}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
              active
                ? "border-border-subtle bg-card"
                : "border-border-subtle bg-card opacity-60"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
              <span className="truncate text-sm">{label}</span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                cost === "Low"
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-sunken text-muted-foreground"
              }`}
            >
              {cost}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Half a battery? The low-cost work floats to the top.
      </p>
    </div>
  );
}

function LowBatteryDayScreen() {
  return (
    <div className="space-y-4 bg-background p-5 text-left sm:p-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-accent p-4">
        <span className="flex items-center gap-2.5">
          <Moon className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm font-semibold text-accent-foreground">
            Low Battery Day
          </span>
        </span>
        <span className="flex h-5 w-9 items-center rounded-full bg-primary p-0.5">
          <span className="ml-auto h-4 w-4 rounded-full bg-primary-foreground" />
        </span>
      </div>
      <div className="rounded-xl border border-border-subtle bg-card p-4">
        <p className="text-sm font-semibold">Still on today</p>
        <ul className="mt-2.5 space-y-2">
          {["Send the follow-up email", "Rest without guilt"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
              <span className="text-sm">{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-sunken p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Gently moved &middot; 3 items
        </p>
        <ul className="mt-2.5 space-y-1.5 text-sm text-muted-foreground">
          <li>Record the workshop</li>
          <li>Map the launch plan</li>
          <li>Refresh the sales page</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Nothing lost. Nothing red. They&rsquo;ll be there tomorrow.
        </p>
      </div>
    </div>
  );
}

const weeks = [
  { w: "Weeks 1-3", label: "Set the offer", done: true },
  { w: "Weeks 4-6", label: "Build the content engine", done: true },
  { w: "Weeks 7-9", label: "Warm up the list", done: false },
  { w: "Weeks 10-13", label: "Launch and debrief", done: false },
];

function CycleScreen() {
  return (
    <div className="space-y-4 bg-background p-5 text-left sm:p-6">
      <div className="rounded-xl border border-border-subtle bg-card p-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-sm font-semibold">
            One focus: launch the membership
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full w-[38%] rounded-full bg-primary" />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Day 34 of 90 &middot; 38% through &middot; 56 days left
        </p>
      </div>
      <ul className="space-y-2">
        {weeks.map(({ w, label, done }) => (
          <li
            key={w}
            className="flex items-center gap-3 rounded-lg border border-border-subtle bg-card px-3 py-2.5"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              }`}
            >
              {done ? <Check className="h-2.5 w-2.5" aria-hidden /> : null}
            </span>
            <span className="w-[86px] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {w}
            </span>
            <span className="truncate text-sm">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewScreen() {
  return (
    <div className="space-y-4 bg-background p-5 text-left sm:p-6">
      <p className="font-serif text-lg leading-tight sm:text-xl">
        Your week, honestly
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { k: "Bare minimums hit", v: "6/7" },
          { k: "Average battery", v: "Half" },
          { k: "Wins logged", v: "4" },
        ].map(({ k, v }) => (
          <div
            key={k}
            className="rounded-xl border border-border-subtle bg-card p-3 text-center"
          >
            <p className="font-serif text-xl leading-none text-primary">{v}</p>
            <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground">
              {k}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1.5 rounded-xl border border-border-subtle bg-card p-4">
        {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
          <span key={i} className="flex-1">
            <span
              className="block w-full rounded-t bg-primary/70"
              style={{ height: `${h}px` }}
            />
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-accent p-4">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm leading-relaxed text-accent-foreground">
          You did your best work on half-battery days. That&rsquo;s worth
          planning around.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------- steps ---------------------------------- */

const steps = [
  {
    id: "checkin",
    icon: BatteryMedium,
    tab: "Battery check-in",
    title: "Start with how you actually are",
    body: "One tap tells the planner what kind of day this is. Everything else adjusts around your answer.",
    screen: CheckinScreen,
  },
  {
    id: "bare-minimum",
    icon: ListChecks,
    tab: "Bare Minimum",
    title: "One to three things that count as a win",
    body: "On hard days that is the whole list — and finishing it still gets a celebration, not a shrug.",
    screen: BareMinimumScreen,
  },
  {
    id: "energy",
    icon: BatteryLow,
    tab: "Energy costs",
    title: "Match the task to the battery you have",
    body: "Every task carries a low, medium or high energy cost, so the right work surfaces on the right day.",
    screen: EnergyScreen,
  },
  {
    id: "low-battery-day",
    icon: Moon,
    tab: "Low Battery Day",
    title: "One tap clears the noise",
    body: "Non-essential work moves gently out of the way. Nothing is deleted, nothing turns red, nothing shames you.",
    screen: LowBatteryDayScreen,
  },
  {
    id: "cycle",
    icon: CalendarRange,
    tab: "90-day cycle",
    title: "One focus, ninety days",
    body: "Your quarter mapped into gentle stretches, with milestones so a 90-day run never feels like one long slog.",
    screen: CycleScreen,
  },
  {
    id: "review",
    icon: Sparkles,
    tab: "Weekly review",
    title: "See the pattern, not the failure",
    body: "Weekly and monthly reviews show what worked at what energy level — so next week is planned for the real you.",
    screen: ReviewScreen,
  },
] as const;

export function FeatureWalkthrough() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touched = useRef(false);

  useEffect(() => {
    if (paused || touched.current) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = window.setInterval(
      () => setActive((i) => (i + 1) % steps.length),
      7000
    );
    return () => window.clearInterval(t);
  }, [paused]);

  const select = (i: number) => {
    touched.current = true;
    setActive((i + steps.length) % steps.length);
  };

  const current = steps[active];
  const Screen = current.screen;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* tabs */}
      <div className="-mx-5 overflow-x-auto px-5 pb-1 lg:mx-0 lg:overflow-visible lg:px-0">
        <div
          role="tablist"
          aria-label="Product walkthrough"
          className="flex gap-2 lg:flex-wrap"
        >
          {steps.map(({ id, icon: Icon, tab }, i) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={i === active}
              aria-controls={`walkthrough-panel-${id}`}
              onClick={() => select(i)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                i === active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-subtle bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* panel */}
      <div
        id={`walkthrough-panel-${current.id}`}
        role="tabpanel"
        className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Step {active + 1} of {steps.length}
          </p>
          <h3 className="mt-3 font-serif text-2xl leading-snug sm:text-3xl">
            {current.title}
          </h3>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {current.body}
          </p>

          <div className="mt-7 flex items-center gap-3">
            <button
              type="button"
              onClick={() => select(active - 1)}
              aria-label="Previous feature"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => select(active + 1)}
              aria-label="Next feature"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            <div className="ml-1 flex items-center gap-1.5">
              {steps.map(({ id }, i) => (
                <button
                  key={id}
                  type="button"
                  aria-label={`Go to step ${i + 1}`}
                  onClick={() => select(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active ? "w-6 bg-primary" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div key={current.id} className="animate-fade-in">
          <WindowChrome>
            <Screen />
          </WindowChrome>
        </div>
      </div>
    </div>
  );
}
