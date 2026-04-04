import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sheet, RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGoogleSheetsSync, SYNCABLE_TABLES } from '@/hooks/useGoogleSheetsSync';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { formatDistanceToNow } from 'date-fns';

export function GoogleSheetsSyncPanel() {
  const { config, isLoading, isSyncing, syncNow, updateSelectedTables } = useGoogleSheetsSync();
  const { status: calStatus, connect } = useGoogleCalendar();
  const [localTables, setLocalTables] = useState<string[] | null>(null);

  const selectedTables = localTables ?? config?.selected_tables ?? SYNCABLE_TABLES.map(t => t.key);

  const toggleTable = (key: string) => {
    const next = selectedTables.includes(key)
      ? selectedTables.filter(k => k !== key)
      : [...selectedTables, key];
    setLocalTables(next);
    updateSelectedTables(next);
  };

  const selectAll = () => {
    const all = SYNCABLE_TABLES.map(t => t.key);
    setLocalTables(all);
    updateSelectedTables(all);
  };

  const selectNone = () => {
    setLocalTables([]);
    updateSelectedTables([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isGoogleConnected = calStatus.connected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sheet className="h-5 w-5" />
          Google Sheets Sync
        </CardTitle>
        <CardDescription>
          Export your planner data to Google Sheets for use with Claude, ChatGPT, or other AI tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isGoogleConnected ? (
          <div className="rounded-lg border border-dashed p-4 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connect your Google account first to enable Sheets sync.
              This uses the same connection as Google Calendar.
            </p>
            <Button variant="outline" onClick={() => connect('/settings')}>
              Connect Google Account
            </Button>
          </div>
        ) : (
          <>
            {/* Status row */}
            {config?.spreadsheet_url && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>
                    Last synced{' '}
                    {config.last_synced_at
                      ? formatDistanceToNow(new Date(config.last_synced_at), { addSuffix: true })
                      : 'never'}
                  </span>
                </div>
                <a
                  href={config.spreadsheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" className="gap-1">
                    Open Sheet <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              </div>
            )}

            {/* Data type selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Data to include</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs h-7">
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SYNCABLE_TABLES.map(table => (
                  <label
                    key={table.key}
                    className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedTables.includes(table.key)}
                      onCheckedChange={() => toggleTable(table.key)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{table.label}</p>
                      <p className="text-xs text-muted-foreground">{table.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Sync button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={syncNow}
                disabled={isSyncing || selectedTables.length === 0}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              {selectedTables.length === 0 && (
                <p className="text-sm text-muted-foreground">Select at least one data type</p>
              )}
              {selectedTables.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedTables.length} type{selectedTables.length !== 1 ? 's' : ''} selected
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Each data type becomes a separate tab in your Google Sheet. 
              You can share the Sheet URL with AI tools for analysis.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
