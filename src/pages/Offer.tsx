import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Brain,
  CheckCircle2,
  CloudOff,
  Download,
  HeartHandshake,
  ListChecks,
  Moon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DashboardMock, TasksMock } from "@/components/offer/AppMock";
import { FeatureWalkthrough } from "@/components/offer/FeatureWalkthrough";
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

const batteryLevels = [
  {
    icon: BatteryFull,
    label: "Full",
    body: "Ready for deep work and high-energy tasks.",
  },
  {
    icon: BatteryMedium,
    label: "Half",
    body: "Steady pace, focusing on medium-energy items.",
  },
  {
    icon: BatteryLow,
    label: "Low",
    body: "Bare minimum plan. Essential tasks only.",
  },
  {
    icon: BatteryWarning,
    label: "Empty",
    body: "Rest day. Move non-essential work away.",
  },
];

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
    body: "Gentle, reduced-motion-friendly moments when you close out a day, a plan or a milestone.",
  },
];

const systemFeatures = [
  {
    icon: Target,
    title: "90-Day Command Centre",
    body: "Your entire quarter at a glance. See what's coming without feeling overwhelmed.",
  },
  {
    icon: Brain,
    title: "Brain Dump Capture",
    body: "Get it out of your head and onto the page. Sort it later, when you have the energy.",
  },
  {
    icon: Wand2,
    title: "Planning Wizards",
    body: "Step-by-step guidance for daily and weekly planning, so you never start from a blank page.",
  },
  {
    icon: Download,
    title: "Export to PDF",
    body: "Need it on paper? Export your plan to PDF anytime and take it with you.",
  },
  {
    icon: Smartphone,
    title: "Installs Like an App",
    body: "Add it to your home screen. It feels and acts like a native app on your phone.",
  },
  {
    icon: CloudOff,
    title: "Saves as You Type",
    body: "Never lose your work. Everything saves instantly, across all your devices.",
  },
];

const included = [
  "Guided 90-day planning",
  "Weekly planning and daily system",
  "Daily planning wizards",
  "Support guides & planner tools",
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
    q: "What if it's just not for me?",
    a: "Try it for 7 days. If it's not helping, email support and it's refunded. No form, no hoop.",
  },
  {
    q: "Is this a subscription?",
    a: "No. It's a one-time payment of $27 for 12 months of access. Nothing renews without you choosing it.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes — it works beautifully on phone, tablet and desktop, and you can add it to your home screen in two taps.",
  },
  {
    q: "What if I fall behind?",
    a: "That is the entire point of the app. Low Battery Day mode, the Bare Minimum Plan and Fresh Start exist because you will have weeks where nothing goes to plan. The planner is built to catch those weeks, not scold you for them.",
  },
  {
    q: "Do I need to be sick or diagnosed to use it?",
    a: "No. It was built for entrepreneurs with chronic illness, but anyone whose energy is inconsistent — parents, carers, burnt-out founders — runs their business better in it.",
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
    <main className="offer-brand min-h-screen overflow-x-hidden bg-background text-foreground">
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

      {/* CONFIRMATION STRIP */}
      <div className="border-b border-border-subtle bg-accent/50">
        <div className="mx-auto w-full max-w-2xl px-5 py-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            You&rsquo;re in. Plan Like a Boss is on its way to your inbox right
            now.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            While that&rsquo;s landing, here&rsquo;s the other half of what you
            just started.
          </p>
        </div>
      </div>

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
              not run on a schedule.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Not another app that assumes a full battery — one built for the
              days you actually have.
            </p>
            <p className="mx-auto mt-5 max-w-xl rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              You already tried this. Your free retreat access includes 3 days
              inside the app. This is what happens after those 3 days end.
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

      {/* WHY I BUILT THIS */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:py-20">
          <SectionLabel>Why I built this</SectionLabel>
          <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>
              I didn&rsquo;t build this because the workbook wasn&rsquo;t good
              enough. The workbook works. I built this because a plan on paper
              doesn&rsquo;t know what kind of day you&rsquo;re having, and mine
              never has.
            </p>
            <p>
              I built $900K+ online while living with ADHD and chronic illness,
              on energy I couldn&rsquo;t predict from one Tuesday to the next.
              The retreat you just claimed gives you the plan. This is the part
              that knows when you&rsquo;re running on empty and adjusts without
              making you feel like you failed.
            </p>
          </div>
          <p className="mt-6 font-serif text-xl text-foreground">&mdash; Faith</p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-b border-border-subtle bg-surface-sunken">
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

      {/* TWO VERSIONS OF NEXT QUARTER */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
            Two versions of next quarter
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-surface-sunken p-6 sm:p-7">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                The old way
              </h3>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Next quarter can look exactly like this one. A plan built on a
                good day, a hard week that knocks it sideways, and a fresh
                notebook in October because this one&rsquo;s page count got too
                honest to keep opening.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-primary/25 bg-card p-6 shadow-sm sm:p-7">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                The new way
              </h3>
              <p className="mt-4 leading-relaxed">
                Or next quarter can look like this instead: a low battery day
                that costs you an afternoon, not the whole plan. Week four
                arriving and you&rsquo;re still in it, because the tool already
                expected week four to be hard. The same 90 days, still running —
                on the days you had, not the days you were supposed to have.
              </p>
            </div>
          </div>
          <p className="mt-8 max-w-2xl font-serif text-xl leading-snug">
            That&rsquo;s the only difference this changes. Not your energy. What
            your plan does with it.
          </p>
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
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Full, Half, Low or Empty. Your plan adjusts to whichever one you
              woke up with.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {batteryLevels.map(({ icon: Icon, label, body }) => (
              <div
                key={label}
                className="rounded-2xl border border-border-subtle bg-card p-5"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 text-base font-semibold">{label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* WALKTHROUGH */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionLabel>Take the tour</SectionLabel>
          <h2 className="max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
            See it working before you buy it.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Six screens, in the order you&rsquo;d actually meet them. Tap
            through at your own pace.
          </p>
          <div className="mt-10">
            <FeatureWalkthrough />
          </div>
        </div>
      </section>

      {/* REAL SCREENS */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionLabel>Real screens</SectionLabel>
          <h2 className="max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
            This is the actual planner. No mockups.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Straight from inside the app you get access to today.
          </p>
          <div className="mt-10">
            <ScreenshotGallery />
          </div>
        </div>
      </section>


      {/* 90 DAY SYSTEM */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionLabel>The 90-day system</SectionLabel>
          <h2 className="max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
            One focus, ninety days, and a plan that keeps working on the weeks
            you cannot.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {systemFeatures.map(({ icon: Icon, title, body }) => (
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

      {/* TESTIMONIALS */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionLabel>From people running the system</SectionLabel>
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
            <SectionLabel>12-Month Access</SectionLabel>
            <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
              90-Day Low Battery Business Planner
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

      {/* GUARANTEE */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-2xl px-5 py-16 text-center sm:py-20">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <h2 className="mt-4 font-serif text-3xl leading-snug sm:text-4xl">
            The 7-day guarantee
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            If it&rsquo;s not a fit, that&rsquo;s a fair trade for $27. Use it
            for 7 days. If it&rsquo;s not doing what a planner should do for
            you, email support and I&rsquo;ll refund it. No form, no hoop.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:py-20">
          <SectionLabel>Before you decide</SectionLabel>
          <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
            The questions people actually ask.
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map(({ q, a }) => (
              <AccordionItem key={q} value={q} className="border-border-subtle">
                <AccordionTrigger className="text-left text-base font-semibold">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
          className={`offer-brand fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-background/95 backdrop-blur transition-transform duration-300 sm:hidden ${
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
