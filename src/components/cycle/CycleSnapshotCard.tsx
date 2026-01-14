import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Target, ChevronDown, ChevronUp, Sparkles, Flame, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface CycleData {
  cycle_id: string;
  goal: string;
  why?: string | null;
  identity?: string | null;
  focus_area?: string | null;
  start_date: string;
  end_date: string;
  metric_1_name?: string | null;
  metric_1_start?: number | null;
  metric_2_name?: string | null;
  metric_2_start?: number | null;
  metric_3_name?: string | null;
  metric_3_start?: number | null;
}

interface CycleSnapshotCardProps {
  onCycleLoaded?: (cycle: CycleData | null) => void;
}

export function CycleSnapshotCard({ onCycleLoaded }: CycleSnapshotCardProps) {
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('cycleSnapshotOpen');
    return stored !== null ? stored === 'true' : false;
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadCycle();
  }, []);

  useEffect(() => {
    localStorage.setItem('cycleSnapshotOpen', String(isOpen));
  }, [isOpen]);

  const loadCycle = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('get-current-cycle-or-create', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      
      const cycleData = data?.cycle || null;
      setCycle(cycleData);
      onCycleLoaded?.(cycleData);
    } catch (err) {
      console.error('Error loading cycle:', err);
      setCycle(null);
      onCycleLoaded?.(null);
    } finally {
      setLoading(false);
    }
  };

  const getDayInfo = () => {
    if (!cycle) return { dayNumber: 0, daysRemaining: 0 };
    const start = new Date(cycle.start_date);
    const end = new Date(cycle.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const dayNumber = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysRemaining = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return { dayNumber: Math.max(1, Math.min(dayNumber, 90)), daysRemaining: Math.max(0, daysRemaining) };
  };

  const getFocusAreaBadge = () => {
    if (!cycle?.focus_area) return null;
    
    const focusConfig: Record<string, { label: string; icon: typeof Sparkles; className: string }> = {
      discover: { label: 'DISCOVER', icon: Sparkles, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      nurture: { label: 'NURTURE', icon: Flame, className: 'bg-primary/10 text-primary border-primary/20' },
      convert: { label: 'CONVERT', icon: Users, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    };
    
    const config = focusConfig[cycle.focus_area.toLowerCase()];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.className} text-xs font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getMetrics = () => {
    if (!cycle) return [];
    const metrics = [];
    if (cycle.metric_1_name) metrics.push({ name: cycle.metric_1_name, value: cycle.metric_1_start });
    if (cycle.metric_2_name) metrics.push({ name: cycle.metric_2_name, value: cycle.metric_2_start });
    if (cycle.metric_3_name) metrics.push({ name: cycle.metric_3_name, value: cycle.metric_3_start });
    return metrics;
  };

  if (loading) {
    return (
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!cycle) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Set up your 90-Day Cycle to unlock planning</span>
            </div>
            <Button size="sm" onClick={() => navigate('/cycle-setup')}>
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { dayNumber, daysRemaining } = getDayInfo();
  const metrics = getMetrics();

  return (
    <Card className="bg-muted/30 border-muted">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">90-Day Cycle</span>
                {getFocusAreaBadge()}
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">{cycle.goal}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Day {dayNumber} of 90 • {daysRemaining} days remaining
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-3 pt-3 border-t border-border/50">
            <div className="space-y-2 text-sm">
              {cycle.why && (
                <div>
                  <span className="text-muted-foreground">Why: </span>
                  <span className="text-foreground">{cycle.why}</span>
                </div>
              )}
              {cycle.identity && (
                <div>
                  <span className="text-muted-foreground">Identity: </span>
                  <span className="text-foreground">{cycle.identity}</span>
                </div>
              )}
              {metrics.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {metrics.map((m, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-muted-foreground">{m.name}: </span>
                      <span className="font-medium">{m.value ?? '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
