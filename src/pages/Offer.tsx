import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { DashboardMock, TasksMock } from "@/components/offer/AppMock";
import logoMark from "/brand/logo-mark.svg";

/**
 * PUBLIC SALES PAGE — $27 / 12 months
 * Replace CHECKOUT_URL with the live GHL checkout link.
 */
const CHECKOUT_URL = "https://faithmariah.com/low-battery-planner-checkout";

function CtaButton({
  label = "Get 12 Months For $27",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Button
      asChild
      size="lg"
      className={`h-auto w-full rounded-full px-8 py-4 text-base font-semibold shadow-md transition-transform hover:-translate-y-0.5 sm:w-auto ${className}`}
    >
      <a href={CHECKOUT_URL}>{label} &rarr;</a>
    </Button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
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
  { icon: Lightbulb, label: "Brain dump capture", body: "Somewhere to put the 2am ideas so they stop circling." },
  { icon: Wand2, label: "Planning wizards", body: "Guided flows for launches, content and offers." },
  { icon: Download, label: "Export to PDF", body: "Take your plan anywhere, anytime you want it on paper." },
  { icon: Smartphone, label: "Installs like an app", body: "Two taps to add it to your phone home screen." },
  { icon: CloudOff, label: "Saves as you type", body: "Works offline. Losing your work is the one thing it refuses to do." },
  { icon: Target, label: "Minimum, normal, expansion", body: "Three modes so the plan flexes with the week you actually get." },
];

const included = [
  "Guided 90-day planning",
  "Weekly planning and daily system",
  "Daily planning wizards",
  "Support guides",
  "Planner tools",
];

const afterSteps = [
  { n: "1", title: "Pay once", body: "$27, one time. Nothing renews on you." },
  { n: "2", title: "Create your login", body: "Straight after checkout, in under a minute." },
  { n: "3", title: "Set your first 90 days", body: "A guided setup walks you through it, gently." },
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "The Low Battery Business Planner — 12 Month Access",
  description:
    "A calm 90-day planning system for entrepreneurs with limited energy. 12 months of access for a one-time $27.",
  brand: { "@type": "Brand", name: "The Low Battery Business Planner" },
  offers: {
    "@type": "Offer",
    price: "27.00",
    priceCurrency: "USD",
    url: "https://plan.faithmariah.com/offer",
    availability: "https://schema.org/InStock",
  },
};

export default function Offer() {
  const [showStickyCta, setShowStickyCta] = useState(false);

  /* Public page renders in the brand palette, not the in-app monochrome theme. */
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.getAttribute("data-theme");
    root.removeAttribute("data-theme");
    return () => {
      if (prevTheme) root.setAttribute("data-theme", prevTheme);
    };
  }, []);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "The Low Battery Business Planner — 12 Months for $27";
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute("content") ?? "";
    desc?.setAttribute(
      "content",
      "A calm 90-day planner for entrepreneurs with limited energy. 12 months of access for a one-time $27.",
    );
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      document.title = prevTitle;
      desc?.setAttribute("content", prevDesc);
      script.remove();
    };
  }, []);

  /* Sticky mobile CTA: appears past the hero, hides over the offer card. */
  useEffect(() => {
    const hero = document.getElementById("offer-hero");
    const card = document.getElementById("offer-card");
    if (!hero || !card) return;
    let heroOut = false;
    let cardVisible = false;
    const sync = () => setShowStickyCta(heroOut && !cardVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroOut = !e.isIntersecting;
        if (e.target === card) cardVisible = e.isIntersecting;
      }
      sync();
    });
    io.observe(hero);
    io.observe(card);
    return () => io.disconnect();
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* BRAND BAR */}
      <header className="border-b border-border-subtle bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={logoMark} alt="" aria-hidden className="h-8 w-8" />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-serif text-sm font-bold tracking-tight">
                Low Battery
              </p>
              <p className="truncate text-[10px] font-medium tracking-[0.2em] text-muted-foreground">
                BUSINESS PLANNER
              </p>
            </div>
          </div>
          <Link
            to="/auth"
            className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section id="offer-hero" className="border-b border-border-subtle bg-surface">
        <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              12-Month Access
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
              <BatteryMedium
                className="mr-3 inline-block h-8 w-8 shrink-0 align-baseline text-primary sm:h-10 sm:w-10"
                aria-hidden
              />
              Your 25% still counts.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              A calm 90-day planning system for entrepreneurs whose energy does
              not run on a schedule. Not another app that assumes a full battery
              — one built for the days you actually have.
            </p>

            <div className="mt-8 flex flex-col items-center gap-2.5">
              <CtaButton />
              <p className="text-sm text-muted-foreground">
                $27 one-time &middot; 12 months of access &middot; not a
                subscription
              </p>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-2xl">
            <DashboardMock />
          </div>
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
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
            <p className="mt-2.5 text-xs text-muted-foreground">
              Your plan adjusts to whichever one you woke up with.
            </p>
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

          <div className="mx-auto mt-10 max-w-xl">
            <TasksMock />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Every task carries an energy cost, so you can plan the day you have.
            </p>
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
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionLabel>Also included</SectionLabel>
          <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
            Everything else, quietly in the background.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {extras.map(({ icon: Icon, label, body }) => (
              <div
                key={label}
                className="rounded-2xl border border-border-subtle bg-card p-5 shadow-sm"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 text-sm font-semibold">{label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
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
                className="flex flex-col rounded-2xl border border-border-subtle bg-card p-6 shadow-sm"
              >
                <blockquote className="flex-1 font-serif text-lg leading-snug">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Becoming Boss Mastermind member
                    </span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* OFFER */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-2xl px-5 py-20 sm:py-28">
          <div
            id="offer-card"
            className="rounded-3xl border-2 border-primary/25 bg-card p-7 shadow-xl sm:p-10"
          >
            <SectionLabel>The offer</SectionLabel>
            <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
              12-Month Access &mdash; 90-Day Low Battery Business Planner
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              A special price, just for claiming Plan Like a Boss through
              Lizzy&rsquo;s Summer Party. A calm planning system built for the
              days your energy doesn&rsquo;t show up on schedule. Your 25% still
              counts.
            </p>

            <p className="mt-8 text-sm font-semibold">What&rsquo;s included:</p>
            <ul className="mt-3 space-y-2.5">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            <p className="mt-7 text-base font-medium">
              12 months of access. One-time payment of $27.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Does not include Becoming Boss Mastermind access, live coaching, or
              community.
            </p>

            <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border-subtle pt-7">
              <span className="font-serif text-5xl leading-none tracking-tight text-primary">
                $27
              </span>
              <span className="text-sm text-muted-foreground">
                one-time &mdash; about $2.25 a month
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This price is available exclusively to Lizzy&rsquo;s Summer Party
              bundle claimants.
            </p>

            <div className="mt-8 flex flex-col items-start gap-2.5">
              <CtaButton />
              <p className="text-sm text-muted-foreground">
                Instant access &middot; works on phone, tablet and desktop
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AFTER YOU BUY */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionLabel>What happens next</SectionLabel>
          <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
            Three steps, then you&rsquo;re planning.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {afterSteps.map(({ n, title, body }) => (
              <div
                key={n}
                className="rounded-2xl border border-border-subtle bg-card p-6 shadow-sm"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {n}
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border-subtle bg-surface-sunken">
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
          <div className="mt-8 flex flex-col items-center gap-2.5">
            <CtaButton />
            <p className="text-sm text-muted-foreground">
              $27 one-time &middot; 12 months access &middot; your 25% still
              counts
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border-subtle pb-24 sm:pb-0">
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

      {/* STICKY MOBILE CTA — portalled so an ancestor transform can't trap it */}
      {createPortal(
        <div
          className={`fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-background/95 backdrop-blur transition-transform duration-300 sm:hidden ${
            showStickyCta ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 leading-tight">
              <p className="text-base font-semibold">$27</p>
              <p className="truncate text-[11px] text-muted-foreground">
                12 months, one-time
              </p>
            </div>
            <Button
              asChild
              className="ml-auto h-auto shrink-0 rounded-full px-5 py-3 text-sm font-semibold"
            >
              <a href={CHECKOUT_URL}>Get access &rarr;</a>
            </Button>
          </div>
        </div>,
        document.body,
      )}

    </main>
  );
}
