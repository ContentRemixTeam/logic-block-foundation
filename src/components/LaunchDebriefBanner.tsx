import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, Rocket, TrendingUp, Clock } from 'lucide-react';
import { usePendingLaunchDebriefs } from '@/hooks/usePendingLaunchDebriefs';
import { differenceInDays, parseISO } from 'date-fns';

export function LaunchDebriefBanner() {
  const navigate = useNavigate();
  const { pendingDebriefs, dismissForSession, dismissPermanently, isLoading } = usePendingLaunchDebriefs();

  if (isLoading || pendingDebriefs.length === 0) return null;

  const mostRecentLaunch = pendingDebriefs[0];
  const daysSinceClose = differenceInDays(new Date(), parseISO(mostRecentLaunch.cart_closes));
  const otherCount = pendingDebriefs.length - 1;

  const handleDoDebrief = () => {
    navigate(`/launch-debrief/${mostRecentLaunch.id}`);
  };

  const handleRemindLater = () => {
    dismissForSession(mostRecentLaunch.id);
  };

  const handleDontShowAgain = async () => {
    await dismissPermanently(mostRecentLaunch.id);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-accent/30 bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 p-4 mb-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 p-3 rounded-full bg-accent/20 text-accent">
          <Rocket className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">
              Time to Debrief Your Launch! 🎯
            </h3>
            {otherCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                +{otherCount} more
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-medium text-foreground">{mostRecentLaunch.name}</span> ended {daysSinceClose} day{daysSinceClose !== 1 ? 's' : ''} ago.
            Capture your wins and lessons while they're fresh!
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Track actual results vs goals
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~5 minutes
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemindLater}
            className="text-muted-foreground hover:text-foreground"
          >
            Later
          </Button>
          <Button
            onClick={handleDoDebrief}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Do Debrief
          </Button>
        </div>

        {/* Close button */}
        <button
          onClick={handleDontShowAgain}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Don't show again for this launch"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
