import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Tags } from 'lucide-react';
import type { TagBreakdown } from '@/hooks/useTimeAnalytics';

interface TimeByTagChartProps {
  data: TagBreakdown[];
}

const TAG_COLORS: Record<string, string> = {
  'deep-work': 'hsl(var(--primary))',
  'admin': 'hsl(var(--muted-foreground))',
  'creative': 'hsl(var(--success))',
  'meetings': 'hsl(var(--warning))',
  'learning': 'hsl(var(--accent-foreground))',
  'untagged': 'hsl(var(--muted))',
};

export function TimeByTagChart({ data }: TimeByTagChartProps) {
  const chartData = useMemo(() => {
    return data.slice(0, 8).map((tag) => ({
      name: tag.tag,
      hours: Math.round(tag.total_minutes / 60 * 10) / 10,
      tasks: tag.task_count,
      accuracy: tag.accuracy,
      fill: TAG_COLORS[tag.tag] || 'hsl(var(--primary))',
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Time by Tag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tag time data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Tags className="h-4 w-4" />
          Time by Tag
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ left: 0, right: 10 }}
            >
              <XAxis 
                type="number" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
                label={{ 
                  value: 'Hours', 
                  position: 'bottom',
                  className: 'fill-muted-foreground text-xs'
                }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                className="text-xs fill-muted-foreground capitalize"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value}h (${props.payload.tasks} tasks)${props.payload.accuracy ? ` • ${props.payload.accuracy}% accurate` : ''}`,
                  'Time'
                ]}
                labelFormatter={(label) => label.charAt(0).toUpperCase() + label.slice(1)}
              />
              <Bar 
                dataKey="hours" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
