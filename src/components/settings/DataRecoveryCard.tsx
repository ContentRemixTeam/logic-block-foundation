import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  HardDrive, 
  RefreshCw, 
  Download, 
  Trash2, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileArchive
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  loadBackups,
  loadLatestBackup,
  deleteBackup,
  cleanupOldBackups,
  getEmergencySaves,
  deleteEmergencySave,
  cleanupEmergencySaves,
  BackupEntry,
  EmergencySaveEntry,
} from '@/lib/offlineDb';
import { checkEmergencySaves, clearEmergencySave } from '@/lib/emergencySave';
import { supabase } from '@/integrations/supabase/client';

interface BackupStats {
  localStorageKeys: number;
  localStorageSize: string;
  idbBackups: number;
  idbEmergency: number;
  serverEmergency: number;
}

export function DataRecoveryCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [emergencySaves, setEmergencySaves] = useState<EmergencySaveEntry[]>([]);
  const [serverSaves, setServerSaves] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupEntry | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const scanStorage = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Count localStorage keys related to our app
      let lsKeys = 0;
      let lsSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('backup') || key.includes('draft') || key.includes('emergency') || key.includes('daily_plan') || key.includes('weekly_plan'))) {
          lsKeys++;
          const value = localStorage.getItem(key);
          if (value) lsSize += value.length;
        }
      }

      // Get IndexedDB backups
      const idbBackups = await loadBackups(user.id, 'daily_plan');
      const allBackups = [
        ...idbBackups,
        ...await loadBackups(user.id, 'weekly_plan'),
        ...await loadBackups(user.id, 'cycle_summary'),
      ];
      
      // Get emergency saves
      const emergency = await getEmergencySaves(user.id);

      // Get server-side emergency saves
      const { data: serverData } = await supabase
        .from('emergency_saves')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setBackups(allBackups.sort((a, b) => b.timestamp - a.timestamp));
      setEmergencySaves(emergency);
      setServerSaves(serverData || []);

      setStats({
        localStorageKeys: lsKeys,
        localStorageSize: `${(lsSize / 1024).toFixed(1)} KB`,
        idbBackups: allBackups.length,
        idbEmergency: emergency.length,
        serverEmergency: serverData?.length || 0,
      });

    } catch (error) {
      console.error('Failed to scan storage:', error);
      toast({
        title: 'Scan failed',
        description: 'Could not scan local storage',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      scanStorage();
    }
  }, [user, scanStorage]);

  const handleCleanup = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Cleanup old IndexedDB backups
      const deletedBackups = await cleanupOldBackups(user.id, 10);
      const deletedEmergency = await cleanupEmergencySaves(user.id, 20);

      // Cleanup old localStorage entries
      const keysToRemove: string[] = [];
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('emergency_')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed.timestamp && parsed.timestamp < cutoff) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Invalid JSON, remove it
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      toast({
        title: 'Cleanup complete',
        description: `Removed ${deletedBackups} old backups, ${deletedEmergency} emergency saves, and ${keysToRemove.length} localStorage entries`,
      });

      scanStorage();
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast({
        title: 'Cleanup failed',
        description: 'Could not clean up old data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      backups: backups,
      emergencySaves: emergencySaves,
      serverSaves: serverSaves,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-recovery-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: 'Your backup data has been downloaded',
    });
  };

  const handleViewBackup = (backup: BackupEntry) => {
    setSelectedBackup(backup);
    setRestoreDialogOpen(true);
  };

  const handleDeleteBackup = async (backup: BackupEntry) => {
    await deleteBackup(backup.id);
    toast({ title: 'Backup deleted' });
    scanStorage();
  };

  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Recovery
          </CardTitle>
          <CardDescription>
            View and restore local backups from IndexedDB and emergency saves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{stats.idbBackups}</div>
                <div className="text-xs text-muted-foreground">IndexedDB Backups</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{stats.idbEmergency}</div>
                <div className="text-xs text-muted-foreground">Emergency Saves</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{stats.serverEmergency}</div>
                <div className="text-xs text-muted-foreground">Server Backups</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{stats.localStorageSize}</div>
                <div className="text-xs text-muted-foreground">Local Storage</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={scanStorage} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Scan Storage
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} disabled={!stats || stats.idbBackups === 0}>
              <FileArchive className="h-4 w-4 mr-2" />
              View Backups ({stats?.idbBackups || 0})
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAll} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <Button variant="destructive" size="sm" onClick={handleCleanup} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Old Data
            </Button>
          </div>

          {/* Server Emergency Saves Warning */}
          {serverSaves.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Crash Recovery Data Found</p>
                  <p className="text-xs text-muted-foreground">
                    {serverSaves.length} emergency save(s) from browser crashes detected. 
                    View backups to restore.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Backups are created automatically every 5 minutes and during browser close events. 
            Emergency saves use sendBeacon for guaranteed delivery even during crashes.
          </p>
        </CardContent>
      </Card>

      {/* Backups List Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Available Backups</DialogTitle>
            <DialogDescription>
              Select a backup to view or restore
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh]">
            <div className="space-y-2 pr-4">
              {backups.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No backups found</p>
              ) : (
                backups.map((backup) => (
                  <div 
                    key={backup.id} 
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{backup.pageType}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {backup.pageId}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(backup.timestamp)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleViewBackup(backup)}>
                          View
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteBackup(backup)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {emergencySaves.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h4 className="font-medium text-sm mb-2">Emergency Saves (IndexedDB)</h4>
                  {emergencySaves.map((save) => (
                    <div 
                      key={save.id} 
                      className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <Badge variant="outline" className="border-amber-500/50">{save.pageType}</Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(save.timestamp)}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setSelectedBackup({
                            id: save.id,
                            userId: save.userId,
                            pageType: save.pageType,
                            pageId: 'emergency',
                            data: save.data,
                            timestamp: save.timestamp,
                          });
                          setRestoreDialogOpen(true);
                        }}>
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {serverSaves.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h4 className="font-medium text-sm mb-2">Server Emergency Saves</h4>
                  {serverSaves.map((save) => (
                    <div 
                      key={save.id} 
                      className="p-3 rounded-lg border border-green-500/30 bg-green-500/5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-green-500" />
                            <Badge variant="outline" className="border-green-500/50">{save.page_type}</Badge>
                            <Badge variant="outline" className="text-xs">{save.source}</Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(save.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setSelectedBackup({
                            id: save.id,
                            userId: save.user_id,
                            pageType: save.page_type,
                            pageId: save.page_id || 'server',
                            data: save.data,
                            timestamp: new Date(save.created_at).getTime(),
                          });
                          setRestoreDialogOpen(true);
                        }}>
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* View/Restore Backup Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Backup Details</DialogTitle>
            <DialogDescription>
              {selectedBackup && (
                <>
                  {selectedBackup.pageType} • {formatTimestamp(selectedBackup.timestamp)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh]">
            {selectedBackup && (
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(selectedBackup.data, null, 2)}
              </pre>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedBackup) {
                navigator.clipboard.writeText(JSON.stringify(selectedBackup.data, null, 2));
                toast({ title: 'Copied to clipboard' });
              }
            }}>
              Copy Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
