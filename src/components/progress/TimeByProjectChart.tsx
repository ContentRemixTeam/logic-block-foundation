import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FolderKanban } from 'lucide-react';
import type { ProjectBreakdown } from '@/hooks/useTimeAnalytics';

interface TimeByProjectChartProps {
  data: ProjectBreakdown[];
}

export function TimeByProjectChart({ data }: TimeByProjectChartProps) {
  const chartData = useMemo(() => {
    return data.slice(0, 8).map((project) => ({
      name: project.project_name,
      value: Math.round(project.total_minutes / 60 * 10) / 10, // Hours
      color: project.project_color,
      tasks: project.task_count,
    }));
  }, [data]);

  const totalHours = useMemo(() => {
    return chartData.reduce((sum, p) => sum + p.value, 0);
  }, [chartData]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Time by Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No project time data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderKanban className="h-4 w-4" />
          Time by Project
          <span className="text-sm font-normal text-muted-foreground">
            ({totalHours.toFixed(1)}h total)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value}h (${props.payload.tasks} tasks)`,
                  name
                ]}
              />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                formatter={(value) => (
                  <span className="text-xs">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
