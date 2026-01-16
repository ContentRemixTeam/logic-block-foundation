import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrialBannerProps {
  expiresAt: Date;
  isGracePeriod?: boolean;
}

export function TrialBanner({ expiresAt, isGracePeriod = false }: TrialBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleJoinClick = () => {
    window.open('https://faithmariah.com/join', '_blank');
  };

  return (
    <div
      className={cn(
        'border-b px-4 py-2.5 transition-colors',
        isGracePeriod
          ? 'bg-destructive/10 border-destructive/20'
          : 'bg-warning/10 border-warning/20'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            {isGracePeriod ? (
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-warning shrink-0" />
            )}
            <span
              className={cn(
                'font-semibold text-sm',
                isGracePeriod
                  ? 'text-destructive'
                  : 'text-warning'
              )}
            >
              {isGracePeriod ? 'Trial Expired' : 'Trial Access'}:{' '}
              <span className="font-bold">{timeRemaining}</span>
            </span>
          </div>
          <p
            className={cn(
              'text-sm hidden md:block',
              isGracePeriod
                ? 'text-destructive/80'
                : 'text-warning/80'
            )}
          >
            {isGracePeriod
              ? 'Grace period active — join now to keep your data'
              : 'Join the Mastermind to keep your plan and unlock everything'}
          </p>
        </div>
        <Button
          onClick={handleJoinClick}
          size="sm"
          className={cn(
            'shrink-0',
            isGracePeriod
              ? 'bg-destructive hover:bg-destructive/90'
              : 'bg-warning hover:bg-warning/90 text-warning-foreground'
          )}
        >
          Join Now
        </Button>
      </div>
    </div>
  );
}
