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
  Download,
  Inbox,
  ListChecks,
  Monitor,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FeatureWalkthrough } from "@/components/offer/FeatureWalkthrough";

import logoMark from "/brand/logo-mark.svg";
import dailyPlanShot from "@/assets/offer/anchors.jpg";
import moneyMovesShot from "@/assets/offer/money-moves.jpg";
import weeklyPlanShot from "@/assets/offer/weekly-plan.jpg";
import focusModeShot from "@/assets/offer/focus-mode.jpg";
import lowBatteryShot from "@/assets/offer/low-battery-day.jpg";
import openLoopsShot from "@/assets/offer/open-loops.jpg";
import wizardsShot from "@/assets/offer/wizards.jpg";

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

function Shot({
  src,
  alt,
  caption,
  className = "",
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}) {
  return (
    <figure
      className={`overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm ${className}`}
    >
      <img src={src} alt={alt} loading="lazy" className="w-full" />
      {caption ? (
        <figcaption className="border-t border-border-subtle px-5 py-3.5 text-sm leading-relaxed text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

const heroBullets = [
  "choose your battery: Full, Half, Low, or Empty",
  "protect the one business move that matters most",
  "turn your weekly focus into three realistic actions",
  "move non-essential work aside without deleting it",
  "keep your 90-day goal visible when the week gets messy",
  "use it on desktop, phone, or tablet — no printing, no PDFs",
];

const moneyMovesBullets = [
  "the problem your offer needs to solve",
  "three small actions to move it forward",
  "notes and proof links",
  "a public commitment",
  "a place to log sales, yeses, booked calls, and other results",
];

const weeklyBullets = [
  "one outcome that matters",
  "three commitments",
  "your realistic capacity",
  "what you will do if life happens",
];

const batteryLevels = [
  {
    icon: BatteryFull,
    label: "Full battery",
    body: "Plan deep work, high-energy tasks, and bigger moves.",
  },
  {
    icon: BatteryMedium,
    label: "Half battery",
    body: "Keep moving with a steady, manageable workload.",
  },
  {
    icon: BatteryLow,
    label: "Low battery",
    body: "See the bare minimum that still counts as progress.",
  },
  {
    icon: BatteryWarning,
    label: "Empty battery",
    body: "Protect your energy and move non-essential work out of the way.",
  },
];

const realityFeatures = [
  {
    icon: Sparkles,
    title: "Daily Plan",
    body: "Start with the day you are actually having. Choose your brave move, low-energy task, waiting-on item, and one thing you are allowed to let go of today.",
  },
  {
    icon: ListChecks,
    title: "Bare Minimum Plan",
    body: "Choose one to three small things that count as a win. On a hard day, that can be the entire list. Finishing it still counts.",
  },
  {
    icon: Zap,
    title: "Energy Cost on Every Task",
    body: "Mark work as low, medium, or high energy so you can match the task to the capacity you have today.",
  },
  {
    icon: Brain,
    title: "Brain Dump Capture",
    body: "Get the thoughts out of your head before they become another problem. Capture tasks, ideas, content, projects, questions, and wins. Leave it messy now. Sort it later, when you have the energy.",
  },
  {
    icon: Inbox,
    title: "Open Loops",
    body: "Put loose threads somewhere calm and sort them into Do, Decide, Defer, or Delete.",
  },
  {
    icon: Trophy,
    title: "Evidence Bank",
    body: "Track wins, learning, proof, and pride so progress does not disappear just because the next thing is already demanding your attention.",
  },
  {
    icon: Wand2,
    title: "Planning Wizards",
    body: "Plan a 90-day cycle, launch, content batch, or week without starting from a blank page.",
  },
  {
    icon: Timer,
    title: "Focus Mode",
    body: "Choose your Top 3, set time estimates, start a timer, and focus on the next task instead of holding the entire business in your head. Complete tasks to hatch your planner pet.",
  },
];

const quarterBullets = [
  "one main focus",
  "smaller weekly commitments",
  "daily next steps",
  "realistic capacity adjustments",
  "visible progress",
  "a way back in after disruption",
];

const quarterFeatures = [
  {
    icon: Target,
    title: "90-Day Command Centre",
    body: "See the whole quarter without carrying the whole quarter in your head.",
  },
  {
    icon: Download,
    title: "Export to PDF",
    body: "Take your plan with you on paper whenever you want.",
  },
  {
    icon: Smartphone,
    title: "Installs Like an App",
    body: "Add it to your phone's home screen and use it like an app on your phone, tablet, or desktop.",
  },
];

const forYou = [
  "you already have a business, offer, audience, skill, or idea in motion",
  "your capacity changes more than your current plan allows for",
  "one hard week tends to become a full restart",
  "you want to make business progress without pretending you can do everything",
  "you need help deciding what matters now",
  "you want a plan that supports your ambition instead of constantly punishing your capacity",
];

const notForYou = [
  "you want a rigid productivity system built around constant output",
  "you want a planner to make every business decision for you",
  "you are looking for a motivation challenge or perfect streak",
  "you do not want to choose what matters most",
  "you want a system that assumes every week will look the same",
];

const included = [
  "Guided 90-day planning",
  "Daily and weekly planning",
  "Battery-based capacity planning",
  "Low Battery Day mode",
  "Money Moves sprints",
  "Brain Dump Capture",
  "Open Loops organization",
  "Planning Wizards",
  "Focus Mode",
  "Evidence Bank",
  "Support guides and planner tools",
  "12 months of access",
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
    a: "No. It is a one-time payment of $27 for 12 months of access.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. You can use it on your phone, tablet, or desktop, and add it to your home screen like an app.",
  },
  {
    q: "What if I fall behind?",
    a: "The planner is built for that. Low Battery Day, the Weekly Tradeoff, and Fresh Start help you adjust without deleting your progress or starting over.",
  },
  {
    q: "Do I need to be sick or diagnosed to use it?",
    a: "No. The planner is for anyone whose energy, attention, responsibilities, or life circumstances are unpredictable.",
  },
  {
    q: "What if I cannot use it every day?",
    a: "You do not need a perfect streak. You need a planning system you can return to.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "The Low Battery Business Planner — 12 Month Access",
  description:
    "A 90-day business planning system for entrepreneurs whose capacity changes. 12 months of access for a one-time $27.",
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
      "Build a 90-day business plan that still works when your capacity changes. 12 months of access for a one-time $27.",
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
              Exclusive — Lizzy&rsquo;s Summer Party Offer
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
              <BatteryMedium
                className="mr-3 inline-block h-8 w-8 shrink-0 align-baseline text-primary sm:h-10 sm:w-10"
                aria-hidden
              />
              Your 25% Still Counts
            </h1>
            <p className="mx-auto mt-5 max-w-xl font-serif text-xl leading-snug sm:text-2xl">
              Build a 90-day business plan that still works when your capacity
              changes.
            </p>
            <p className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-border-subtle bg-background px-4 py-2 text-sm font-semibold text-foreground">
              <Monitor className="h-4 w-4 text-primary" aria-hidden />
              <Smartphone className="h-4 w-4 text-primary" aria-hidden />
              <span>
                Web app for desktop, phone, or tablet
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-block" />
              <span className="hidden text-muted-foreground sm:inline">
                not a PDF or paper planner
              </span>
            </p>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Most planners help you decide what to do.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-lg leading-relaxed text-muted-foreground">
              This one helps you decide what still matters when you cannot do it
              all.
            </p>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              The Low Battery Business Planner helps ambitious entrepreneurs
              choose the next money move, plan around their actual capacity, and
              keep the business moving when energy, attention, health, or life
              does not follow a predictable schedule.
            </p>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Your free retreat access includes 3 days inside the app. When
              those 3 days are up, keep using it for 12 months for $27.
            </p>

            <div className="mt-8 flex flex-col items-center gap-2.5">
              <CtaButton />
              <p className="text-sm text-muted-foreground">
                $27 one-time &middot; 12 months of access &middot; not a
                subscription
              </p>
              <p className="text-xs text-muted-foreground">
                Nothing to print or download. Open it in your browser and use it anywhere.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <Shot
              src={dailyPlanShot}
              alt="Today's Anchors panel inside the Daily Plan, with brave move, low-energy task and waiting-on fields"
            />
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <p className="text-base font-semibold">Inside the planner, you can:</p>
            <ul className="mt-4 space-y-2.5">
              {heroBullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-1 h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="leading-relaxed text-muted-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-7 font-serif text-xl leading-snug">
              A hard week should cost you a hard week &mdash; not the entire
              quarter.
            </p>
          </div>
        </div>
      </section>

      {/* MONEY MOVES */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <SectionLabel>
              This is not just a planner for organizing tasks
            </SectionLabel>
            <p className="font-serif text-2xl leading-snug">
              It helps you keep the business moving.
            </p>
            <h2 className="mt-8 font-serif text-3xl leading-snug sm:text-4xl">
              Choose your next money move
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              The Money Moves system turns a vague business goal into one
              realistic focus for the week.
            </p>
          </div>

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
            <div>
              <p className="text-base font-semibold">You choose:</p>
              <ul className="mt-4 space-y-2.5">
                {moneyMovesBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-1 h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="leading-relaxed text-muted-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-7 font-serif text-xl leading-snug">
                Small. Honest. Doable this week.
              </p>
            </div>
            <Shot
              src={moneyMovesShot}
              alt="Money Moves screen showing this week's move and three sprint actions"
            />
          </div>
        </div>
      </section>

      {/* WEEKLY TRADEOFF */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <SectionLabel>The weekly tradeoff</SectionLabel>
            <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
              Plan the week you can actually live
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              The Weekly Tradeoff helps you decide:
            </p>
            <ul className="mt-4 space-y-2.5">
              {weeklyBullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-1 h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="leading-relaxed text-muted-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              If your energy crashes, your child gets sick, your day job runs
              late, or you fall behind, you already have an adjusted version of
              the plan.
            </p>
            <p className="mt-5 font-serif text-xl leading-snug">
              You are not failing the plan. You are using it.
            </p>
          </div>

          <div className="mt-10">
            <Shot
              src={weeklyPlanShot}
              alt="Weekly Tradeoff panel with one outcome, three commitments, realistic capacity and a life-happens plan"
            />
          </div>
        </div>
      </section>

      {/* BATTERY SYSTEM */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <SectionLabel>The battery system</SectionLabel>
            <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
              Your plan should change when your capacity changes
            </h2>
            <div className="mt-5 space-y-3 text-lg leading-relaxed text-muted-foreground">
              <p>Business advice often assumes you feel fine.</p>
              <p>This planner does not.</p>
              <p>
                You choose the battery you woke up with, and the system helps you
                plan accordingly.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {batteryLevels.map(({ icon: Icon, label, body }) => (
              <div
                key={label}
                className="rounded-2xl border border-border-subtle bg-card p-5 shadow-sm"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 text-base font-semibold">{label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOW BATTERY DAY */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <SectionLabel>Low Battery Day</SectionLabel>
              <h2 className="font-serif text-3xl leading-snug sm:text-4xl">
                When the day goes sideways, your plan does not have to
              </h2>
              <div className="mt-5 space-y-3 text-lg leading-relaxed text-muted-foreground">
                <p>
                  Low Battery Day moves non-essential tasks aside with one tap.
                </p>
                <p>Nothing is deleted. Nothing is lost.</p>
                <p>Nothing turns into a wall of red overdue tasks.</p>
              </div>
              <p className="mt-6 font-serif text-xl leading-snug">
                The plan gets smaller. The goal stays intact.
              </p>
            </div>
            <Shot
              src={lowBatteryShot}
              alt="Low Battery Day prompt offering to park the rest of the day's non-essential tasks"
            />
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
              enough. The workbook works.
            </p>
            <p>
              I built this because a plan on paper does not know what kind of day
              you&rsquo;re having &mdash; and mine never has.
            </p>
            <p>
              I built a $900K+ online business while living with ADHD and chronic
              illness, on energy I could not predict from one Tuesday to the
              next.
            </p>
            <p>The retreat you just claimed gives you the plan.</p>
            <p>
              This is the part that helps the plan keep working when you are
              running on empty.
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
            <p>Then you have a low day. Then three.</p>
            <p>
              You fall behind your own system, the page fills with red, and you
              quietly stop opening it.
            </p>
            <p>
              The plan did not fail. The tool just never made room for a hard
              week.
            </p>
            <p>
              And hard weeks are not an exception for you. They are part of the
              schedule.
            </p>
            <p className="font-medium text-foreground">
              So this planner plans for them from the start.
            </p>
          </div>
        </div>
      </section>

      {/* TWO VERSIONS */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
            Two versions of your next quarter
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-surface-sunken p-6 sm:p-7">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                The old way
              </h3>
              <div className="mt-4 space-y-3 leading-relaxed text-muted-foreground">
                <p>You build a plan on a good day.</p>
                <p>A hard week knocks it sideways.</p>
                <p>
                  You fall behind, avoid opening the planner, and eventually
                  start over with a fresh notebook because this one got too
                  honest to keep looking at.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-primary/25 bg-card p-6 shadow-sm sm:p-7">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                The new way
              </h3>
              <div className="mt-4 space-y-3 leading-relaxed">
                <p>
                  A low-battery day costs you an afternoon, not the entire plan.
                </p>
                <p>
                  Week four arrives and you are still in it because the planner
                  expected week four to be hard.
                </p>
                <p>You keep the goal. You adjust the route.</p>
                <p>You keep going from the capacity you actually have.</p>
              </div>
            </div>
          </div>
          <p className="mt-8 max-w-2xl font-serif text-xl leading-snug">
            That is the difference. Not your energy. What your plan does with it.
          </p>
        </div>
      </section>

      {/* ORGANIZED AROUND REALITY */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
            Your business, organized around reality
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {realityFeatures.map(({ icon: Icon, title, body }) => (
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

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Shot
              src={focusModeShot}
              alt="Focus Mode with Top 3 tasks, timer settings and the planner pet"
              caption="Focus Mode. Choose your Top 3, start a timer, and hatch your planner pet."
            />
            <div className="grid gap-6">
              <Shot
                src={openLoopsShot}
                alt="Open Loops page grouping items into Do, Decide, Defer and Delete"
                caption="Open Loops. Every loose thread sorted into do, decide, defer or delete."
              />
              <Shot
                src={wizardsShot}
                alt="Planning wizards library with the 90-day cycle planner and other guided workflows"
                caption="Planning Wizards. Never start from a blank page."
              />
            </div>
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
            Six screens, in the order you&rsquo;d actually meet them. Tap through
            at your own pace.
          </p>
          <div className="mt-10">
            <FeatureWalkthrough />
          </div>
        </div>
      </section>

      {/* 90 DAY SYSTEM */}
      <section className="border-b border-border-subtle bg-surface-sunken">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionLabel>The 90-day system</SectionLabel>
          <h2 className="max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
            One focus. Ninety days. A plan that keeps working.
          </h2>
          <p className="mt-6 text-base font-semibold">Your quarter becomes:</p>
          <ul className="mt-4 grid max-w-2xl gap-2.5 sm:grid-cols-2">
            {quarterBullets.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-1 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span className="leading-relaxed text-muted-foreground">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quarterFeatures.map(({ icon: Icon, title, body }) => (
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

      {/* FIT */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-primary/25 bg-card p-6 shadow-sm sm:p-7">
              <h2 className="font-serif text-2xl leading-snug">
                This is for you if&hellip;
              </h2>
              <ul className="mt-5 space-y-3">
                {forYou.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-1 h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-sunken p-6 sm:p-7">
              <h2 className="font-serif text-2xl leading-snug">
                This is probably not for you if&hellip;
              </h2>
              <ul className="mt-5 space-y-3">
                {notForYou.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <X
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionLabel>What Faith&rsquo;s students are saying</SectionLabel>
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
              The 90-Day Low Battery Business Planner
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              A business planning system for ambitious entrepreneurs whose
              energy, attention, responsibilities, or life circumstances do not
              run on a predictable schedule.
            </p>
            <p className="mt-3 font-serif text-xl">Your 25% still counts.</p>

            <p className="mt-8 text-sm font-semibold">What&rsquo;s included</p>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
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
              One-time payment of $27.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This does not include Becoming Boss Mastermind access, live
              coaching, or community access.
            </p>

            <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border-subtle pt-7">
              <span className="font-serif text-5xl leading-none tracking-tight text-primary">
                $27
              </span>
              <span className="text-sm text-muted-foreground">
                One-time payment &middot; about $2.25 per month over 12 months
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This special price is available exclusively to Lizzy&rsquo;s
              Summer Party bundle claimants.
            </p>

            <div className="mt-8 flex flex-col items-start gap-2.5">
              <CtaButton />
              <p className="text-sm text-muted-foreground">
                Instant access &middot; works on phone, tablet, and desktop
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
          <div className="mt-5 space-y-3 text-lg leading-relaxed text-muted-foreground">
            <p>Use the planner for 7 days.</p>
            <p>
              If it is not doing what a planner should do for you, email support
              and I&rsquo;ll refund your purchase.
            </p>
            <p>No form. No hoops.</p>
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
          <Rocket className="mx-auto h-7 w-7 text-primary" aria-hidden />
          <h2 className="mt-4 font-serif text-3xl leading-snug sm:text-4xl">
            You do not need more discipline.
          </h2>
          <p className="mx-auto mt-3 max-w-xl font-serif text-2xl leading-snug sm:text-3xl">
            You need a plan that fits your battery.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2.5">
            <CtaButton />
            <p className="text-sm text-muted-foreground">
              $27 one-time &middot; 12 months of access &middot; your 25% still
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
