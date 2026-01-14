import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, BarChart3, ArrowRight, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MetricData {
  metric_1_name: string | null;
  metric_2_name: string | null;
  metric_3_name: string | null;
  metric_4_name: string | null;
  metric_5_name: string | null;
  metric_1_start: number | null;
  metric_2_start: number | null;
  metric_3_start: number | null;
  metric_4_start: number | null;
  metric_5_start: number | null;
  metric_1_goal: number | null;
  metric_2_goal: number | null;
  metric_3_goal: number | null;
  metric_4_goal: number | null;
  metric_5_goal: number | null;
  metric_1_current: number | null;
  metric_2_current: number | null;
  metric_3_current: number | null;
  metric_4_current: number | null;
  metric_5_current: number | null;
  metric_1_change: number | null;
  metric_2_change: number | null;
  metric_3_change: number | null;
  metric_4_change: number | null;
  metric_5_change: number | null;
}

interface WeeklyDataPoint {
  week_number: number;
  start_of_week: string;
  metric_1_actual: number | null;
  metric_2_actual: number | null;
  metric_3_actual: number | null;
  metric_4_actual: number | null;
  metric_5_actual: number | null;
}

interface ProgressData {
  has_cycle: boolean;
  metrics: MetricData;
  weekly_data: WeeklyDataPoint[];
  cycle_start_date: string;
}

// Trend calculation helper
function calculateTrend(data: (number | null)[]): 'up' | 'down' | 'flat' {
  const validData = data.filter((d): d is number => d !== null);
  if (validData.length < 2) return 'flat';
  
  const recent = validData.slice(-3);
  if (recent.length < 2) return 'flat';
  
  const first = recent[0];
  const last = recent[recent.length - 1];
  const diff = ((last - first) / Math.abs(first)) * 100;
  
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'flat';
}

const MetricSummaryCard = ({
  name,
  start,
  current,
  goal,
  change,
  weeklyData,
}: {
  name: string | null;
  start: number | null;
  current: number | null;
  goal: number | null;
  change: number | null;
  weeklyData: (number | null)[];
}) => {
  if (!name) return null;

  const isPositive = change !== null && change >= 0;
  const hasData = current !== null;
  const trend = calculateTrend(weeklyData);
  
  // Calculate progress to goal
  const goalProgress = goal && start !== null && current !== null
    ? Math.round(((current - start) / (goal - start)) * 100)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {name}
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-success" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-destructive" />}
          {trend === 'flat' && <Minus className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Started</span>
          <span className="font-medium">{start ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current</span>
          <span className="font-medium">{hasData ? current : "—"}</span>
        </div>
        {goal !== null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Goal
            </span>
            <span className="font-medium">{goal}</span>
          </div>
        )}
        {goal !== null && goalProgress !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress to Goal</span>
              <span className={`font-medium ${goalProgress >= 100 ? 'text-success' : goalProgress >= 50 ? 'text-primary' : 'text-muted-foreground'}`}>
                {goalProgress}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all ${goalProgress >= 100 ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, Math.max(0, goalProgress))}%` }}
              />
            </div>
          </div>
        )}
        {hasData && change !== null ? (
          <div className="flex items-center justify-between text-sm pt-1 border-t">
            <span className="text-muted-foreground">Change</span>
            <span className={`font-medium flex items-center gap-1 ${isPositive ? "text-success" : "text-destructive"}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}{change.toFixed(1)}%
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm pt-1 border-t">
            <span className="text-muted-foreground">Change</span>
            <span className="text-muted-foreground text-xs">No data yet</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Line colors for 5 metrics
const METRIC_COLORS = [
  "hsl(210, 100%, 50%)", // Blue
  "hsl(142, 76%, 36%)",  // Green
  "hsl(270, 70%, 50%)",  // Purple
  "hsl(30, 100%, 50%)",  // Orange
  "hsl(340, 82%, 52%)",  // Pink
];

