import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ChevronDown, ChevronUp, Check, AlertCircle, Clock, Calendar, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOAuthDebugInfo } from '@/hooks/useGoogleCalendar';

interface MutationLogEntry {
  id: string;
  timestamp: Date;
  type: 'create' | 'update' | 'delete' | 'toggle';
  taskId?: string;
  taskText?: string;
  status: 'pending' | 'success' | 'error';
  errorMessage?: string;
  duration?: number;
  updates?: Record<string, any>;
}

// Singleton store for mutations
class MutationLogger {
  private static instance: MutationLogger;
  private entries: MutationLogEntry[] = [];
  private listeners: Set<() => void> = new Set();
  private maxEntries = 10;

  static getInstance(): MutationLogger {
    if (!MutationLogger.instance) {
      MutationLogger.instance = new MutationLogger();
    }
    return MutationLogger.instance;
  }

  log(entry: Omit<MutationLogEntry, 'id' | 'timestamp'>): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEntry: MutationLogEntry = {
      ...entry,
      id,
      timestamp: new Date(),
    };
    
    this.entries = [newEntry, ...this.entries].slice(0, this.maxEntries);
    this.notifyListeners();
    return id;
  }

  updateStatus(id: string, status: 'success' | 'error', errorMessage?: string, duration?: number) {
    this.entries = this.entries.map(e => 
      e.id === id ? { ...e, status, errorMessage, duration } : e
    );
    this.notifyListeners();
  }

  getEntries(): MutationLogEntry[] {
    return this.entries;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  clear() {
    this.entries = [];
    this.notifyListeners();
  }
}

export const mutationLogger = MutationLogger.getInstance();

// Helper to wrap mutations with logging
export function logMutation<T>(
  type: MutationLogEntry['type'],
  taskId: string | undefined,
  taskText: string | undefined,
  updates: Record<string, any> | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const id = mutationLogger.log({
    type,
    taskId,
    taskText,
    updates,
    status: 'pending',
  });

  return fn()
    .then(result => {
      mutationLogger.updateStatus(id, 'success', undefined, Date.now() - startTime);
      return result;
    })
    .catch(error => {
      mutationLogger.updateStatus(id, 'error', error?.message || 'Unknown error', Date.now() - startTime);
      throw error;
    });
}

type DebugTab = 'mutations' | 'oauth';

