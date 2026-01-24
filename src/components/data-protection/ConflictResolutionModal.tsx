import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock, 
  Monitor, 
  Cloud, 
  GitMerge,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export interface ConflictData<T = Record<string, unknown>> {
  local: {
    data: T;
    timestamp: number;
    tabId?: string;
  };
  remote: {
    data: T;
    timestamp: number;
    source?: string;
  };
  pageType: string;
  pageId?: string;
}

interface ConflictResolutionModalProps<T = Record<string, unknown>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ConflictData<T> | null;
  onResolve: (choice: 'local' | 'remote' | 'merge', mergedData?: T) => void;
  fieldLabels?: Record<string, string>;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return `${format(date, 'MMM d, h:mm:ss a')} (${formatDistanceToNow(date, { addSuffix: true })})`;
}

function getFieldDiff<T extends Record<string, unknown>>(
  local: T,
  remote: T
): { field: string; localValue: unknown; remoteValue: unknown; isDifferent: boolean }[] {
  const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
  const diffs: { field: string; localValue: unknown; remoteValue: unknown; isDifferent: boolean }[] = [];
  
  allKeys.forEach(key => {
    const localVal = local?.[key];
    const remoteVal = remote?.[key];
    const isDifferent = JSON.stringify(localVal) !== JSON.stringify(remoteVal);
    diffs.push({ field: key, localValue: localVal, remoteValue: remoteVal, isDifferent });
  });
  
  return diffs.sort((a, b) => {
    if (a.isDifferent && !b.isDifferent) return -1;
    if (!a.isDifferent && b.isDifferent) return 1;
    return a.field.localeCompare(b.field);
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'string') return value.length > 100 ? value.slice(0, 100) + '...' : value;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 100) + '...';
  return String(value);
}

