import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, RefreshCw, Unplug, Settings2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { CalendarSelectionModal } from './CalendarSelectionModal';
import { formatDistanceToNow } from 'date-fns';

export function GoogleCalendarPanel() {
  const {
    status,
    loading,
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

  // Check for OAuth return on mount
  useEffect(() => {
    handleOAuthReturn();
  }, [handleOAuthReturn]);

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
          <CardContent>
            <Button onClick={() => connect()} className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Your calendar events will sync bidirectionally
            </p>
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
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
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
          <CardDescription>
            Connected to: {status.calendarName || 'Unknown calendar'}
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