export function DevDebugPanel() {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<DebugTab>('mutations');
  const [entries, setEntries] = useState<MutationLogEntry[]>([]);

  // Check if debug mode is enabled via query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsVisible(params.get('debug') === '1');
  }, [location.search]);

  // Subscribe to mutation updates
  useEffect(() => {
    const updateEntries = () => {
      setEntries([...mutationLogger.getEntries()]);
    };
    
    updateEntries();
    return mutationLogger.subscribe(updateEntries);
  }, []);

  if (!isVisible) {
    return null;
  }

  const successCount = entries.filter(e => e.status === 'success').length;
  const errorCount = entries.filter(e => e.status === 'error').length;
  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const oauthDebugInfo = getOAuthDebugInfo();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 bg-card border rounded-lg shadow-lg font-mono text-xs">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-2 border-b bg-muted/50 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">🔧 Debug</span>
          <div className="flex gap-1">
            {successCount > 0 && (
              <span className="bg-green-500/20 text-green-600 px-1.5 rounded">
                ✓{successCount}
              </span>
            )}
            {errorCount > 0 && (
              <span className="bg-red-500/20 text-red-600 px-1.5 rounded">
                ✗{errorCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="bg-yellow-500/20 text-yellow-600 px-1.5 rounded animate-pulse">
                ⏳{pendingCount}
              </span>
            )}
            {oauthDebugInfo.lastError && (
              <span className="bg-orange-500/20 text-orange-600 px-1.5 rounded">
                OAuth ✗
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="p-1 hover:bg-muted rounded"
            onClick={(e) => { e.stopPropagation(); mutationLogger.clear(); }}
          >
            Clear
          </button>
          {isCollapsed ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      {!isCollapsed && (
        <div className="flex border-b">
          <button
            className={cn(
              "flex-1 p-2 text-center hover:bg-muted/50 transition-colors",
              activeTab === 'mutations' && "bg-muted border-b-2 border-primary"
            )}
            onClick={() => setActiveTab('mutations')}
          >
            <Clock className="h-3 w-3 inline mr-1" />
            Mutations
          </button>
          <button
            className={cn(
              "flex-1 p-2 text-center hover:bg-muted/50 transition-colors",
              activeTab === 'oauth' && "bg-muted border-b-2 border-primary"
            )}
            onClick={() => setActiveTab('oauth')}
          >
            <Calendar className="h-3 w-3 inline mr-1" />
            OAuth
          </button>
        </div>
      )}

      {/* Tab Content */}
      {!isCollapsed && activeTab === 'mutations' && (
        <div className="max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No mutations logged yet
            </div>
          ) : (
            entries.slice(0, 5).map((entry) => (
              <div 
                key={entry.id}
                className={cn(
                  "p-2 border-b last:border-b-0",
                  entry.status === 'error' && "bg-red-500/5",
                  entry.status === 'pending' && "bg-yellow-500/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {entry.status === 'success' && (
                      <Check className="h-3 w-3 text-green-500" />
                    )}
                    {entry.status === 'error' && (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    )}
                    {entry.status === 'pending' && (
                      <Clock className="h-3 w-3 text-yellow-500 animate-pulse" />
                    )}
                    <span className={cn(
                      "font-medium uppercase",
                      entry.type === 'create' && "text-blue-500",
                      entry.type === 'update' && "text-yellow-500",
                      entry.type === 'delete' && "text-red-500",
                      entry.type === 'toggle' && "text-purple-500",
                    )}>
                      {entry.type}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {entry.timestamp.toLocaleTimeString()}
                    {entry.duration && (
                      <span className="ml-1 text-muted-foreground/70">
                        ({entry.duration}ms)
                      </span>
                    )}
                  </span>
                </div>
                
                {entry.taskText && (
                  <div className="mt-1 text-muted-foreground truncate">
                    "{entry.taskText.substring(0, 30)}{entry.taskText.length > 30 ? '...' : ''}"
                  </div>
                )}
                
                {entry.updates && Object.keys(entry.updates).length > 0 && (
                  <div className="mt-1 text-muted-foreground/70">
                    {Object.entries(entry.updates)
                      .filter(([k]) => k !== 'action' && k !== 'task_id')
                      .slice(0, 3)
                      .map(([key, val]) => (
                        <span key={key} className="mr-2">
                          <span className="text-primary/70">{key}:</span>{' '}
                          {val === null ? 'null' : String(val).substring(0, 15)}
                        </span>
                      ))}
                  </div>
                )}
                
                {entry.errorMessage && (
                  <div className="mt-1 text-red-500 text-[10px]">
                    {entry.errorMessage}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* OAuth Debug Tab */}
      {!isCollapsed && activeTab === 'oauth' && (
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Flow Type:</span>
              <span className="text-primary font-medium">{oauthDebugInfo.flowType}</span>
            </div>
            
            <div className="flex items-start gap-2">
              <Globe className="h-3 w-3 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">Origin:</span>
              <span className="text-foreground break-all">{oauthDebugInfo.currentOrigin}</span>
            </div>
            
            <div className="flex items-start gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">Redirect URI:</span>
            </div>
            <div className="bg-muted/50 p-1.5 rounded text-[10px] break-all">
              {oauthDebugInfo.redirectUri}
            </div>
            
            {oauthDebugInfo.lastError && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                <span className="text-red-500 font-medium">Last Error:</span>
                <div className="text-red-400 mt-1">{oauthDebugInfo.lastError}</div>
              </div>
            )}
            
            {Object.keys(oauthDebugInfo.lastOAuthParams || {}).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Last OAuth Params
                </summary>
                <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] overflow-auto">
                  {JSON.stringify(oauthDebugInfo.lastOAuthParams, null, 2)}
                </pre>
              </details>
            )}
          </div>
          
          <div className="pt-2 border-t text-muted-foreground">
            <p className="text-[10px]">
              ℹ️ Google OAuth uses Edge Function callback at 
              <code className="ml-1 text-primary">/functions/v1/google-oauth-callback</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}