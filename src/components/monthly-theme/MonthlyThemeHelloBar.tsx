/**
 * Monthly Theme Hello Bar
 * Dismissible banner at top of layout announcing the monthly theme
 */
import { Link } from 'react-router-dom';
import { useMonthlyTheme } from '@/hooks/useMonthlyTheme';
import { Gift, ArrowRight, X } from 'lucide-react';

export function MonthlyThemeHelloBar() {
  const { data, showHelloBar, dismissHelloBar } = useMonthlyTheme();

  if (!showHelloBar || !data?.template) return null;

  const emoji = data.template.reward_theme?.preview_emoji || '🎨';
  const isEnrolled = !!data.challenge;
  const progress = data.progress;

  return (
    <div className="bg-gradient-to-r from-accent to-primary text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-3 relative z-40">
      <Gift className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium">
        {isEnrolled && progress
          ? `${emoji} ${data.template.title} — ${progress.percent}% complete (${progress.current_count}/${progress.target_value})`
          : `${emoji} New monthly theme: ${data.template.title} — Unlock it with a challenge!`}
      </span>
      <Link
        to="/monthly-theme"
        className="inline-flex items-center gap-1.5 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold transition-colors"
      >
        {isEnrolled ? 'View Progress' : 'Get Started'}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={dismissHelloBar}
        className="absolute right-3 p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
