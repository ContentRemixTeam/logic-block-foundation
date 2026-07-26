import { useEffect } from "react";
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  CalendarRange,
  CheckCircle2,
  CloudOff,
  Download,
  HeartHandshake,
  Lightbulb,
  ListChecks,
  Moon,
  Smartphone,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * PUBLIC SALES PAGE — $27 / 12 months
 * Replace CHECKOUT_URL with the live GHL checkout link.
 */
const CHECKOUT_URL = "https://faithmariah.com/low-battery-planner-checkout";

function CtaButton({ label = "Get 12 Months For $27" }: { label?: string }) {
  return (
    <Button
      asChild
      size="lg"
      className="h-auto w-full rounded-full px-8 py-4 text-base font-semibold shadow-md transition-transform hover:-translate-y-0.5 sm:w-auto"
    >
      <a href={CHECKOUT_URL}>{label} &rarr;</a>
    </Button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

const batteryFeatures = [
  {
    icon: BatteryMedium,
    title: "Daily battery check-in",
    body: "Full, Half, Low or Empty. Thirty seconds, once a day. No streaks to break, no guilt if you skip it.",
  },
  {
    icon: ListChecks,
    title: "Bare Minimum Plan",
    body: "One to three tiny things that count as a win. On hard days that is the entire list — and finishing it still gets a celebration.",
  },
  {
    icon: BatteryLow,
    title: "Energy cost on every task",
    body: "Tag work low, medium or high so you can match the task to the battery you actually have today.",
  },
  {
    icon: Moon,
    title: "Low Battery Day mode",
    body: "One tap gently moves non-essential work out of the way. Nothing is lost. Nothing turns red.",
  },
  {
    icon: HeartHandshake,
    title: "Overdue never yells",
    body: "Late items stay warm amber instead of alarm red — and Fresh Start clears a backlog in one click when you have been away.",
  },
  {
    icon: Sparkles,
    title: "Celebrations built in",
    body: "Finishing should feel like something. Gentle, reduced-motion-friendly moments when you close out a day, a plan or a milestone.",
  },
];

const cycleFeatures = [
  "90-day cycle command centre with one clear focus at the top",
  "Daily, weekly, monthly and quarterly views all connected to the same plan",
  "Tasks generated from your plan, so Monday is never a blank page",
  "Weekly and monthly reviews that show what is actually working",
  "Milestone moments so a 90-day stretch never feels like one long slog",
];

const extras = [
  { icon: Lightbulb, label: "Brain dump capture for the 2am ideas" },
  { icon: Wand2, label: "Wizards for launches, content and offers" },
  { icon: Download, label: "Export your plan to PDF anytime" },
  { icon: Smartphone, label: "Installs on your phone like a real app" },
  { icon: CloudOff, label: "Works offline and saves as you type" },
  { icon: Target, label: "Minimum, normal and expansion modes" },
];

const testimonials = [
  {
    quote:
      "I went from making pennies to making a consistent $7K in sales each month.",
    name: "Megan Griffith",
  },
  {
    quote:
      "I consistently stayed stuck in my business and started each month at 0 — until this.",
    name: "Tina Zufelt",
  },
  {
    quote: "Made in 6 months what took me 12 last year.",
    name: "Rita Martens",
  },
];

const faqs = [
  {
    q: "Is this a subscription?",
    a: "No. $27 once, and you have the planner for 12 months. Nothing renews without you choosing it.",
  },
  {
    q: "What if I fall behind?",
    a: "That is the entire point of the app. Low Battery Day mode, the Bare Minimum Plan and Fresh Start exist because you will have weeks where nothing goes to plan. The planner is built to catch those weeks, not scold you for them.",
  },
  {
    q: "Do I need to be sick or diagnosed to use it?",
    a: "No. It was built for entrepreneurs with chronic illness, but anyone whose energy is inconsistent — parents, carers, burnt-out founders — runs their business better in it.",
  },
  {
    q: "Do I have to download anything?",
    a: "No. It runs in your browser and you can add it to your phone home screen in two taps if you want it to feel like an app.",
  },
  {
    q: "What happens to my work if my wifi drops?",
    a: "It keeps saving. Losing your work is the one thing this planner refuses to do.",
  },
];

export default function Offer() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "The Low Battery Business Planner — 12 Months for $27";
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute("content") ?? "";
    desc?.setAttribute(
      "content",
      "A calm 90-day planner for entrepreneurs with limited energy. 12 months of access for a one-time $27.",
    );
    return () => {
      document.title = prevTitle;
      desc?.setAttribute("content", prevDesc);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* HERO */}
      <section className="relative border-b border-border-subtle">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-accent/50 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-3xl px-5 py-16 text-center sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            The Low Battery Business Planner
          </p>
          <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Your 25% still counts.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            A calm 90-day planning system for entrepreneurs whose energy does not
            run on a schedule. Not another app that assumes a full battery — one
            built for the days you actually have.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <CtaButton />
            <p className="text-sm text-muted-foreground">
              $27 one-time &middot; 12 months of access &middot; not a subscription
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-lg grid-cols-2 gap-3 text-left sm:grid-cols-4">
            {[
              { icon: BatteryFull, label: "Full" },
              { icon: BatteryMedium, label: "Half" },
              { icon: BatteryLow, label: "Low" },
              { icon: BatteryWarning, label: "Empty" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-3 py-2.5"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Your plan adjusts to whichever one you woke up with.
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:py-20">
          <SectionLabel>Why the last planner didn&rsquo;t stick</SectionLabel>
          <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
            Most planners are built for your best day.
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>
              Then you have a low day. Then three. You fall behind your own
              system, the page fills with red, and you quietly stop opening it.
            </p>
            <p>
              The plan didn&rsquo;t fail. The tool just never made room for a bad
              week — and bad weeks are not an exception for you, they are part of
              the schedule.
            </p>
            <p className="font-medium text-foreground">
              So this one plans for them from the start.
            </p>
          </div>
        </div>
      </section>

      {/* BATTERY SYSTEM */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <SectionLabel>The battery system</SectionLabel>
            <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
              A planner that asks how you are before it asks what you&rsquo;ll do.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {batteryFeatures.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border-subtle bg-card p-6 shadow-sm"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 90 DAY SYSTEM */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>The 90-day system</SectionLabel>
            <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
              The same quarterly system we teach live in the Mastermind.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Now something you carry with you, instead of rebuilding it from a
              blank workbook every quarter. One focus, ninety days, and a plan
              that keeps working on the weeks you cannot.
            </p>
          </div>
          <ul className="space-y-3">
            {cycleFeatures.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border-subtle bg-card p-4"
              >
                <CalendarRange
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span className="text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* EXTRAS */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-4xl px-5 py-16 sm:py-20">
          <SectionLabel>Also included</SectionLabel>
          <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
            Everything else, quietly in the background.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {extras.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-start gap-3 py-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="text-sm leading-relaxed">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionLabel>From people running the 90-day system</SectionLabel>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonials.map(({ quote, name }) => (
              <figure
                key={name}
                className="rounded-2xl border border-border-subtle bg-card p-6 shadow-sm"
              >
                <blockquote className="font-serif text-lg leading-snug">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm text-muted-foreground">
                  {name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* OFFER */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:py-20">
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-md sm:p-10">
            <SectionLabel>The offer</SectionLabel>
            <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
              12 months. $27.
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Four full 90-day cycles for the price of one quiet weekend.
            </p>
            <ul className="mx-auto mt-8 max-w-sm space-y-3 text-left">
              {[
                "Full access to the planner for 12 months",
                "Every feature on this page, nothing locked behind a tier",
                "New features added during your year, included",
                "One-time payment — nothing renews on you",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-col items-center gap-3">
              <CtaButton />
              <p className="text-sm text-muted-foreground">
                Instant access &middot; works on phone, tablet and desktop
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:py-20">
          <SectionLabel>Before you decide</SectionLabel>
          <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
            The questions people actually ask.
          </h2>
          <dl className="mt-8 divide-y divide-border-subtle">
            {faqs.map(({ q, a }) => (
              <div key={q} className="py-5">
                <dt className="text-base font-semibold">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FINAL CTA */}
      <section>
        <div className="mx-auto w-full max-w-2xl px-5 py-20 text-center">
          <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
            You do not need more discipline. You need a plan that fits your
            battery.
          </h2>
          <div className="mt-8 flex flex-col items-center gap-3">
            <CtaButton />
            <p className="text-sm text-muted-foreground">
              $27 one-time &middot; 12 months access &middot; your 25% still counts
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-5 py-8 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>&copy; {new Date().getFullYear()} Faith Mariah</p>
          <div className="flex gap-5">
            <a
              className="hover:text-foreground"
              href="https://faithmariah.com/privacy-policy"
            >
              Privacy Policy
            </a>
            <a className="hover:text-foreground" href="https://faithmariah.com/terms">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
