import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Repeat, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecurringTaskAverage } from '@/hooks/useTimeAnalytics';

interface RecurringTasksTableProps {
  data: RecurringTaskAverage[];
}

export function RecurringTasksTable({ data }: RecurringTasksTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Recurring Task Averages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete recurring tasks with time tracking to see average durations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getAccuracyBadge = (estimated: number, actual: number) => {
    if (!estimated || !actual) return null;
    const diff = ((actual - estimated) / estimated) * 100;
    
    if (Math.abs(diff) <= 10) {
      return <Badge variant="success" className="text-xs">Accurate</Badge>;
    } else if (diff > 10) {
      return <Badge variant="warning" className="text-xs">+{Math.round(diff)}%</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">{Math.round(diff)}%</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Repeat className="h-4 w-4" />
          Recurring Task Averages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead className="text-right w-20">Times</TableHead>
              <TableHead className="text-right w-24">Avg Time</TableHead>
              <TableHead className="text-right w-24">Est.</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((task) => (
              <TableRow key={task.parent_task_id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {task.task_text}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {task.instance_count}x
                </TableCell>
                <TableCell className="text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {formatMinutes(task.avg_actual_minutes)}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {task.avg_estimated_minutes ? formatMinutes(task.avg_estimated_minutes) : '-'}
                </TableCell>
                <TableCell>
                  {getAccuracyBadge(task.avg_estimated_minutes, task.avg_actual_minutes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
