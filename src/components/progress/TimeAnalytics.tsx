import { useTimeAnalytics } from '@/hooks/useTimeAnalytics';
import { TimeAccuracyCard } from './TimeAccuracyCard';
import { WeeklyTimeChart } from './WeeklyTimeChart';
import { TimeByProjectChart } from './TimeByProjectChart';
import { TimeByTagChart } from './TimeByTagChart';
import { RecurringTasksTable } from './RecurringTasksTable';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';

export function TimeAnalytics() {
  const { data, isLoading, error } = useTimeAnalytics();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-destructive text-center">
            Failed to load time analytics. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-2">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Start tracking time on tasks to see analytics here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Accuracy Card - Full width */}
      <TimeAccuracyCard metrics={data.accuracyMetrics} />

      {/* Weekly Chart - Full width */}
      <WeeklyTimeChart data={data.weeklyTimeData} />

      {/* Two-column grid for breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimeByProjectChart data={data.projectBreakdown} />
        <TimeByTagChart data={data.tagBreakdown} />
      </div>

      {/* Recurring tasks table - Full width */}
      <RecurringTasksTable data={data.recurringTaskAverages} />
    </div>
  );
}
