import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  Target, ChevronDown, ChevronUp, Sparkles, Flame, Users, 
  AlertCircle, CheckCircle2, TrendingUp, DollarSign, Zap 
} from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ContextPullSectionProps {
  cycle: {
    goal: string;
    focus_area: string | null;
    identity: string | null;
    start_date: string;
    end_date: string;
    biggest_bottleneck?: string | null;
  } | null;
  weekNumber: number;
  quarterStats: {
    revenue_goal: number | null;
    revenue_actual: number;
    sales_goal: number | null;
    sales_actual: number;
    offers_goal: number | null;
    offers_actual: number;
  };
  executionStats: {
    tasks_completed: number;
    tasks_total: number;
    habit_percent: number;
    alignment_average: number | null;
  };
  bottleneck: string | null;
  launchStatus: 'none' | 'approaching' | 'this_week' | null;
}

export function ContextPullSection({
  cycle,
  weekNumber,
  quarterStats,
  executionStats,
  bottleneck,
  launchStatus,
}: ContextPullSectionProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  if (!cycle) return null;

  const getStatusColor = (actual: number, goal: number | null) => {
    if (!goal || goal === 0) return 'text-muted-foreground';
    const percent = (actual / goal) * 100;
    if (percent >= 90) return 'text-green-600';
    if (percent >= 70) return 'text-orange-500';
    return 'text-red-500';
  };

  const getStatusIcon = (actual: number, goal: number | null) => {
    if (!goal || goal === 0) return null;
    const percent = (actual / goal) * 100;
    if (percent >= 90) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (percent >= 70) return <AlertCircle className="h-4 w-4 text-orange-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
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

  const taskPercent = executionStats.tasks_total > 0 
    ? Math.round((executionStats.tasks_completed / executionStats.tasks_total) * 100) 
    : 0;

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}K`;
    return `$${val}`;
  };

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Target className="h-5 w-5 text-accent shrink-0" />
                <CardTitle className="text-base">Before You Review...</CardTitle>
                {getFocusAreaBadge()}
              </div>
              <p className="text-sm text-muted-foreground">
                Here's what you committed to this quarter
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Goal Reminder */}
            <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Your 90-Day Goal
              </p>
              <p className="text-sm font-medium">{cycle.goal}</p>
            </div>

            {/* Quarterly Targets Grid */}
            <div className={cn(
              "grid gap-3",
              isMobile ? "grid-cols-1" : "grid-cols-3"
            )}>
              {/* Revenue */}
              {quarterStats.revenue_goal && (
                <div className="bg-background rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Revenue
                    </span>
                    {getStatusIcon(quarterStats.revenue_actual, quarterStats.revenue_goal)}
                  </div>
                  <p className={cn(
                    "text-lg font-bold",
                    getStatusColor(quarterStats.revenue_actual, quarterStats.revenue_goal)
                  )}>
                    {formatCurrency(quarterStats.revenue_actual)}
                    <span className="text-muted-foreground text-sm font-normal">
                      /{formatCurrency(quarterStats.revenue_goal)}
                    </span>
                  </p>
                </div>
              )}

              {/* Sales */}
              {quarterStats.sales_goal && (
                <div className="bg-background rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Sales
                    </span>
                    {getStatusIcon(quarterStats.sales_actual, quarterStats.sales_goal)}
                  </div>
                  <p className={cn(
                    "text-lg font-bold",
                    getStatusColor(quarterStats.sales_actual, quarterStats.sales_goal)
                  )}>
                    {quarterStats.sales_actual}
                    <span className="text-muted-foreground text-sm font-normal">
                      /{quarterStats.sales_goal}
                    </span>
                  </p>
                </div>
              )}

              {/* Offers */}
              {quarterStats.offers_goal && (
                <div className="bg-background rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Offers
                    </span>
                    {getStatusIcon(quarterStats.offers_actual, quarterStats.offers_goal)}
                  </div>
                  <p className={cn(
                    "text-lg font-bold",
                    getStatusColor(quarterStats.offers_actual, quarterStats.offers_goal)
                  )}>
                    {quarterStats.offers_actual}
                    <span className="text-muted-foreground text-sm font-normal">
                      /{quarterStats.offers_goal}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Bottleneck */}
            {bottleneck && (
              <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">
                  Your Focus Bottleneck
                </p>
                <p className="text-sm font-medium capitalize">{bottleneck}</p>
              </div>
            )}

            {/* This Week's Execution */}
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                This Week's Execution
              </p>
              <div className={cn(
                "grid gap-3",
                isMobile ? "grid-cols-3" : "grid-cols-3"
              )}>
                <div className="text-center">
                  <p className="text-lg font-bold">{executionStats.tasks_completed}/{executionStats.tasks_total}</p>
                  <p className="text-xs text-muted-foreground">Tasks ({taskPercent}%)</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{executionStats.habit_percent}%</p>
                  <p className="text-xs text-muted-foreground">Habits</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{executionStats.alignment_average ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Alignment</p>
                </div>
              </div>
            </div>

            {/* Launch Status */}
            {launchStatus && launchStatus !== 'none' && (
              <div className={cn(
                "rounded-lg p-3 border",
                launchStatus === 'this_week' 
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-blue-500/10 border-blue-500/20"
              )}>
                <p className="text-sm font-medium">
                  {launchStatus === 'this_week' 
                    ? '🚀 Launch this week!'
                    : '📅 Launch approaching'}
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
