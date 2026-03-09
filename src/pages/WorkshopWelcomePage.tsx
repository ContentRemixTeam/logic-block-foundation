import { motion } from 'framer-motion';
import { Calendar, Youtube, Headphones, Sparkles, Mail, Users, Trophy, Flag, ChevronRight, ExternalLink, Package } from 'lucide-react';

// Google Calendar URL builder
function buildGoogleCalendarUrl({
  title,
  date,
  startHour,
  endHour,
  timezone,
  description,
  location,
}: {
  title: string;
  date: string; // YYYYMMDD
  startHour: string; // HHMM
  endHour: string; // HHMM
  timezone: string;
  description?: string;
  location?: string;
}) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${date}T${startHour}00/${date}T${endHour}00`,
    ctz: timezone,
    details: description || '',
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const coachingCalUrl = buildGoogleCalendarUrl({
  title: '🏎️ Free Business Coaching — Build Your Engine Workshop',
  date: '20260311',
  startHour: '1600',
  endHour: '1700',
  timezone: 'America/New_York',
  description: 'Free live business coaching session! Link will be sent to your email. Make sure to whitelist our emails.',
});

const officeHoursCalUrl = buildGoogleCalendarUrl({
  title: '🏁 Office Hours: Bundle Edition — Behind the Scenes',
  date: '20260311',
  startHour: '1500',
  endHour: '1600',
  timezone: 'America/New_York',
  description: 'Office Hours: Bundle Edition. Watch live: https://www.youtube.com/watch?v=i7RY5obUzWo\n\nStats, behind the scenes of the Becoming Boss Bundle, and Q&A. Mastermind members can submit questions ahead of time!',
  location: 'https://www.youtube.com/watch?v=i7RY5obUzWo',
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

function AddToCalendarButton({ url, label }: { url: string; label?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
    >
      <Calendar className="w-3.5 h-3.5" />
      {label || 'Add to Calendar'}
    </a>
  );
}

function SectionCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      custom={delay}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className={`relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function WorkshopWelcomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Checkered flag stripe - top */}
      <div className="h-3 w-full" style={{
        backgroundImage: 'repeating-conic-gradient(hsl(var(--foreground)) 0% 25%, transparent 0% 50%)',
        backgroundSize: '24px 24px',
        opacity: 0.08,
      }} />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/30 pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-10 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-5xl mb-4"
          >
            🏎️
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4"
          >
            Welcome to the{' '}
            <span className="text-primary">Build Your Business Engine</span>{' '}
            Workshop
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Get ready to build your Discover → Nurture → Convert engine.
            Here's everything you need to fuel up for an amazing week! 🏁
          </motion.p>

          {/* Decorative race track divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-8 mx-auto max-w-md h-1 rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 pb-16 space-y-5">

        {/* ---- EMAIL WHITELIST NOTICE ---- */}
        <SectionCard delay={0}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base mb-1">📬 Check Your Inbox!</h3>
              <p className="text-sm text-muted-foreground">
                All workshop links will be sent to your email. <strong className="text-foreground">Make sure to whitelist our emails</strong> so you don't miss a thing!
                Check your spam/promotions folder just in case.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ---- FREE BUSINESS COACHING ---- */}
        <SectionCard delay={1} className="border-primary/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">SAVE THE DATE</span>
                <span className="text-xs text-muted-foreground">🏁 Pit Stop #1</span>
              </div>
              <h3 className="font-bold text-foreground text-lg mb-1">
                Free Business Coaching
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                <strong className="text-foreground">Wednesday at 4:00 PM EST</strong> — Join us for free live coaching to help you build your engine! The link will be sent to your email.
              </p>
              <AddToCalendarButton url={coachingCalUrl} />
            </div>
          </div>
        </SectionCard>

        {/* ---- OFFICE HOURS: BUNDLE EDITION ---- */}
        <SectionCard delay={2} className="border-primary/20">
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/40 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <Youtube className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">SAVE THE DATE</span>
                <span className="text-xs text-muted-foreground">🔧 Pit Stop #2</span>
              </div>
              <h3 className="font-bold text-foreground text-lg mb-1">
                Office Hours: Bundle Edition
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                <strong className="text-foreground">Wednesday at 3:00 PM EST</strong> — I'll share stats & behind the scenes of the Becoming Boss Bundle and answer your questions!
              </p>
              <p className="text-xs text-muted-foreground mb-3 italic">
                💡 Mastermind members can submit questions ahead of time.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://www.youtube.com/watch?v=i7RY5obUzWo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Youtube className="w-4 h-4" /> Watch on YouTube
                </a>
                <AddToCalendarButton url={officeHoursCalUrl} />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ---- LIVE COACHING CTA ---- */}
        <SectionCard delay={3}>
          <div className="text-center py-2">
            <div className="text-3xl mb-3">🏎️💨</div>
            <h3 className="font-bold text-foreground text-lg mb-1">Free Live Coaching</h3>
            <p className="text-sm text-muted-foreground mb-1">
              <strong className="text-foreground">Wednesday at 3:00 PM EST</strong>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              The coaching link will be sent straight to your email — keep an eye on your inbox! 📧
            </p>
            <AddToCalendarButton
              url={coachingCalUrl}
              label="Add Coaching to Calendar"
            />
          </div>
        </SectionCard>

        {/* ---- UPGRADE TO BOSS MODE ---- */}
        <SectionCard delay={4} className="bg-gradient-to-br from-primary/5 to-accent/20 border-primary/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold inline-block mb-2">
                🚀 TURBO BOOST
              </span>
              <h3 className="font-bold text-foreground text-lg mb-1">
                Upgrade to Boss Mode
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get <strong className="text-foreground">30 days in the Becoming Boss Mastermind</strong> — full access to coaching, community, the Boss Planner, and all the tools to build your engine at top speed.
              </p>
              <a
                href="https://faithmariah.com/bundle-offer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
              >
                Upgrade Now <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </SectionCard>

        {/* ---- SUBSCRIBE SECTION ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* YouTube */}
          <SectionCard delay={5}>
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <Youtube className="w-6 h-6 text-destructive" />
              </div>
              <h4 className="font-bold text-foreground text-sm mb-1">Subscribe on YouTube</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Office Hours, Goal Setting, and behind-the-scenes content every week!
              </p>
              <a
                href="https://www.youtube.com/@FaithMariah"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Youtube className="w-4 h-4" /> Subscribe
              </a>
            </div>
          </SectionCard>

          {/* Podcast */}
          <SectionCard delay={6}>
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mx-auto mb-3">
                <Headphones className="w-6 h-6 text-info" />
              </div>
              <h4 className="font-bold text-foreground text-sm mb-1">Subscribe to the Podcast</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Catch every episode wherever you listen — business tips on the go! 🎧
              </p>
              <a
                href="https://home.faithmariah.com/podcast"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-info text-info-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Headphones className="w-4 h-4" /> Listen Now
              </a>
            </div>
          </SectionCard>
        </div>

        {/* ---- WE WANT TO FEATURE YOU ---- */}
        <SectionCard delay={7}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground text-base mb-1">
                ✨ We Want to Feature YOU!
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Want to be part of our next bundle? We'd love to showcase your business and help you reach a whole new audience.
              </p>
              <a
                href="https://www.faithmariahevents.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Join Our Next Bundle <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </SectionCard>

        {/* ---- QUESTIONS ---- */}
        <SectionCard delay={8}>
          <div className="text-center py-3">
            <div className="text-3xl mb-2">💌</div>
            <h3 className="font-bold text-foreground text-base mb-1">Have Questions?</h3>
            <p className="text-sm text-muted-foreground">
              Reply to any of our emails or drop a comment during Office Hours —
              we're here to help you build the business of your dreams!
            </p>
          </div>
        </SectionCard>

        {/* ---- START ENGINE BUILDER CTA ---- */}
        <SectionCard delay={9} className="border-primary/30 bg-gradient-to-r from-accent/30 via-card to-accent/30">
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🏁</div>
            <h3 className="font-bold text-foreground text-xl mb-2">
              Ready to Build Your Engine?
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Jump into the Business Engine Builder and map out your Discover → Nurture → Convert plan in minutes.
            </p>
            <a
              href="/workshop/engine-builder"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
            >
              🏎️ Start Building <Flag className="w-4 h-4" />
            </a>
          </div>
        </SectionCard>
      </main>

      {/* Checkered flag stripe - bottom */}
      <div className="h-3 w-full" style={{
        backgroundImage: 'repeating-conic-gradient(hsl(var(--foreground)) 0% 25%, transparent 0% 50%)',
        backgroundSize: '24px 24px',
        opacity: 0.08,
      }} />
    </div>
  );
}