export function ConflictResolutionModal<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  conflict,
  onResolve,
  fieldLabels = {}
}: ConflictResolutionModalProps<T>) {
  const [showAllFields, setShowAllFields] = useState(false);
  const [mergeSelections, setMergeSelections] = useState<Record<string, 'local' | 'remote'>>({});
  const [activeTab, setActiveTab] = useState<'compare' | 'merge'>('compare');

  if (!conflict) return null;

  const { local, remote, pageType } = conflict;
  const diffs = getFieldDiff(local.data as Record<string, unknown>, remote.data as Record<string, unknown>);
  const changedFields = diffs.filter(d => d.isDifferent);
  const unchangedFields = diffs.filter(d => !d.isDifferent);
  
  const localIsNewer = local.timestamp > remote.timestamp;
  const timeDiffMs = Math.abs(local.timestamp - remote.timestamp);
  const timeDiffSeconds = Math.round(timeDiffMs / 1000);

  const handleMerge = () => {
    const merged = { ...remote.data } as T;
    
    // Apply merge selections (default to newest for each field)
    diffs.forEach(({ field, isDifferent }) => {
      if (isDifferent) {
        const selection = mergeSelections[field] || (localIsNewer ? 'local' : 'remote');
        if (selection === 'local') {
          (merged as Record<string, unknown>)[field] = local.data[field as keyof T];
        }
      }
    });
    
    onResolve('merge', merged);
  };

  const getFieldLabel = (field: string): string => {
    return fieldLabels[field] || field.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Data Conflict Detected
          </DialogTitle>
          <DialogDescription>
            Changes were made in multiple places for <strong>{pageType}</strong>. 
            Choose which version to keep or merge them.
          </DialogDescription>
        </DialogHeader>

        {/* Version Summary */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className={`p-3 rounded-lg border-2 ${localIsNewer ? 'border-primary bg-primary/5' : 'border-muted'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="h-4 w-4" />
              <span className="font-medium">This Device</span>
              {localIsNewer && <Badge variant="default" className="text-xs">Newer</Badge>}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatTimestamp(local.timestamp)}
            </div>
          </div>
          
          <div className={`p-3 rounded-lg border-2 ${!localIsNewer ? 'border-primary bg-primary/5' : 'border-muted'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="h-4 w-4" />
              <span className="font-medium">{remote.source || 'Other Tab/Server'}</span>
              {!localIsNewer && <Badge variant="default" className="text-xs">Newer</Badge>}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatTimestamp(remote.timestamp)}
            </div>
          </div>
        </div>

        {timeDiffSeconds > 0 && (
          <p className="text-xs text-muted-foreground text-center -mt-2 mb-2">
            {timeDiffSeconds < 60 
              ? `${timeDiffSeconds} seconds apart`
              : `${Math.round(timeDiffSeconds / 60)} minutes apart`
            }
          </p>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'compare' | 'merge')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compare">Compare</TabsTrigger>
            <TabsTrigger value="merge">
              <GitMerge className="h-3.5 w-3.5 mr-1.5" />
              Custom Merge
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="compare" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-3">
                {changedFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No differences found in the data.
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} changed
                    </p>
                    {changedFields.map(({ field, localValue, remoteValue }) => (
                      <div key={field} className="border rounded-lg p-3 bg-muted/30">
                        <p className="text-sm font-medium mb-2 capitalize">{getFieldLabel(field)}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-background rounded border">
                            <p className="text-muted-foreground mb-1">This Device:</p>
                            <p className="break-words">{formatValue(localValue)}</p>
                          </div>
                          <div className="p-2 bg-background rounded border">
                            <p className="text-muted-foreground mb-1">Remote:</p>
                            <p className="break-words">{formatValue(remoteValue)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {unchangedFields.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowAllFields(!showAllFields)}
                  >
                    {showAllFields ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                    {showAllFields ? 'Hide' : 'Show'} {unchangedFields.length} unchanged fields
                  </Button>
                )}
                
                {showAllFields && unchangedFields.map(({ field, localValue }) => (
                  <div key={field} className="border rounded-lg p-3 opacity-60">
                    <p className="text-sm font-medium mb-1 capitalize">{getFieldLabel(field)}</p>
                    <p className="text-xs text-muted-foreground break-words">{formatValue(localValue)}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="merge" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[280px] pr-4">
              <p className="text-sm text-muted-foreground mb-3">
                Choose which version to use for each changed field:
              </p>
              <div className="space-y-3">
                {changedFields.map(({ field, localValue, remoteValue }) => {
                  const selection = mergeSelections[field] || (localIsNewer ? 'local' : 'remote');
                  return (
                    <div key={field} className="border rounded-lg p-3">
                      <p className="text-sm font-medium mb-2 capitalize">{getFieldLabel(field)}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setMergeSelections(prev => ({ ...prev, [field]: 'local' }))}
                          className={`p-2 text-left text-xs rounded border-2 transition-colors ${
                            selection === 'local' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-muted hover:border-muted-foreground/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">This Device</span>
                            {selection === 'local' && <Check className="h-3 w-3 text-primary" />}
                          </div>
                          <p className="break-words">{formatValue(localValue)}</p>
                        </button>
                        <button
                          onClick={() => setMergeSelections(prev => ({ ...prev, [field]: 'remote' }))}
                          className={`p-2 text-left text-xs rounded border-2 transition-colors ${
                            selection === 'remote' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-muted hover:border-muted-foreground/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">Remote</span>
                            {selection === 'remote' && <Check className="h-3 w-3 text-primary" />}
                          </div>
                          <p className="break-words">{formatValue(remoteValue)}</p>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          {activeTab === 'compare' ? (
            <>
              <Button
                variant="outline"
                onClick={() => onResolve('remote')}
                className="flex-1"
              >
                <Cloud className="h-4 w-4 mr-2" />
                Use Remote
              </Button>
              <Button
                variant="outline"
                onClick={() => onResolve('local')}
                className="flex-1"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Use This Device
              </Button>
              <Button
                onClick={() => {
                  // Auto-merge: keep newest value for each field
                  handleMerge();
                }}
                className="flex-1"
              >
                <GitMerge className="h-4 w-4 mr-2" />
                Auto-Merge (Newest)
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setActiveTab('compare')}
              >
                Back
              </Button>
              <Button onClick={handleMerge} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Apply Custom Merge
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
