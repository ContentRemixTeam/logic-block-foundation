import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface Metric {
  name: string;
  start: number | string | null;
  current: number | string | null;
}

interface MetricsWidgetProps {
  metrics?: {
    metric1_name?: string | null;
    metric1_start?: number | null;
    metric2_name?: string | null;
    metric2_start?: number | null;
    metric3_name?: string | null;
    metric3_start?: number | null;
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
          current: propsMetrics.metric1_start ?? null 
        });
      }
      if (propsMetrics.metric2_name) {
        metricsArray.push({ 
          name: propsMetrics.metric2_name, 
          start: propsMetrics.metric2_start ?? null, 
          current: propsMetrics.metric2_start ?? null 
        });
      }
      if (propsMetrics.metric3_name) {
        metricsArray.push({ 
          name: propsMetrics.metric3_name, 
          start: propsMetrics.metric3_start ?? null, 
          current: propsMetrics.metric3_start ?? null 
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
        .select('metric_1_name, metric_1_start, metric_2_name, metric_2_start, metric_3_name, metric_3_start')
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
          metricsArray.push({ name: cycle.metric_1_name, start: cycle.metric_1_start, current: cycle.metric_1_start });
        }
        if (cycle.metric_2_name) {
          metricsArray.push({ name: cycle.metric_2_name, start: cycle.metric_2_start, current: cycle.metric_2_start });
        }
        if (cycle.metric_3_name) {
          metricsArray.push({ name: cycle.metric_3_name, start: cycle.metric_3_start, current: cycle.metric_3_start });
        }
        setMetrics(metricsArray);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
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
          <Link to="/weekly-review">
            <Button variant="ghost" size="sm" className="text-xs">
              Update <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-3">
          {metrics.map((metric, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <span className="text-sm font-medium">{metric.name}</span>
              <div className="text-right">
                <span className="text-lg font-bold text-primary">
                  {metric.current ?? '-'}
                </span>
                {metric.start !== null && metric.start !== metric.current && (
                  <span className="text-xs text-foreground-muted ml-1">
                    (started: {metric.start})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground-muted mt-3">
          Update your metrics in weekly reviews
        </p>
      </PremiumCardContent>
    </PremiumCard>
  );
}
