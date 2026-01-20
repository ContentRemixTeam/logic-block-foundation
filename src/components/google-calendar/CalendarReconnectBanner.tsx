import { useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

interface CalendarReconnectBannerProps {
  onDismiss?: () => void;
}

export function CalendarReconnectBanner({ onDismiss }: CalendarReconnectBannerProps) {
  const { status, connect, loading } = useGoogleCalendar();
  const [isConnecting, setIsConnecting] = useState(false);

  // Only show if connected but inactive (token revoked)
  if (!status.connected || status.syncStatus !== 'error') {
    return null;
  }

  const handleReconnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Alert variant="destructive" className="mb-4 border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Google Calendar Disconnected</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive/20"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm mb-3">
          Your Google Calendar connection has expired or was revoked. Reconnect to see your meetings.
        </p>
        <Button 
          size="sm" 
          variant="outline"
          onClick={handleReconnect}
          disabled={isConnecting || loading}
          className="border-destructive/50 hover:bg-destructive/20"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Reconnect Google Calendar
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
