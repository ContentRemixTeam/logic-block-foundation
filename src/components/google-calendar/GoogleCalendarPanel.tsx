import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, RefreshCw, Unplug, Settings2, CheckCircle2, AlertCircle, Clock, Mail } from 'lucide-react';
import { useGoogleCalendar, getOAuthDebugInfo } from '@/hooks/useGoogleCalendar';
import { CalendarSelectionModal } from './CalendarSelectionModal';
import { formatDistanceToNow } from 'date-fns';

export function GoogleCalendarPanel() {
  const {
    status,
    loading,
    connecting,
    syncing,
    calendars,
    showCalendarModal,
    setShowCalendarModal,
    connect,
    selectCalendar,
    disconnect,
    syncNow,
    handleOAuthReturn,
  } = useGoogleCalendar();

  // Check for OAuth return on mount - only once
  useEffect(() => {
    handleOAuthReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show debug info in dev mode
  const showDebug = new URLSearchParams(window.location.search).has('debug');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status.connected) {
    const debugInfo = showDebug ? getOAuthDebugInfo() : null;
    
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar Integration
            </CardTitle>
            <CardDescription>
              Sync your time blocks with Google Calendar automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => connect()} 
              className="w-full"
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Your calendar events will sync bidirectionally
            </p>
            
            {/* Debug panel for OAuth troubleshooting */}
            {debugInfo && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-1 font-mono">
                <p className="font-semibold text-foreground">OAuth Debug Info:</p>
                <p>Flow Type: {debugInfo.flowType}</p>
                <p>Current Origin: {debugInfo.currentOrigin}</p>
                <p className="break-all">Redirect URI: {debugInfo.redirectUri}</p>
                {debugInfo.lastError && (
                  <p className="text-destructive">Last Error: {debugInfo.lastError}</p>
                )}
                {Object.keys(debugInfo.lastOAuthParams || {}).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Last OAuth Params</summary>
                    <pre className="mt-1 text-[10px] overflow-auto">
                      {JSON.stringify(debugInfo.lastOAuthParams, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <CalendarSelectionModal
          open={showCalendarModal}
          onOpenChange={setShowCalendarModal}
          calendars={calendars}
          onSelect={selectCalendar}
        />
      </>
    );
  }

  const getSyncStatusBadge = () => {
    switch (status.syncStatus) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <Clock className="h-3 w-3 mr-1" />
            Paused
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar
            </CardTitle>
            {getSyncStatusBadge()}
          </div>
          <CardDescription className="space-y-1">
            <span>Connected to: {status.calendarName || 'Unknown calendar'}</span>
            {status.connectedEmail && (
              <span className="flex items-center gap-1 text-xs">
                <Mail className="h-3 w-3" />
                {status.connectedEmail}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.lastSyncAt && (
            <p className="text-sm text-muted-foreground">
              Last synced: {formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}
            </p>
          )}

          {status.lastError && (
            <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              {status.lastError}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncNow}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalendarModal(true)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Change Calendar
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={disconnect}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Unplug className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>

          {/* Reconnect option if there are sync issues */}
          {status.lastError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => connect()}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect to fix issues
            </Button>
          )}
        </CardContent>
      </Card>

      <CalendarSelectionModal
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
        calendars={calendars}
        onSelect={selectCalendar}
      />
    </>
  );
}
