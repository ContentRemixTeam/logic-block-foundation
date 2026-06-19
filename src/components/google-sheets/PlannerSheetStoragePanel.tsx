import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Database, ExternalLink, FileSpreadsheet, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { usePlannerSheetSetup } from '@/hooks/usePlannerSheetSetup';
import { getPendingPlannerWriteCount } from '@/lib/planner-storage/localPendingWrites';
import { retryPendingPlannerSheetWrites } from '@/lib/planner-storage/shadowTaskSync';
import { toast } from 'sonner';

function modeLabel(mode: string) {
  if (mode === 'sheets_primary') return 'Sheets primary';
  if (mode === 'sheets_shadow') return 'Safe test mode';
  return 'Supabase primary';
}

export function PlannerSheetStoragePanel() {
  const { status, isLoading, isSettingUp, setup, refresh, setMode } = usePlannerSheetSetup();
  const { status: googleStatus, connect } = useGoogleCalendar();
  const [pendingWrites, setPendingWrites] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const refreshPendingWrites = () => {
    setPendingWrites(getPendingPlannerWriteCount());
  };

  useEffect(() => {
    refreshPendingWrites();
  }, []);

  const retryPendingWrites = async () => {
    try {
      setIsRetrying(true);
      const result = await retryPendingPlannerSheetWrites();
      refreshPendingWrites();

      if (result.failed > 0) {
        toast.warning(`Retried ${result.attempted} backups. ${result.failed} still need attention.`);
      } else if (result.synced > 0) {
        toast.success(`Backed up ${result.synced} pending task${result.synced === 1 ? '' : 's'} to Google Sheets`);
      } else {
        toast.info('No pending Google Sheet backups found');
      }
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasGoogle = googleStatus.connected;
  const isConnected = status.connected && !!status.spreadsheet_url;
  const lastVerified = status.last_verified_at
    ? formatDistanceToNow(new Date(status.last_verified_at), { addSuffix: true })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Planner Data Storage
        </CardTitle>
        <CardDescription>
          Create a private Google Sheet in your Drive for customer-owned planner storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {modeLabel(status.storage_mode)}
          </Badge>
          {isConnected && status.is_healthy && (
            <Badge variant="outline" className="gap-1 border-green-200 text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </Badge>
          )}
          {isConnected && !status.is_healthy && (
            <Badge variant="destructive" className="gap-1">
              <TriangleAlert className="h-3.5 w-3.5" />
              Needs attention
            </Badge>
          )}
        </div>

        {!hasGoogle && (
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertTitle>Connect Google first</AlertTitle>
            <AlertDescription>
              The app needs Google permission so it can create your planner Sheet in your Drive.
            </AlertDescription>
          </Alert>
        )}

        {isConnected ? (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Your planner Sheet is connected</p>
                <p className="text-xs text-muted-foreground">
                  {lastVerified ? `Last verified ${lastVerified}` : 'Verification has not run yet'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refresh} className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
                <a href={status.spreadsheet_url || '#'} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1">
                    Open Sheet
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {status.storage_mode === 'sheets_primary' ? (
                <Button variant="outline" size="sm" onClick={() => setMode('sheets_shadow')}>
                  Return to safe mode
                </Button>
              ) : status.can_set_sheets_primary ? (
                <Button size="sm" onClick={() => setMode('sheets_primary')} disabled={!status.is_healthy}>
                  Start Sheets primary test
                </Button>
              ) : (
                <Badge variant="outline">Admin rollout required for Sheets primary</Badge>
              )}
            </div>

            {status.last_error && (
              <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Storage check failed</AlertTitle>
                <AlertDescription>{status.last_error}</AlertDescription>
              </Alert>
            )}

            {pendingWrites > 0 && (
              <Alert>
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>{pendingWrites} Google backup pending</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>Your tasks are saved in the app. Google Sheet backup needs another try.</span>
                  <Button variant="outline" size="sm" onClick={retryPendingWrites} disabled={isRetrying} className="w-fit gap-1">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {isRetrying ? 'Retrying...' : 'Retry backup'}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Create your planner Sheet</p>
                <p className="text-sm text-muted-foreground">
                  This creates your planner Sheet and starts in safe test mode. Task data can move to the Sheet first; other planner sections stay in protected app storage until their tabs are activated.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!hasGoogle ? (
                <Button variant="outline" onClick={() => connect('/settings')} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Connect Google
                </Button>
              ) : (
                <Button onClick={setup} disabled={isSettingUp} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {isSettingUp ? 'Creating Sheet...' : 'Create my planner Sheet'}
                </Button>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Safety rule: existing members stay in safe mode until the Sheets primary rollout is enabled.
        </p>
      </CardContent>
    </Card>
  );
}
