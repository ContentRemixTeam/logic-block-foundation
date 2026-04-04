import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, ReferenceLine, Area
} from 'recharts';
import {
  Flame, Trophy, Target, Brain, TrendingUp, AlertTriangle, CheckCircle2, Sparkles
} from 'lucide-react';
import {
  useAllScorecards,
  calculateStreak,
  type WeeklyScorecard,
} from '@/hooks/useWeeklyScorecard';
import { StaggerContainer, StaggerItem } from '@/components/transitions/PageTransition';

interface ScorecardDashboardProps {
  cycleId: string;
  cycleGoal: string;
  weekNumber: number;
}

export function ScorecardDashboard({ cycleId, cycleGoal, weekNumber }: ScorecardDashboardProps) {
  const { data: scorecards = [], isLoading } = useAllScorecards(cycleId);

  const streak = useMemo(() => calculateStreak(scorecards), [scorecards]);

  const latestScorecard = useMemo(() => {
    if (!scorecards.length) return null;
    return [...scorecards].sort((a, b) => b.week_number - a.week_number)[0];
  }, [scorecards]);

  const avgExecution = useMemo(() => {
    const scored = scorecards.filter(s => s.execution_score !== null);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((sum, s) => sum + (s.execution_score ?? 0), 0) / scored.length);
  }, [scorecards]);

  const sprintCompletions = useMemo(() => {
    return scorecards.filter(s => s.sprint_phase === 'complete').length;
  }, [scorecards]);

  // Build 13-week chart data
  const chartData = useMemo(() => {
    const weeks = Array.from({ length: 13 }, (_, i) => {
      const week = i + 1;
      const sc = scorecards.find(s => s.week_number === week);
      return {
        week: `W${week}`,
        weekNum: week,
        execution: sc?.execution_score ?? null,
        belief: sc?.belief_score ? sc.belief_score * 10 : null, // Scale to 0-100 for overlay
        beliefRaw: sc?.belief_score ?? null,
        isCurrent: week === weekNumber,
      };
    });
    return weeks;
  }, [scorecards, weekNumber]);

  const beliefTrend = useMemo(() => {
    if (scorecards.length < 2) return 'stable';
    const sorted = [...scorecards].sort((a, b) => b.week_number - a.week_number);
    const latest = sorted[0]?.belief_score;
    const previous = sorted[1]?.belief_score;
    if (!latest || !previous) return 'stable';
    if (latest < previous) return 'down';
    if (latest > previous) return 'up';
    return 'stable';
  }, [scorecards]);

  if (isLoading) {
    return <div className="space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}
    </div>;
  }

  return (
    <StaggerContainer className="space-y-6">
      {/* Cycle Goal Banner */}
      <StaggerItem>
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">90-Day Goal</p>
          <h2 className="text-xl font-bold">{cycleGoal || 'Set your 90-day goal'}</h2>
          <p className="text-sm text-muted-foreground">Week {weekNumber} of 13</p>
        </div>
      </StaggerItem>

      {/* Quick Stats Row */}
      <StaggerItem>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Execution Avg */}
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <CheckCircle2 className={cn("h-5 w-5 mx-auto mb-1", avgExecution >= 85 ? "text-green-500" : avgExecution >= 65 ? "text-yellow-500" : "text-muted-foreground")} />
              <p className={cn("text-2xl font-bold tabular-nums", avgExecution >= 85 ? "text-green-500" : avgExecution >= 65 ? "text-yellow-500" : "text-muted-foreground")}>
                {avgExecution > 0 ? `${avgExecution}%` : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Execution</p>
            </CardContent>
          </Card>

          {/* Belief Score */}
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <Brain className={cn("h-5 w-5 mx-auto mb-1", 
                (latestScorecard?.belief_score ?? 0) >= 7 ? "text-green-500" : 
                (latestScorecard?.belief_score ?? 0) >= 5 ? "text-yellow-500" : "text-red-500"
              )} />
              <p className="text-2xl font-bold tabular-nums">
                {latestScorecard?.belief_score ?? '—'}
                <span className="text-sm font-normal text-muted-foreground">/10</span>
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Belief
                {beliefTrend === 'down' && ' ↓'}
                {beliefTrend === 'up' && ' ↑'}
              </p>
            </CardContent>
          </Card>

          {/* Streak */}
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <Flame className={cn("h-5 w-5 mx-auto mb-1", streak >= 4 ? "text-orange-500" : "text-muted-foreground")} />
              <p className="text-2xl font-bold tabular-nums">{streak}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Week Streak</p>
            </CardContent>
          </Card>

          {/* Sprint Badges */}
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <Trophy className={cn("h-5 w-5 mx-auto mb-1", sprintCompletions > 0 ? "text-yellow-500" : "text-muted-foreground")} />
              <p className="text-2xl font-bold tabular-nums">{sprintCompletions}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sprints Done</p>
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* 12-Week Chart */}
      <StaggerItem>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              13-Week Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    domain={[0, 100]}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const exec = payload.find(p => p.dataKey === 'execution');
                      const belief = payload.find(p => p.dataKey === 'belief');
                      const beliefRaw = payload[0]?.payload?.beliefRaw;
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs space-y-1">
                          <p className="font-medium">{label}</p>
                          {exec?.value != null && <p>Execution: <span className="font-bold">{exec.value}%</span></p>}
                          {beliefRaw != null && <p>Belief: <span className="font-bold">{beliefRaw}/10</span></p>}
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={85} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Bar
                    dataKey="execution"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                  />
                  <Line
                    dataKey="belief"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'hsl(var(--destructive))' }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary opacity-80" /> Execution %
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-destructive" /> Belief Score
              </span>
              <span className="flex items-center gap-1">
                <div className="w-6 h-0 border-t-2 border-dashed border-primary opacity-50" /> 85% Target
              </span>
            </div>
          </CardContent>
        </Card>
      </StaggerItem>

      {/* Coaching Alert */}
      {latestScorecard && (latestScorecard.belief_score ?? 10) < 5 && (
        <StaggerItem>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-2 border-amber-500/50 bg-amber-500/5">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Belief score dropped below 5 this week.</p>
                    <p className="text-xs text-muted-foreground">
                      This is the #1 predictor of quitting. Not lack of strategy — lack of belief. 
                      Your execution often drops AFTER belief drops. Let's catch this now.
                    </p>
                    <p className="text-xs font-medium text-amber-600">
                      💡 What thought showed up this week? Write it in your scorecard reflection — 
                      that's the first step of the CTFAR model.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </StaggerItem>
      )}

      {/* Sprint Badges Display */}
      {sprintCompletions > 0 && (
        <StaggerItem>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Completed Sprints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {scorecards
                  .filter(s => s.sprint_phase === 'complete')
                  .map((s, i) => (
                    <div key={s.id} className="flex flex-col items-center gap-1">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">W{s.week_number}</span>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
