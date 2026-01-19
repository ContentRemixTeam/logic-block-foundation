import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface HealthStatus {
  name: string;
  status: 'ok' | 'warning' | 'error' | 'loading';
  message: string;
  details?: string;
}

export function HealthCheckPanel() {
  const { user } = useAuth();
  const { status: calendarStatus } = useGoogleCalendar();
  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useTasks();
  const [healthChecks, setHealthChecks] = useState<HealthStatus[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runHealthChecks = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    const checks: HealthStatus[] = [];

    // 1. Tasks check
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayTasks = tasks.filter(t => 
      t.scheduled_date === today || t.planned_day === today
    );
    
    if (tasksLoading) {
      checks.push({
        name: 'Tasks',
        status: 'loading',
        message: 'Loading tasks...',
      });
    } else if (tasksError) {
      checks.push({
        name: 'Tasks',
        status: 'error',
        message: 'Failed to load tasks',
        details: 'Check console for errors',
      });
    } else {
      checks.push({
        name: 'Tasks',
        status: 'ok',
        message: `${tasks.length} total, ${todayTasks.length} for today`,
        details: `Incomplete today: ${todayTasks.filter(t => !t.is_completed).length}`,
      });
    }

    // 2. Google Calendar check
    if (calendarStatus.connected) {
      if (calendarStatus.lastError) {
        checks.push({
          name: 'Google Calendar',
          status: 'error',
          message: 'Connection error',
          details: calendarStatus.lastError,
        });
      } else if (!calendarStatus.calendarSelected) {
        checks.push({
          name: 'Google Calendar',
          status: 'warning',
          message: 'Connected but no calendar selected',
        });
      } else {
        checks.push({
          name: 'Google Calendar',
          status: 'ok',
          message: `Connected: ${calendarStatus.calendarName || 'Calendar'}`,
          details: calendarStatus.lastSyncAt 
            ? `Last sync: ${format(new Date(calendarStatus.lastSyncAt), 'h:mm a')}`
            : undefined,
        });
      }
    } else {
      checks.push({
        name: 'Google Calendar',
        status: 'warning',
        message: 'Not connected',
        details: 'Connect in settings to sync events',
      });
    }

    // 3. Edge Functions check
    try {
      const startTime = Date.now();
      const { error } = await supabase.functions.invoke('get-dashboard-summary');
      const latency = Date.now() - startTime;
      
      if (error) {
        checks.push({
          name: 'Edge Functions',
          status: 'error',
          message: 'Functions failing',
          details: error.message,
        });
      } else {
        checks.push({
          name: 'Edge Functions',
          status: latency > 3000 ? 'warning' : 'ok',
          message: latency > 3000 ? 'Slow response' : 'Responding',
          details: `Latency: ${latency}ms`,
        });
      }
    } catch (e: any) {
      checks.push({
        name: 'Edge Functions',
        status: 'error',
        message: 'Connection error',
        details: e?.message,
      });
    }

    // 4. Auth check
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const expiresAt = new Date(session.expires_at! * 1000);
      const minsUntilExpiry = Math.round((expiresAt.getTime() - Date.now()) / 60000);
      
      checks.push({
        name: 'Auth Session',
        status: minsUntilExpiry < 10 ? 'warning' : 'ok',
        message: minsUntilExpiry < 10 ? 'Expiring soon' : 'Active',
        details: `Expires in ${minsUntilExpiry} mins`,
      });
    } else {
      checks.push({
        name: 'Auth Session',
        status: 'error',
        message: 'No session',
      });
    }

    setHealthChecks(checks);
    setLastChecked(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      runHealthChecks();
    }
  }, [user, tasks.length, calendarStatus.connected]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'loading':
        return <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusBadge = (status: HealthStatus['status']) => {
    switch (status) {
      case 'ok':
        return <Badge variant="outline" className="text-green-600 border-green-600">OK</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">WARN</Badge>;
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>;
      case 'loading':
        return <Badge variant="secondary">...</Badge>;
    }
  };

  return (
    <Card className="border-dashed border-blue-500/50 bg-blue-500/5">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            🔧 Dev Health Check
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastChecked && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(lastChecked, 'h:mm:ss a')}
              </span>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={runHealthChecks}
              disabled={isRefreshing}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {healthChecks.map((check) => (
          <div 
            key={check.name}
            className="flex items-center justify-between p-2 rounded-lg bg-background/50"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(check.status)}
              <div>
                <p className="text-sm font-medium">{check.name}</p>
                <p className="text-xs text-muted-foreground">{check.message}</p>
                {check.details && (
                  <p className="text-xs text-muted-foreground/70">{check.details}</p>
                )}
              </div>
            </div>
            {getStatusBadge(check.status)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
