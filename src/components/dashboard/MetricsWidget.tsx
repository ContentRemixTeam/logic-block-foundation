import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { TrendingUp, ArrowRight, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Metric {
  name: string;
  start: number | null;
  current: number | null;
  goal: number | null;
}

interface MetricsWidgetProps {
  metrics?: {
    metric1_name?: string | null;
    metric1_start?: number | null;
    metric1_goal?: number | null;
    metric2_name?: string | null;
    metric2_start?: number | null;
    metric2_goal?: number | null;
    metric3_name?: string | null;
    metric3_start?: number | null;
    metric3_goal?: number | null;
    metric4_name?: string | null;
    metric4_start?: number | null;
    metric4_goal?: number | null;
    metric5_name?: string | null;
    metric5_start?: number | null;
    metric5_goal?: number | null;
  } | null;
}

export function MetricsWidget({ metrics: propsMetrics }: MetricsWidgetProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propsMetrics) {
      // Use props if provided
      const metricsArray: Metric[] = [];
      if (propsMetrics.metric1_name) {
        metricsArray.push({ 
          name: propsMetrics.metric1_name, 
          start: propsMetrics.metric1_start ?? null, 
          current: propsMetrics.metric1_start ?? null,
          goal: propsMetrics.metric1_goal ?? null
        });
      }
      if (propsMetrics.metric2_name) {
        metricsArray.push({ 
          name: propsMetrics.metric2_name, 
          start: propsMetrics.metric2_start ?? null, 
          current: propsMetrics.metric2_start ?? null,
          goal: propsMetrics.metric2_goal ?? null
        });
      }
      if (propsMetrics.metric3_name) {
        metricsArray.push({ 
          name: propsMetrics.metric3_name, 
          start: propsMetrics.metric3_start ?? null, 
          current: propsMetrics.metric3_start ?? null,
          goal: propsMetrics.metric3_goal ?? null
        });
      }
      if (propsMetrics.metric4_name) {
        metricsArray.push({ 
          name: propsMetrics.metric4_name, 
          start: propsMetrics.metric4_start ?? null, 
          current: propsMetrics.metric4_start ?? null,
          goal: propsMetrics.metric4_goal ?? null
        });
      }
      if (propsMetrics.metric5_name) {
        metricsArray.push({ 
          name: propsMetrics.metric5_name, 
          start: propsMetrics.metric5_start ?? null, 
          current: propsMetrics.metric5_start ?? null,
          goal: propsMetrics.metric5_goal ?? null
        });
      }
      setMetrics(metricsArray);
      setLoading(false);
    } else {
      loadMetrics();
    }
  }, [user, propsMetrics]);

  const loadMetrics = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const { data: cycle, error } = await supabase
        .from('cycles_90_day')
        .select(`
          metric_1_name, metric_1_start, metric_1_goal,
          metric_2_name, metric_2_start, metric_2_goal,
          metric_3_name, metric_3_start, metric_3_goal,
          metric_4_name, metric_4_start, metric_4_goal,
          metric_5_name, metric_5_start, metric_5_goal
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading metrics:', error);
        setLoading(false);
        return;
      }
      
      if (cycle) {
        const metricsArray: Metric[] = [];
        if (cycle.metric_1_name) {
          metricsArray.push({ 
            name: cycle.metric_1_name, 
            start: cycle.metric_1_start, 
            current: cycle.metric_1_start,
            goal: cycle.metric_1_goal
          });
        }
        if (cycle.metric_2_name) {
          metricsArray.push({ 
            name: cycle.metric_2_name, 
            start: cycle.metric_2_start, 
            current: cycle.metric_2_start,
            goal: cycle.metric_2_goal
          });
        }
        if (cycle.metric_3_name) {
          metricsArray.push({ 
            name: cycle.metric_3_name, 
            start: cycle.metric_3_start, 
            current: cycle.metric_3_start,
            goal: cycle.metric_3_goal
          });
        }
        if (cycle.metric_4_name) {
          metricsArray.push({ 
            name: cycle.metric_4_name, 
            start: cycle.metric_4_start, 
            current: cycle.metric_4_start,
            goal: cycle.metric_4_goal
          });
        }
        if (cycle.metric_5_name) {
          metricsArray.push({ 
            name: cycle.metric_5_name, 
            start: cycle.metric_5_start, 
            current: cycle.metric_5_start,
            goal: cycle.metric_5_goal
          });
        }
        setMetrics(metricsArray);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (start: number | null, current: number | null, goal: number | null): number => {
    if (start === null || goal === null || goal === start) return 0;
    const effectiveCurrent = current ?? start;
    const progress = ((effectiveCurrent - start) / (goal - start)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  if (loading || metrics.length === 0) return null;

  return (
    <PremiumCard category="do">
      <PremiumCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-foreground-muted" />
            <PremiumCardTitle className="text-base">Success Metrics</PremiumCardTitle>
          </div>
          <Link to="/progress">
            <Button variant="ghost" size="sm" className="text-xs">
              View Progress <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-3">
          {metrics.slice(0, 3).map((metric, i) => {
            const progress = calculateProgress(metric.start, metric.current, metric.goal);
            const hasGoal = metric.goal !== null;
            
            return (
              <div key={i} className="p-2 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">
                      {metric.current ?? '-'}
                    </span>
                    {hasGoal && (
                      <span className="text-xs text-foreground-muted ml-1">
                        / {metric.goal}
                      </span>
                    )}
                  </div>
                </div>
                {hasGoal && (
                  <Progress value={progress} className="h-1.5" />
                )}
              </div>
            );
          })}
        </div>
        {metrics.length > 3 && (
          <p className="text-xs text-foreground-muted mt-2">
            +{metrics.length - 3} more metrics
          </p>
        )}
        <p className="text-xs text-foreground-muted mt-3">
          Update your metrics in weekly reviews
        </p>
      </PremiumCardContent>
    </PremiumCard>
  );
}
