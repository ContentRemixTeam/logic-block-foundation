import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Send, PenTool, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useContentForPlanner, ContentPlannerItem } from '@/hooks/useContentForPlanner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function WeeklyContentScheduleCard() {
  const navigate = useNavigate();
  const { getContentForWeek, showContentInPlanners, isLoading } = useContentForPlanner();
  
  if (!showContentInPlanners || isLoading) {
    return null;
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const content = getContentForWeek(weekStart);
  
  if (content.length === 0) {
    return null;
  }

  // Group by day
  const contentByDay: Record<string, ContentPlannerItem[]> = {};
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    contentByDay[dateStr] = content.filter(item => 
      item.plannedCreationDate === dateStr || 
      item.plannedPublishDate === dateStr
    );
  });

  const totalItems = content.length;

  return (
    <Card className="border-l-4 border-l-violet-500">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-500" />
            Content This Week
            <Badge variant="secondary" className="ml-1 text-xs">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-6 px-2"
            onClick={() => navigate('/editorial-calendar')}
          >
            View Calendar <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4">
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayContent = contentByDay[dateStr] || [];
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <div 
                key={dateStr}
                className={cn(
                  "p-1.5 rounded text-center min-h-[60px]",
                  isToday && "bg-primary/10 ring-1 ring-primary/30",
                  dayContent.length > 0 && !isToday && "bg-muted/50"
                )}
              >
                <div className="text-[10px] text-muted-foreground mb-1">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-xs font-medium mb-1",
                  isToday && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>
                {dayContent.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {dayContent.slice(0, 2).map((item, idx) => {
                      const isPublish = item.plannedPublishDate === dateStr;
                      return (
                        <div 
                          key={`${item.id}-${idx}`}
                          className={cn(
                            "text-[8px] px-1 py-0.5 rounded truncate",
                            isPublish 
                              ? "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300" 
                              : "bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300"
                          )}
                          title={`${isPublish ? 'Publish' : 'Create'}: ${item.title}`}
                        >
                          {isPublish ? '📤' : '✏️'} {item.title}
                        </div>
                      );
                    })}
                    {dayContent.length > 2 && (
                      <div className="text-[8px] text-muted-foreground">
                        +{dayContent.length - 2} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[9px] text-muted-foreground">—</div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
