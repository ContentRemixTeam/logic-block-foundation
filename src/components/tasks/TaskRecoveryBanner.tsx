 /**
  * Task Recovery Banner
  * Shows when there are pending syncs, failed mutations, or recovered drafts
  */
 
 import { useState, useEffect, useCallback } from 'react';
 import { AlertCircle, CloudOff, RefreshCw, Trash2, X } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { useOfflineSync } from '@/hooks/useOfflineSync';
 import { 
   getPendingTaskDrafts, 
   clearAllTaskDrafts, 
   useResilientTaskMutation,
   type TaskDraft 
 } from '@/hooks/useResilientTaskMutation';
 import { cn } from '@/lib/utils';
 import { toast } from 'sonner';
 
 interface TaskRecoveryBannerProps {
   className?: string;
   compact?: boolean;
 }
 
 export function TaskRecoveryBanner({ className, compact = false }: TaskRecoveryBannerProps) {
   const { pendingCount, failedCount, triggerSync, isOnline, isSyncing } = useOfflineSync();
   const { retryDraft } = useResilientTaskMutation();
   const [localDrafts, setLocalDrafts] = useState<TaskDraft[]>([]);
   const [isRetrying, setIsRetrying] = useState(false);
   const [dismissed, setDismissed] = useState(false);
 
   // Check for emergency drafts on mount and after sync
   useEffect(() => {
     const checkDrafts = () => {
       const drafts = getPendingTaskDrafts();
       
       // Also check for quick capture draft
       const quickDraft = localStorage.getItem('quick-capture-draft');
       const taskEmergencyDraft = localStorage.getItem('task-emergency-draft');
       
       // Combine all drafts
       const allDrafts: TaskDraft[] = [...drafts];
       
       if (quickDraft) {
         try {
           const parsed = JSON.parse(quickDraft);
           if (parsed.input && parsed.timestamp) {
             allDrafts.push({
               id: 'quick-capture',
               data: { task_text: parsed.input },
               timestamp: parsed.timestamp,
             });
           }
         } catch (e) {
           // Invalid draft, ignore
         }
       }
       
       if (taskEmergencyDraft) {
         try {
           const parsed = JSON.parse(taskEmergencyDraft);
           if (parsed.text && parsed.timestamp) {
             allDrafts.push({
               id: 'task-emergency',
               data: { 
                 task_text: parsed.text,
                 priority: parsed.priority,
               },
               timestamp: parsed.timestamp,
             });
           }
         } catch (e) {
           // Invalid draft, ignore
         }
       }
       
       setLocalDrafts(allDrafts);
     };
     
     checkDrafts();
     
     // Re-check after sync completes
     const interval = setInterval(checkDrafts, 5000);
     return () => clearInterval(interval);
   }, [pendingCount, failedCount]);
 
   const handleSync = useCallback(async () => {
     const result = await triggerSync();
     if (result && result.synced > 0) {
       toast.success(`Synced ${result.synced} item(s)`);
     }
   }, [triggerSync]);
 
   const handleRetryDrafts = useCallback(async () => {
     setIsRetrying(true);
     let successCount = 0;
     
     for (const draft of localDrafts) {
       // Handle special draft types
       if (draft.id === 'quick-capture') {
         // This would need to go through the regular create flow
         // For now, just mark for manual retry
         continue;
       }
       if (draft.id === 'task-emergency') {
         // Same - mark for manual retry
         continue;
       }
       
       const success = await retryDraft(draft);
       if (success) successCount++;
     }
     
     if (successCount > 0) {
       toast.success(`Recovered ${successCount} draft(s)`);
       // Refresh drafts list
       setLocalDrafts(getPendingTaskDrafts());
     }
     
     setIsRetrying(false);
   }, [localDrafts, retryDraft]);
 
   const handleDiscardDrafts = useCallback(() => {
     clearAllTaskDrafts();
     localStorage.removeItem('quick-capture-draft');
     localStorage.removeItem('task-emergency-draft');
     setLocalDrafts([]);
     toast.info('Drafts cleared');
   }, []);
 
   // Don't show if nothing to show or dismissed
   const hasIssues = pendingCount > 0 || failedCount > 0 || localDrafts.length > 0;
   if (!hasIssues || dismissed) {
     return null;
   }
 
   if (compact) {
     return (
       <div className={cn(
         "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs",
         failedCount > 0 
          ? "bg-destructive/10 text-destructive border border-destructive/20"
          : "bg-warning/10 text-warning-foreground border border-warning/20",
         className
       )}>
         {!isOnline ? (
           <CloudOff className="h-3 w-3" />
         ) : (
           <AlertCircle className="h-3 w-3" />
         )}
         <span>
           {pendingCount > 0 && `${pendingCount} pending`}
           {pendingCount > 0 && failedCount > 0 && ' · '}
           {failedCount > 0 && `${failedCount} failed`}
           {(pendingCount > 0 || failedCount > 0) && localDrafts.length > 0 && ' · '}
           {localDrafts.length > 0 && `${localDrafts.length} draft(s)`}
         </span>
         {isOnline && (
           <Button 
             size="sm" 
             variant="ghost" 
             className="h-5 px-1.5 text-xs"
             onClick={handleSync}
             disabled={isSyncing}
           >
             <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
           </Button>
         )}
       </div>
     );
   }
 
   return (
     <div className={cn(
       "relative rounded-lg p-3 mb-4",
       failedCount > 0 
        ? "bg-destructive/10 border border-destructive/30"
        : "bg-warning/10 border border-warning/30",
       className
     )}>
       <Button
         variant="ghost"
         size="sm"
         className="absolute top-1 right-1 h-6 w-6 p-0"
         onClick={() => setDismissed(true)}
       >
         <X className="h-3 w-3" />
       </Button>
       
       <div className="flex flex-wrap items-center gap-2">
         {!isOnline ? (
          <CloudOff className="h-4 w-4 text-warning flex-shrink-0" />
         ) : (
           <AlertCircle className={cn(
             "h-4 w-4 flex-shrink-0",
            failedCount > 0 ? "text-destructive" : "text-warning"
           )} />
         )}
         
         <div className="flex flex-wrap items-center gap-1.5 text-sm">
           {!isOnline && (
            <Badge variant="outline" className="text-warning border-warning/30">
               Offline
             </Badge>
           )}
           {pendingCount > 0 && (
             <Badge variant="secondary">
               {pendingCount} pending sync
             </Badge>
           )}
           {failedCount > 0 && (
             <Badge variant="destructive">
               {failedCount} failed
             </Badge>
           )}
           {localDrafts.length > 0 && (
             <Badge variant="outline">
               {localDrafts.length} unsaved draft(s)
             </Badge>
           )}
         </div>
         
         <div className="flex items-center gap-1.5 ml-auto">
           {localDrafts.length > 0 && (
             <>
               <Button 
                 size="sm" 
                 variant="outline" 
                 className="h-7 text-xs"
                 onClick={handleRetryDrafts}
                 disabled={isRetrying || !isOnline}
               >
                 {isRetrying ? (
                   <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                 ) : (
                   <RefreshCw className="h-3 w-3 mr-1" />
                 )}
                 Restore
               </Button>
               <Button 
                 size="sm" 
                 variant="ghost" 
                 className="h-7 text-xs text-muted-foreground"
                 onClick={handleDiscardDrafts}
               >
                 <Trash2 className="h-3 w-3 mr-1" />
                 Discard
               </Button>
             </>
           )}
           {isOnline && (pendingCount > 0 || failedCount > 0) && (
             <Button 
               size="sm" 
               variant="default" 
               className="h-7 text-xs"
               onClick={handleSync}
               disabled={isSyncing}
             >
               {isSyncing ? (
                 <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
               ) : (
                 <RefreshCw className="h-3 w-3 mr-1" />
               )}
               Sync Now
             </Button>
           )}
         </div>
       </div>
     </div>
   );
 }