import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileSpreadsheet, HelpCircle, Loader2, LogOut, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { usePlannerSheetSetup } from '@/hooks/usePlannerSheetSetup';

const DEFAULT_REQUIRED_AFTER = '2026-06-19T00:00:00.000Z';

function shouldRequirePlannerSheet(userCreatedAt?: string): boolean {
  if (import.meta.env.VITE_REQUIRE_PLANNER_SHEETS_FOR_NEW_USERS === 'false') {
    return false;
  }

  if (!userCreatedAt) return false;

  const requiredAfter = import.meta.env.VITE_PLANNER_SHEETS_REQUIRED_AFTER || DEFAULT_REQUIRED_AFTER;
  const cutoff = Date.parse(requiredAfter);
  const createdAt = Date.parse(userCreatedAt);

  if (Number.isNaN(cutoff) || Number.isNaN(createdAt)) return false;
  return createdAt >= cutoff;
}

export function PlannerSheetSetupGate({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const {
    status: sheetStatus,
    isLoading: sheetLoading,
    isSettingUp,
    setup,
    refresh,
  } = usePlannerSheetSetup();
  const {
    status: googleStatus,
    loading: googleLoading,
    connecting,
    connect,
    refreshStatus,
    handleOAuthReturn,
  } = useGoogleCalendar();
  const [isRefreshingOAuth, setIsRefreshingOAuth] = useState(false);

  const requiresPlannerSheet = useMemo(
    () => shouldRequirePlannerSheet(user?.created_at),
    [user?.created_at],
  );

  const hasPlannerSheet = Boolean(
    sheetStatus.connected &&
    sheetStatus.spreadsheet_url &&
    sheetStatus.is_healthy,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('oauth')) return;

    handleOAuthReturn({ openCalendarSelection: false, showToast: false });
    setIsRefreshingOAuth(true);

    Promise.all([refreshStatus(), refresh()])
      .finally(() => setIsRefreshingOAuth(false));
  }, [handleOAuthReturn, refresh, refreshStatus]);

  if (!requiresPlannerSheet || hasPlannerSheet) {
    return <>{children}</>;
  }

  const isLoading = sheetLoading || googleLoading || isRefreshingOAuth;
  const hasGoogle = googleStatus.connected;

  const handleCreateSheet = async () => {
    await setup();
    await refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Create your planner Sheet</CardTitle>
          <CardDescription>
            New Boss Planner accounts start with a private Google Sheet connected to this app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-8">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Checking setup...
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <div className="mt-0.5 text-primary">
                    {hasGoogle ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Connect Google</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This lets the app create your private planner Sheet in your Drive.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <div className="mt-0.5 text-primary">
                    {hasPlannerSheet ? <CheckCircle2 className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Create planner storage</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The app starts in safe mode while the Sheet backup is verified.
                    </p>
                  </div>
                </div>
              </div>

              {sheetStatus.last_error && (
                <Alert variant="destructive">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>Storage setup needs attention</AlertTitle>
                  <AlertDescription>{sheetStatus.last_error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                {!hasGoogle ? (
                  <Button
                    size="lg"
                    onClick={() => connect(window.location.pathname)}
                    disabled={connecting}
                    className="flex-1 gap-2"
                  >
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {connecting ? 'Connecting...' : 'Connect Google'}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleCreateSheet}
                    disabled={isSettingUp}
                    className="flex-1 gap-2"
                  >
                    {isSettingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    {isSettingUp ? 'Creating Sheet...' : 'Create my planner Sheet'}
                  </Button>
                )}

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    void Promise.all([refreshStatus(), refresh()]);
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Check again
                </Button>
              </div>

              <Button variant="ghost" onClick={signOut} className="w-full gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>

              <Button variant="link" asChild className="w-full gap-2">
                <Link to="/help/planner-storage">
                  <HelpCircle className="h-4 w-4" />
                  Planner storage help
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
