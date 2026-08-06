import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Facebook, Headphones, Youtube, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface ResourceCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}


function ResourceCard({ href, title, description, icon }: ResourceCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors',
        'hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
      aria-label={`${title} (opens in a new tab)`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-primary" aria-hidden="true">
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </a>
  );
}

interface LowBatteryWelcomeProps {
  onStart: () => void;
  hasSavedAnswers?: boolean;
}

export function LowBatteryWelcome({ onStart, hasSavedAnswers }: LowBatteryWelcomeProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-1px)] max-w-3xl flex-col justify-center px-4 py-12">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Welcome</p>
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            You&apos;re in the right place.
          </h1>
          <p className="text-lg text-muted-foreground">
            You&apos;re about to build a 90-day business plan that can still run on a bad week.
          </p>
          {hasSavedAnswers && (
            <p className="text-base text-foreground">
              Your previous answers are still saved in this browser. Pick up right where you left
              off.
            </p>
          )}
        </div>

        <p className="text-base font-medium text-foreground">
          Before we start, here are three ways to keep getting useful business support and find
          people to grow with.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <ResourceCard
            href="https://home.faithmariah.com/podcast"
            title="Listen to the podcast"
            description="Practical business coaching for the weeks when your energy and attention are not predictable."
            icon={<Headphones className="h-5 w-5" />}
          />
          <ResourceCard
            href="https://www.youtube.com/@FaithMariah?sub_confirmation=1"
            title="Subscribe on YouTube"
            description="Watch coaching, strategy, and the conversations behind the plan."
            icon={<Youtube className="h-5 w-5" />}
          />
          <ResourceCard
            href="https://www.facebook.com/groups/faithmariah"
            title="Find collaborators in the Facebook group"
            description="Meet business owners, find collaborations, and stop trying to grow alone."
            icon={<Facebook className="h-5 w-5" />}
          />
        </div>

        <div className="pt-2">
          <Button
            onClick={onStart}
            className="min-h-[48px] w-full text-base font-semibold sm:w-auto"
          >
            Start my plan
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </main>
  );
}