export default function Progress() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase.functions.invoke("get-progress-metrics", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;
      setProgressData(data);
    } catch (error) {
      console.error("Error loading progress data:", error);
      toast({
        title: "Error",
        description: "Failed to load progress data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get all metric names that are defined
  const definedMetrics = [
    { key: 'metric_1', name: progressData?.metrics?.metric_1_name },
    { key: 'metric_2', name: progressData?.metrics?.metric_2_name },
    { key: 'metric_3', name: progressData?.metrics?.metric_3_name },
    { key: 'metric_4', name: progressData?.metrics?.metric_4_name },
    { key: 'metric_5', name: progressData?.metrics?.metric_5_name },
  ].filter(m => m.name);

  // Transform data for the chart - fill in all 13 weeks
  const chartData = [];
  for (let i = 1; i <= 13; i++) {
    const weekData = progressData?.weekly_data?.find(w => w.week_number === i);
    const dataPoint: Record<string, string | number | null> = { name: `W${i}` };
    
    definedMetrics.forEach((metric, idx) => {
      const actualKey = `${metric.key}_actual` as keyof WeeklyDataPoint;
      dataPoint[metric.name as string] = weekData?.[actualKey] ?? null;
    });
    
    chartData.push(dataPoint);
  }

  const hasAnyMetrics = definedMetrics.length > 0;

  const hasAnyData = progressData?.weekly_data?.some(
    w => w.metric_1_actual !== null || w.metric_2_actual !== null || w.metric_3_actual !== null ||
         w.metric_4_actual !== null || w.metric_5_actual !== null
  );

  // Helper to get weekly data for a specific metric
  const getWeeklyDataForMetric = (metricNum: 1 | 2 | 3 | 4 | 5): (number | null)[] => {
    const key = `metric_${metricNum}_actual` as keyof WeeklyDataPoint;
    return progressData?.weekly_data?.map(w => w[key] as number | null) || [];
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading progress...</div>
        </div>
      </Layout>
    );
  }

  // No cycle state
  if (!progressData?.has_cycle) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quarterly Progress</h1>
            <p className="text-muted-foreground">Track your key metrics over 13 weeks</p>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Cycle</h3>
              <p className="text-muted-foreground mb-6">
                Set up your 90-Day Plan first to track metrics
              </p>
              <Button asChild>
                <Link to="/cycle-setup">
                  Go to Cycle Setup <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // No metrics defined
  if (!hasAnyMetrics) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quarterly Progress</h1>
            <p className="text-muted-foreground">Track your key metrics over 13 weeks</p>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Metrics Defined</h3>
              <p className="text-muted-foreground mb-6">
                Add metrics to your cycle setup to start tracking progress
              </p>
              <Button asChild>
                <Link to="/cycle-setup">
                  Edit Cycle Setup <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quarterly Progress</h1>
            <p className="text-muted-foreground">Your {definedMetrics.length} key metrics over 13 weeks</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/weekly-review">
              Update Metrics <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Metric Trends
            </CardTitle>
            <CardDescription>Weekly progress throughout your 90-day cycle</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasAnyData ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Start tracking your weekly metrics to see trends here
                </p>
                <Button asChild variant="outline">
                  <Link to="/weekly-review">
                    Complete This Week's Review <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="h-[400px] w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height="100%" minWidth={600}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--card-foreground))"
                      }}
                    />
                    <Legend />
                    {definedMetrics.map((metric, idx) => (
                      <Line
                        key={metric.key}
                        type="monotone"
                        dataKey={metric.name as string}
                        stroke={METRIC_COLORS[idx]}
                        strokeWidth={2}
                        dot={{ fill: METRIC_COLORS[idx] }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quarter Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quarter Summary</h2>
          <div className={`grid gap-4 ${definedMetrics.length <= 3 ? 'md:grid-cols-3' : definedMetrics.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
            <MetricSummaryCard
              name={progressData?.metrics?.metric_1_name}
              start={progressData?.metrics?.metric_1_start}
              current={progressData?.metrics?.metric_1_current}
              goal={progressData?.metrics?.metric_1_goal}
              change={progressData?.metrics?.metric_1_change}
              weeklyData={getWeeklyDataForMetric(1)}
            />
            <MetricSummaryCard
              name={progressData?.metrics?.metric_2_name}
              start={progressData?.metrics?.metric_2_start}
              current={progressData?.metrics?.metric_2_current}
              goal={progressData?.metrics?.metric_2_goal}
              change={progressData?.metrics?.metric_2_change}
              weeklyData={getWeeklyDataForMetric(2)}
            />
            <MetricSummaryCard
              name={progressData?.metrics?.metric_3_name}
              start={progressData?.metrics?.metric_3_start}
              current={progressData?.metrics?.metric_3_current}
              goal={progressData?.metrics?.metric_3_goal}
              change={progressData?.metrics?.metric_3_change}
              weeklyData={getWeeklyDataForMetric(3)}
            />
            <MetricSummaryCard
              name={progressData?.metrics?.metric_4_name}
              start={progressData?.metrics?.metric_4_start}
              current={progressData?.metrics?.metric_4_current}
              goal={progressData?.metrics?.metric_4_goal}
              change={progressData?.metrics?.metric_4_change}
              weeklyData={getWeeklyDataForMetric(4)}
            />
            <MetricSummaryCard
              name={progressData?.metrics?.metric_5_name}
              start={progressData?.metrics?.metric_5_start}
              current={progressData?.metrics?.metric_5_current}
              goal={progressData?.metrics?.metric_5_goal}
              change={progressData?.metrics?.metric_5_change}
              weeklyData={getWeeklyDataForMetric(5)}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}