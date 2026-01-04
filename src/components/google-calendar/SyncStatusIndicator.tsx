import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock, CloudOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  status: 'active' | 'syncing' | 'error' | 'paused' | 'disconnected';
  lastSyncAt?: string;
  error?: string;
  onClick?: () => void;
  className?: string;
}

export function SyncStatusIndicator({
  status,
  lastSyncAt,
  error,
  onClick,
  className,
}: SyncStatusIndicatorProps) {
  const [, setTick] = useState(0);

  // Update display every minute to keep "time ago" fresh
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusDisplay = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          text: 'Syncing...',
          color: 'text-blue-500',
        };
      case 'active':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          text: lastSyncAt
            ? `Synced ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}`
            : 'Connected',
          color: 'text-green-500',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          text: 'Sync failed',
          color: 'text-red-500',
        };
      case 'paused':
        return {
          icon: <Clock className="h-3.5 w-3.5" />,
          text: 'Sync paused',
          color: 'text-yellow-500',
        };
      case 'disconnected':
        return {
          icon: <CloudOff className="h-3.5 w-3.5" />,
          text: 'Not connected',
          color: 'text-muted-foreground',
        };
    }
  };

  const display = getStatusDisplay();

  const content = (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 text-xs transition-colors',
        display.color,
        onClick && 'hover:opacity-80 cursor-pointer',
        className
      )}
    >
      {display.icon}
      <span>{display.text}</span>
    </button>
  );

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{error}</p>
            {onClick && <p className="text-xs text-muted-foreground">Click to retry</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
