import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, BarChart3, ArrowRight } from "lucide-react";
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
  metric_1_start: number | null;
  metric_2_start: number | null;
  metric_3_start: number | null;
  metric_1_current: number | null;
  metric_2_current: number | null;
  metric_3_current: number | null;
  metric_1_change: number | null;
  metric_2_change: number | null;
  metric_3_change: number | null;
}

interface WeeklyDataPoint {
  week_number: number;
  start_of_week: string;
  metric_1_actual: number | null;
  metric_2_actual: number | null;
  metric_3_actual: number | null;
}

interface ProgressData {
  has_cycle: boolean;
  metrics: MetricData;
  weekly_data: WeeklyDataPoint[];
  cycle_start_date: string;
}

const MetricSummaryCard = ({
  name,
  start,
  current,
  change,
}: {
  name: string | null;
  start: number | null;
  current: number | null;
  change: number | null;
}) => {
  if (!name) return null;

  const isPositive = change !== null && change >= 0;
  const hasData = current !== null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
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
        {hasData && change !== null ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Change</span>
            <span className={`font-medium flex items-center gap-1 ${isPositive ? "text-success" : "text-destructive"}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}{change.toFixed(1)}%
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Change</span>
            <span className="text-muted-foreground text-xs">No data yet</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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

  // Transform data for the chart - fill in all 13 weeks
  const chartData = [];
  for (let i = 1; i <= 13; i++) {
    const weekData = progressData?.weekly_data?.find(w => w.week_number === i);
    chartData.push({
      name: `W${i}`,
      [progressData?.metrics?.metric_1_name || "Metric 1"]: weekData?.metric_1_actual ?? null,
      [progressData?.metrics?.metric_2_name || "Metric 2"]: weekData?.metric_2_actual ?? null,
      [progressData?.metrics?.metric_3_name || "Metric 3"]: weekData?.metric_3_actual ?? null,
    });
  }

  const hasAnyMetrics = progressData?.metrics?.metric_1_name || 
                        progressData?.metrics?.metric_2_name || 
                        progressData?.metrics?.metric_3_name;

  const hasAnyData = progressData?.weekly_data?.some(
    w => w.metric_1_actual !== null || w.metric_2_actual !== null || w.metric_3_actual !== null
  );

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
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quarterly Progress</h1>
          <p className="text-muted-foreground">Your 3 key metrics over 13 weeks</p>
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
              <div className="h-[350px] w-full overflow-x-auto">
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
                    {progressData?.metrics?.metric_1_name && (
                      <Line
                        type="monotone"
                        dataKey={progressData.metrics.metric_1_name}
                        stroke="hsl(210, 100%, 50%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(210, 100%, 50%)" }}
                        connectNulls
                      />
                    )}
                    {progressData?.metrics?.metric_2_name && (
                      <Line
                        type="monotone"
                        dataKey={progressData.metrics.metric_2_name}
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(142, 76%, 36%)" }}
                        connectNulls
                      />
                    )}
                    {progressData?.metrics?.metric_3_name && (
                      <Line
                        type="monotone"
                        dataKey={progressData.metrics.metric_3_name}
                        stroke="hsl(270, 70%, 50%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(270, 70%, 50%)" }}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quarter Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quarter Summary</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricSummaryCard
              name={progressData?.metrics?.metric_1_name}
              start={progressData?.metrics?.metric_1_start}
              current={progressData?.metrics?.metric_1_current}
              change={progressData?.metrics?.metric_1_change}
            />
            <MetricSummaryCard
              name={progressData?.metrics?.metric_2_name}
              start={progressData?.metrics?.metric_2_start}
              current={progressData?.metrics?.metric_2_current}
              change={progressData?.metrics?.metric_2_change}
            />
            <MetricSummaryCard
              name={progressData?.metrics?.metric_3_name}
              start={progressData?.metrics?.metric_3_start}
              current={progressData?.metrics?.metric_3_current}
              change={progressData?.metrics?.metric_3_change}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
