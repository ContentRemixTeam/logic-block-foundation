import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  WifiOff,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'offline';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSaved: Date | null;
  className?: string;
  variant?: 'full' | 'compact';
}

export function SaveStatusIndicator({
  status,
  lastSaved,
  className,
  variant = 'full'
}: SaveStatusIndicatorProps) {
  const getTimeAgo = (date: Date | null) => {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  };

  if (variant === 'compact') {
    switch (status) {
      case 'saved':
        return (
          <CheckCircle2 className={cn("h-4 w-4 text-green-500", className)} />
        );
      
      case 'saving':
        return (
          <Loader2 className={cn("h-4 w-4 text-muted-foreground animate-spin", className)} />
        );
      
      case 'error':
        return (
          <AlertTriangle className={cn("h-4 w-4 text-destructive", className)} />
        );
      
      case 'offline':
        return (
          <WifiOff className={cn("h-4 w-4 text-amber-500", className)} />
        );
      
      case 'pending':
        return (
          <Clock className={cn("h-4 w-4 text-muted-foreground", className)} />
        );
      
      default:
        return null;
    }
  }

  switch (status) {
    case 'saved':
      return (
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400",
            className
          )}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          ✅ Saved {lastSaved ? getTimeAgo(lastSaved) : ''}
        </Badge>
      );

    case 'saving':
      return (
        <Badge variant="secondary" className={cn("text-xs animate-pulse", className)}>
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Saving...
        </Badge>
      );

    case 'error':
      return (
        <Badge variant="destructive" className={cn("text-xs", className)}>
          <AlertTriangle className="mr-1 h-3 w-3" />
          Save failed - retrying
        </Badge>
      );

    case 'offline':
      return (
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400",
            className
          )}
        >
          <WifiOff className="mr-1 h-3 w-3" />
          Offline - saved locally
        </Badge>
      );

    case 'pending':
      return (
        <Badge variant="outline" className={cn("text-xs text-muted-foreground", className)}>
          <Clock className="mr-1 h-3 w-3" />
          Saving soon...
        </Badge>
      );

    default:
      return null;
  }
}

interface SaveStatusBannerProps {
  status: SaveStatus;
  onRetry?: () => void;
}

export function SaveStatusBanner({ status, onRetry }: SaveStatusBannerProps) {
  if (status !== 'offline' && status !== 'error') {
    return null;
  }

  return (
    <div className={cn(
      "rounded-lg border p-4 mb-4",
      status === 'offline' 
        ? "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800" 
        : "bg-destructive/10 border-destructive/20"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {status === 'offline' ? (
            <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          )}
        </div>
        
        <div className="flex-1 space-y-1">
          <p className={cn(
            "font-medium text-sm",
            status === 'offline' 
              ? "text-amber-800 dark:text-amber-200" 
              : "text-destructive"
          )}>
            {status === 'offline' ? '🔴 You\'re offline' : '⚠️ Save failed'}
          </p>
          
          <p className="text-sm text-muted-foreground">
            {status === 'offline' 
              ? 'Don\'t worry - your work is saved on this device and will sync when you\'re back online.' 
              : 'Your changes couldn\'t be saved to the server, but they\'re saved locally. We\'ll keep trying.'}
          </p>
          
          {status === 'error' && onRetry && (
            <Button 
              variant="link" 
              size="sm" 
              onClick={onRetry}
              className="h-auto p-0 text-sm"
            >
              Try saving again now →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
